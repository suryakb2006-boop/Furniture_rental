import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { Truck, ArrowCounterClockwise, WarningCircle, Wrench, BellRinging, ChatText, Envelope } from '@phosphor-icons/react';
import { api } from '../../lib/api.js';
import { inr, fmtRange, fmtDate } from '../../lib/format.js';
import { useToast } from '../../context/store.jsx';
import { Badge, Button, CountUp, Skeleton, STATUS_TONE, reveal, stagger } from '../../components/ui.jsx';

function ActionList({ title, icon: Icon, tone, orders, action, onAction, empty, dateOf }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 font-semibold"><Icon size={18} className={tone} /> {title} <span className="tabular text-sm font-normal text-muted">({orders.length})</span></h3>
      {orders.length === 0 ? <p className="text-sm text-muted">{empty}</p> : (
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium"><span className="tabular">{o.order_code}</span> <span className="text-muted">{o.customer_name}</span></div>
                <div className="text-xs text-muted">{dateOf(o)}, {((n) => `${n} unit${n === 1 ? '' : 's'}`)(o.items.reduce((s, i) => s + i.qty, 0))}</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onAction(o, action)}>Mark {action.toLowerCase()}</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { onAuthError } = useOutletContext();
  const toast = useToast();
  const [s, setS] = useState(null);
  const load = useCallback(() => api.admin.stats().then(setS).catch((e) => (e.status === 401 ? onAuthError() : toast(e.message, 'bad'))), [onAuthError, toast]);
  useEffect(() => { load(); }, [load]);
  const [log, setLog] = useState(null);
  const loadLog = useCallback(() => api.admin.notifications().then(setLog).catch(() => setLog([])), []);
  useEffect(() => { loadLog(); }, [loadLog]);
  const runNow = async () => {
    try { const r = await api.admin.runReminders(); toast(r.sent ? `Sent ${r.sent} reminder${r.sent === 1 ? '' : 's'}` : 'All reminders for today were already sent'); loadLog(); } catch (e) { toast(e.message, 'bad'); }
  };

  const act = async (o, status) => {
    try {
      const u = await api.admin.setStatus(o.id, status);
      toast(u.late?.total ? `${o.order_code} returned ${u.late.days} day${u.late.days === 1 ? '' : 's'} late. Late charge ${inr(u.late.total)} taken from the deposit.` : `${o.order_code} marked ${status.toLowerCase()}`);
      load();
    } catch (e) { toast(e.message, 'bad'); }
  };

  if (!s) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;

  const maxCat = Math.max(1, ...s.revenueByCategory.map((c) => c.revenue));
  const kpis = [
    { label: 'Rental revenue', value: s.revenue, format: inr, note: [s.extensionRevenue && `${inr(s.extensionRevenue)} from extensions`, s.lateCollected && `${inr(s.lateCollected)} late fees`, s.damageRecovered && `${inr(s.damageRecovered)} damage recovered`].filter(Boolean).join(', ') || 'Excludes GST and deposits' },
    { label: 'Active rentals', value: s.activeRentals, note: `${s.unitsOut.toLocaleString('en-IN')} units out today` },
    { label: 'Listings in use today', value: s.utilization, format: (n) => n.toFixed(1) + '%', note: `${s.listingsInUse} of ${s.listings} listings` },
    { label: 'Returns due in 3 days', value: s.returnsDue.length, note: s.overdue.length ? `${s.overdue.length} overdue, ${inr(s.lateAccruing)} late fees building` : 'None overdue', alert: s.overdue.length > 0 },
  ];

  return (
    <div className="flex flex-col gap-10">
      <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <motion.div key={k.label} variants={reveal} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <span className="text-sm text-muted">{k.label}</span>
            <CountUp value={k.value} format={k.format} className="font-display text-3xl font-semibold" />
            <span className={k.alert ? 'text-xs font-medium text-bad' : 'text-xs text-muted'}>{k.note}</span>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Revenue by category</h2>
          <ul className="flex flex-col gap-3">
            {s.revenueByCategory.map((c, i) => (
              <li key={c.category} className="grid grid-cols-[80px_1fr_auto] items-center gap-3 text-sm">
                <span className="text-muted">{c.category}</span>
                <motion.span initial={{ width: 0 }} animate={{ width: `${(c.revenue / maxCat) * 100}%` }} transition={{ duration: 0.9, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }} className="h-3 rounded-full bg-accent" />
                <span className="tabular w-20 text-right font-medium">{inr(c.revenue)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {['Confirmed', 'Delivered', 'Returned', 'Cancelled'].map((st) => (
              <Link key={st} to={`/admin/orders?status=${st}`}><Badge tone={STATUS_TONE[st]} className="px-3 py-1 text-sm">{st}: <span className="tabular">{s.byStatus[st] || 0}</span></Badge></Link>
            ))}
            {s.maintenance > 0 && <Link to="/admin/listings"><Badge tone="warn" className="px-3 py-1 text-sm"><Wrench size={13} /> {s.maintenance} in maintenance</Badge></Link>}
          </div>
        </section>

        <section className="flex flex-col gap-8">
          {s.overdue.length > 0 && (
            <ActionList title="Overdue returns" icon={WarningCircle} tone="text-bad" orders={s.overdue} action="Returned" onAction={act} empty="" dateOf={(o) => `Was due ${fmtDate(o.end_date)}, ${o.late.days} day${o.late.days === 1 ? '' : 's'} late, ${inr(o.late.total)} so far`} />
          )}
          <ActionList title="Deliveries due" icon={Truck} tone="text-accent" orders={s.deliveriesDue} action="Delivered" onAction={act} empty="No deliveries in the next 5 days." dateOf={(o) => `Deliver ${fmtDate(o.start_date)}`} />
          <ActionList title="Returns due" icon={ArrowCounterClockwise} tone="text-warn" orders={s.returnsDue} action="Returned" onAction={act} empty="No pick-ups in the next 3 days." dateOf={(o) => `Pick up ${fmtDate(o.end_date)} (${fmtRange(o.start_date, o.end_date)})`} />
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold"><BellRinging size={22} className="text-accent" /> Customer reminders</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">Sent automatically every 30 minutes: delivery tomorrow, rental ends in 2 days, pick-up tomorrow, ends today, and a daily overdue notice with the late charge so far. Each goes in-app, by SMS and by email, once.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={runNow}>Run reminders now</Button>
        </div>
        {!log ? <Skeleton className="h-40" /> : log.length === 0 ? <p className="text-sm text-muted">No reminders sent yet.</p> : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs text-muted"><tr className="border-b border-line"><th className="px-4 py-3 font-medium">Sent</th><th className="px-3 py-3 font-medium">Customer</th><th className="px-3 py-3 font-medium">Message</th><th className="px-4 py-3 font-medium">Channels</th></tr></thead>
              <tbody>
                {log.slice(0, 12).map((n) => (
                  <tr key={n.id} className="border-b border-line last:border-0 align-top">
                    <td className="tabular whitespace-nowrap px-4 py-3 text-muted">{n.created_at.slice(5, 16).replace('-', '/')}</td>
                    <td className="px-3 py-3"><div className="font-medium">{n.customer_name}</div><div className="tabular text-xs text-muted">{n.order_code}, {n.phone}</div></td>
                    <td className="px-3 py-3"><div className="font-medium">{n.title}</div><div className="text-xs text-muted">{n.body}</div></td>
                    <td className="px-4 py-3"><div className="flex gap-1.5 text-muted" title={n.channels}><BellRinging size={16} /><ChatText size={16} />{n.channels?.includes('Email') && <Envelope size={16} />}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
