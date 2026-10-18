import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Receipt, Check, WarningCircle } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import LateNotice from '../components/LateNotice.jsx';
import ExtendRental from '../components/ExtendRental.jsx';
import RateItems from '../components/RateItems.jsx';
import { FileText } from '@phosphor-icons/react';
import { inr, fmtRange, fmtDate, today } from '../lib/format.js';
import { useAuth, useToast } from '../context/store.jsx';
import { Badge, Button, EmptyState, ItemImage, Skeleton, STATUS_TONE, reveal, stagger, cx } from '../components/ui.jsx';

const FLOW = ['Confirmed', 'Delivered', 'Returned'];

function Timeline({ status }) {
  if (status === 'Cancelled') return <Badge tone="bad">Cancelled</Badge>;
  const at = FLOW.indexOf(status);
  return (
    <ol className="flex items-center gap-2 text-xs">
      {FLOW.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={cx('flex items-center gap-1.5', i <= at ? 'text-ink' : 'text-muted')}>
            <span className={cx('grid h-5 w-5 place-items-center rounded-full', i <= at ? 'bg-accent text-accent-ink' : 'border border-line')}>{i <= at && <Check size={11} weight="bold" />}</span>
            {s}
          </span>
          {i < FLOW.length - 1 && <span className={cx('h-px w-6', i < at ? 'bg-accent' : 'bg-line')} />}
        </li>
      ))}
    </ol>
  );
}

export default function MyBookings() {
  const toast = useToast();
  const { user, expire } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    api.myOrders().then(setOrders).catch((e) => { if (e.status === 401) expire(); else { setError(e.message); setOrders([]); } });
  }, [expire]);
  const loading = orders === null;
  const active = (orders || []).filter((o) => o.status === 'Confirmed' || o.status === 'Delivered').length;

  const cancel = async (o) => {
    try {
      const updated = await api.cancelOrder(o.id);
      setOrders((os) => os.map((x) => (x.id === o.id ? updated : x)));
      toast(`${o.order_code} cancelled. ${updated.payment_status === 'Refunded' ? 'Refund initiated.' : ''}`);
    } catch (e) { toast(e.message, 'bad'); }
    setConfirmId(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-8 pt-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">My bookings</h1>
          <p className="mt-2 text-muted">Hi {user.name.split(' ')[0]}, {loading ? 'loading your rentals...' : `you have ${active} active rental${active === 1 ? '' : 's'} and ${orders.length} booking${orders.length === 1 ? '' : 's'} in total.`}</p>
        </div>
        <div className="text-right text-sm text-muted"><div>{user.email}</div><div className="tabular">{user.phone}</div></div>
      </div>
      {error && <p className="mt-3 flex items-center gap-2 text-sm text-bad"><WarningCircle size={16} /> {error}</p>}

      <div className="mt-10">
        {loading ? (
          <div className="flex flex-col gap-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
        ) : orders && orders.length === 0 ? (
          <EmptyState icon={Receipt} title="No bookings for this number" body="Check the number, or book your first rental." action={<Button as={Link} to="/browse">Browse furniture</Button>} />
        ) : orders && (
          <motion.ul variants={stagger(0.08)} initial="hidden" animate="show" className="flex flex-col gap-5">
            {orders.map((o) => {
              const cancellable = o.status === 'Confirmed' && o.start_date > today();
              return (
                <motion.li key={o.id} variants={reveal} layout className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link to={`/order/${o.order_code}`} className="tabular font-display text-lg font-semibold hover:text-accent">{o.order_code}</Link>
                      <p className="text-sm text-muted">{o.purpose} rental, {fmtRange(o.start_date, o.end_date)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="tabular font-semibold">{inr(o.total)}</span>
                      <span className="text-xs text-muted">{o.payment_method}, {o.payment_status}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {o.items.map((i) => (
                      <div key={i.id} className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-3 text-sm">
                        <ItemImage item={i} className="h-8 w-8" rounded="rounded-full" /> {i.qty} x {i.name}
                      </div>
                    ))}
                  </div>
                  {o.extensions?.length > 0 && (
                    <ul className="flex flex-col gap-1 text-sm text-muted">
                      {o.extensions.map((x) => (
                        <li key={x.id}>Extended from {fmtDate(x.old_end)} to <span className="font-medium text-ink">{fmtDate(x.new_end)}</span>, {x.extra_days} extra day{x.extra_days === 1 ? '' : 's'}, paid {inr(x.rent + x.gst)} by {x.payment_method}</li>
                      ))}
                    </ul>
                  )}
                  <LateNotice order={o} />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <div className="flex items-center gap-3"><Timeline status={o.status} />{o.overdue && <Badge tone="bad">Return overdue</Badge>}</div>
                    <div className="flex flex-wrap items-center gap-2">
                    <RateItems order={o} onDone={(u) => setOrders((os) => os.map((x) => (x.id === u.id ? u : x)))} />
                    {o.status !== 'Cancelled' && <Button as={Link} to={`/invoice/${o.order_code}`} size="sm" variant="ghost"><FileText size={16} /> Invoice</Button>}
                    {o.can_extend && <ExtendRental order={o} onExtended={(u) => setOrders((os) => os.map((x) => (x.id === u.id ? u : x)))} />}
                    {cancellable && (
                      <AnimatePresence mode="wait">
                        {confirmId === o.id ? (
                          <motion.div key="c" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                            <span className="text-sm text-muted">Cancel this booking?</span>
                            <Button size="sm" variant="danger" onClick={() => cancel(o)}>Yes, cancel</Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>Keep it</Button>
                          </motion.div>
                        ) : (
                          <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Button size="sm" variant="secondary" onClick={() => setConfirmId(o.id)}>Cancel booking</Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>
    </div>
  );
}
