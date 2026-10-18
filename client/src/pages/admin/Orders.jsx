import { useCallback, useEffect, useState } from 'react';
import LateNotice from '../../components/LateNotice.jsx';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Receipt, DownloadSimple } from '@phosphor-icons/react';
import { api } from '../../lib/api.js';
import { inr, fmtRange, fmtDate, today } from '../../lib/format.js';
import { useToast } from '../../context/store.jsx';
import { Badge, Button, Chip, EmptyState, Field, ItemImage, Modal, Skeleton, STATUS_TONE, inputCls } from '../../components/ui.jsx';

const FILTERS = ['All', 'Confirmed', 'Delivered', 'Returned', 'Cancelled'];
const NEXT = { Confirmed: ['Delivered', 'Cancelled'], Delivered: ['Returned'], Returned: [], Cancelled: [] };

function Actions({ o, onSet, size = 'sm' }) {
  return (
    <div className="flex justify-end gap-1.5">
      {NEXT[o.status].map((s) => (
        <Button key={s} size={size} variant={s === 'Cancelled' ? 'danger' : 'secondary'} onClick={(e) => { e.stopPropagation(); onSet(o, s); }}>
          {s === 'Delivered' ? 'Mark delivered' : s === 'Returned' ? 'Mark returned' : 'Cancel'}
        </Button>
      ))}
      {NEXT[o.status].length === 0 && <span className="text-xs text-muted">Closed</span>}
    </div>
  );
}

const DAMAGE = [
  { level: 'None', label: 'Good condition' },
  { level: 'Minor', label: 'Minor damage' },
  { level: 'Major', label: 'Major damage' },
  { level: 'Lost', label: 'Lost or broken' },
];

