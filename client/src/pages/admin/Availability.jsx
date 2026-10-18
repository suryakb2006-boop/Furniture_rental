import { Fragment, useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { api } from '../../lib/api.js';
import { today, dayNum, weekday, fmtDateLong, addDays } from '../../lib/format.js';
import { useToast } from '../../context/store.jsx';
import { Button, Skeleton, inputCls, cx } from '../../components/ui.jsx';

function cellTone(d, stock, status) {
  if (status !== 'Available') return 'bg-surface-2 text-muted';
  if (d.free === 0) return 'bg-bad/20 text-bad';
  const r = d.free / stock;
  if (r < 0.5) return 'bg-warn/20 text-warn';
  return 'bg-ok/14 text-ok';
}

export default function Availability() {
  const { onAuthError } = useOutletContext();
  const toast = useToast();
  const [from, setFrom] = useState(today());
  const [data, setData] = useState(null);
  const load = useCallback(() => {
    setData(null);
    api.admin.availability(from, 14).then(setData).catch((e) => (e.status === 401 ? onAuthError() : toast(e.message, 'bad')));
  }, [from, onAuthError, toast]);
  useEffect(() => { load(); }, [load]);

  let lastCat = '';
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">Starting
            <input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className={cx(inputCls, 'w-44')} />
          </label>
          <Button variant="ghost" onClick={() => setFrom(addDays(from, -14))}>Earlier</Button>
          <Button variant="ghost" onClick={() => setFrom(addDays(from, 14))}>Later</Button>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-ok/30" /> Mostly free</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-warn/40" /> Under half free</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-bad/40" /> Fully booked</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-surface-2 ring-1 ring-line" /> Maintenance</span>
        </div>
      </div>
      <p className="text-sm text-muted">Each cell shows units free out of total stock for that day.</p>

      {!data ? <Skeleton className="h-[480px]" /> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[980px] border-separate border-spacing-1 p-2 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-surface px-2 py-2 text-left font-medium text-muted">Item</th>
                {data.dates.map((d) => (
                  <th key={d} title={fmtDateLong(d)} className={cx('w-12 py-1 font-medium', d === today() ? 'text-accent' : 'text-muted')}>
                    <div>{weekday(d)}</div><div className="text-sm text-ink">{dayNum(d)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, r) => {
                const header = it.category !== lastCat;
                lastCat = it.category;
                return (
                  <Fragment key={it.id}>
                    {header && <tr><td colSpan={data.dates.length + 1} className="sticky left-0 px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{it.category}</td></tr>}
                    <tr>
                      <td className="sticky left-0 z-10 max-w-52 truncate bg-surface px-2 py-1.5 text-sm" title={it.name}>{it.name} <span className="text-muted">({it.stock})</span></td>
                      {it.days.map((d, c) => (
                        <motion.td key={d.date} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(0.6, r * 0.015 + c * 0.01) }}
                          title={`${it.name}, ${fmtDateLong(d.date)}: ${d.free} of ${it.stock} free, ${d.booked} booked`}
                          className={cx('tabular rounded-lg py-2 text-center font-medium', cellTone(d, it.stock, it.status))}>
                          {it.status === 'Available' ? d.free : '-'}
                        </motion.td>
                      ))}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
