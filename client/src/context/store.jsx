import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react';
import { api, customerToken } from '../lib/api.js';

const read = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };

// ---------- Cart ----------
const CartCtx = createContext(null);
export function CartProvider({ children }) {
  const [lines, setLines] = useState(() => read('rr_cart', []));
  useEffect(() => write('rr_cart', lines), [lines]);
  const add = useCallback((line) => setLines((ls) => [...ls, { ...line, key: Date.now() + '-' + Math.random().toString(36).slice(2, 6) }]), []);
  const remove = useCallback((key) => setLines((ls) => ls.filter((l) => l.key !== key)), []);
  const update = useCallback((key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l))), []);
  const clear = useCallback(() => setLines([]), []);
  const value = useMemo(() => ({ lines, add, remove, update, clear, count: lines.reduce((s, l) => s + l.qty, 0) }), [lines, add, remove, update, clear]);
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
export const useCart = () => useContext(CartCtx);

// ---------- Toasts ----------
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-lift"
            >
              {t.tone === 'bad'
                ? <WarningCircle size={20} weight="fill" className="mt-px shrink-0 text-bad" />
                : <CheckCircle size={20} weight="fill" className="mt-px shrink-0 text-ok" />}
              <span className="text-ink">{t.message}</span>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="ml-1 text-muted hover:text-ink" aria-label="Dismiss">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---------- Theme ----------
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('rr_theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
    setDark(next);
  };
  return { dark, toggle };
}

export const lastPhone = {
  get: () => read('rr_phone', ''),
  set: (p) => write('rr_phone', p),
};

// ---------- Customer account ----------
const AuthCtx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!customerToken.get());

  useEffect(() => {
    if (!customerToken.get()) return;
    api.auth.me()
      .then((d) => setUser(d.user))
      .catch(() => customerToken.set(''))
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback(async (identifier, password) => {
    const d = await api.auth.login(identifier, password);
    customerToken.set(d.token);
    setUser(d.user);
    return d.user;
  }, []);
  const register = useCallback(async (data) => {
    const d = await api.auth.register(data);
    customerToken.set(d.token);
    setUser(d.user);
    return d.user;
  }, []);
  const signOut = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* token already invalid */ }
    customerToken.set('');
    setUser(null);
  }, []);
  // Called when an API call returns 401 (expired session).
  const expire = useCallback(() => { customerToken.set(''); setUser(null); }, []);

  const value = useMemo(() => ({ user, ready, signIn, register, signOut, expire }), [user, ready, signIn, register, signOut, expire]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

// ---------- Wishlist (saved to the customer's account) ----------
const WishCtx = createContext(null);
export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => new Set());
  useEffect(() => {
    if (!user) { setIds(new Set()); return; }
    api.wishlist().then((items) => setIds(new Set(items.map((i) => i.id)))).catch(() => {});
  }, [user]);
  // Returns 'auth' when the visitor must sign in first, otherwise the new saved state.
  const toggle = useCallback(async (id) => {
    if (!user) return 'auth';
    const saved = ids.has(id);
    setIds((s) => { const n = new Set(s); saved ? n.delete(id) : n.add(id); return n; });
    try { saved ? await api.wishRemove(id) : await api.wishAdd(id); } catch {
      setIds((s) => { const n = new Set(s); saved ? n.add(id) : n.delete(id); return n; });
      throw new Error('Could not update your wishlist. Try again.');
    }
    return !saved;
  }, [user, ids]);
  const value = useMemo(() => ({ ids, has: (id) => ids.has(id), toggle, count: ids.size }), [ids, toggle]);
  return <WishCtx.Provider value={value}>{children}</WishCtx.Provider>;
}
export const useWishlist = () => useContext(WishCtx);
