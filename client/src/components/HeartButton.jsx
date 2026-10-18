import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Heart } from '@phosphor-icons/react';
import { useToast, useWishlist } from '../context/store.jsx';
import { cx } from './ui.jsx';

// Save / unsave an item to the signed-in customer's wishlist.
export default function HeartButton({ item, className, withLabel = false }) {
  const wish = useWishlist();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const saved = wish.has(item.id);

  const click = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const r = await wish.toggle(item.id);
      if (r === 'auth') { toast('Sign in to save items to your wishlist'); nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`); return; }
      toast(r ? `${item.name} saved to your wishlist` : `${item.name} removed from your wishlist`);
    } catch (err) { toast(err.message, 'bad'); }
  };

  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${item.name} from wishlist` : `Save ${item.name} to wishlist`}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full transition active:scale-95',
        withLabel ? 'h-12 border border-line bg-surface px-5 text-sm font-medium hover:border-accent' : 'h-9 w-9 bg-surface/95 shadow-soft backdrop-blur hover:scale-105',
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={saved ? 'on' : 'off'} initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0.4 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} className="grid place-items-center">
          <Heart size={withLabel ? 20 : 18} weight={saved ? 'fill' : 'regular'} className={saved ? 'text-bad' : 'text-ink'} />
        </motion.span>
      </AnimatePresence>
      {withLabel && (saved ? 'Saved' : 'Save')}
    </button>
  );
}
