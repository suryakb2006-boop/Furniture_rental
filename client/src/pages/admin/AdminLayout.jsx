import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChartBar, Couch, Receipt, CalendarBlank, SignOut, Lock } from '@phosphor-icons/react';
import { api, adminToken } from '../../lib/api.js';
import { Button, Field, inputCls, cx } from '../../components/ui.jsx';

const TABS = [
  { to: '/admin', end: true, label: 'Overview', icon: ChartBar },
  { to: '/admin/listings', label: 'Listings', icon: Couch },
  { to: '/admin/orders', label: 'Orders', icon: Receipt },
  { to: '/admin/availability', label: 'Availability', icon: CalendarBlank },
];

function Login({ onDone }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { const { token } = await api.admin.login(pw); adminToken.set(token); onDone(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20">
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-7 shadow-soft">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent"><Lock size={22} /></span>
        <div><h1 className="text-2xl font-semibold">Admin console</h1><p className="mt-1 text-sm text-muted">Manage listings, rental orders and stock.</p></div>
        <Field label="Password" htmlFor="a-pw" error={error} hint="Demo password: admin123">
          <input id="a-pw" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} />
        </Field>
        <Button type="submit" size="lg" disabled={busy || !pw}>{busy ? 'Signing in...' : 'Sign in'}</Button>
      </motion.form>
    </div>
  );
}

export default function AdminLayout() {
  const [authed, setAuthed] = useState(!!adminToken.get());
  const nav = useNavigate();
  const logout = () => { adminToken.set(''); setAuthed(false); nav('/admin'); };
  const onAuthError = () => { adminToken.set(''); setAuthed(false); };

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Admin console</h1>
        <Button variant="ghost" size="sm" onClick={logout}><SignOut size={16} /> Sign out</Button>
      </div>
      <nav className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cx('relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm transition', isActive ? 'text-ink' : 'text-muted hover:text-ink')}>
            {({ isActive }) => (<>
              <t.icon size={18} /> {t.label}
              {isActive && <motion.span layoutId="admin-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
            </>)}
          </NavLink>
        ))}
      </nav>
      <div className="pt-8"><Outlet context={{ onAuthError }} /></div>
    </div>
  );
}
