import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, WarningCircle, ArrowCounterClockwise, Ruler, Cube, SquaresFour } from '@phosphor-icons/react';

const RoomFit3D = lazy(() => import('./RoomFit3D.jsx'));
import { inr } from '../lib/format.js';
import { cx } from './ui.jsx';

// Room Fit Check: a to-scale floor plan of one room with the planned furniture laid out automatically.
// Units inside the SVG are centimetres. Pieces can be dragged, and rotated with a double click.
export const FT = 30.48;
const GAP = 15; // walking gap kept between pieces by the auto layout
const DOOR = 80; // door width, kept clear on the bottom wall
const SWING = 70; // clear depth in front of the door

const hit = (a, b, gap = 0) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
const isRug = (name) => /rug/i.test(name);
const fitsEmpty = (w, d, W, L) => (w <= W && d <= L) || (d <= W && w <= L);

// Largest pieces first, each at the free spot that touches the most walls (beds and wardrobes go against walls).
function autoLayout(blocks, W, L, door) {
  const placed = [];
  const out = {};
  const step = 10;
  for (const b of [...blocks].sort((a, c) => c.w * c.d - a.w * a.d)) {
    let best = null;
    for (const [w, h, rot] of [[b.w, b.d, false], [b.d, b.w, true]]) {
      if (w > W || h > L) continue;
      const xs = []; for (let x = 0; x < W - w; x += step) xs.push(x); xs.push(W - w);
      const ys = []; for (let y = 0; y < L - h; y += step) ys.push(y); ys.push(L - h);
      for (const y of ys) for (const x of xs) {
        const r = { x, y, w, h };
        if (hit(r, door) || placed.some((p) => hit(r, p, GAP))) continue;
        const walls = (x === 0) + (y === 0) + (x + w === W) + (y + h === L);
        const score = walls * 1000 - y * 0.2 - x * 0.1;
        if (!best || score > best.score) best = { ...r, rot, score };
      }
    }
    if (best) { placed.push(best); out[b.id] = { x: best.x, y: best.y, rot: best.rot }; } else out[b.id] = null;
  }
  return out;
}

