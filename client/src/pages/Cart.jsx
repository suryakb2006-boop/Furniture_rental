import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ShoppingBag, Trash, Minus, Plus, WarningCircle, ArrowRight } from '@phosphor-icons/react';
import { useCart } from '../context/store.jsx';
import { api } from '../lib/api.js';
import { inr, quoteLine, totals, fmtRange } from '../lib/format.js';
import { Button, EmptyState, ItemImage } from '../components/ui.jsx';

export function Summary({ t, children }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6 shadow-soft">
      <h2 className="text-lg font-semibold">Order summary</h2>
      <dl className="flex flex-col gap-2 text-sm">
        {t.discount > 0 && <div className="flex justify-between text-ok"><dt>Savings vs daily price</dt><dd className="tabular">- {inr(t.discount)}</dd></div>}
        <div className="flex justify-between"><dt className="text-muted">Rent</dt><dd className="tabular">{inr(t.subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">GST (18%)</dt><dd className="tabular">{inr(t.gst)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Delivery and pick-up</dt><dd className="tabular">{t.delivery ? inr(t.delivery) : 'Free'}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Refundable deposit</dt><dd className="tabular">{inr(t.deposit)}</dd></div>
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
          <dt className="font-medium">Total due now</dt>
          <dd className="tabular font-display text-2xl font-semibold">{inr(t.total)}</dd>
        </div>
      </dl>
      {t.delivery > 0 && <p className="text-xs text-muted">Add {inr(5000 - t.subtotal)} more in rent for free delivery.</p>}
      {children}
    </div>
  );
}

export default function Cart() {
  const cart = useCart();
  const nav = useNavigate();
  const [problem, setProblem] = useState('');

  const priced = useMemo(() => cart.lines.map((l) => ({ ...l, ...quoteLine(l, l.qty, l.start, l.end, l.bundlePct) })), [cart.lines]);
  const t = totals(priced);

  useEffect(() => {
    if (!cart.lines.length) { setProblem(''); return; }
    api.quote(cart.lines.map((l) => ({ furnitureId: l.furnitureId, qty: l.qty, start: l.start, end: l.end, bundleId: l.bundleId })))
      .then(() => setProblem(''))
      .catch((e) => setProblem(e.message));
  }, [cart.lines]);

  if (!cart.lines.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState icon={ShoppingBag} title="Your cart is empty" body="Pick your furniture, choose dates and it will show up here." action={<Button as={Link} to="/browse">Browse furniture</Button>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold md:text-4xl">Your cart</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="flex flex-col divide-y divide-line">
          <AnimatePresence initial={false}>
            {priced.map((l) => (
              <motion.li key={l.key} layout exit={{ opacity: 0, x: -30, height: 0 }} transition={{ duration: 0.3 }} className="flex gap-4 py-5">
                <Link to={`/item/${l.furnitureId}?from=${l.start}&to=${l.end}`} className="shrink-0"><ItemImage item={l} className="h-24 w-28 sm:h-28 sm:w-36" /></Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/item/${l.furnitureId}`} className="font-display text-lg font-semibold leading-snug hover:text-accent">{l.name}</Link>
                    <span className="tabular font-semibold">{inr(l.rent)}</span>
                  </div>
                  <p className="text-sm text-muted">{fmtRange(l.start, l.end)} ({l.days} day{l.days > 1 ? 's' : ''}) at {inr(l.price_per_day)} / day</p>
                  {l.bundleName && <p className="text-xs font-medium text-accent">Part of {l.bundleName}, {l.bundlePct}% pack discount</p>}
                  {l.plan === 'monthly' ? <p className="text-xs text-ok">Monthly plan price applied</p> : l.rate > 0 && <p className="text-xs text-ok">10% weekly discount applied</p>}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-1 rounded-full border border-line p-0.5">
                      <button onClick={() => l.qty > 1 && cart.update(l.key, { qty: l.qty - 1 })} className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2" aria-label="Decrease quantity"><Minus size={14} /></button>
                      <span className="tabular w-8 text-center text-sm font-semibold">{l.qty}</span>
                      <button onClick={() => cart.update(l.key, { qty: l.qty + 1 })} className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2" aria-label="Increase quantity"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => cart.remove(l.key)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-bad"><Trash size={16} /> Remove</button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Summary t={t}>
            {problem && <p className="flex items-start gap-2 rounded-xl bg-bad/10 p-3 text-sm text-bad"><WarningCircle size={18} className="mt-px shrink-0" /> {problem}</p>}
            <Button size="lg" disabled={!!problem} onClick={() => nav('/checkout')}>Checkout <ArrowRight size={18} weight="bold" /></Button>
            <Link to="/browse" className="text-center text-sm text-muted hover:text-ink">Add more furniture</Link>
          </Summary>
        </div>
      </div>
    </div>
  );
}
