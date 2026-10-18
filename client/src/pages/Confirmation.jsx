import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, Truck, CalendarBlank, MapPin, Receipt } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/store.jsx';
import LateNotice from '../components/LateNotice.jsx';
import { inr, fmtRange, fmtDateLong } from '../lib/format.js';
import { Badge, Button, ItemImage, Skeleton, STATUS_TONE } from '../components/ui.jsx';

export default function Confirmation() {
  const { code } = useParams();
  const { state } = useLocation();
  const [order, setOrder] = useState(state?.order || null);
  const [error, setError] = useState('');
  const fresh = !!state?.fresh;
  const { expire } = useAuth();

  useEffect(() => { if (!order) api.orderByCode(code).then(setOrder).catch((e) => (e.status === 401 ? expire() : setError(e.message))); }, [code, order, expire]);

  if (error) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-3xl font-semibold">Order not found</h1><p className="mt-2 text-muted">{error}</p></div>;
  if (!order) return <div className="mx-auto max-w-3xl px-4 py-16"><Skeleton className="h-96" /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-12 sm:px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <motion.div
          initial={fresh ? { scale: 0, rotate: -45 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
          className="relative grid h-20 w-20 place-items-center rounded-full bg-accent text-accent-ink"
        >
          {fresh && <motion.span className="absolute inset-0 rounded-full bg-accent" initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 1.9, opacity: 0 }} transition={{ duration: 1.1, delay: 0.3 }} />}
          <Check size={40} weight="bold" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-semibold md:text-4xl">{order.status === 'Cancelled' ? 'Booking cancelled' : 'Your booking is confirmed'}</h1>
          <p className="text-muted">Order <span className="tabular font-semibold text-ink">{order.order_code}</span>. We will call {order.phone} a day before delivery.</p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-10 flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6 shadow-soft">
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div className="flex gap-3"><CalendarBlank size={20} className="shrink-0 text-accent" /><div><div className="text-muted">Rental period</div><div className="font-medium">{fmtRange(order.start_date, order.end_date)}</div></div></div>
          <div className="flex gap-3"><Truck size={20} className="shrink-0 text-accent" /><div><div className="text-muted">Delivery on</div><div className="font-medium">{fmtDateLong(order.start_date)}</div></div></div>
          <div className="flex gap-3"><Receipt size={20} className="shrink-0 text-accent" /><div><div className="text-muted">Payment</div><div className="font-medium">{order.payment_method}, <Badge tone={order.payment_status === 'Paid' ? 'ok' : 'warn'}>{order.payment_status}</Badge></div></div></div>
        </div>
        <div className="flex gap-3 text-sm"><MapPin size={20} className="shrink-0 text-accent" /><div><div className="text-muted">Address</div><div>{order.address}</div></div></div>

        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-3">
              <ItemImage item={i} className="h-14 w-16 shrink-0" rounded="rounded-xl" />
              <div className="min-w-0 flex-1 text-sm"><div className="font-medium">{i.qty} x {i.name}</div><div className="text-muted">{fmtRange(i.start_date, i.end_date)}, {i.days} day{i.days > 1 ? 's' : ''}</div></div>
              <span className="tabular text-sm">{inr(i.rent)}</span>
            </li>
          ))}
        </ul>

        <dl className="ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
          {order.discount > 0 && <div className="flex justify-between text-ok"><dt>Savings vs daily price</dt><dd className="tabular">- {inr(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">Rent</dt><dd className="tabular">{inr(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">GST</dt><dd className="tabular">{inr(order.gst)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular">{order.delivery ? inr(order.delivery) : 'Free'}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Deposit (refundable)</dt><dd className="tabular">{inr(order.deposit)}</dd></div>
          <div className="mt-1 flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd className="tabular">{inr(order.total)}</dd></div>
        </dl>
        <LateNotice order={order} />
        <div className="flex items-center gap-2 text-sm"><span className="text-muted">Status</span><Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge></div>
      </motion.div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button as={Link} to="/bookings">View my bookings</Button>
        <Button as={Link} to={`/invoice/${order.order_code}`} variant="secondary">Download invoice</Button>
        <Button as={Link} to="/browse" variant="secondary">Keep browsing</Button>
      </div>
    </div>
  );
}
