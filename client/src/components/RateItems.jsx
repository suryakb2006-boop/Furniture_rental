import { useState } from 'react';
import { Star } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { useToast } from '../context/store.jsx';
import { Button, ItemImage, Modal, Stars, inputCls, cx } from './ui.jsx';

const LABELS = ['', 'Poor', 'Below average', 'Good', 'Very good', 'Excellent'];

// After a rental is returned, the customer rates each item they rented.
export default function RateItems({ order, onDone }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const pending = order.items.filter((i) => !i.my_rating);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  if (order.status !== 'Returned') return null;
  if (!pending.length) return <span className="flex items-center gap-1.5 text-sm text-muted"><Star size={16} weight="fill" className="text-warn" /> You rated this rental</span>;

  const submit = async () => {
    const entries = pending.filter((i) => form[i.furniture_id]?.rating);
    if (!entries.length) { toast('Pick a star rating for at least one item', 'bad'); return; }
    setBusy(true);
    let updated = order;
    try {
      for (const i of entries) {
        updated = await api.addReview({ orderId: order.id, furnitureId: i.furniture_id, rating: form[i.furniture_id].rating, comment: form[i.furniture_id].comment || '' });
      }
      toast('Thanks for your review');
      setOpen(false);
      onDone(updated);
    } catch (e) { toast(e.message, 'bad'); } finally { setBusy(false); }
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Star size={16} /> Rate items</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="How was your rental?">
        <div className="flex flex-col gap-5">
          {pending.map((i) => {
            const v = form[i.furniture_id] || {};
            return (
              <div key={i.id} className="flex flex-col gap-3 border-b border-line pb-5 last:border-0">
                <div className="flex items-center gap-3">
                  <ItemImage item={i} className="h-12 w-14 shrink-0" rounded="rounded-xl" />
                  <div className="min-w-0"><div className="font-medium">{i.name}</div><div className={cx('text-sm', v.rating ? 'text-ink' : 'text-muted')}>{v.rating ? LABELS[v.rating] : 'Tap a star'}</div></div>
                </div>
                <Stars value={v.rating || 0} size={28} onChange={(r) => setForm((f) => ({ ...f, [i.furniture_id]: { ...v, rating: r } }))} />
                <textarea aria-label={`Comment on ${i.name}`} rows={2} maxLength={500} value={v.comment || ''} onChange={(e) => setForm((f) => ({ ...f, [i.furniture_id]: { ...v, comment: e.target.value } }))}
                  placeholder="What was good, what could be better? (optional)" className={cx(inputCls, 'h-auto py-2.5')} />
              </div>
            );
          })}
          <Button size="lg" disabled={busy} onClick={submit}>{busy ? 'Posting...' : 'Post review'}</Button>
        </div>
      </Modal>
    </>
  );
}
