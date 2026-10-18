import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LinkSimple, UploadSimple, CheckCircle, WarningCircle, CircleNotch, Trash, Image as ImageIcon } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { cx, inputCls } from './ui.jsx';

// Product image: paste a link or upload from the computer. The preview loads the image so the admin can
// see straight away whether it works (with its size) or fails.
export default function ImageField({ id, label, value, onChange, optional }) {
  const [mode, setMode] = useState(value && value.startsWith('/uploads/') ? 'upload' : 'link');
  const [status, setStatus] = useState(value ? 'loading' : 'empty'); // empty | loading | ok | error
  const [size, setSize] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { setStatus(value ? 'loading' : 'empty'); setSize(null); }, [value]);

  const upload = async (file) => {
    if (!file) return;
    setErr('');
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) { setErr('Choose a PNG, JPG, WEBP or GIF image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setErr('Image must be 5 MB or smaller.'); return; }
    setBusy(true);
    try {
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      const { url } = await api.admin.upload(dataUrl);
      onChange(url);
    } catch (e) { setErr(e.message || 'Upload failed.'); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}{optional && <span className="font-normal text-muted"> (optional)</span>}</span>
        <div className="flex rounded-full border border-line p-0.5 text-xs" role="tablist">
          {[['link', 'Paste link', LinkSimple], ['upload', 'Upload', UploadSimple]].map(([m, t, Icon]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              className={cx('flex items-center gap-1 rounded-full px-3 py-1.5 transition', mode === m ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink')}>
              <Icon size={13} /> {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <div className="flex flex-col gap-2">
          {mode === 'link' ? (
            <input id={id} value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="https://images.unsplash.com/photo-..." className={inputCls} />
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm text-muted transition hover:border-accent hover:text-accent"
            >
              {busy ? <><CircleNotch size={16} className="animate-spin" /> Uploading...</> : <><UploadSimple size={16} /> Choose or drop an image</>}
              <input ref={fileRef} id={id} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.p key={err || status} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={cx('flex items-center gap-1.5 text-xs', err || status === 'error' ? 'text-bad' : status === 'ok' ? 'text-ok' : 'text-muted')}>
              {err ? <><WarningCircle size={14} /> {err}</>
                : status === 'ok' ? <><CheckCircle size={14} weight="fill" /> Image loaded{size ? `, ${size.w} x ${size.h} px` : ''}. It will show on the website.</>
                : status === 'error' ? <><WarningCircle size={14} /> This image could not be loaded. Check the link or upload a file instead.</>
                : status === 'loading' ? <><CircleNotch size={14} className="animate-spin" /> Checking image...</>
                : 'No image yet. The category icon is shown until you add one.'}
            </motion.p>
          </AnimatePresence>
          {value && <button type="button" onClick={() => onChange('')} className="flex w-fit items-center gap-1 text-xs text-muted hover:text-bad"><Trash size={12} /> Remove image</button>}
        </div>
        <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border border-line bg-surface-2">
          {!value || status === 'error' ? <ImageIcon size={28} weight="thin" className="text-muted" /> : null}
          {value && (
            <motion.img key={value} src={value} alt="Preview" initial={{ opacity: 0 }} animate={{ opacity: status === 'ok' ? 1 : 0 }}
              onLoad={(e) => { setStatus('ok'); setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight }); }}
              onError={() => setStatus('error')} className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
      </div>
    </div>
  );
}
