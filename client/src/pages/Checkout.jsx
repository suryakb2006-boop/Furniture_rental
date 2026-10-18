import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { QrCode, CreditCard, Money, Lock, WarningCircle, CircleNotch } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { inr, quoteLine, totals, fmtRange } from '../lib/format.js';
import { useAuth, useCart, useToast, lastPhone } from '../context/store.jsx';
import { Button, Chip, Field, Modal, inputCls, cx } from '../components/ui.jsx';
import { Summary } from './Cart.jsx';

const METHODS = [
  { id: 'UPI', icon: QrCode, label: 'UPI' },
  { id: 'Card', icon: CreditCard, label: 'Card' },
  { id: 'Cash on delivery', icon: Money, label: 'Cash' },
];

function validate(c) {
  const e = {};
  if (!c.name.trim() || c.name.trim().length < 2) e.name = 'Enter your full name.';
  if (!/^[6-9]\d{9}$/.test(c.phone)) e.phone = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.';
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) e.email = 'Enter a valid email or leave it empty.';
  if (c.address.trim().length < 10) e.address = 'Enter the full address with area and pincode.';
  return e;
}

export function PaymentModal({ open, onClose, amount, onPaid }) {
  const [method, setMethod] = useState('UPI');
  const [f, setF] = useState({ upiId: '', cardNumber: '', expiry: '', cvv: '', name: '' });
  const [state, setState] = useState({ busy: false, error: '' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  const formatExpiry = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };

  const pay = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: '' });
    try {
      const res = await api.pay({ method, amount, ...f, cardNumber: f.cardNumber.replace(/\s/g, '') });
      await onPaid(res);
    } catch (err) {
      setState({ busy: false, error: err.message });
      return;
    }
    setState({ busy: false, error: '' });
  };

  return (
    <Modal open={open} onClose={state.busy ? undefined : onClose} title="Payment">
      <form onSubmit={pay} className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between rounded-xl bg-surface-2 px-4 py-3">
          <span className="text-sm text-muted">Amount</span>
          <span className="tabular font-display text-2xl font-semibold">{inr(amount)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2" role="tablist">
          {METHODS.map((m) => (
            <button type="button" role="tab" aria-selected={method === m.id} key={m.id} onClick={() => { setMethod(m.id); setState({ busy: false, error: '' }); }}
              className={cx('flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm transition', method === m.id ? 'border-accent bg-accent-soft text-accent' : 'border-line hover:border-accent')}>
              <m.icon size={22} /> {m.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={method} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="flex flex-col gap-4">
            {method === 'UPI' && (
              <Field label="UPI ID" htmlFor="p-upi" hint="Demo: any ID like vijay@okaxis works.">
                <input id="p-upi" autoFocus value={f.upiId} onChange={set('upiId')} placeholder="name@okaxis" className={inputCls} />
              </Field>
            )}
            {method === 'Card' && (
              <>
                <Field label="Card number" htmlFor="p-card" hint="Demo: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined.">
                  <input id="p-card" inputMode="numeric" autoFocus value={f.cardNumber} onChange={(e) => setF((x) => ({ ...x, cardNumber: formatCard(e.target.value) }))} placeholder="4242 4242 4242 4242" className={cx(inputCls, 'tabular')} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expiry" htmlFor="p-exp"><input id="p-exp" inputMode="numeric" value={f.expiry} onChange={(e) => setF((x) => ({ ...x, expiry: formatExpiry(e.target.value) }))} placeholder="MM/YY" className={inputCls} /></Field>
                  <Field label="CVV" htmlFor="p-cvv"><input id="p-cvv" inputMode="numeric" type="password" maxLength={3} value={f.cvv} onChange={set('cvv')} placeholder="123" className={inputCls} /></Field>
                </div>
                <Field label="Name on card" htmlFor="p-name"><input id="p-name" value={f.name} onChange={set('name')} className={inputCls} /></Field>
              </>
            )}
            {method === 'Cash on delivery' && (
              <p className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">Pay the full amount, including the refundable deposit, in cash or by UPI when the furniture arrives. Your booking is confirmed right away.</p>
            )}
          </motion.div>
        </AnimatePresence>

        {state.error && (
          <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }} transition={{ duration: 0.4 }} className="flex items-start gap-2 rounded-xl bg-bad/10 p-3 text-sm text-bad">
            <WarningCircle size={18} className="mt-px shrink-0" /> {state.error}
          </motion.p>
        )}

        <Button type="submit" size="lg" disabled={state.busy}>
          {state.busy ? <><CircleNotch size={18} className="animate-spin" /> Processing payment...</> : method === 'Cash on delivery' ? 'Confirm booking' : <>Pay {inr(amount)}</>}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted"><Lock size={14} /> Simulated payment. No real money is charged.</p>
      </form>
    </Modal>
  );
}

export default function Checkout() {
  const cart = useCart();
  const toast = useToast();
  const nav = useNavigate();
  const { user, expire } = useAuth();
  const [c, setC] = useState({ name: user?.name || '', phone: user?.phone || lastPhone.get() || '', email: user?.email || '', address: '', purpose: 'Home' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [checking, setChecking] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [serverTotal, setServerTotal] = useState(null);

  const priced = useMemo(() => cart.lines.map((l) => ({ ...l, ...quoteLine(l, l.qty, l.start, l.end, l.bundlePct) })), [cart.lines]);
  const t = totals(priced);
  const payload = cart.lines.map((l) => ({ furnitureId: l.furnitureId, qty: l.qty, start: l.start, end: l.end, bundleId: l.bundleId }));

  if (!cart.lines.length && !payOpen) return <Navigate to="/cart" replace />;

  const set = (k) => (e) => setC((x) => ({ ...x, [k]: e.target.value }));

  const proceed = async (e) => {
    e.preventDefault();
    const errs = validate(c);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setChecking(true);
    setServerError('');
    try {
      const q = await api.quote(payload); // final stock check + server-side prices
      setServerTotal(q.totals.total);
      setPayOpen(true);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const onPaid = async (payment) => {
    try {
      const order = await api.placeOrder({ customer: c, lines: payload, payment: { ref: payment.ref } });
      lastPhone.set(c.phone);
      cart.clear();
      toast(`Booking ${order.order_code} confirmed`);
      nav(`/order/${order.order_code}`, { state: { order, fresh: true } });
    } catch (err) {
      setPayOpen(false);
      if (err.status === 401) { expire(); return; }
      setServerError(err.message + (payment.status === 'Paid' ? ' Your simulated payment was not captured.' : ''));
      throw err;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold md:text-4xl">Checkout</h1>
      <p className="mt-2 text-muted">Booking as <span className="font-medium text-ink">{user?.name}</span>. The booking is saved to your account.</p>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <form id="checkout" onSubmit={proceed} noValidate className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">What is this rental for?</h2>
            <div className="flex flex-wrap gap-2">
              {['Home', 'Office', 'Event'].map((p) => <Chip key={p} active={c.purpose === p} onClick={() => setC((x) => ({ ...x, purpose: p }))}>{p}</Chip>)}
            </div>
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <h2 className="text-lg font-semibold sm:col-span-2">Contact and delivery</h2>
            <Field label="Full name" htmlFor="c-name" error={errors.name}><input id="c-name" autoComplete="name" value={c.name} onChange={set('name')} className={inputCls} /></Field>
            <Field label="Mobile number" htmlFor="c-phone" error={errors.phone} hint="Used to look up your bookings later.">
              <input id="c-phone" inputMode="numeric" autoComplete="tel" maxLength={10} value={c.phone} onChange={(e) => setC((x) => ({ ...x, phone: e.target.value.replace(/\D/g, '') }))} placeholder="98xxxxxxxx" className={inputCls} />
            </Field>
            <Field label="Email (optional)" htmlFor="c-email" error={errors.email} className="sm:col-span-2"><input id="c-email" type="email" autoComplete="email" value={c.email} onChange={set('email')} className={inputCls} /></Field>
            <Field label={c.purpose === 'Event' ? 'Venue address' : 'Delivery address'} htmlFor="c-addr" error={errors.address} className="sm:col-span-2">
              <textarea id="c-addr" rows={3} value={c.address} onChange={set('address')} placeholder="Door no, street, area, city, pincode" className={cx(inputCls, 'h-auto py-3')} />
            </Field>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Items</h2>
            <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
              {priced.map((l) => (
                <li key={l.key} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="min-w-0"><span className="font-medium">{l.qty} x {l.name}</span><br /><span className="text-muted">{fmtRange(l.start, l.end)}, {l.days} day{l.days > 1 ? 's' : ''}</span></span>
                  <span className="tabular shrink-0">{inr(l.rent)}</span>
                </li>
              ))}
            </ul>
            <Link to="/cart" className="text-sm text-accent hover:underline">Edit cart</Link>
          </section>
        </form>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Summary t={t}>
            {serverError && <p className="flex items-start gap-2 rounded-xl bg-bad/10 p-3 text-sm text-bad"><WarningCircle size={18} className="mt-px shrink-0" /> {serverError}</p>}
            <Button type="submit" form="checkout" size="lg" disabled={checking}>{checking ? 'Checking stock...' : 'Continue to payment'}</Button>
          </Summary>
        </div>
      </div>

      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} amount={serverTotal ?? t.total} onPaid={onPaid} />
    </div>
  );
}