export default function RoomFit({ room, size, lines, onResize, onSwap, busy }) {
  const W = Math.round(size.w * FT);
  const L = Math.round(size.l * FT);
  const door = { x: 20, y: L - SWING, w: DOOR, h: SWING };
  const [draft, setDraft] = useState(size);
  const [view, setView] = useState('2d');
  useEffect(() => setDraft(size), [size.w, size.l]); // eslint-disable-line react-hooks/exhaustive-deps

  // One block per physical piece (qty is expanded, capped so a row of chairs stays readable).
  const blocks = useMemo(() => lines.flatMap((l) => Array.from({ length: Math.min(l.qty, 12) }, (_, i) => ({
    id: `${l.key}-${i}`, key: l.key, name: l.item.name, category: l.item.category, w: l.item.width_cm || 60, d: l.item.depth_cm || 60, rug: isRug(l.item.name),
  }))), [lines]);
  const solid = blocks.filter((b) => !b.rug);
  const rug = blocks.find((b) => b.rug);
  const layoutKey = `${W}x${L}|${solid.map((b) => `${b.id}:${b.w}x${b.d}`).join(',')}`;
  const [pos, setPos] = useState({});
  useEffect(() => { setPos(autoLayout(solid, W, L, door)); }, [layoutKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const rects = solid.map((b) => {
    const p = pos[b.id];
    if (!p) return { ...b, placed: false };
    const [w, h] = p.rot ? [b.d, b.w] : [b.w, b.d];
    return { ...b, placed: true, x: p.x, y: p.y, rw: w, rh: h };
  });
  const box = (r) => ({ x: r.x, y: r.y, w: r.rw, h: r.rh });
  const clash = new Set();
  rects.forEach((a, i) => {
    if (!a.placed) return;
    if (hit(box(a), door)) clash.add(a.id);
    rects.forEach((b, j) => { if (j > i && b.placed && hit(box(a), box(b))) { clash.add(a.id); clash.add(b.id); } });
  });

  const tooBig = lines.filter((l) => !isRug(l.item.name) && !fitsEmpty(l.item.width_cm || 0, l.item.depth_cm || 0, W, L));
  const noSpace = [...new Set(rects.filter((r) => !r.placed && !tooBig.some((t) => t.key === r.key)).map((r) => r.name))];
  const used = rects.filter((r) => r.placed).reduce((s, r) => s + r.rw * r.rh, 0);
  const pct = Math.round((used / (W * L)) * 100);
  const status = tooBig.length || noSpace.length ? 'bad' : clash.size ? 'warn' : pct > 60 ? 'warn' : 'ok';

  // Dragging: convert pointer position into room centimetres.
  const svgRef = useRef(null);
  const drag = useRef(null);
  const toCm = (e) => { const pt = svgRef.current.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svgRef.current.getScreenCTM().inverse()); };
  const down = (e, r) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const c = toCm(e); drag.current = { id: r.id, dx: c.x - r.x, dy: c.y - r.y, w: r.rw, h: r.rh }; };
  const move = (e) => {
    const d = drag.current; if (!d) return;
    const c = toCm(e);
    const x = Math.round(Math.min(W - d.w, Math.max(0, c.x - d.dx)) / 5) * 5;
    const y = Math.round(Math.min(L - d.h, Math.max(0, c.y - d.dy)) / 5) * 5;
    setPos((p) => ({ ...p, [d.id]: { ...p[d.id], x, y } }));
  };
  const up = () => { drag.current = null; };
  const rotate = (r) => setPos((p) => {
    const cur = p[r.id]; const nw = r.rh; const nh = r.rw;
    if (nw > W || nh > L) return p;
    return { ...p, [r.id]: { rot: !cur.rot, x: Math.min(cur.x, W - nw), y: Math.min(cur.y, L - nh) } };
  });

  const fs = Math.max(W, L) / 26;
  const gridId = `grid-${room.replace(/[^a-z0-9]/gi, '')}`;
  const commit = () => { if (draft.w !== size.w || draft.l !== size.l) onResize({ w: Math.min(40, Math.max(4, Number(draft.w) || size.w)), l: Math.min(40, Math.max(4, Number(draft.l) || size.l)) }); };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold"><Ruler size={16} className="text-accent" /> Room fit check
          <span className="flex rounded-full border border-line p-0.5 text-xs font-medium" role="tablist" aria-label="Plan view">
            {[['2d', '2D', SquaresFour], ['3d', '3D', Cube]].map(([v, t, Icon]) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
                className={cx('flex items-center gap-1 rounded-full px-2.5 py-1 transition', view === v ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink')}><Icon size={12} /> {t}</button>
            ))}
          </span>
        </span>
        <form onSubmit={(e) => { e.preventDefault(); commit(); }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) commit(); }} className="flex items-center gap-1.5 text-sm">
          <input aria-label={`${room} width in feet`} type="number" min="4" max="40" value={draft.w} onChange={(e) => setDraft((d) => ({ ...d, w: e.target.value }))}
            className="tabular h-8 w-14 rounded-lg border border-line bg-surface px-2 text-center" />
          <span className="text-muted">x</span>
          <input aria-label={`${room} length in feet`} type="number" min="4" max="40" value={draft.l} onChange={(e) => setDraft((d) => ({ ...d, l: e.target.value }))}
            className="tabular h-8 w-14 rounded-lg border border-line bg-surface px-2 text-center" />
          <span className="text-muted">ft</span>
          <button type="submit" className="sr-only">Update room size</button>
        </form>
      </div>

      {view === '3d' && (
        <div className={cx('relative aspect-square w-full overflow-hidden rounded-xl bg-surface-2 transition-opacity', busy && 'opacity-50')}>
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted">Loading 3D view...</div>}>
            <RoomFit3D W={W} L={L} door={door} rects={rects.filter((r) => r.placed).map((r) => ({ ...r, rot: !!pos[r.id]?.rot, bad: clash.has(r.id) }))} />
          </Suspense>
          <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-surface/85 px-2.5 py-1 text-[11px] text-muted backdrop-blur">Drag to orbit. Same layout as the 2D plan.</span>
        </div>
      )}
      <div className={cx('relative transition-opacity', busy && 'opacity-50', view === '3d' && 'hidden')}>
        <svg ref={svgRef} viewBox={`${-fs * 1.6} ${-fs * 1.6} ${W + fs * 3.2} ${L + fs * 3.2}`} className="h-auto w-full touch-none select-none" onPointerMove={move} onPointerUp={up} onPointerLeave={up}
          role="img" aria-label={`Floor plan of ${room}, ${size.w} by ${size.l} feet`}>
          <defs>
            <pattern id={gridId} width={FT} height={FT} patternUnits="userSpaceOnUse">
              <path d={`M ${FT} 0 L 0 0 0 ${FT}`} style={{ fill: 'none', stroke: 'var(--line)' }} strokeWidth={fs / 14} />
            </pattern>
          </defs>
          <rect x={0} y={0} width={W} height={L} style={{ fill: 'var(--surface-2)' }} />
          <rect x={0} y={0} width={W} height={L} fill={`url(#${gridId})`} />
          {rug && fitsEmpty(rug.w, rug.d, W, L) && (() => {
            const [w, h] = rug.w <= W && rug.d <= L ? [rug.w, rug.d] : [rug.d, rug.w];
            return <rect x={(W - w) / 2} y={(L - h) / 2} width={w} height={h} rx={fs / 3} style={{ fill: 'var(--warn)', fillOpacity: 0.08, stroke: 'var(--warn)', strokeOpacity: 0.5 }} strokeDasharray={`${fs / 3} ${fs / 4}`} strokeWidth={fs / 10} />;
          })()}
          {/* door and its swing, kept clear */}
          <path d={`M ${door.x} ${L} A ${DOOR} ${DOOR} 0 0 1 ${door.x + DOOR} ${L - DOOR}`} style={{ fill: 'none', stroke: 'var(--muted)' }} strokeWidth={fs / 10} strokeDasharray={`${fs / 4} ${fs / 5}`} />
          <line x1={door.x + DOOR} y1={L} x2={door.x + DOOR} y2={L - DOOR} style={{ stroke: 'var(--muted)' }} strokeWidth={fs / 8} />
          <text x={door.x + DOOR / 2} y={L - fs * 0.5} fontSize={fs * 0.7} style={{ fill: 'var(--muted)' }} textAnchor="middle">Door</text>

          {rects.filter((r) => r.placed).map((r) => {
            const bad = clash.has(r.id);
            const label = r.name.replace(/ with Mattress| \(.*\)|Height-Adjustable |Ergonomic |Four-Drawer |Three-Door |Five-Tier /g, '');
            return (
              <motion.g key={r.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${r.x + r.rw / 2}px ${r.y + r.rh / 2}px`, cursor: 'grab' }}
                onPointerDown={(e) => down(e, r)} onDoubleClick={() => rotate(r)}>
                <title>{`${r.name}, ${r.w} x ${r.d} cm. Drag to move, double-click to rotate.`}</title>
                <rect x={r.x} y={r.y} width={r.rw} height={r.rh} rx={fs / 4}
                  style={{ fill: bad ? 'var(--bad)' : 'var(--accent)', fillOpacity: bad ? 0.22 : 0.18, stroke: bad ? 'var(--bad)' : 'var(--accent)' }} strokeWidth={fs / 8} />
                {Math.min(r.rw, r.rh) > fs * 1.2 && (
                  <text x={r.x + r.rw / 2} y={r.y + r.rh / 2} fontSize={Math.min(fs * 0.75, r.rw / Math.max(6, label.length * 0.62))} textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none', fill: 'var(--ink)' }}>
                    {label}
                  </text>
                )}
              </motion.g>
            );
          })}
          <rect x={0} y={0} width={W} height={L} style={{ fill: 'none', stroke: 'var(--ink)' }} strokeWidth={fs / 5} />
          <text x={W / 2} y={-fs * 0.6} fontSize={fs * 0.8} style={{ fill: 'var(--muted)' }} textAnchor="middle">{size.w} ft</text>
          <text x={-fs * 0.6} y={L / 2} fontSize={fs * 0.8} style={{ fill: 'var(--muted)' }} textAnchor="middle" transform={`rotate(-90 ${-fs * 0.6} ${L / 2})`}>{size.l} ft</text>
        </svg>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${status}-${tooBig.length}-${noSpace.length}-${clash.size}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2 text-sm">
          {status === 'ok' && <p className="flex items-center gap-1.5 font-medium text-ok"><CheckCircle size={18} weight="fill" /> Everything fits. {pct}% of the floor used, with room to walk.</p>}
          {status === 'warn' && !clash.size && <p className="flex items-center gap-1.5 font-medium text-warn"><WarningCircle size={18} weight="fill" /> Fits, but crowded: {pct}% of the floor is covered.</p>}
          {!!clash.size && !tooBig.length && !noSpace.length && <p className="flex items-center gap-1.5 font-medium text-warn"><WarningCircle size={18} weight="fill" /> Pieces overlap or block the door. Drag them apart or reset the layout.</p>}
          {tooBig.map((l) => {
            const alt = l.alternatives.filter((a) => a.id !== l.item.id && fitsEmpty(a.width_cm || 0, a.depth_cm || 0, W, L)).sort((a, b) => a.cost - b.cost)[0];
            return (
              <div key={l.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bad/10 p-3 text-bad">
                <span className="flex items-start gap-1.5"><WarningCircle size={18} weight="fill" className="mt-px shrink-0" /> {l.item.name} ({l.item.width_cm} x {l.item.depth_cm} cm) does not fit a {size.w} x {size.l} ft room.</span>
                {alt
                  ? <button type="button" onClick={() => onSwap(l.key, alt.id)} className="rounded-full bg-bad px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">Swap to {alt.name} ({inr(alt.cost)})</button>
                  : <span className="text-xs">Nothing in this category fits. Enter the real room size or choose another room.</span>}
              </div>
            );
          })}
          {noSpace.length > 0 && <p className="flex items-start gap-1.5 font-medium text-bad"><WarningCircle size={18} weight="fill" className="mt-px shrink-0" /> No floor space left for {noSpace.join(', ')}. Remove it or enter a bigger room.</p>}
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>Drag to move. Double-click to rotate. 1 square = 1 ft.</span>
        <button type="button" onClick={() => setPos(autoLayout(solid, W, L, door))} className="flex items-center gap-1 hover:text-ink"><ArrowCounterClockwise size={13} /> Reset layout</button>
      </div>
    </div>
  );
}

