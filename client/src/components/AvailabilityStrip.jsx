import { motion } from 'motion/react';
import { dayNum, weekday, fmtDateLong } from '../lib/format.js';
import { cx } from './ui.jsx';

// 14-day strip: each cell shows free units; the selected rental period is outlined.
export default function AvailabilityStrip({ days, start, end, qty = 1 }) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1.5 no-scrollbar">
      {days.map((d, i) => {
        const ratio = d.stock ? d.free / d.stock : 0;
        const tone = d.free === 0 ? 'bg-bad/15 text-bad' : d.free < qty || ratio < 0.25 ? 'bg-warn/15 text-warn' : 'bg-ok/12 text-ok';
        const inRange = start && end && d.date >= start && d.date <= end;
        return (
          <motion.div
            key={d.date}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.025 }}
            title={`${fmtDateLong(d.date)}: ${d.free} of ${d.stock} free`}
            className={cx('flex min-w-11 flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs', tone, inRange && 'ring-2 ring-accent ring-offset-2 ring-offset-surface')}
          >
            <span className="opacity-70">{weekday(d.date)}</span>
            <span className="font-semibold text-ink">{dayNum(d.date)}</span>
            <span className="tabular font-medium">{d.free}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
