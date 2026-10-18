import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowRight, HandGrabbing, Couch } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { inr } from '../lib/format.js';
import { modelFor } from './furniture3d.jsx';
import { Stars, cx } from './ui.jsx';

const Turntable3D = lazy(() => import('./Turntable3D.jsx'));
const PICKS = ['Three-Seater Fabric Sofa', 'Queen Bed with Mattress', 'Accent Armchair', 'Six-Seater Dining Table Set', 'Height-Adjustable Standing Desk', 'Arc Floor Lamp'];

// Landing section: a 3D showroom that turns each featured piece on a plinth. Tabs pick the piece; it cycles on its own until touched.
export default function Showroom() {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: '-15%' });
  const reduce = useReducedMotion();
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    api.furniture().then((all) => setItems(PICKS.map((n) => all.find((x) => x.name === n)).filter(Boolean))).catch(() => {});
  }, []);
  useEffect(() => {
    if (!inView || paused || reduce || items.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 4200);
    return () => clearInterval(t);
  }, [inView, paused, reduce, items.length]);

  const item = items[i];
  return (
    <section ref={ref} className="mx-auto max-w-7xl px-4 pt-24 sm:px-6" aria-label="3D showroom">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-6">
          <div>
            <span className="text-sm font-medium text-accent">3D showroom</span>
            <h2 className="mt-2 max-w-lg text-3xl font-semibold md:text-5xl">Turn every piece around before you rent it.</h2>
          </div>
          <ul className="flex flex-col" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
            {items.map((it, k) => (
              <li key={it.id}>
                <button type="button" onClick={() => { setI(k); setPaused(true); }} aria-pressed={k === i}
                  className={cx('group relative flex w-full items-center justify-between gap-4 border-b border-line py-4 text-left transition', k === i ? 'text-ink' : 'text-muted hover:text-ink')}>
                  {k === i && <motion.span layoutId="showroom-bar" className="absolute -bottom-px left-0 h-0.5 w-full origin-left bg-accent" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
                  <span className={cx('font-display text-xl font-semibold transition md:text-2xl', k === i && 'translate-x-2')}>{it.name}</span>
                  <span className="tabular shrink-0 text-sm">{inr(it.price_per_month)}<span className="text-muted">/mo</span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative aspect-square w-full max-w-[640px] justify-self-center lg:aspect-[1.05]">
          <div className="absolute inset-[10%] rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />
          {inView || items.length ? (
            <Suspense fallback={<div className="grid h-full place-items-center"><Couch size={48} className="animate-pulse text-accent" /></div>}>
              {item && <Turntable3D kind={modelFor(item.name, item.category)} widthCm={item.width_cm} depthCm={item.depth_cm} reduce={!!reduce} className="absolute inset-0" />}
            </Suspense>
          ) : null}
          <AnimatePresence mode="wait">
            {item && (
              <motion.div key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}
                className="absolute inset-x-4 bottom-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-4 shadow-lift backdrop-blur sm:inset-x-8">
                <div className="min-w-0">
                  <div className="font-semibold">{item.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="tabular">{item.width_cm} x {item.depth_cm} cm</span>
                    {item.rating?.count > 0 && <><Stars value={item.rating.avg} size={11} /> {item.rating.avg.toFixed(1)}</>}
                  </div>
                </div>
                <Link to={`/item/${item.id}`} className="group flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink">
                  From {inr(item.price_per_day)}/day <ArrowRight size={14} weight="bold" className="transition group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          <span className="pointer-events-none absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1.5 text-xs text-muted backdrop-blur sm:right-8"><HandGrabbing size={14} /> Drag to turn</span>
        </div>
      </div>
    </section>
  );
}
