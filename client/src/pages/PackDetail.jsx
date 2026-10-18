import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, CheckCircle, WarningCircle, Package, Tag } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { addDays, today, inr, periodError, fmtRange } from '../lib/format.js';
import { useCart, useToast } from '../context/store.jsx';
import { AnimatedNumber, Badge, Button, Field, ItemImage, Skeleton, availabilityInfo, inputCls, stagger, reveal } from '../components/ui.jsx';

export default function PackDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const cart = useCart();
  const toast = useToast();
  const [start, setStart] = useState(addDays(today(), 1));
  const [end, setEnd] = useState(addDays(today(), 30));
  const [b, setB] = useState(null);
  const [error, setError] = useState('');
  const perr = periodError(start, end);

  useEffect(() => {
    const t = setTimeout(() => {
      api.bundle(id, perr ? '' : start, perr ? '' : end).then(setB).catch((e) => setError(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [id, start, end, perr]);

  if (error) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-3xl font-semibold">Pack not found</h1><p className="mt-2 text-muted">{error}</p></div>;
  if (!b) return <div className="mx-auto max-w-7xl px-4 py-10"><Skeleton className="h-96" /></div>;

  const short = b.items.filter((i) => i.status !== 'Available' || i.free < i.qty);
  const addPack = () => {
    for (const i of b.items) {
      cart.add({
        furnitureId: i.id, name: i.name, category: i.category, image_url: i.image_url, price_per_day: i.price_per_day, deposit: i.deposit,
        qty: i.qty, start, end, bundleId: b.id, bundleName: b.name, bundlePct: b.discount_pct,
      });
    }
    toast(`${b.name} added to your cart`);
    nav('/cart');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6">
      <button onClick={() => nav(-1)} className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft size={16} /> Back</button>
      <div className="relative overflow-hidden rounded-2xl bg-surface-2">
        <motion.img initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          src={b.image_url} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgb(8_14_11/0.9)] via-[rgb(8_14_11/0.55)] to-transparent" />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative flex max-w-xl flex-col gap-3 p-8 text-white md:p-12">
          <span className="flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur"><Package size={16} /> {b.use} pack, {b.discount_pct}% off</span>
          <h1 className="text-3xl font-semibold md:text-5xl">{b.name}</h1>
          <p className="text-white/85">{b.tagline}.</p>
          <p className="text-white/85"><span className="tabular font-display text-3xl font-semibold text-white">{inr(b.perDayPack)}</span> / day as a pack <span className="tabular ml-1 line-through opacity-60">{inr(b.perDay)}</span></p>
        </motion.div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
        <section className="min-w-0">
          <h2 className="text-2xl font-semibold">What is in the pack</h2>
          <p className="mt-1 text-sm text-muted">Stock shown for {fmtRange(b.period.start, b.period.end)}.</p>
          <motion.ul variants={stagger(0.06)} initial="hidden" animate="show" className="mt-5 flex flex-col divide-y divide-line">
            {b.items.map((i) => {
              const a = availabilityInfo(i);
              const ok = i.status === 'Available' && i.free >= i.qty;
              return (
                <motion.li key={i.id} variants={reveal} className="flex items-center gap-4 py-4">
                  <Link to={`/item/${i.id}`}><ItemImage item={i} className="h-16 w-20 shrink-0" rounded="rounded-xl" /></Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/item/${i.id}`} className="font-medium hover:text-accent">{i.qty} x {i.name}</Link>
                    <div className="text-sm text-muted">{inr(i.price_per_day)} / day each, {i.condition}</div>
                  </div>
                  {ok ? <Badge tone="ok"><CheckCircle size={12} weight="fill" /> {i.free} free</Badge> : <Badge tone={a.tone === 'ok' ? 'bad' : a.tone}>{i.status !== 'Available' ? 'Maintenance' : `Only ${i.free} free`}</Badge>}
                </motion.li>
              );
            })}
          </motion.ul>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Choose dates</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="p-start"><input id="p-start" type="date" min={today()} value={start} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); }} className={inputCls} /></Field>
              <Field label="End" htmlFor="p-end"><input id="p-end" type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} /></Field>
            </div>
            {perr ? <p className="text-sm text-bad">{perr}</p> : b.quote && (
              <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-4 text-sm">
                <div className="flex justify-between"><span className="text-muted">{b.quote.days} days, all items</span><AnimatedNumber value={b.quote.base} format={inr} /></div>
                <div className="flex justify-between text-ok"><span className="flex items-center gap-1"><Tag size={14} /> Pack + duration discount</span><span className="tabular">- <AnimatedNumber value={b.quote.discount} format={inr} /></span></div>
                <div className="flex justify-between"><span className="text-muted">GST (18%)</span><AnimatedNumber value={b.quote.gst} format={inr} /></div>
                <div className="flex justify-between"><span className="text-muted">Delivery</span><span>{b.quote.delivery ? inr(b.quote.delivery) : 'Free'}</span></div>
                <div className="flex justify-between"><span className="text-muted">Refundable deposit</span><AnimatedNumber value={b.quote.deposit} format={inr} /></div>
                <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3"><span className="font-medium">Total</span><AnimatedNumber value={b.quote.total} format={inr} className="font-display text-2xl font-semibold" /></div>
              </div>
            )}
            <AnimatePresence>
              {!perr && short.length > 0 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-start gap-2 text-sm text-bad">
                  <WarningCircle size={18} className="mt-px shrink-0" /> {short.map((i) => i.name).join(', ')} {short.length === 1 ? 'is' : 'are'} not fully available for these dates. Try other dates.
                </motion.p>
              )}
            </AnimatePresence>
            <Button size="lg" disabled={!!perr || short.length > 0} onClick={addPack}>Add pack to cart</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
