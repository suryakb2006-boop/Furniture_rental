import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  House, Buildings, Confetti, ArrowLeft, ArrowRight, Minus, Plus, Sparkle, CheckCircle, X, ArrowCounterClockwise,
  Couch, Bed, ForkKnife, Desk, WarningCircle, PencilSimple, ShoppingBag, CircleNotch, ArrowsLeftRight,
} from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { addDays, today, inr, fmtDateLong, fmtDate } from '../lib/format.js';
import { useCart, useToast } from '../context/store.jsx';
import { AnimatedNumber, Badge, Button, CATEGORY_ICON, ItemImage, Stars, inputCls, cx } from '../components/ui.jsx';
import RoomFit from '../components/RoomFit.jsx';

const SITUATIONS = [
  { id: 'home', icon: House, title: 'Temporary home', body: 'New city, project posting, or a flat for a few months' },
  { id: 'office', icon: Buildings, title: 'Office or team', body: 'A new team, a pop-up office, or extra desks' },
  { id: 'event', icon: Confetti, title: 'Event', body: 'Wedding, reception, launch or family function' },
];

const PRESETS = [
  { label: 'Moving into a 2BHK for 4 months', input: { situation: 'home', months: 4, rooms: { living: true, bedrooms: 2, dining: true, work: false }, budget: 5000, priority: 'value' } },
  { label: 'Working from home for 3 months', input: { situation: 'home', months: 3, rooms: { living: false, bedrooms: 1, dining: false, work: true }, budget: 3000, priority: 'comfort' } },
  { label: 'Team of 6 for 2 months', input: { situation: 'office', months: 2, teamSize: 6, budget: 12000, priority: 'value' } },
  { label: 'Wedding for 150 guests', input: { situation: 'event', days: 2, guests: 150, budget: 40000, priority: 'value' } },
];

const STEPS = ['Situation', 'Dates', 'Space', 'Budget'];
const DEFAULT = { situation: 'home', start: addDays(today(), 2), months: 4, days: 2, rooms: { living: true, bedrooms: 1, dining: false, work: false }, teamSize: 6, guests: 100, budget: 5000, priority: 'value', fitCheck: true,
  roomSizes: { 'Living room': { w: 12, l: 14 }, 'Bedroom 1': { w: 10, l: 12 }, 'Bedroom 2': { w: 10, l: 11 }, 'Bedroom 3': { w: 9, l: 10 }, Dining: { w: 10, l: 10 }, 'Work corner': { w: 6, l: 8 } } };

function Stepper({ value, min, max, onChange, label }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-4 py-3">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-1 rounded-full border border-line p-0.5">
        <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(min, value - 1))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2"><Minus size={16} /></button>
        <span className="tabular w-10 text-center font-semibold">{value}</span>
        <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2"><Plus size={16} /></button>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, icon: Icon, title, body }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cx('flex items-start gap-3 rounded-2xl border p-4 text-left transition', on ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent')}>
      <Icon size={24} className={on ? 'text-accent' : 'text-muted'} />
      <span className="flex-1"><span className="block font-medium">{title}</span><span className="text-sm text-muted">{body}</span></span>
      <span className={cx('grid h-5 w-5 place-items-center rounded-full border', on ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>{on && <CheckCircle size={14} weight="bold" />}</span>
    </button>
  );
}

