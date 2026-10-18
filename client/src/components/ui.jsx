import { useEffect, useRef } from 'react';
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from 'motion/react';
import {
  Couch, Bed, Armchair, Desk, Books, Lamp, ForkKnife, X, Star,
} from '@phosphor-icons/react';

export const CATEGORY_ICON = { Sofa: Couch, Bed, Chair: Armchair, Table: ForkKnife, Desk, Storage: Books, Decor: Lamp };

const cx = (...c) => c.filter(Boolean).join(' ');
export { cx };

export function Button({ as: As = 'button', variant = 'primary', size = 'md', className, children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background,color,transform,box-shadow] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';
  const sizes = { sm: 'h-9 px-4 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-12 px-7 text-base' };
  const variants = {
    primary: 'bg-accent text-accent-ink hover:bg-accent-hover shadow-soft',
    secondary: 'border border-line bg-surface text-ink hover:border-accent hover:text-accent',
    ghost: 'text-ink hover:bg-surface-2',
    danger: 'border border-bad/40 text-bad hover:bg-bad hover:text-white',
  };
  return <As className={cx(base, sizes[size], variants[variant], className)} {...props}>{children}</As>;
}

export function Field({ label, htmlFor, error, hint, children, className }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && <label htmlFor={htmlFor} className="text-sm font-medium text-ink">{label}</label>}
      {children}
      {error ? <p className="text-sm text-bad">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export const inputCls = 'h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted/80 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25';

export function Chip({ active, children, className, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        'h-9 whitespace-nowrap rounded-full border px-4 text-sm transition',
        active ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface text-ink hover:border-accent',
        className
      )}
      aria-pressed={!!active}
      {...props}
    >
      {children}
    </button>
  );
}

const TONES = {
  ok: 'bg-ok/12 text-ok',
  warn: 'bg-warn/14 text-warn',
  bad: 'bg-bad/12 text-bad',
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent-soft text-accent',
};
export function Badge({ tone = 'neutral', children, className }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', TONES[tone], className)}>{children}</span>;
}

export const STATUS_TONE = { Confirmed: 'accent', Delivered: 'ok', Returned: 'neutral', Cancelled: 'bad' };
export const CONDITION_TONE = { New: 'accent', 'Like New': 'ok', Good: 'neutral' };

export function availabilityInfo(item) {
  if (item.status === 'Maintenance') return { tone: 'warn', label: 'Under maintenance' };
  if (item.free <= 0) return { tone: 'bad', label: 'Fully booked' };
  if (item.free <= Math.max(1, Math.ceil(item.stock * 0.2))) return { tone: 'warn', label: `Only ${item.free} left` };
  return { tone: 'ok', label: `${item.free} of ${item.stock} free` };
}

export function Skeleton({ className }) {
  return <div className={cx('animate-pulse rounded-2xl bg-surface-2', className)} />;
}

export function ItemImage({ item, className, rounded = 'rounded-2xl' }) {
  const Icon = CATEGORY_ICON[item?.category] || Couch;
  return (
    <div className={cx('relative overflow-hidden bg-surface-2', rounded, className)}>
      <div className="absolute inset-0 grid place-items-center text-muted/60">
        <Icon size={56} weight="thin" />
      </div>
      {item?.image_url && (
        <img
          src={item.image_url}
          alt={item.name}
          loading="lazy"
          className="relative h-full w-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[rgb(10_16_13/0.55)] backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={cx('relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 shadow-lift sm:rounded-2xl sm:p-7', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button onClick={onClose} className="-m-1 rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-IN'), className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView || !ref.current) return;
    if (reduce) { ref.current.textContent = format(value); return; }
    const controls = animate(0, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { if (ref.current) ref.current.textContent = format(v); } });
    return () => controls.stop();
  }, [inView, value, reduce, format]);
  return <span ref={ref} className={cx('tabular', className)}>{format(value)}</span>;
}

// Animates a number whenever it changes (used for live price totals).
export function AnimatedNumber({ value, format, className }) {
  const ref = useRef(null);
  const prev = useRef(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!ref.current) return;
    if (reduce) { ref.current.textContent = format(value); prev.current = value; return; }
    const c = animate(prev.current, value, { duration: 0.45, ease: 'easeOut', onUpdate: (v) => { if (ref.current) ref.current.textContent = format(v); } });
    prev.current = value;
    return () => c.stop();
  }, [value, format, reduce]);
  return <span ref={ref} className={cx('tabular', className)}>{format(value)}</span>;
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      {Icon && <Icon size={40} weight="light" className="text-muted" />}
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

export const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};
export const stagger = (gap = 0.07) => ({ hidden: {}, show: { transition: { staggerChildren: gap } } });

// Read-only star row (supports half values by rounding) or an input when onChange is given.
export function Stars({ value = 0, size = 14, onChange, className }) {
  return (
    <span className={cx('inline-flex items-center gap-0.5', className)} role={onChange ? 'radiogroup' : 'img'} aria-label={onChange ? 'Rating' : `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= Math.round(value);
        const star = <Star size={size} weight={on ? 'fill' : 'regular'} className={on ? 'text-warn' : 'text-muted/60'} />;
        return onChange ? (
          <motion.button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => onChange(n)} className="p-0.5">{star}</motion.button>
        ) : <span key={n}>{star}</span>;
      })}
    </span>
  );
}
