import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Truck, CalendarCheck, Clock, WarningCircle, CheckCircle, ArrowCounterClockwise, CalendarPlus, XCircle } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { useAuth, useToast } from '../context/store.jsx';
import { cx } from './ui.jsx';

const ICON = {
  booked: [CheckCircle, 'text-ok'], extended: [CalendarPlus, 'text-accent'], delivered: [Truck, 'text-ok'],
  returned: [ArrowCounterClockwise, 'text-ok'], cancelled: [XCircle, 'text-muted'], delivery_tomorrow: [Truck, 'text-accent'],
  due_soon: [CalendarCheck, 'text-accent'], due_tomorrow: [Clock, 'text-warn'], due_today: [Clock, 'text-warn'], overdue: [WarningCircle, 'text-bad'],
};

function ago(ts) {
  const d = new Date(ts.replace(' ', 'T'));
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Bell with unread count. Checks for new reminders every minute and shows a toast when one arrives.
export default function NotificationBell() {
  const { user, expire } = useAuth();
  const toast = useToast();
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const seen = useRef(null);

  const load = useCallback(() => {
    api.notifications().then((d) => {
      // Toast only notifications this browser has not announced before (remembered across page loads).
      let last = 0;
      try { last = Number(localStorage.getItem('rr_last_notice') || 0); } catch { /* ignore */ }
      const fresh = d.items.filter((n) => n.id > last && !n.read_at);
      if (fresh.length === 1) toast(fresh[0].title);
      else if (fresh.length > 1) toast(`You have ${fresh.length} new updates about your rentals`);
      const max = Math.max(last, ...d.items.map((n) => n.id));
      try { localStorage.setItem('rr_last_notice', String(max)); } catch { /* ignore */ }
      seen.current = true;
      setData(d);
    }).catch((e) => { if (e.status === 401) expire(); });
  }, [toast, expire]);

  useEffect(() => {
    if (!user) return;
    seen.current = null;
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [user, load]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && data.unread) {
      setTimeout(() => { api.readNotifications().catch(() => {}); setData((d) => ({ ...d, unread: 0, items: d.items.map((n) => ({ ...n, read_at: n.read_at || 'now' })) })); }, 1200);
    }
  };

  if (!user) return null;
  return (
    <div className="relative">
      <button onClick={toggle} aria-expanded={open} aria-label={`Notifications, ${data.unread} unread`} className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-surface-2">
        <motion.span animate={data.unread ? { rotate: [0, -16, 14, -10, 6, 0] } : {}} transition={{ duration: 0.8, repeat: data.unread ? Infinity : 0, repeatDelay: 6 }} className="grid place-items-center">
          <Bell size={21} weight={data.unread ? 'fill' : 'regular'} />
        </motion.span>
        <AnimatePresence>
          {data.unread > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="tabular absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1 text-[11px] font-semibold text-white">{data.unread}</motion.span>
          )}
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.18 }}
              className="fixed inset-x-3 top-16 z-50 max-h-[70dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-lift sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="font-semibold">Notifications</span>
                <span className="text-xs text-muted">Also sent by SMS and email</span>
              </div>
              {data.items.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted">No updates yet. Reminders appear here before your pick-up date.</p> : (
                <ul className="flex flex-col">
                  {data.items.map((n, i) => {
                    const [Icon, tone] = ICON[n.type] || [Bell, 'text-muted'];
                    return (
                      <motion.li key={n.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                        <Link to="/bookings" onClick={() => setOpen(false)} className={cx('flex gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface-2', !n.read_at && 'bg-accent-soft/50')}>
                          <Icon size={20} weight="fill" className={cx('mt-0.5 shrink-0', tone)} />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-sm font-medium leading-snug">{n.title}</span>
                            <span className="text-xs leading-relaxed text-muted">{n.body}</span>
                            <span className="text-[11px] text-muted/80">{ago(n.created_at)}</span>
                          </span>
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
