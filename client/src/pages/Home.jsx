import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import { PackCard } from './Packs.jsx';
import Landing3D from '../components/Landing3D.jsx';
import Showroom from '../components/Showroom.jsx';
import {
  ArrowRight, House, Buildings, Confetti, Sparkle, MagnifyingGlass, CalendarBlank, CreditCard, Truck, ArrowCounterClockwise, Star,
} from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { addDays, today, inr } from '../lib/format.js';
import FurnitureCard from '../components/FurnitureCard.jsx';
import { Button, Chip, CountUp, Field, Skeleton, inputCls, reveal, stagger, availabilityInfo, Badge } from '../components/ui.jsx';

const IMG = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

const USE_CASES = [
  { use: 'Home', icon: House, title: 'Set up a home in a day', body: 'Beds, sofas, wardrobes and dining sets for a new flat, a long project posting or visiting family.', img: IMG('1586023492125-27b2c045efd7') },
  { use: 'Office', icon: Buildings, title: 'Kit out an office', body: 'Workstations, ergonomic chairs and conference tables for new teams and pop-up offices.', img: IMG('1497366216548-37526070297c', 900) },
  { use: 'Event', icon: Confetti, title: 'Seat every guest', body: 'Banquet chairs, round tables and stage frames for receptions, launches and family functions.', img: IMG('1519167758481-83f550bb49b3', 900) },
];

const STEPS = [
  { icon: MagnifyingGlass, title: 'Choose', body: 'Filter by room, condition and live stock for your dates.' },
  { icon: CalendarBlank, title: 'Schedule', body: 'Pick a start and end date. Weekly and monthly rates apply on their own.' },
  { icon: CreditCard, title: 'Pay', body: 'Pay by UPI, card or cash on delivery. The deposit is fully refundable.' },
  { icon: Truck, title: 'Receive', body: 'We deliver and assemble. Pick-up is booked for your end date.' },
];

const QUOTES = [
  { text: 'We moved from Pune with two suitcases. The bed, sofa and wardrobe were set up before our cab from the airport arrived.', name: 'Nithya Raghavan', role: 'Rented for 6 months, Adyar' },
  { text: '220 banquet chairs and 24 tables for my daughter\'s reception, delivered to the hall at 7 am and collected the next evening.', name: 'S. Chandrasekar', role: 'Event rental, Vadapalani' },
  { text: 'Our new team of nine started on Monday. Desks and chairs came on Saturday.', name: 'Rohan Mehta', role: 'Operations lead, Guindy' },
];

