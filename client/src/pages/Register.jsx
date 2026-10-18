import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeSlash, WarningCircle, CircleNotch, Check, Circle } from '@phosphor-icons/react';
import { useAuth, useToast } from '../context/store.jsx';
import AuthShell, { AuthLink } from '../components/AuthShell.jsx';
import { Button, Field, inputCls, cx } from '../components/ui.jsx';

const RULES = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[A-Za-z]/.test(p), label: 'A letter' },
  { test: (p) => /\d/.test(p), label: 'A number' },
];

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
  if (!/^[6-9]\d{9}$/.test(f.phone)) e.phone = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.';
  if (!RULES.every((r) => r.test(f.password))) e.password = 'Your password needs all three items below.';
  if (f.confirm !== f.password) e.confirm = 'Passwords do not match.';
  if (!f.agree) e.agree = 'Please accept the rental terms to continue.';
  return e;
}

export default function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get('next') || '/browse';
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm: '', agree: false });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user && !busy) return <Navigate to={next} replace />;

  const set = (k) => (e) => {
    const v = k === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : k === 'agree' ? e.target.checked : e.target.value;
    setF((x) => ({ ...x, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setServerError('');
    try {
      const u = await register({ name: f.name.trim(), email: f.email.trim(), phone: f.phone, password: f.password });
      toast(`Account created. Welcome, ${u.name.split(' ')[0]}`);
      nav(next, { replace: true });
    } catch (err) {
      if (err.data?.fields) setErrors(err.data.fields);
      else setServerError(err.message);
      setBusy(false);
    }
  };

  const strength = RULES.filter((r) => r.test(f.password)).length;

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes a minute. You need an account to book and track rentals."
      footer={<>Already have an account? <AuthLink to={`/login${sp.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}>Sign in</AuthLink></>}
    >
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="r-name" error={errors.name} className="sm:col-span-2">
          <input id="r-name" autoFocus autoComplete="name" value={f.name} onChange={set('name')} className={inputCls} />
        </Field>
        <Field label="Email" htmlFor="r-email" error={errors.email}>
          <input id="r-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} placeholder="you@example.com" className={inputCls} />
        </Field>
        <Field label="Mobile number" htmlFor="r-phone" error={errors.phone}>
          <input id="r-phone" inputMode="numeric" autoComplete="tel" value={f.phone} onChange={set('phone')} placeholder="98xxxxxxxx" className={cx(inputCls, 'tabular')} />
        </Field>
        <Field label="Password" htmlFor="r-pw" error={errors.password} className="sm:col-span-2">
          <div className="relative">
            <input id="r-pw" type={show ? 'text' : 'password'} autoComplete="new-password" value={f.password} onChange={set('password')} className={cx(inputCls, 'pr-11')} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="mt-1 flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="h-1 flex-1 rounded-full bg-line" animate={{ backgroundColor: i < strength ? (strength === 3 ? 'var(--ok)' : 'var(--warn)') : 'var(--line)' }} />
            ))}
          </div>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {RULES.map((r) => {
              const ok = r.test(f.password);
              return (
                <li key={r.label} className={cx('flex items-center gap-1.5 transition-colors', ok ? 'text-ok' : 'text-muted')}>
                  {ok ? <Check size={12} weight="bold" /> : <Circle size={10} />} {r.label}
                </li>
              );
            })}
          </ul>
        </Field>
        <Field label="Confirm password" htmlFor="r-confirm" error={errors.confirm} className="sm:col-span-2">
          <input id="r-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={f.confirm} onChange={set('confirm')} className={inputCls} />
        </Field>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" checked={f.agree} onChange={set('agree')} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]" />
            <span className="text-muted">I agree to the rental terms: furniture is returned in the condition received, and damage is charged against the deposit.</span>
          </label>
          {errors.agree && <p className="text-sm text-bad">{errors.agree}</p>}
        </div>

        <AnimatePresence>
          {serverError && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 rounded-xl bg-bad/10 p-3 text-sm text-bad sm:col-span-2">
              <WarningCircle size={18} className="mt-px shrink-0" /> {serverError}
            </motion.p>
          )}
        </AnimatePresence>

        <Button type="submit" size="lg" disabled={busy} className="sm:col-span-2">
          {busy ? <><CircleNotch size={18} className="animate-spin" /> Creating account...</> : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
}
