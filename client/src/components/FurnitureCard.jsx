import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight } from '@phosphor-icons/react';
import { Badge, ItemImage, Stars, availabilityInfo, CONDITION_TONE, reveal } from './ui.jsx';
import { inr } from '../lib/format.js';
import HeartButton from './HeartButton.jsx';
import Tilt from './Tilt.jsx';

export default function FurnitureCard({ item, query = '' }) {
  const a = availabilityInfo(item);
  return (
    <motion.article variants={reveal} layout className="group">
      <Tilt>
      <Link to={`/item/${item.id}${query}`} className="flex h-full flex-col gap-3 rounded-2xl p-2 transition duration-300 hover:-translate-y-1 hover:bg-surface hover:shadow-lift">
        <div className="relative overflow-hidden rounded-2xl">
          <ItemImage item={item} className="aspect-[4/3] w-full transition duration-700 ease-out group-hover:scale-[1.04]" />
          <HeartButton item={item} className="absolute left-3 top-3" />
          <span className="absolute right-3 top-3 grid h-9 w-9 translate-y-1 place-items-center rounded-full bg-surface text-ink opacity-0 shadow-soft transition group-hover:translate-y-0 group-hover:opacity-100">
            <ArrowUpRight size={18} />
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 px-1 pb-1">
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span>{item.category}</span>
            <Badge tone={CONDITION_TONE[item.condition]}>{item.condition}</Badge>
          </div>
          <h3 className="font-display text-lg font-semibold leading-snug">{item.name}</h3>
          {item.rating?.count > 0 ? (
            <span className="flex items-center gap-1.5 text-xs text-muted"><Stars value={item.rating.avg} size={13} /> <span className="tabular font-medium text-ink">{item.rating.avg.toFixed(1)}</span> ({item.rating.count})</span>
          ) : <span className="text-xs text-muted">No reviews yet</span>}
          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            <p className="flex flex-col text-sm text-muted"><span><span className="tabular font-display text-xl font-semibold text-ink">{inr(item.price_per_day)}</span> / day</span>{item.price_per_month > 0 && <span className="text-xs"><span className="tabular font-medium text-accent">{inr(item.price_per_month)}</span> / month</span>}</p>
            <Badge tone={a.tone}>{a.label}</Badge>
          </div>
        </div>
      </Link>
      </Tilt>
    </motion.article>
  );
}
