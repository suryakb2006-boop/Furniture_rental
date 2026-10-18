import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarPlus, WarningCircle, Tag } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { addDays, fmtDate, fmtDateLong, inr } from '../lib/format.js';
import { useToast } from '../context/store.jsx';
import { PaymentModal } from '../pages/Checkout.jsx';
import { Button, Field, Modal, Skeleton, inputCls } from './ui.jsx';

// Customer extends an active rental: pick a new end date, see the price for the extra days, pay, done.
export default function ExtendRental({ order, onExtended }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [end, setEnd] = useState(addDays(order.end_date, 7));
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuote(null); setError('');
    const t = setTimeout(() => {
      api.extendQuote(order.id, end).then(setQuote).catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [open, end, order.id]);

  const paid = async (payment) => {
    const updated = await api.extend(order.id, end, payment.ref);
    setPaying(false); setOpen(false);
    toast(`${order.order_code} extended to ${fmtDate(end)}`);
    onExtended(updated);
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => { setEnd(addDays(order.end_date, 7)); setOpen(true); }}><CalendarPlus size={16} /> Extend rental</Button>
      <Modal open={open && !paying} onClose={() => setOpen(false)} title={`Extend ${order.order_code}`}>
        <div className="flex flex-col gap-5 text-sm">
          <p className="text-muted">Currently ends on <span className="font-medium text-ink">{fmtDateLong(order.end_date)}</span>. Extra days are charged at the rate you booked. Monthly plans keep their monthly rate; daily plans get 10% off for 7+ extra days.</p>
          <div className="flex flex-wrap gap-2">
            {[3, 7, 30].map((n) => (
              <button key={n} type="button" onClick={() => setEnd(addDays(order.end_date, n))}
                className={`h-9 rounded-full border px-4 transition ${end === addDays(order.end_date, n) ? 'border-accent bg-accent text-accent-ink' : 'border-line hover:border-accent'}`}>
                +{n} days
              </button>
            ))}
          </div>
          <Field label="New end date" htmlFor="ext-end">
            <input id="ext-end" type="date" min={addDays(order.end_date, 1)} value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </Field>

          <AnimatePresence mode="wait">
            {error ? (
              <motion.p key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-start gap-2 rounded-xl bg-bad/10 p-3 text-bad"><WarningCircle size={18} className="mt-px shrink-0" /> {error}</motion.p>
            ) : !quote ? <Skeleton key="s" className="h-32" /> : (
              <motion.div key="q" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 rounded-xl bg-surface-2 p-4">
                {quote.lines.map((l) => (
                  <div key={l.id} className="flex justify-between gap-3"><span>{l.qty} x {l.name}, {l.days} extra day{l.days === 1 ? '' : 's'} at {inr(l.rate)}</span><span className="tabular shrink-0">{inr(l.base)}</span></div>
                ))}
                {quote.discount > 0 && <div className="flex justify-between text-ok"><span className="flex items-center gap-1"><Tag size={14} /> Extension discount</span><span className="tabular">- {inr(quote.discount)}</span></div>}
                <div className="flex justify-between"><span className="text-muted">GST (18%)</span><span className="tabular">{inr(quote.gst)}</span></div>
                <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3"><span className="font-medium">Pay now</span><span className="tabular font-display text-2xl font-semibold">{inr(quote.total)}</span></div>
                <p className="text-xs text-muted">Stock is checked for the extra days. Your deposit stays the same.</p>
              </motion.div>
            )}
          </AnimatePresence>
          <Button size="lg" disabled={!quote || !!error} onClick={() => setPaying(true)}>Continue to payment</Button>
        </div>
      </Modal>
      {quote && <PaymentModal open={paying} onClose={() => setPaying(false)} amount={quote.total} onPaid={paid} />}
    </>
  );
}
