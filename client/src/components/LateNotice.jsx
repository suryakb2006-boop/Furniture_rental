import { motion } from 'motion/react';
import { Clock, CheckCircle, Warning } from '@phosphor-icons/react';
import { inr, fmtDate } from '../lib/format.js';
import { cx } from './ui.jsx';

// Deposit settlement: late charges (live while overdue, final once returned) and any damage found at pick-up.
export default function LateNotice({ order }) {
  const l = order.late;
  const dmg = order.damage && order.damage.charge > 0 ? order.damage : null;
  const lateTotal = l?.total || 0;

  if (!lateTotal && !dmg) {
    if (order.status === 'Returned' && order.returned_on) {
      return <p className="flex items-center gap-2 text-sm text-ok"><CheckCircle size={16} weight="fill" /> Returned on time on {fmtDate(order.returned_on)} in good condition. Full deposit of {inr(order.deposit)} refunded.</p>;
    }
    return null;
  }
  const live = l?.accruing;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cx('flex flex-col gap-3 rounded-2xl p-4 text-sm', live ? 'bg-bad/10' : 'bg-warn/12')}>
      {lateTotal > 0 && (
        <div className={cx('flex items-start gap-2 font-medium', live ? 'text-bad' : 'text-warn')}>
          <Clock size={18} className="mt-px shrink-0" />
          {live
            ? <span>Return overdue by {l.days} day{l.days === 1 ? '' : 's'}. Late charges so far: {inr(l.total)}. Adds {inr(l.perDayWithGst)} for each extra day until pick-up.</span>
            : <span>Returned {l.days} day{l.days === 1 ? '' : 's'} late on {fmtDate(l.returnedOn)}. Late charge: {inr(l.total)}.</span>}
        </div>
      )}
      {dmg && (
        <div className="flex items-start gap-2 font-medium text-warn">
          <Warning size={18} className="mt-px shrink-0" />
          <span>{dmg.level === 'Lost' ? 'Item not returned or beyond repair' : `${dmg.level} damage found at pick-up`}{dmg.note ? `: ${dmg.note}` : ''}. Damage charge: {inr(dmg.charge)}.</span>
        </div>
      )}
      <ul className="flex flex-col gap-1 text-ink/85">
        {(l?.lines || []).map((x) => (
          <li key={x.id} className="flex justify-between gap-3">
            <span>Late: {x.qty} x {x.name}, {inr(x.rate)} x {x.days} day{x.days === 1 ? '' : 's'}</span>
            <span className="tabular shrink-0">{inr(x.fee)}</span>
          </li>
        ))}
        {lateTotal > 0 && <li className="flex justify-between gap-3"><span>GST on late charge (18%)</span><span className="tabular">{inr(l.gst)}</span></li>}
        {dmg && <li className="flex justify-between gap-3"><span>Damage ({dmg.level})</span><span className="tabular">{inr(dmg.charge)}</span></li>}
      </ul>
      <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-line/70 pt-2">
        <span>{live ? 'Deposit refund if returned today' : 'Deposit refunded'}: <span className="tabular font-semibold">{inr(l?.refund ?? order.deposit_refund ?? 0)}</span> of {inr(order.deposit)}</span>
        {(l?.due || order.balance_due) > 0 && <span className="font-semibold text-bad">Balance to pay: <span className="tabular">{inr(l?.due || order.balance_due)}</span></span>}
      </div>
    </motion.div>
  );
}