export default function Home() {
  const nav = useNavigate();
  const [featured, setFeatured] = useState(null);
  const [finder, setFinder] = useState({ use: 'Home', from: addDays(today(), 1), to: addDays(today(), 7) });
  const [spot, setSpot] = useState(null);
  const [packs, setPacks] = useState([]);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const yBig = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const ySmall = useTransform(scrollYProgress, [0, 1], [0, -70]);
  useEffect(() => { api.bundles().then((b) => setPacks(b.slice(0, 3))).catch(() => {}); }, []);

  useEffect(() => {
    api.furniture({ onlyAvailable: 'true' }).then((items) => {
      setFeatured(items.slice(0, 8));
      setSpot(items.find((i) => i.category === 'Bed') || items[0]);
    }).catch(() => setFeatured([]));
  }, []);

  const find = (e) => {
    e.preventDefault();
    const q = new URLSearchParams({ use: finder.use, from: finder.from, to: finder.to < finder.from ? finder.from : finder.to });
    nav('/browse?' + q.toString());
  };

  return (
    <>
      {/* 3D story: the flat assembles as you scroll */}
      <Landing3D />

      {/* 3D showroom turntable */}
      <Showroom />

      {/* Availability finder */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <motion.form
          onSubmit={find}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-soft md:grid-cols-[auto_1fr_1fr_auto] md:items-end md:p-6"
        >
          <Field label="Renting for">
            <div className="flex flex-wrap gap-2">
              {['Home', 'Office', 'Event'].map((u) => <Chip key={u} active={finder.use === u} onClick={() => setFinder((f) => ({ ...f, use: u }))}>{u}</Chip>)}
            </div>
          </Field>
          <Field label="From" htmlFor="finder-from">
            <input id="finder-from" type="date" min={today()} value={finder.from} onChange={(e) => setFinder((f) => ({ ...f, from: e.target.value, to: f.to < e.target.value ? e.target.value : f.to }))} className={inputCls} />
          </Field>
          <Field label="Until" htmlFor="finder-to">
            <input id="finder-to" type="date" min={finder.from} value={finder.to} onChange={(e) => setFinder((f) => ({ ...f, to: e.target.value }))} className={inputCls} />
          </Field>
          <Button type="submit" size="lg" className="md:h-11">Check availability</Button>
        </motion.form>
      </section>

      {/* Rental Life Planner teaser */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
          className="grid items-center gap-8 overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-soft md:grid-cols-[1.1fr_1fr] md:p-10">
          <div className="flex flex-col items-start gap-4">
            <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent"><Sparkle size={14} weight="fill" /> Rental Life Planner</span>
            <h2 className="text-3xl font-semibold md:text-4xl">Describe your situation. We plan every piece.</h2>
            <p className="max-w-[48ch] text-muted">Moving into a 2BHK for 4 months on ₹5,000 a month? Tell us the rooms, the duration and the budget. The planner picks furniture that is free for your whole stay and fits the budget, ready to rent in one click.</p>
            <Button as={Link} to="/planner" size="lg">Plan my setup <ArrowRight size={18} weight="bold" /></Button>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-5 text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Example: 2BHK, 4 months</span>
            {[['Two-Seater Leatherette Sofa', 899], ['Queen Bed with Mattress', 1099], ['Single Bed with Mattress', 649], ['Six-Seater Dining Table Set', 1299], ['Three-Door Wardrobe', 899]].map(([n, v], i) => (
              <motion.div key={n} initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.08 }} className="flex justify-between gap-3">
                <span>{n}</span><span className="tabular font-medium">{inr(v)}/mo</span>
              </motion.div>
            ))}
            <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold"><span>Total</span><span className="tabular">{inr(4845)}/mo</span></div>
            <div className="flex justify-between text-ok"><span>Budget ₹5,000/mo</span><span className="tabular">{inr(155)} left</span></div>
          </div>
        </motion.div>
      </section>

      {/* Use cases: asymmetric bento, 3 items = 3 cells */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <h2 className="max-w-2xl text-3xl font-semibold md:text-4xl">One catalogue for homes, offices and events</h2>
        <motion.div variants={stagger(0.12)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="mt-10 grid gap-4 md:grid-cols-2 md:grid-rows-2">
          {USE_CASES.map((u, i) => (
            <motion.div key={u.use} variants={reveal} className={i === 0 ? 'md:row-span-2' : ''}>
              <Link to={`/browse?use=${u.use}`} className="group relative flex h-full min-h-[260px] overflow-hidden rounded-2xl bg-surface-2 md:min-h-[240px]">
                <img onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} src={u.img} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgb(8_14_11/0.82)] via-[rgb(8_14_11/0.35)] to-transparent" />
                <div className="relative mt-auto flex w-full items-end justify-between gap-4 p-6 text-white">
                  <div className="flex max-w-md flex-col gap-2">
                    <u.icon size={26} weight="light" />
                    <h3 className={i === 0 ? 'text-3xl font-semibold' : 'text-2xl font-semibold'}>{u.title}</h3>
                    <p className="text-sm text-white/80">{u.body}</p>
                  </div>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#14201a] transition group-hover:translate-x-1">
                    <ArrowRight size={18} weight="bold" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Ready-made packs */}
      {packs.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="max-w-2xl text-3xl font-semibold md:text-4xl">Whole rooms, booked as one pack</h2>
            <Link to="/packs" className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">See all packs <ArrowRight size={14} /></Link>
          </div>
          <motion.div variants={stagger(0.1)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="mt-10 grid gap-4 md:grid-cols-[1.3fr_1fr] md:grid-rows-2">
            {packs.map((b, i) => (
              <motion.div key={b.id} variants={reveal} className={i === 0 ? 'md:row-span-2' : ''}><PackCard b={b} large={i === 0} /></motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* How it works: a real sequence, laid out as a connected row */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <h2 className="text-3xl font-semibold md:text-4xl">How renting works</h2>
        <motion.ol variants={stagger(0.1)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {STEPS.map((s, i) => (
            <motion.li key={s.title} variants={reveal} className="relative flex flex-col gap-3 lg:pr-8">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><s.icon size={22} /></span>
                {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-line lg:block" />}
              </div>
              <h3 className="text-xl font-semibold">{s.title}</h3>
              <p className="max-w-[32ch] text-sm leading-relaxed text-muted">{s.body}</p>
            </motion.li>
          ))}
        </motion.ol>
        <p className="mt-8 flex items-center gap-2 text-sm text-muted"><ArrowCounterClockwise size={16} /> Rentals of 7 days or more get 10% off, and from 30 days you pay the much lower monthly plan price.</p>
      </section>

      {/* Featured: horizontal scroll rail */}
      <section className="pt-24">
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-4 px-4 sm:px-6">
          <h2 className="text-3xl font-semibold md:text-4xl">Free to book this week</h2>
          <Link to="/browse" className="hidden items-center gap-1 text-sm font-medium text-accent hover:underline sm:flex">See all furniture <ArrowRight size={14} /></Link>
        </div>
        <div className="no-scrollbar mx-auto mt-8 flex max-w-7xl snap-x gap-4 overflow-x-auto px-4 pb-4 sm:px-6">
          {featured === null
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 w-72 shrink-0" />)
            : featured.map((item) => (
              <motion.div key={item.id} initial="hidden" whileInView="show" viewport={{ once: true }} className="w-72 shrink-0 snap-start">
                <FurnitureCard item={item} />
              </motion.div>
            ))}
        </div>
      </section>

      {/* Numbers band */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="grid gap-8 rounded-2xl bg-accent-soft px-6 py-10 sm:grid-cols-2 md:px-10 lg:grid-cols-4">
          {[
            [1284, 'homes furnished since 2023'],
            [317, 'events seated'],
            [46, 'offices set up'],
            [4.7, 'average rating from 912 reviews', (n) => n.toFixed(1)],
          ].map(([v, label, f]) => (
            <div key={label} className="flex flex-col gap-1">
              <CountUp value={v} format={f} className="font-display text-4xl font-semibold text-accent md:text-5xl" />
              <span className="text-sm text-ink/80">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials: one large quote, two supporting */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <h2 className="text-3xl font-semibold md:text-4xl">What renters say</h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <motion.figure initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col justify-between gap-8 rounded-2xl border border-line bg-surface p-8 shadow-soft">
            <div className="flex gap-1 text-accent">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={18} weight="fill" />)}</div>
            <blockquote className="font-display text-2xl font-medium leading-snug md:text-3xl">{QUOTES[0].text}</blockquote>
            <figcaption className="text-sm"><span className="font-semibold">{QUOTES[0].name}</span><br /><span className="text-muted">{QUOTES[0].role}</span></figcaption>
          </motion.figure>
          <div className="flex flex-col gap-6">
            {QUOTES.slice(1).map((q, i) => (
              <motion.figure key={q.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * (i + 1) }} viewport={{ once: true }} className="flex flex-1 flex-col justify-between gap-5 border-t border-line pt-6">
                <blockquote className="text-lg leading-relaxed">{q.text}</blockquote>
                <figcaption className="text-sm"><span className="font-semibold">{q.name}</span> <span className="text-muted">- {q.role}</span></figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-accent px-6 py-14 text-accent-ink md:px-12">
          <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-semibold md:text-4xl">Moving in next week?</h2>
              <p className="max-w-lg opacity-85">Book today and we can deliver as early as tomorrow morning.</p>
            </div>
            <Link to="/browse" className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-accent-ink px-7 font-medium text-accent transition hover:opacity-90 active:scale-[0.98]">
              Browse furniture <ArrowRight size={18} weight="bold" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Cycles through a few words. The wrapper animates its width to each word so nothing after it jumps.
function RotatingWord({ words }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % words.length), 2200); return () => clearInterval(t); }, [words.length]);
  return (
    <motion.span layout transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }} className="relative inline-flex overflow-hidden font-semibold">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={words[i]} layout="position"
          initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="whitespace-nowrap">
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
