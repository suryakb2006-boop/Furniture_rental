import { Link, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { CalendarCheck, Truck, ShieldCheck } from '@phosphor-icons/react';
import { useAuth } from '../context/store.jsx';
import { Skeleton } from './ui.jsx';

const PERKS = [
  { icon: CalendarCheck, text: 'Track every rental, delivery and pick-up in one place' },
  { icon: Truck, text: 'Checkout in seconds with your saved details' },
  { icon: ShieldCheck, text: 'Deposit refunds tracked against your account' },
];

// Split layout shared by the sign-in and registration pages.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-8 pt-8 sm:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_1.05fr] lg:items-stretch lg:py-10">
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative hidden overflow-hidden rounded-2xl bg-[#1f5a43] lg:flex"
      >
        <img
          src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1100&q=70"
          alt=""
          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
          className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(12_40_29/0.95)] via-[rgb(12_40_29/0.55)] to-[rgb(12_40_29/0.2)]" />
        <div className="relative mt-auto flex flex-col gap-8 p-10 text-white">
          <h2 className="max-w-md text-4xl font-semibold leading-tight">Your home, office or event, furnished on your schedule.</h2>
          <ul className="flex flex-col gap-4">
            {PERKS.map((p, i) => (
              <motion.li key={p.text} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-center gap-3 text-white/85">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/12"><p.icon size={20} /></span>
                {p.text}
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.aside>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col justify-center"
      >
        <div className="mx-auto flex w-full max-w-md flex-col gap-7 py-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
            <p className="text-muted">{subtitle}</p>
          </div>
          {children}
          {footer && <p className="text-center text-sm text-muted">{footer}</p>}
        </div>
      </motion.section>
    </div>
  );
}

// Sends signed-out visitors to the sign-in page and brings them back afterwards.
export function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="mx-auto max-w-3xl px-4 py-16"><Skeleton className="h-72" /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace state={{ reason: 'auth' }} />;
  return children;
}

export const AuthLink = ({ to, children }) => <Link to={to} className="font-medium text-accent hover:underline">{children}</Link>;
