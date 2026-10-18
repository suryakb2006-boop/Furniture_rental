import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Couch, ShoppingBag, Sun, Moon, List, X, SignOut, Receipt, SignIn, Heart } from '@phosphor-icons/react';
import { useAuth, useCart, useTheme, useToast, useWishlist } from '../context/store.jsx';
import { cx } from './ui.jsx';
import NotificationBell from './NotificationBell.jsx';

const LINKS = [
  { to: '/browse', label: 'Browse' },
  { to: '/planner', label: 'Planner' },
  { to: '/packs', label: 'Packs' },
  { to: '/bookings', label: 'My bookings' },
  { to: '/admin', label: 'Admin' },
];

export default function Navbar() {
  const { count } = useCart();
  const { dark, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const wish = useWishlist();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); setMenu(false); }, [loc.pathname, loc.search]);
  const initials = user ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '';
  const doSignOut = async () => { await signOut(); setMenu(false); toast('You are signed out'); };

  const isActive = (to) => {
    const [p, q] = to.split('?');
    if (q) return loc.pathname === p && loc.search.includes(q);
    return loc.pathname.startsWith(p) && !(p === '/browse' && loc.search.includes('use=Event'));
  };

  return (
    <header className="site-header sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-ink"><Couch size={20} weight="bold" /></span>
          RentRoom
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={cx('relative rounded-full px-4 py-2 text-sm transition', isActive(l.to) ? 'text-ink' : 'text-muted hover:text-ink')}>
              {isActive(l.to) && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-surface-2" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              <span className="relative">{l.label}</span>
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggle} className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <NotificationBell />
          {user && (
            <Link to="/wishlist" className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-surface-2" aria-label={`Wishlist, ${wish.count} saved`}>
              <Heart size={21} weight={wish.count ? 'fill' : 'regular'} className={wish.count ? 'text-bad' : ''} />
            </Link>
          )}
          <Link to="/cart" className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-surface-2" aria-label={`Cart, ${count} items`}>
            <ShoppingBag size={21} />
            <AnimatePresence>
              {count > 0 && (
                <motion.span key={count} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}
                  className="tabular absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-ink">
                  {count > 99 ? '99+' : count}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          {user ? (
            <div className="relative hidden md:block">
              <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Account menu" className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent transition hover:ring-2 hover:ring-accent/30">
                {initials}
              </button>
              <AnimatePresence>
                {menu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                    <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.16 }}
                      className="absolute right-0 top-12 z-50 w-64 origin-top-right rounded-2xl border border-line bg-surface p-2 shadow-lift">
                      <div className="px-3 py-2">
                        <div className="truncate font-medium">{user.name}</div>
                        <div className="truncate text-xs text-muted">{user.email}</div>
                      </div>
                      <div className="my-1 h-px bg-line" />
                      <Link to="/bookings" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-surface-2"><Receipt size={18} /> My bookings</Link>
                      <Link to="/wishlist" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-surface-2"><Heart size={18} /> Wishlist <span className="tabular ml-auto text-xs text-muted">{wish.count}</span></Link>
                      <button onClick={doSignOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-2"><SignOut size={18} /> Sign out</button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/login" className="ml-1 hidden h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium transition hover:border-accent hover:text-accent md:inline-flex">
              <SignIn size={18} /> Sign in
            </Link>
          )}
          <button onClick={() => setOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full md:hidden hover:bg-surface-2" aria-label="Menu" aria-expanded={open}>
            {open ? <X size={22} /> : <List size={22} />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-line md:hidden">
            <div className="flex flex-col gap-1 px-4 py-3">
              {LINKS.map((l) => (
                <Link key={l.to} to={l.to} className={cx('rounded-xl px-3 py-2.5 text-base', isActive(l.to) ? 'bg-surface-2 text-ink' : 'text-muted')}>{l.label}</Link>
              ))}
              <div className="my-1 h-px bg-line" />
              {user ? (
                <>
                  <span className="px-3 pt-1 text-sm text-muted">Signed in as {user.name}</span>
                  <Link to="/wishlist" className="rounded-xl px-3 py-2.5 text-base text-ink">Wishlist ({wish.count})</Link>
                  <button onClick={doSignOut} className="rounded-xl px-3 py-2.5 text-left text-base text-muted">Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="rounded-xl px-3 py-2.5 text-base text-ink">Sign in</Link>
                  <Link to="/register" className="rounded-xl px-3 py-2.5 text-base text-accent">Create an account</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