export default function Planner() {
  const nav = useNavigate();
  const cart = useCart();
  const toast = useToast();
  const [input, setInput] = useState(DEFAULT);
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setInput((x) => ({ ...x, ...patch }));
  const setRooms = (patch) => setInput((x) => ({ ...x, rooms: { ...x.rooms, ...patch } }));
  const perMonth = input.situation !== 'event';

  const build = async (body, animate = true) => {
    setError('');
    setBusy(true);
    if (animate) setThinking(true);
    try {
      const [p] = await Promise.all([api.planner(body), new Promise((r) => setTimeout(r, animate ? 1400 : 0))]);
      setPlan(p);
      setInput((x) => ({ ...x, ...body }));
      if (animate) window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setError(e.message); } finally { setBusy(false); setThinking(false); }
  };

  const refine = (patch) => build({ ...input, ...patch }, false);
  const choose = (key, id) => refine({ choices: { ...(input.choices || {}), [key]: Number(id) } });
  const remove = (key) => refine({ skip: [...new Set([...(input.skip || []), key])], include: (input.include || []).filter((k) => k !== key) });
  const addBack = (key) => refine({ skip: (input.skip || []).filter((k) => k !== key), include: [...new Set([...(input.include || []), key])] });

  const rentAll = () => {
    for (const l of plan.lines) {
      cart.add({ furnitureId: l.item.id, name: l.item.name, category: l.item.category, image_url: l.item.image_url, price_per_day: l.item.price_per_day, price_per_month: l.item.price_per_month, deposit: l.item.deposit, qty: l.qty, start: plan.period.start, end: plan.period.end });
    }
    toast(`Your plan (${plan.summary.pieces} pieces) is in the cart`);
    nav('/cart');
  };

  const canNext = step !== 2 || input.situation !== 'home' || input.rooms.living || input.rooms.bedrooms > 0 || input.rooms.dining || input.rooms.work;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6">
      <AnimatePresence mode="wait">
        {thinking ? (
          <Thinking key="t" input={input} />
        ) : plan ? (
          <PlanView key="p" plan={plan} busy={busy} perMonth={plan.basis === 'month'} onChoose={choose} onRemove={remove} onAddBack={addBack} onRent={rentAll}
            onResize={(room, size) => refine({ roomSizes: { ...(plan.roomSizes || {}), [room]: size } })}
            onEdit={() => { setPlan(null); setStep(0); }} />
        ) : (
          <motion.div key="w" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
            <div className="flex flex-col gap-6">
              <Badge tone="accent" className="w-fit px-3 py-1 text-sm"><Sparkle size={14} weight="fill" /> Rental Life Planner</Badge>
              <h1 className="text-4xl font-semibold leading-[1.05] md:text-5xl">Tell us your situation. Get a complete furniture plan.</h1>
              <p className="max-w-[48ch] text-lg text-muted">Answer four questions. We match our catalogue to your rooms, check stock for your whole stay and fit it to your budget.</p>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Or start from an example</span>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button key={p.label} type="button" onClick={() => build({ ...DEFAULT, ...p.input, start: addDays(today(), 2) })}
                      className="rounded-full border border-line bg-surface px-4 py-2 text-sm transition hover:border-accent hover:text-accent active:scale-[0.98]">{p.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-7">
              <ol className="flex items-center gap-2" aria-label="Progress">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex flex-1 flex-col gap-1.5">
                    <motion.span className="h-1 rounded-full bg-line" animate={{ backgroundColor: i <= step ? 'var(--accent)' : 'var(--line)' }} />
                    <span className={cx('text-xs', i === step ? 'font-medium text-ink' : 'text-muted')}>{s}</span>
                  </li>
                ))}
              </ol>

              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="flex min-h-[320px] flex-col gap-4">
                  {step === 0 && (<>
                    <h2 className="text-xl font-semibold">What are you furnishing?</h2>
                    <div className="grid gap-3">
                      {SITUATIONS.map((s) => (
                        <Toggle key={s.id} on={input.situation === s.id} onClick={() => set({ situation: s.id, budget: s.id === 'event' ? 40000 : s.id === 'office' ? 12000 : 5000 })} icon={s.icon} title={s.title} body={s.body} />
                      ))}
                    </div>
                  </>)}

                  {step === 1 && (<>
                    <h2 className="text-xl font-semibold">When, and for how long?</h2>
                    <label className="flex flex-col gap-1.5 text-sm font-medium">Delivery date
                      <input type="date" min={today()} value={input.start} onChange={(e) => set({ start: e.target.value })} className={inputCls} />
                    </label>
                    {perMonth ? (
                      <div className="flex flex-col gap-3">
                        <span className="flex items-baseline justify-between text-sm font-medium">Duration <span className="tabular font-display text-2xl font-semibold">{input.months} month{input.months > 1 ? 's' : ''}</span></span>
                        <input type="range" min="1" max="6" value={input.months} onChange={(e) => set({ months: Number(e.target.value) })} className="w-full accent-[var(--accent)]" aria-label="Months" />
                        <div className="flex justify-between text-xs text-muted">{[1, 2, 3, 4, 5, 6].map((m) => <span key={m}>{m}</span>)}</div>
                        <p className="text-sm text-muted">Until {fmtDateLong(addDays(input.start, input.months * 30 - 1))}. Monthly plan prices apply.</p>
                      </div>
                    ) : (
                      <Stepper label="Days" value={input.days} min={1} max={7} onChange={(v) => set({ days: v })} />
                    )}
                  </>)}

                  {step === 2 && input.situation === 'home' && (<>
                    <h2 className="text-xl font-semibold">Which rooms?</h2>
                    <Toggle on={input.rooms.living} onClick={() => setRooms({ living: !input.rooms.living })} icon={Couch} title="Living room" body="Sofa, coffee table, accent chair, rug, lamp" />
                    <Stepper label="Bedrooms" value={input.rooms.bedrooms} min={0} max={3} onChange={(v) => setRooms({ bedrooms: v })} />
                    <Toggle on={input.rooms.dining} onClick={() => setRooms({ dining: !input.rooms.dining })} icon={ForkKnife} title="Dining" body="Six-seater dining set" />
                    <Toggle on={input.rooms.work} onClick={() => setRooms({ work: !input.rooms.work })} icon={Desk} title="Work corner" body="Desk, ergonomic chair, bookshelf" />
                    {!canNext && <p className="text-sm text-bad">Pick at least one room.</p>}
                    <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-line p-4">
                      <span className="text-sm font-medium">Room sizes in feet <span className="font-normal text-muted">(for the Room Fit Check)</span></span>
                      {[input.rooms.living && 'Living room', ...Array.from({ length: input.rooms.bedrooms }, (_, i) => `Bedroom ${i + 1}`), input.rooms.dining && 'Dining', input.rooms.work && 'Work corner'].filter(Boolean).map((r) => {
                        const v = input.roomSizes?.[r] || { w: 10, l: 12 };
                        const upd = (k, val) => set({ roomSizes: { ...input.roomSizes, [r]: { ...v, [k]: Number(val) } } });
                        return (
                          <div key={r} className="flex items-center justify-between gap-3 text-sm">
                            <span>{r}</span>
                            <span className="flex items-center gap-1.5">
                              <input aria-label={`${r} width`} type="number" min="4" max="40" value={v.w} onChange={(e) => upd('w', e.target.value)} className="tabular h-9 w-16 rounded-lg border border-line bg-surface px-2 text-center" />
                              <span className="text-muted">x</span>
                              <input aria-label={`${r} length`} type="number" min="4" max="40" value={v.l} onChange={(e) => upd('l', e.target.value)} className="tabular h-9 w-16 rounded-lg border border-line bg-surface px-2 text-center" />
                              <span className="text-muted">ft</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>)}
                  {step === 2 && input.situation === 'office' && (<>
                    <h2 className="text-xl font-semibold">How big is the team?</h2>
                    <Stepper label="People" value={input.teamSize} min={2} max={40} onChange={(v) => set({ teamSize: v })} />
                    <p className="text-sm text-muted">We plan workstations (4 seats each), one chair per person, and a conference table for teams of 5 or more.</p>
                  </>)}
                  {step === 2 && input.situation === 'event' && (<>
                    <h2 className="text-xl font-semibold">How many guests?</h2>
                    <div className="flex items-baseline justify-between"><span className="text-sm font-medium">Guests</span><span className="tabular font-display text-2xl font-semibold">{input.guests}</span></div>
                    <input type="range" min="20" max="300" step="10" value={input.guests} onChange={(e) => set({ guests: Number(e.target.value) })} className="w-full accent-[var(--accent)]" aria-label="Guests" />
                    <p className="text-sm text-muted">One chair per guest, a round table for every 9, plus a stage and cocktail tables if the budget allows.</p>
                  </>)}

                  {step === 3 && (<>
                    <h2 className="text-xl font-semibold">Budget and priority</h2>
                    <label className="flex flex-col gap-1.5 text-sm font-medium">{perMonth ? 'Budget per month (rent)' : 'Total budget (rent)'}
                      <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">₹</span>
                        <input type="number" min="0" step="500" value={input.budget} onChange={(e) => set({ budget: Number(e.target.value) })} className={cx(inputCls, 'tabular pl-8 text-lg font-semibold')} />
                      </div>
                    </label>
                    <input type="range" min={perMonth ? 1000 : 5000} max={perMonth ? 30000 : 150000} step={perMonth ? 500 : 5000} value={input.budget} onChange={(e) => set({ budget: Number(e.target.value) })} className="w-full accent-[var(--accent)]" aria-label="Budget" />
                    <div className="grid grid-cols-2 gap-3">
                      {[['value', 'Best value', 'Lowest price that does the job'], ['comfort', 'Best condition', 'Newest pieces, highest rated']].map(([id, t, b]) => (
                        <button key={id} type="button" onClick={() => set({ priority: id })} aria-pressed={input.priority === id}
                          className={cx('flex flex-col rounded-2xl border p-4 text-left transition', input.priority === id ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent')}>
                          <span className="font-medium">{t}</span><span className="text-sm text-muted">{b}</span>
                        </button>
                      ))}
                    </div>
                  </>)}
                </motion.div>
              </AnimatePresence>

              {error && <p className="flex items-start gap-2 rounded-xl bg-bad/10 p-3 text-sm text-bad"><WarningCircle size={18} className="mt-px shrink-0" /> {error}</p>}
              <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
                <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft size={16} /> Back</Button>
                {step < 3
                  ? <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Next <ArrowRight size={16} /></Button>
                  : <Button size="lg" disabled={busy} onClick={() => build({ ...input, choices: {}, skip: [], include: [] })}><Sparkle size={18} weight="fill" /> Build my plan</Button>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Short "working" sequence so the steps the planner runs are visible during the demo.
function Thinking({ input }) {
  const lines = [
    'Reading your situation',
    input.situation === 'event' ? `Sizing seating for ${input.guests} guests` : input.situation === 'office' ? `Planning for a team of ${input.teamSize}` : 'Matching furniture to each room',
    `Checking stock for the whole ${input.situation === 'event' ? `${input.days}-day event` : `${input.months}-month stay`}`,
    `Fitting the plan to ${inr(input.budget)}${input.situation === 'event' ? '' : ' a month'}`,
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center gap-5">
      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent"><Sparkle size={28} weight="fill" /></motion.span>
      <h2 className="text-2xl font-semibold">Building your rental plan</h2>
      <ul className="flex flex-col gap-3">
        {lines.map((l, i) => (
          <motion.li key={l} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.3 }} className="flex items-center gap-3 text-muted">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.3 + 0.25, type: 'spring' }}><CheckCircle size={20} weight="fill" className="text-ok" /></motion.span>
            {l}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

const ROOM_ICON = { 'Living room': Couch, Dining: ForkKnife, 'Work corner': Desk };

function PlanView({ plan, perMonth, busy, onChoose, onRemove, onAddBack, onRent, onEdit, onResize }) {
  const s = plan.summary;
  const rooms = [...new Set(plan.lines.map((l) => l.room))];
  const pct = s.budget ? Math.min(100, (s.cost / s.budget) * 100) : 0;
  const per = perMonth ? '/mo' : '';
  const title = plan.input.situation === 'event' ? `Your ${plan.period.days}-day event plan` : `Your ${plan.period.months}-month rental plan`;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge tone="accent" className="px-3 py-1 text-sm"><Sparkle size={14} weight="fill" /> Rental Life Planner</Badge>
          <h1 className="mt-3 text-3xl font-semibold md:text-5xl">{title}</h1>
          <p className="mt-2 text-muted">{fmtDateLong(plan.period.start)} to {fmtDateLong(plan.period.end)}, {s.pieces} pieces, {plan.input.priority === 'comfort' ? 'best condition first' : 'best value first'}.</p>
        </div>
        <Button variant="secondary" onClick={onEdit}><PencilSimple size={16} /> Change answers</Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className={cx('flex min-w-0 flex-col gap-8 transition-opacity', busy && 'opacity-60')}>
          {rooms.map((room, ri) => {
            const Icon = ROOM_ICON[room] || (room.startsWith('Bedroom') ? Bed : CATEGORY_ICON[plan.lines.find((l) => l.room === room)?.item.category] || Couch);
            return (
              <section key={room}>
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Icon size={20} className="text-accent" /> {room}
                  {plan.roomSizes?.[room] && <span className="text-sm font-normal text-muted">{plan.roomSizes[room].w} x {plan.roomSizes[room].l} ft</span>}
                </h2>
                <div className={cx('mt-3 grid gap-4', plan.roomSizes?.[room] && 'xl:grid-cols-[1fr_340px]')}>
                <ul className="flex flex-col self-start divide-y divide-line rounded-2xl border border-line bg-surface">
                  <AnimatePresence initial={false}>
                    {plan.lines.filter((l) => l.room === room).map((l, i) => (
                      <motion.li key={l.key} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: (ri * 3 + i) * 0.05 }}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                        <Link to={`/item/${l.item.id}`} className="shrink-0"><ItemImage item={l.item} className="h-16 w-20" rounded="rounded-xl" /></Link>
                        <div className="min-w-[160px] flex-1">
                          <div className="text-xs text-muted">{l.label}{!l.essential && ' (optional)'}</div>
                          <div className="font-medium">{l.qty > 1 && `${l.qty} x `}{l.item.name}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted"><Badge>{l.item.condition}</Badge>{l.item.width_cm && <span className="tabular">{l.item.width_cm} x {l.item.depth_cm} cm</span>}{l.fits === false && <Badge tone="bad">Too big for this room</Badge>}{l.item.rating?.count > 0 && <><Stars value={l.item.rating.avg} size={11} />{l.item.rating.avg.toFixed(1)}</>}</div>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          {l.alternatives.length > 1 && (
                            <label className="relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 text-xs font-medium transition hover:border-accent hover:text-accent">
                              <ArrowsLeftRight size={14} /> Swap ({l.alternatives.length - 1})
                              <select aria-label={`Swap ${l.label}`} value={l.item.id} onChange={(e) => onChoose(l.key, e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
                                {l.alternatives.map((a) => <option key={a.id} value={a.id}>{a.name}, {a.condition} ({inr(a.cost)}{per})</option>)}
                              </select>
                            </label>
                          )}
                          <span className="tabular w-24 text-right font-semibold">{inr(l.cost)}<span className="text-xs font-normal text-muted">{per}</span></span>
                          {!l.essential && <button onClick={() => onRemove(l.key)} aria-label={`Remove ${l.label}`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-bad/10 hover:text-bad"><X size={16} /></button>}
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                {plan.roomSizes?.[room] && (
                  <RoomFit room={room} size={plan.roomSizes[room]} lines={plan.lines.filter((l) => l.room === room)} busy={busy}
                    onResize={(size) => onResize(room, size)} onSwap={onChoose} />
                )}
                </div>
              </section>
            );
          })}

          {plan.dropped.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">Not in this plan</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {plan.dropped.map((d) => (
                  <li key={d.key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-sm">
                    <span><span className="font-medium">{d.room}: {d.label}</span> <span className="text-muted">{d.reason}{d.from ? `, from ${inr(d.from)}${per}` : ''}</span></span>
                    {d.from !== null && <Button size="sm" variant="ghost" onClick={() => onAddBack(d.key)}><ArrowCounterClockwise size={14} /> Add back</Button>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {plan.notes.length > 0 && <ul className="flex flex-col gap-1 text-sm text-muted">{plan.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 shadow-soft">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted">{perMonth ? 'Plan cost per month' : 'Plan rent'}</span>
              <AnimatedNumber value={s.cost} format={inr} className="font-display text-4xl font-semibold" />
            </div>
            {s.budget > 0 && (
              <div className="flex flex-col gap-2">
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <motion.div className={cx('h-full rounded-full', s.withinBudget ? 'bg-accent' : 'bg-bad')} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Budget {inr(s.budget)}{per}</span>
                  {s.withinBudget
                    ? <span className="font-medium text-ok">{inr(s.remaining)}{per} left</span>
                    : <span className="font-medium text-bad">{inr(-s.remaining)}{per} over</span>}
                </div>
                {!s.withinBudget && <p className="text-xs text-bad">Only essentials are left. Raise the budget or choose fewer rooms.</p>}
              </div>
            )}
            <dl className="flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Rent for {perMonth ? `${plan.period.months} month${plan.period.months > 1 ? 's' : ''}` : `${plan.period.days} day${plan.period.days > 1 ? 's' : ''}`}</dt><dd className="tabular">{inr(s.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">GST (18%)</dt><dd className="tabular">{inr(s.gst)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Delivery and pick-up</dt><dd className="tabular">{s.delivery ? inr(s.delivery) : 'Free'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Refundable deposit</dt><dd className="tabular">{inr(s.deposit)}</dd></div>
              <div className="mt-1 flex justify-between border-t border-line pt-2 font-semibold"><dt>Pay at checkout</dt><dd className="tabular">{inr(s.total)}</dd></div>
              {s.savedVsDaily > 0 && <p className="mt-1 text-xs text-ok">You save {inr(s.savedVsDaily)} compared with daily prices.</p>}
            </dl>
            <Button size="lg" disabled={busy || plan.lines.length === 0} onClick={onRent}>
              {busy ? <><CircleNotch size={18} className="animate-spin" /> Updating plan</> : <><ShoppingBag size={18} /> Rent complete set</>}
            </Button>
            <p className="text-center text-xs text-muted">Swap any item or remove optional ones. Stock is held for the dates above once you pay.</p>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
