import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, PencilSimple, Trash, MagnifyingGlass, DownloadSimple } from '@phosphor-icons/react';
import { api } from '../../lib/api.js';
import { inr } from '../../lib/format.js';
import { useToast } from '../../context/store.jsx';
import { Badge, Button, CONDITION_TONE, Field, ItemImage, Modal, Skeleton, inputCls, cx } from '../../components/ui.jsx';
import ImageField from '../../components/ImageField.jsx';

const CATEGORIES = ['Sofa', 'Bed', 'Chair', 'Table', 'Desk', 'Storage', 'Decor'];
const CONDITIONS = ['New', 'Like New', 'Good'];
const USES = ['Home', 'Office', 'Event'];
const STATUSES = ['Available', 'Maintenance', 'Unlisted'];
const STATUS_TONE = { Available: 'ok', Maintenance: 'warn', Unlisted: 'neutral' };
const EMPTY = { name: '', category: 'Sofa', price_per_day: '', deposit: '', condition: 'New', stock: 1, uses: ['Home'], status: 'Available', description: '', image_url: '', image_url_2: '', price_per_month: '', width_cm: '', depth_cm: '' };

function ItemForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggleUse = (u) => setF((x) => ({ ...x, uses: x.uses.includes(u) ? x.uses.filter((y) => y !== u) : [...x.uses, u] }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await onSave(f); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Item name" htmlFor="i-name" className="sm:col-span-2"><input id="i-name" required value={f.name} onChange={set('name')} className={inputCls} /></Field>
      <Field label="Category" htmlFor="i-cat"><select id="i-cat" value={f.category} onChange={set('category')} className={inputCls}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Condition" htmlFor="i-cond"><select id="i-cond" value={f.condition} onChange={set('condition')} className={inputCls}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Rental price per day (₹)" htmlFor="i-price"><input id="i-price" type="number" min="1" required value={f.price_per_day} onChange={set('price_per_day')} className={inputCls} /></Field>
      <Field label="Monthly plan price (₹)" htmlFor="i-month" hint="Charged pro rata for rentals of 30 days or more."><input id="i-month" type="number" min="1" required value={f.price_per_month ?? ''} onChange={set('price_per_month')} className={inputCls} /></Field>
      <Field label="Size: width x depth (cm)" htmlFor="i-w" hint="Used by the Room Fit Check in the planner.">
        <div className="flex items-center gap-2">
          <input id="i-w" type="number" min="10" max="1000" value={f.width_cm ?? ''} onChange={set('width_cm')} placeholder="210" className={inputCls} />
          <span className="text-muted">x</span>
          <input aria-label="Depth in cm" type="number" min="10" max="1000" value={f.depth_cm ?? ''} onChange={set('depth_cm')} placeholder="90" className={inputCls} />
        </div>
      </Field>
      <Field label="Deposit per unit (₹)" htmlFor="i-dep"><input id="i-dep" type="number" min="0" value={f.deposit} onChange={set('deposit')} className={inputCls} /></Field>
      <Field label="Units in stock" htmlFor="i-stock"><input id="i-stock" type="number" min="0" required value={f.stock} onChange={set('stock')} className={inputCls} /></Field>
      <Field label="Status" htmlFor="i-status"><select id="i-status" value={f.status} onChange={set('status')} className={inputCls}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Suitable for" className="sm:col-span-2">
        <div className="flex gap-2">{USES.map((u) => (
          <button type="button" key={u} onClick={() => toggleUse(u)} aria-pressed={f.uses.includes(u)} className={cx('h-9 rounded-full border px-4 text-sm', f.uses.includes(u) ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>{u}</button>
        ))}</div>
      </Field>
      <div className="flex flex-col gap-5 rounded-2xl border border-line p-4 sm:col-span-2">
        <ImageField id="i-img" label="Main image" value={f.image_url || ''} onChange={(v) => setF((x) => ({ ...x, image_url: v }))} />
        <ImageField id="i-img2" label="Second image" optional value={f.image_url_2 || ''} onChange={(v) => setF((x) => ({ ...x, image_url_2: v }))} />
      </div>
      <Field label="Description" htmlFor="i-desc" className="sm:col-span-2"><textarea id="i-desc" rows={3} value={f.description} onChange={set('description')} className={cx(inputCls, 'h-auto py-3')} /></Field>
      {error && <p className="rounded-xl bg-bad/10 p-3 text-sm text-bad sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Saving...' : initial.id ? 'Save changes' : 'Add listing'}</Button>
      </div>
    </form>
  );
}

export default function Listings() {
  const { onAuthError } = useOutletContext();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [q, setQ] = useState('');

  const fail = useCallback((e) => (e.status === 401 ? onAuthError() : toast(e.message, 'bad')), [onAuthError, toast]);
  const load = useCallback(() => api.admin.furniture().then(setItems).catch(fail), [fail]);
  useEffect(() => { load(); }, [load]);

  const save = async (f) => {
    const body = { ...f, price_per_day: Number(f.price_per_day), price_per_month: Number(f.price_per_month), deposit: Number(f.deposit || 0), stock: Number(f.stock) };
    if (f.id) { await api.admin.update(f.id, body); toast(`${f.name} updated`); } else { await api.admin.create(body); toast(`${f.name} added to the catalogue`); }
    setEditing(null); load();
  };
  const setStatus = async (item, status) => {
    try { await api.admin.update(item.id, { status }); toast(`${item.name} set to ${status}`); load(); } catch (e) { fail(e); }
  };
  const remove = async (item) => {
    try {
      const r = await api.admin.remove(item.id);
      toast(r.archived ? `${item.name} has rental history, so it was unlisted instead of deleted` : `${item.name} deleted`);
      load();
    } catch (e) { fail(e); }
    setConfirmDel(null);
  };

  const shown = (items || []).filter((i) => !q || (i.name + i.category).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input aria-label="Search listings" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search listings" className={cx(inputCls, 'pl-10')} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={async () => { try { toast(`Downloaded ${await api.admin.download('furniture.csv')}`); } catch (e) { fail(e); } }}><DownloadSimple size={18} /> Export CSV</Button>
          <Button onClick={() => setEditing(EMPTY)}><Plus size={18} weight="bold" /> Add furniture</Button>
        </div>
      </div>

      {!items ? <Skeleton className="h-96" /> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-medium">Item</th><th className="px-3 py-3 font-medium">Price / day, month</th><th className="px-3 py-3 font-medium">Condition</th>
                <th className="px-3 py-3 font-medium">Stock</th><th className="px-3 py-3 font-medium">Free today</th><th className="px-3 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {shown.map((i) => (
                  <motion.tr key={i.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-line last:border-0 hover:bg-surface-2/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ItemImage item={i} className="h-11 w-14 shrink-0" rounded="rounded-xl" />
                        <div><div className="font-medium">{i.name}</div><div className="text-xs text-muted">{i.category}, {i.uses.join(' / ')}</div></div>
                      </div>
                    </td>
                    <td className="tabular px-3 py-3">{inr(i.price_per_day)}<div className="text-xs text-muted">{inr(i.price_per_month)} / mo</div></td>
                    <td className="px-3 py-3"><Badge tone={CONDITION_TONE[i.condition]}>{i.condition}</Badge></td>
                    <td className="tabular px-3 py-3">{i.stock}</td>
                    <td className="tabular px-3 py-3">{i.status === 'Available' ? i.free : '-'}</td>
                    <td className="px-3 py-3">
                      <select aria-label={`Status of ${i.name}`} value={i.status} onChange={(e) => setStatus(i, e.target.value)} className={cx('h-8 rounded-full border-0 px-3 text-xs font-medium', { ok: 'bg-ok/12 text-ok', warn: 'bg-warn/14 text-warn', neutral: 'bg-surface-2 text-muted' }[STATUS_TONE[i.status]])}>
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {confirmDel === i.id ? (
                          <>
                            <Button size="sm" variant="danger" onClick={() => remove(i)}>Confirm delete</Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDel(null)}>Keep</Button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditing({ ...i })} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink" aria-label={`Edit ${i.name}`}><PencilSimple size={18} /></button>
                            <button onClick={() => setConfirmDel(i.id)} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-bad/10 hover:text-bad" aria-label={`Delete ${i.name}`}><Trash size={18} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.name}` : 'Add furniture'} wide>
        {editing && <ItemForm key={editing.id || 'new'} initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
