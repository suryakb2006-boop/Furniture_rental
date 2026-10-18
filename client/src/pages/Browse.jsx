import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { MagnifyingGlass, SlidersHorizontal, X, Couch } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { today, fmtRange, inr } from '../lib/format.js';
import FurnitureCard from '../components/FurnitureCard.jsx';
import { Button, Chip, EmptyState, Field, Skeleton, inputCls, stagger, cx } from '../components/ui.jsx';

const CATEGORIES = ['All', 'Sofa', 'Bed', 'Chair', 'Table', 'Desk', 'Storage', 'Decor'];
const USES = ['All', 'Home', 'Office', 'Event'];
const CONDITIONS = ['All', 'New', 'Like New', 'Good'];
const DEFAULTS = { q: '', category: 'All', use: 'All', condition: 'All', maxPrice: '1200', from: '', to: '', sort: 'featured', onlyAvailable: 'false' };

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const f = useMemo(() => Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, params.get(k) ?? v])), [params]);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(f.q);
  const [showFilters, setShowFilters] = useState(false);

  const set = (patch) => {
    const next = { ...f, ...patch };
    const clean = Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== DEFAULTS[k] && v !== ''));
    setParams(clean, { replace: true });
  };

  // Debounce the search box into the URL.
  useEffect(() => {
    const t = setTimeout(() => { if (search !== f.q) set({ q: search }); }, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const rangeValid = f.from && f.to && f.to >= f.from;
  useEffect(() => {
    let alive = true;
    setItems(null);
    setError('');
    api.furniture({
      q: f.q, category: f.category, use: f.use, condition: f.condition, maxPrice: f.maxPrice,
      from: rangeValid ? f.from : '', to: rangeValid ? f.to : '', sort: f.sort, onlyAvailable: f.onlyAvailable,
    })
      .then((d) => alive && setItems(d))
      .catch((e) => alive && (setError(e.message), setItems([])));
    return () => { alive = false; };
  }, [f.q, f.category, f.use, f.condition, f.maxPrice, f.from, f.to, f.sort, f.onlyAvailable, rangeValid]);

  const activeCount = ['category', 'use', 'condition', 'maxPrice', 'from', 'onlyAvailable'].filter((k) => f[k] !== DEFAULTS[k]).length;
  const linkQuery = rangeValid ? `?from=${f.from}&to=${f.to}` : '';

  const filters = (
    <div className="flex flex-col gap-6">
      <Field label="Renting for">
        <div className="flex flex-wrap gap-2">{USES.map((u) => <Chip key={u} active={f.use === u} onClick={() => set({ use: u })}>{u}</Chip>)}</div>
      </Field>
      <Field label="Category">
        <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <Chip key={c} active={f.category === c} onClick={() => set({ category: c })}>{c}</Chip>)}</div>
      </Field>
      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">Available between</span>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="From date" type="date" min={today()} value={f.from} onChange={(e) => set({ from: e.target.value, to: f.to && f.to < e.target.value ? e.target.value : f.to })} className={inputCls} />
          <input aria-label="To date" type="date" min={f.from || today()} value={f.to} onChange={(e) => set({ to: e.target.value })} className={inputCls} />
        </div>
        {f.from && !rangeValid && <p className="text-xs text-warn">Pick an end date to check stock for your dates.</p>}
      </div>
      <Field label="Condition" htmlFor="f-cond">
        <select id="f-cond" value={f.condition} onChange={(e) => set({ condition: e.target.value })} className={inputCls}>
          {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label={`Max price: ${inr(f.maxPrice)} / day`} htmlFor="f-price">
        <input id="f-price" type="range" min="25" max="1200" step="25" value={f.maxPrice} onChange={(e) => set({ maxPrice: e.target.value })} className="w-full accent-[var(--accent)]" />
      </Field>
      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
        Only show items I can book
        <input type="checkbox" checked={f.onlyAvailable === 'true'} onChange={(e) => set({ onlyAvailable: e.target.checked ? 'true' : 'false' })} className="h-5 w-5 accent-[var(--accent)]" />
      </label>
      {activeCount > 0 && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>Clear all filters</Button>}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold md:text-4xl">{f.use === 'Event' ? 'Event furniture' : f.use === 'Office' ? 'Office furniture' : f.use === 'Home' ? 'Home furniture' : 'All furniture'}</h1>
        <p className="text-muted">
          {rangeValid ? <>Showing live stock for <span className="font-medium text-ink">{fmtRange(f.from, f.to)}</span>.</> : 'Stock shown is for today. Add your dates to check your exact period.'}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input aria-label="Search furniture" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sofas, standing desks, banquet chairs..." className={cx(inputCls, 'pl-10')} />
        </div>
        <div className="flex gap-3">
          <select aria-label="Sort" value={f.sort} onChange={(e) => set({ sort: e.target.value })} className={cx(inputCls, 'sm:w-48')}>
            <option value="featured">Featured</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name">Name A to Z</option>
          </select>
          <Button variant="secondary" className="lg:hidden" onClick={() => setShowFilters(true)}>
            <SlidersHorizontal size={18} /> Filters{activeCount ? ` (${activeCount})` : ''}
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block"><div className="sticky top-24">{filters}</div></aside>

        <div className="min-w-0">
          {error && <p className="mb-4 rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad">{error}</p>}
          {items === null ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex flex-col gap-3 p-2"><Skeleton className="aspect-[4/3]" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/3" /></div>)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon={Couch} title="Nothing matches these filters" body="Try a wider price range, another category or different dates." action={<Button variant="secondary" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>Clear filters</Button>} />
          ) : (
            <>
              <p className="mb-3 px-2 text-sm text-muted">{items.length} item{items.length === 1 ? '' : 's'}</p>
              <motion.div key={params.toString()} variants={stagger(0.05)} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => <FurnitureCard key={item.id} item={item} query={linkQuery} />)}
              </motion.div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-[rgb(10_16_13/0.5)]" onClick={() => setShowFilters(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col gap-6 overflow-y-auto bg-surface p-6">
              <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Filters</h2><button onClick={() => setShowFilters(false)} aria-label="Close filters"><X size={22} /></button></div>
              {filters}
              <Button onClick={() => setShowFilters(false)}>Show {items?.length ?? ''} results</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