// Pick-up check: actual return date, condition of the furniture, and the resulting deposit settlement.
function ReturnPanel({ order, onReturn }) {
  const [date, setDate] = useState(today());
  const [level, setLevel] = useState('None');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [maintenance, setMaintenance] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    const t = setTimeout(() => {
      api.admin.latePreview(order.id, { returned_on: date, damage_level: level, damage_charge: amount })
        .then(setPreview).catch((e) => { setPreview(null); setError(e.message); });
    }, 200);
    return () => clearTimeout(t);
  }, [order.id, date, level, amount]);

  const pickLevel = (lv) => { setLevel(lv); setAmount(''); setMaintenance(lv === 'Major' || lv === 'Lost'); };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line p-4">
      <h3 className="font-semibold">Pick-up check</h3>
      <Field label="Returned on" htmlFor="ret-date"><input id="ret-date" type="date" max={today()} min={order.start_date} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
      <Field label="Condition at pick-up">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DAMAGE.map((d) => (
            <button key={d.level} type="button" onClick={() => pickLevel(d.level)} aria-pressed={level === d.level}
              className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left text-sm transition ${level === d.level ? 'border-accent bg-accent-soft text-accent' : 'border-line hover:border-accent'}`}>
              <span className="font-medium">{d.label}</span>
              <span className="tabular text-xs opacity-80">{preview?.presets ? (d.level === 'None' ? 'No charge' : inr(preview.presets[d.level])) : ' '}</span>
            </button>
          ))}
        </div>
      </Field>
      {level !== 'None' && (
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <Field label="Damage charge (₹)" htmlFor="dmg-amt" hint="Pre-filled from the level. Edit if needed.">
            <input id="dmg-amt" type="number" min="0" value={amount === '' ? (preview?.damage?.charge ?? '') : amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </Field>
          <Field label="What was damaged?" htmlFor="dmg-note"><input id="dmg-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. torn seat fabric on one chair" className={inputCls} /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Send these items for maintenance (they stop being bookable until you set them Available)
          </label>
        </div>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      {preview && (
        <div className="grid gap-1 rounded-xl bg-surface-2 p-3 text-sm">
          <div className="flex justify-between"><span className="text-muted">Deposit held</span><span className="tabular">{inr(preview.deposit)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Late charge ({preview.days} day{preview.days === 1 ? '' : 's'}, incl. GST)</span><span className="tabular">- {inr(preview.total)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Damage charge</span><span className="tabular">- {inr(preview.damage.charge)}</span></div>
          <div className="mt-1 flex justify-between border-t border-line pt-2 font-semibold"><span>Refund to customer</span><span className="tabular text-ok">{inr(preview.refund)}</span></div>
          {preview.due > 0 && <div className="flex justify-between font-semibold text-bad"><span>Balance to collect</span><span className="tabular">{inr(preview.due)}</span></div>}
        </div>
      )}
      <Button disabled={!!error || !preview} onClick={() => onReturn(order, { returned_on: date, damage_level: level, damage_charge: amount === '' ? undefined : amount, damage_note: note, maintenance })}>
        Confirm return
      </Button>
    </div>
  );
}

export default function Orders() {
  const { onAuthError } = useOutletContext();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') || 'All';
  const [orders, setOrders] = useState(null);
  const [open, setOpen] = useState(null);

  const fail = useCallback((e) => (e.status === 401 ? onAuthError() : toast(e.message, 'bad')), [onAuthError, toast]);
  const load = useCallback(() => api.admin.orders(status).then(setOrders).catch(fail), [status, fail]);
  useEffect(() => { setOrders(null); load(); }, [load]);

  const setStatus = async (o, next, extra) => {
    try {
      const updated = await api.admin.setStatus(o.id, next, extra);
      toast(next === 'Returned'
        ? `${o.order_code} returned. Deposit refund ${inr(updated.deposit_refund)}${updated.balance_due ? `, balance to collect ${inr(updated.balance_due)}` : ''}.`
        : `${o.order_code} is now ${next.toLowerCase()}${next === 'Cancelled' ? '. Stock released.' : ''}`);
      if (open?.id === o.id) setOpen(updated);
      load();
    } catch (e) { fail(e); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => <Chip key={f} active={status === f} onClick={() => setSp(f === 'All' ? {} : { status: f })}>{f}</Chip>)}
        </div>
        <Button variant="secondary" size="sm" onClick={async () => { try { toast(`Downloaded ${await api.admin.download('orders.csv')}`); } catch (e) { fail(e); } }}><DownloadSimple size={16} /> Export orders CSV</Button>
      </div>

      {!orders ? <Skeleton className="h-80" /> : orders.length === 0 ? (
        <EmptyState icon={Receipt} title={`No ${status === 'All' ? '' : status.toLowerCase() + ' '}orders`} body="Orders appear here as soon as customers book." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-medium">Order</th><th className="px-3 py-3 font-medium">Customer</th><th className="px-3 py-3 font-medium">Rental period</th>
                <th className="px-3 py-3 font-medium">Items</th><th className="px-3 py-3 font-medium">Total</th><th className="px-3 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => (
                <motion.tr key={o.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} onClick={() => setOpen(o)} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3"><div className="tabular font-semibold">{o.order_code}</div><div className="text-xs text-muted">{o.purpose}, booked {fmtDate(o.created_at.slice(0, 10))}</div></td>
                  <td className="px-3 py-3"><div>{o.customer_name}</div><div className="tabular text-xs text-muted">{o.phone}</div></td>
                  <td className="px-3 py-3">{fmtRange(o.start_date, o.end_date)}</td>
                  <td className="tabular px-3 py-3">{((n) => `${n} unit${n === 1 ? '' : 's'}`)(o.items.reduce((s, i) => s + i.qty, 0))}</td>
                  <td className="px-3 py-3"><div className="tabular font-medium">{inr(o.total)}</div><div className="text-xs text-muted">{o.payment_method}, {o.payment_status}</div></td>
                  <td className="px-3 py-3"><div className="flex flex-col items-start gap-1"><Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>{o.overdue && <Badge tone="bad">{o.late.days}d late, {inr(o.late.total)}</Badge>}{o.status === 'Returned' && o.late?.total > 0 && <Badge tone="warn">Late fee {inr(o.late.total)}</Badge>}{o.damage?.charge > 0 && <Badge tone="warn">{o.damage.level} damage {inr(o.damage.charge)}</Badge>}{o.extensions?.length > 0 && <Badge tone="accent">Extended</Badge>}</div></td>
                  <td className="px-4 py-3"><Actions o={o} onSet={setStatus} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Order ${open.order_code}` : ''} wide>
        {open && (
          <div className="flex flex-col gap-5 text-sm">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={STATUS_TONE[open.status]}>{open.status}</Badge>{open.overdue && <Badge tone="bad">Return overdue</Badge>}<span className="text-muted">{open.purpose} rental, booked {open.created_at}</span></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><div className="text-muted">Customer</div><div className="font-medium">{open.customer_name}</div><div className="tabular">{open.phone}</div>{open.email && <div>{open.email}</div>}</div>
              <div><div className="text-muted">Address</div><div>{open.address}</div></div>
            </div>
            <ul className="flex flex-col divide-y divide-line border-y border-line">
              {open.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3">
                  <ItemImage item={i} className="h-12 w-14 shrink-0" rounded="rounded-xl" />
                  <div className="min-w-0 flex-1"><div className="font-medium">{i.qty} x {i.name}</div><div className="text-muted">{fmtRange(i.start_date, i.end_date)}, {i.days} days</div></div>
                  <span className="tabular">{inr(i.rent)}</span>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:ml-auto sm:w-72">
              <span className="text-muted">Rent</span><span className="tabular text-right">{inr(open.subtotal)}</span>
              <span className="text-muted">GST</span><span className="tabular text-right">{inr(open.gst)}</span>
              <span className="text-muted">Delivery</span><span className="tabular text-right">{inr(open.delivery)}</span>
              <span className="text-muted">Deposit</span><span className="tabular text-right">{inr(open.deposit)}</span>
              <span className="font-semibold">Total</span><span className="tabular text-right font-semibold">{inr(open.total)}</span>
              <span className="text-muted">Payment</span><span className="text-right">{open.payment_method}, {open.payment_status}</span>
              <span className="text-muted">Reference</span><span className="tabular text-right">{open.payment_ref}</span>
            </div>
            {open.status !== 'Cancelled' && <a href={`/invoice/${open.order_code}`} target="_blank" rel="noreferrer" className="w-fit text-sm font-medium text-accent hover:underline">Open GST invoice</a>}
            <LateNotice order={open} />
            {open.status === 'Delivered'
              ? <ReturnPanel key={open.id} order={open} onReturn={(o, extra) => setStatus(o, 'Returned', extra)} />
              : <div className="border-t border-line pt-4"><Actions o={open} onSet={setStatus} size="md" /></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
