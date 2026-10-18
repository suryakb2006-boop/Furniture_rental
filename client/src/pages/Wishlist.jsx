import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { useWishlist } from '../context/store.jsx';
import FurnitureCard from '../components/FurnitureCard.jsx';
import { Button, EmptyState, Skeleton, stagger } from '../components/ui.jsx';

export default function Wishlist() {
  const wish = useWishlist();
  const [items, setItems] = useState(null);
  useEffect(() => { api.wishlist().then(setItems).catch(() => setItems([])); }, []);
  const shown = (items || []).filter((i) => wish.has(i.id)); // hides an item as soon as it is un-hearted

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold md:text-4xl">Wishlist</h1>
      <p className="mt-2 text-muted">Furniture you saved for later, with live stock for today.</p>
      <div className="mt-8">
        {items === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80" />)}</div>
        ) : shown.length === 0 ? (
          <EmptyState icon={Heart} title="Nothing saved yet" body="Tap the heart on any item to keep it here while you plan." action={<Button as={Link} to="/browse">Browse furniture</Button>} />
        ) : (
          <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((i) => <FurnitureCard key={i.id} item={i} />)}
          </motion.div>
        )}
      </div>
    </div>
  );
}
