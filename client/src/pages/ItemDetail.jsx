import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Minus, Plus, ShieldCheck, Truck, Wrench, CheckCircle, WarningCircle, Tag, Cube, Image as ImageIcon } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { addDays, today, inr, quoteLine, periodError, fmtDateLong } from '../lib/format.js';
import { useCart, useToast } from '../context/store.jsx';
import AvailabilityStrip from '../components/AvailabilityStrip.jsx';
import FurnitureCard from '../components/FurnitureCard.jsx';
import HeartButton from '../components/HeartButton.jsx';
import { modelFor } from '../components/furniture3d.jsx';
import { Suspense, lazy } from 'react';
const Turntable3D = lazy(() => import('../components/Turntable3D.jsx'));
import { AnimatedNumber, Badge, Button, CONDITION_TONE, Field, ItemImage, Skeleton, Stars, inputCls, stagger, cx } from '../components/ui.jsx';

export default function ItemDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const cart = useCart();
  const toast = useToast();

  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [related, setRelated] = useState([]);
  const [start, setStart] = useState(sp.get('from') && sp.get('from') >= today() ? sp.get('from') : addDays(today(), 1));
  const [end, setEnd] = useState(sp.get('to') && sp.get('to') >= start ? sp.get('to') : addDays(start, 2));
  const [qty, setQty] = useState(1);
  const [strip, setStrip] = useState(null);
  const [check, setCheck] = useState({ state: 'idle' }); // idle | checking | ok | fail
  const [justAdded, setJustAdded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [shot, setShot] = useState(0);
  const [view3d, setView3d] = useState(false);

  useEffect(() => { api.reviews(id).then(setReviews).catch(() => setReviews([])); setShot(0); }, [id]);

  useEffect(() => {
    api.item(id).then((it) => {
      setItem(it);
      api.furniture({ category: it.category }).then((all) => setRelated(all.filter((x) => x.id !== it.id).slice(0, 3)));
    }).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!start) return;
    api.availability(id, start, 14).then(setStrip).catch(() => setStrip([]));
  }, [id, start]);

  const periodErr = periodError(start, end);
  const quote = useMemo(() => (item && !periodErr ? quoteLine(item, qty, start, end) : null), [item, qty, start, end, periodErr]);
  const cartSame = cart.lines.filter((l) => l.furnitureId === Number(id));

  // Ask the server whether this period + quantity (plus anything already in the cart) can be booked.
  useEffect(() => {
    if (!item || periodErr) { setCheck({ state: 'idle' }); return; }
    if (item.status !== 'Available') { setCheck({ state: 'fail', message: 'This item is under maintenance and cannot be booked right now.' }); return; }
    setCheck({ state: 'checking' });
    const t = setTimeout(() => {
      const lines = [...cartSame.map((l) => ({ furnitureId: l.furnitureId, qty: l.qty, start: l.start, end: l.end })), { furnitureId: item.id, qty, start, end }];
      api.quote(lines)
        .then(() => setCheck({ state: 'ok' }))
        .catch((e) => {
          const free = e.data?.free;
          const inCart = cartSame.reduce((s, l) => s + (l.start <= end && l.end >= start ? l.qty : 0), 0);
          const msg = free !== undefined
            ? `Only ${free} free for these dates${inCart ? ` after the ${inCart} already in your cart` : ''}. Lower the quantity or change dates.`
            : e.message;
          setCheck({ state: 'fail', message: msg });
        });
    }, 250);
    return () => clearTimeout(t);
  }, [item, qty, start, end, periodErr, cart.lines.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const addToCart = () => {
    cart.add({
      furnitureId: item.id, name: item.name, category: item.category, image_url: item.image_url,
      price_per_day: item.price_per_day, deposit: item.deposit, qty, start, end,
    });
    toast(`${qty} x ${item.name} added to your cart`);
    setJustAdded(true);
  };

  if (error) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Item not found</h1>
        <p className="text-muted">{error}</p>
        <Button as={Link} to="/browse">Browse furniture</Button>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <Skeleton className="aspect-[4/3]" />
        <div className="flex flex-col gap-4"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-40" /><Skeleton className="h-24" /></div>
      </div>
    );
  }

  const maxQty = item.stock;
  const canBook = check.state === 'ok' && !periodErr;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6">
      <button onClick={() => nav(-1)} className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft size={16} /> Back</button>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 lg:sticky lg:top-24">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-soft">
              <div className="absolute right-3 top-3 z-10 flex rounded-full border border-line bg-surface/90 p-0.5 text-xs font-medium backdrop-blur" role="tablist" aria-label="Image or 3D">
                {[[false, 'Photos', ImageIcon], [true, '3D view', Cube]].map(([v, t, Icon]) => (
                  <button key={t} type="button" role="tab" aria-selected={view3d === v} onClick={() => setView3d(v)}
                    className={cx('flex items-center gap-1 rounded-full px-3 py-1.5 transition', view3d === v ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink')}><Icon size={13} /> {t}</button>
                ))}
              </div>
              {view3d && (
                <div className="absolute inset-0 z-[5] bg-surface-2">
                  <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted">Loading 3D view...</div>}>
                    <Turntable3D kind={modelFor(item.name, item.category)} widthCm={item.width_cm} depthCm={item.depth_cm} className="absolute inset-0" />
                  </Suspense>
                  <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-surface/85 px-3 py-1 text-[11px] text-muted backdrop-blur">Representative 3D model at real size ({item.width_cm} x {item.depth_cm} cm). Drag to turn.</span>
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.div key={shot} initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0">
                  <ItemImage item={{ ...item, image_url: [item.image_url, item.image_url_2].filter(Boolean)[shot] || item.image_url }} className="h-full w-full" />
                </motion.div>
              </AnimatePresence>
            </div>
            {[item.image_url, item.image_url_2].filter(Boolean).length > 1 && (
              <div className="flex gap-3">
                {[item.image_url, item.image_url_2].filter(Boolean).map((u, i) => (
                  <button key={u} onClick={() => setShot(i)} aria-label={`Show image ${i + 1}`} className={cx('overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-bg transition', shot === i ? 'ring-accent' : 'ring-transparent opacity-70 hover:opacity-100')}>
                    <ItemImage item={{ ...item, image_url: u }} className="h-16 w-20" rounded="rounded-xl" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>{item.category}</span>
              <Badge tone={CONDITION_TONE[item.condition]}>{item.condition}</Badge>
              {item.uses.map((u) => <Badge key={u}>{u}</Badge>)}
            </div>
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">{item.name}</h1>
            {item.rating?.count > 0 && (
              <a href="#reviews" className="flex w-fit items-center gap-2 text-sm"><Stars value={item.rating.avg} size={16} /><span className="tabular font-semibold">{item.rating.avg.toFixed(1)}</span><span className="text-muted underline-offset-2 hover:underline">{item.rating.count} review{item.rating.count === 1 ? '' : 's'}</span></a>
            )}
            <p className="text-lg text-muted"><span className="tabular font-display text-3xl font-semibold text-ink">{inr(item.price_per_day)}</span> / day <span className="mx-2 text-line">|</span><span className="tabular font-display text-2xl font-semibold text-accent">{inr(item.price_per_month)}</span> / month on 30+ day plans</p>
            <p className="max-w-[60ch] leading-relaxed text-muted">{item.description}</p>
          </div>

          <dl className="grid grid-cols-3 gap-4 border-y border-line py-4 text-sm sm:grid-cols-4">
            <div><dt className="text-muted">In stock</dt><dd className="tabular mt-1 font-semibold">{item.stock} units</dd></div>
            <div><dt className="text-muted">Deposit</dt><dd className="tabular mt-1 font-semibold">{inr(item.deposit)} / unit</dd></div>
            <div><dt className="text-muted">Free today</dt><dd className="tabular mt-1 font-semibold">{item.free} units</dd></div>
            {item.width_cm > 0 && <div className="col-span-3 sm:col-span-1"><dt className="text-muted">Size (W x D)</dt><dd className="tabular mt-1 font-semibold">{item.width_cm} x {item.depth_cm} cm</dd></div>}
          </dl>

          {item.status === 'Maintenance' ? (
            <div className="flex items-start gap-3 rounded-2xl bg-warn/12 p-4 text-sm text-warn"><Wrench size={20} className="shrink-0" /> This item is being serviced and cannot be booked right now. Check back soon.</div>
          ) : (
            <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <h2 className="text-lg font-semibold">Choose your rental period</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date" htmlFor="d-start">
                  <input id="d-start" type="date" min={today()} value={start} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); setJustAdded(false); }} className={inputCls} />
                </Field>
                <Field label="End date" htmlFor="d-end">
                  <input id="d-end" type="date" min={start} value={end} onChange={(e) => { setEnd(e.target.value); setJustAdded(false); }} className={inputCls} />
                </Field>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium">Quantity</span>
                <div className="flex items-center gap-1 rounded-full border border-line p-1">
                  <button onClick={() => { setQty((q) => Math.max(1, q - 1)); setJustAdded(false); }} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2" aria-label="Decrease quantity"><Minus size={16} /></button>
                  <input aria-label="Quantity" type="number" min="1" max={maxQty} value={qty} onChange={(e) => { setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1))); setJustAdded(false); }} className="tabular w-14 bg-transparent text-center font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                  <button onClick={() => { setQty((q) => Math.min(maxQty, q + 1)); setJustAdded(false); }} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2" aria-label="Increase quantity"><Plus size={16} /></button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Units free per day from {fmtDateLong(start)}</span>
                {strip ? <AvailabilityStrip days={strip} start={start} end={end} qty={qty} /> : <Skeleton className="h-16" />}
              </div>

              {periodErr ? (
                <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">{periodErr}</p>
              ) : quote && (
                <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-4 text-sm">
                  <div className="flex justify-between"><span className="text-muted">{quote.plan === 'monthly' ? `${inr(item.price_per_month)} / month x ${(quote.days / 30).toFixed(quote.days % 30 ? 1 : 0)} months x ${qty}` : `${inr(item.price_per_day)} x ${quote.days} day${quote.days > 1 ? 's' : ''} x ${qty}`}</span><AnimatedNumber value={quote.base} format={inr} /></div>
                  <AnimatePresence>
                    {quote.discount > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex justify-between text-ok">
                        <span className="flex items-center gap-1"><Tag size={14} /> {quote.plan === 'monthly' ? `Monthly plan at ${inr(item.price_per_month)} / month` : '10% weekly discount'}</span>
                        <span className="tabular">- <AnimatedNumber value={quote.discount} format={inr} /></span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex justify-between"><span className="text-muted">Refundable deposit</span><AnimatedNumber value={quote.deposit} format={inr} /></div>
                  <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
                    <span className="font-medium">Rent for this period</span>
                    <AnimatedNumber value={quote.rent} format={inr} className="font-display text-2xl font-semibold" />
                  </div>
                  {quote.days < 30 && <p className="text-xs text-muted">{quote.days < 7 ? '7 days or more: 10% off. ' : ''}30 days or more: monthly plan at {inr(item.price_per_month)} / month.</p>}
                </div>
              )}

              <AnimatePresence mode="wait">
                {check.state === 'fail' && (
                  <motion.p key="fail" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-2 text-sm text-bad"><WarningCircle size={18} className="mt-px shrink-0" /> {check.message}</motion.p>
                )}
                {check.state === 'ok' && (
                  <motion.p key="ok" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-ok"><CheckCircle size={18} weight="fill" /> Available for your dates</motion.p>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="lg" className="flex-1" disabled={!canBook} onClick={addToCart}>
                  {check.state === 'checking' ? 'Checking stock...' : 'Add to cart'}
                </Button>
                {justAdded && <Button as={Link} to="/cart" size="lg" variant="secondary">Go to cart</Button>}
                <HeartButton item={item} withLabel />
              </div>
            </div>
          )}

          <ul className="flex flex-col gap-3 text-sm text-muted">
            <li className="flex items-center gap-3"><Truck size={20} className="text-accent" /> Free delivery and assembly on rentals above ₹5,000</li>
            <li className="flex items-center gap-3"><ShieldCheck size={20} className="text-accent" /> Deposit refunded within 3 days of pick-up</li>
          </ul>
        </motion.div>
      </div>

      <section id="reviews" className="mt-20 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold">Customer reviews</h2>
          {item.rating?.count > 0 && <div className="flex items-center gap-3"><span className="tabular font-display text-4xl font-semibold">{item.rating.avg.toFixed(1)}</span><div className="flex flex-col"><Stars value={item.rating.avg} size={18} /><span className="text-sm text-muted">from {item.rating.count} renter{item.rating.count === 1 ? '' : 's'}</span></div></div>}
        </div>
        {reviews.length === 0 ? <p className="mt-4 text-muted">No reviews yet. Renters can review items after the pick-up.</p> : (
          <motion.ul variants={stagger(0.06)} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-6 grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <motion.li key={r.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 font-medium"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{r.reviewer_name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>{r.reviewer_name}</span>
                  <Stars value={r.rating} />
                </div>
                {r.comment && <p className="text-sm leading-relaxed text-ink/85">{r.comment}</p>}
                <span className="text-xs text-muted">{new Date(r.created_at.replace(' ', 'T')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{r.verified ? ', verified rental' : ''}</span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-semibold">More {item.category.toLowerCase()} options</h2>
          <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => <FurnitureCard key={r.id} item={r} />)}
          </motion.div>
        </section>
      )}
    </div>
  );
}
