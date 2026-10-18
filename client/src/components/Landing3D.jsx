import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useMotionValue } from 'motion/react';
import { ArrowRight, Sparkle, CalendarCheck, Ruler, Truck, Couch } from '@phosphor-icons/react';
import { cx } from './ui.jsx';

const Scene3D = lazy(() => import('./Scene3D.jsx'));

// Button that leans toward the pointer (spring physics), like a magnet.
export function Magnetic({ children, className, strength = 0.3 }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });
  const reduce = useReducedMotion();
  const move = (e) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  };
  return (
    <motion.div ref={ref} style={{ x: sx, y: sy }} onPointerMove={move} onPointerLeave={() => { x.set(0); y.set(0); }} className={cx('inline-block', className)}>
      {children}
    </motion.div>
  );
}

function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const CHAPTERS = [
  { id: 'situation', icon: Sparkle, eyebrow: 'Situation', title: 'Tell us your situation.', body: 'A 2BHK for four months, a team of six, a wedding for 150. The Rental Life Planner drafts every piece around it and fits your budget.', cta: ['Try the planner', '/planner'] },
  { id: 'stay', icon: CalendarCheck, eyebrow: 'Your whole stay', title: 'Priced and reserved for every day you need it.', body: 'Daily rates for events, monthly plans from 30 days, and stock checked for each day of the booking, so nothing is double booked.', cta: ['Browse furniture', '/browse'] },
  { id: 'fit', icon: Ruler, eyebrow: 'Room fit', title: 'Checked against your room, to scale.', body: 'Enter your room size. We lay the furniture out on a floor plan and flag anything that will not fit before you pay.', cta: ['Check my room', '/planner'] },
  { id: 'care', icon: Truck, eyebrow: 'Delivery to pick-up', title: 'Delivered, reminded, picked up.', body: 'Assembly on delivery, reminders before your end date, one-tap extensions, and the deposit settled the day we collect.', cta: ['See room packs', '/packs'] },
];

const WORDS = ['Furnish', 'any', 'space,', 'for', 'as', 'long', 'as', 'you', 'need', 'it.'];

export default function Landing3D() {
  const section = useRef(null);
  const reduce = useReducedMotion();
  const dark = useDarkMode();
  const inView = useInView(section, { margin: '200px' });
  const [gl] = useState(webglOK);
  const [compact, setCompact] = useState(() => window.innerWidth < 1024);
  useEffect(() => { const r = () => setCompact(window.innerWidth < 1024); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }, []);

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.0005 });
  const [chapter, setChapter] = useState(-1);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setChapter(v < 0.14 ? -1 : v < 0.34 ? 0 : v < 0.53 ? 1 : v < 0.76 ? 2 : 3));

  return (
    <section ref={section} className="relative" aria-label="RentRoom story">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Sticky 3D stage: right half on desktop, top band on phones */}
        <div className="sticky top-16 z-0 h-[46dvh] self-start lg:order-2 lg:h-[calc(100dvh-4rem)]">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-x-[8%] top-[18%] h-[60%] rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />
            {gl ? (
              <Suspense fallback={<div className="grid h-full place-items-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}><Couch size={40} className="text-accent" /></motion.div></div>}>
                <Scene3D progress={progress} reduce={!!reduce} dark={dark} active={inView} compact={compact} />
              </Suspense>
            ) : (
              <div className="grid h-full place-items-center text-muted"><Couch size={64} weight="thin" /></div>
            )}
          </div>
          {/* chapter progress */}
          <ol className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border border-line bg-surface/80 px-3 py-2 backdrop-blur lg:bottom-8" aria-hidden="true">
            {CHAPTERS.map((c, i) => (
              <li key={c.id} className="flex items-center gap-2">
                <motion.span className="h-1.5 rounded-full" animate={{ width: chapter === i ? 28 : 8, backgroundColor: chapter >= i ? 'var(--accent)' : 'var(--line)' }} />
                <span className={cx('hidden whitespace-nowrap text-xs transition-colors sm:inline', chapter === i ? 'text-ink' : 'text-muted')}>{c.eyebrow}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Story column */}
        <div className="relative z-10 lg:order-1">
          <div className="flex min-h-[calc(100dvh-4rem)] flex-col justify-center gap-7 px-4 pb-16 pt-6 sm:px-6 lg:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:pr-8">
            <motion.span initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="flex w-fit items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1 text-sm font-medium text-accent backdrop-blur">
              <Couch size={16} weight="fill" /> Furniture rental across Chennai
            </motion.span>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl xl:text-7xl" aria-label="Furnish any space, for as long as you need it.">
              {WORDS.map((w, i) => (
                <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
                  <motion.span className={cx('inline-block', i >= 8 && 'text-accent')} initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: 0.25 + i * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                    {w}&nbsp;
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }} className="max-w-[44ch] text-lg leading-relaxed text-muted">
              Sofas, beds, desks and event seating by the day or month. Planned around your rooms, delivered and picked up.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="flex flex-wrap gap-3">
              <Magnetic>
                <Link to="/planner" className="inline-flex h-13 items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-base font-medium text-accent-ink shadow-lift transition hover:bg-accent-hover active:scale-[0.98]">
                  <Sparkle size={18} weight="fill" /> Plan my setup
                </Link>
              </Magnetic>
              <Magnetic strength={0.2}>
                <Link to="/browse" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-7 py-3.5 text-base font-medium transition hover:border-accent hover:text-accent active:scale-[0.98]">
                  Browse furniture <ArrowRight size={18} weight="bold" />
                </Link>
              </Magnetic>
            </motion.div>
          </div>

          {CHAPTERS.map((c, i) => (
            <div key={c.id} className="flex min-h-[72dvh] items-end px-4 py-10 lg:min-h-[88dvh] lg:items-center lg:py-16 sm:px-6 lg:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:pr-8">
              <motion.article
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.5 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="flex max-w-lg flex-col gap-4 max-lg:rounded-2xl max-lg:border max-lg:border-line max-lg:bg-surface/92 max-lg:p-6 max-lg:shadow-lift max-lg:backdrop-blur-md"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-accent"><c.icon size={18} weight="fill" /> {c.eyebrow}</span>
                <h2 className="text-3xl font-semibold leading-tight md:text-5xl">{c.title}</h2>
                <p className="text-lg leading-relaxed text-muted">{c.body}</p>
                <Link to={c.cta[1]} className="group flex w-fit items-center gap-2 font-medium text-accent">
                  {c.cta[0]} <ArrowRight size={16} weight="bold" className="transition group-hover:translate-x-1" />
                </Link>
              </motion.article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
