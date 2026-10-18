import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Package } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { inr } from '../lib/format.js';
import { Badge, EmptyState, Skeleton, reveal, stagger, cx } from '../components/ui.jsx';
import Tilt from '../components/Tilt.jsx';

export function PackCard({ b, large = false }) {
  return (
    <Tilt className="h-full" max={5}>
    <Link to={`/packs/${b.id}`} className={cx('group relative flex h-full overflow-hidden rounded-2xl bg-surface-2', large ? 'min-h-[420px]' : 'min-h-[260px]')}>
      <img src={b.image_url} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[rgb(8_14_11/0.9)] via-[rgb(8_14_11/0.45)] to-[rgb(8_14_11/0.05)]" />
      <div className="relative mt-auto flex w-full flex-col gap-3 p-6 text-white">
        <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">{b.discount_pct}% off as a pack</span>
        <h3 className={large ? 'text-3xl font-semibold' : 'text-2xl font-semibold'}>{b.name}</h3>
        <p className="max-w-md text-sm text-white/80">{b.tagline}. {b.items.length} items, {b.items.reduce((s, i) => s + i.qty, 0)} pieces.</p>
        <div className="flex items-end justify-between gap-4">
          <p className="text-sm text-white/80">
            <span className="tabular font-display text-2xl font-semibold text-white">{inr(b.perDayPack)}</span> / day
            <span className="ml-2 tabular line-through opacity-60">{inr(b.perDay)}</span>
          </p>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#14201a] transition group-hover:translate-x-1"><ArrowRight size={18} weight="bold" /></span>
        </div>
      </div>
    </Link>
    </Tilt>
  );
}

export default function Packs() {
  const [packs, setPacks] = useState(null);
  useEffect(() => { api.bundles().then(setPacks).catch(() => setPacks([])); }, []);
  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6">
      <Badge tone="accent" className="px-3 py-1 text-sm">Ready-made packs</Badge>
      <h1 className="mt-3 max-w-2xl text-3xl font-semibold md:text-5xl">Furnish a whole room in one booking</h1>
      <p className="mt-3 max-w-xl text-muted">Curated sets for a new flat, a home office, a team pod or an event. One date range, one delivery, and a pack discount on top of weekly and monthly rates.</p>
      <div className="mt-10">
        {packs === null ? (
          <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div>
        ) : packs.length === 0 ? <EmptyState icon={Package} title="No packs yet" /> : (
          <motion.div variants={stagger(0.08)} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {packs.map((b, i) => (
              <motion.div key={b.id} variants={reveal} className={i === 0 ? 'md:col-span-2 lg:row-span-2' : ''}>
                <PackCard b={b} large={i === 0} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
