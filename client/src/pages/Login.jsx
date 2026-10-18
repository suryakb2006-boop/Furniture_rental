import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeSlash, WarningCircle, CircleNotch, UserCircle } from '@phosphor-icons/react';
import { useAuth, useToast } from '../context/store.jsx';
import AuthShell, { AuthLink } from '../components/AuthShell.jsx';
import { Button, Field, inputCls, cx } from '../components/ui.jsx';

export default function Login() {
  const { user, signIn } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [sp] = useSearchParams();
  const next = sp.get('next') || '/';
  const [f, setF] = useState({ identifier: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user && !busy) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!f.identifier.trim() || !f.password) { setError('Enter your email or mobile number and your password.'); return; }
    setBusy(true); setError('');
    try {
      const u = await signIn(f.identifier.trim(), f.password);
      toast(`Welcome back, ${u.name.split(' ')[0]}`);
      nav(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle={loc.state?.reason === 'auth' || sp.get('next') ? 'Sign in to continue. Your cart is saved.' : 'Welcome back. Pick up where you left off.'}
      footer={<>New to RentRoom? <AuthLink to={`/register${sp.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</AuthLink></>}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="Email or mobile number" htmlFor="l-id">
          <input id="l-id" autoFocus autoComplete="username" value={f.identifier} onChange={(e) => setF((x) => ({ ...x, identifier: e.target.value }))} placeholder="you@example.com or 98xxxxxxxx" className={inputCls} />
        </Field>
        <Field label="Password" htmlFor="l-pw">
          <div className="relative">
            <input id="l-pw" type={show ? 'text' : 'password'} autoComplete="current-password" value={f.password} onChange={(e) => setF((x) => ({ ...x, password: e.target.value }))} className={cx(inputCls, 'pr-11')} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -3, 0] }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 rounded-xl bg-bad/10 p-3 text-sm text-bad">
              <WarningCircle size={18} className="mt-px shrink-0" /> {error}
            </motion.p>
          )}
        </AnimatePresence>

        <Button type="submit" size="lg" disabled={busy}>{busy ? <><CircleNotch size={18} className="animate-spin" /> Signing in...</> : 'Sign in'}</Button>
      </form>

      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-4 text-sm">
        <UserCircle size={32} weight="light" className="shrink-0 text-accent" />
        <div className="flex-1">
          <div className="font-medium">Demo customer</div>
          <div className="tabular text-muted">9840213576, password Rent@1234</div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => { setF({ identifier: '9840213576', password: 'Rent@1234' }); setError(''); }}>Fill in</Button>
      </div>
    </AuthShell>
  );
}
