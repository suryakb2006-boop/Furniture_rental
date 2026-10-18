import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, DownloadSimple, Couch } from '@phosphor-icons/react';
import { api } from '../lib/api.js';
import { inr, fmtDate, amountInWords } from '../lib/format.js';
import { Button, Skeleton } from '../components/ui.jsx';

// GST tax invoice. "Download PDF" opens the browser's print dialog where the invoice can be saved as a PDF.
export default function Invoice() {
  const { code } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.invoice(code).then(setD).catch((e) => setError(e.message)); }, [code]);
  useEffect(() => { if (d) document.title = `Invoice ${d.invoiceNo} | RentRoom`; return () => { document.title = 'RentRoom | Furniture rental for homes, offices and events'; }; }, [d]);

  if (error) return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold">Invoice not available</h1><p className="text-muted">{error}</p>
      <Button as={Link} to={`/login?next=/invoice/${code}`}>Sign in</Button>
    </div>
  );
  if (!d) return <div className="mx-auto max-w-4xl px-4 py-10"><Skeleton className="h-[640px]" /></div>;

  const { seller, order: o } = d;
  const half = (n) => Math.round(n / 2);
  const rows = o.items.map((i) => ({ key: `i${i.id}`, desc: `${i.name}${i.bundle_name ? ` (${i.bundle_name})` : ''}`, sub: `${fmtDate(i.start_date)} to ${fmtDate(i.end_date)}`, qty: i.qty, days: i.days, rate: i.rate, amount: i.rent }));
  const lateFee = o.status === 'Returned' ? o.late_fee : 0;
  if (lateFee) rows.push({ key: 'late', desc: `Late return charge, ${o.late_days} day${o.late_days === 1 ? '' : 's'}`, sub: `Returned ${fmtDate(o.returned_on)}`, qty: '', days: o.late_days, rate: '', amount: lateFee });
  const taxable = o.subtotal + lateFee;
  const gst = o.gst + (o.status === 'Returned' ? o.late_gst : 0);
  const invoiceTotal = taxable + gst + o.delivery;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-8 pt-8 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button onClick={() => nav(-1)} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft size={16} /> Back</button>
        <Button onClick={() => window.print()}><DownloadSimple size={18} /> Download PDF</Button>
      </div>

      <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="invoice rounded-2xl border border-line bg-surface p-6 text-sm shadow-soft sm:p-10 print:rounded-none print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 font-display text-xl font-semibold"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-ink"><Couch size={20} weight="bold" /></span>{seller.name}</span>
            <span className="text-muted">{seller.address}</span>
            <span className="text-muted">GSTIN <span className="tabular text-ink">{seller.gstin}</span>, State {seller.state}</span>
            <span className="text-muted">{seller.email}, {seller.phone}</span>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="font-display text-2xl font-semibold">Tax invoice</span>
            <span>Invoice no. <span className="tabular font-medium">{d.invoiceNo}</span></span>
            <span>Date <span className="tabular">{fmtDate(o.created_at.slice(0, 10))} {o.created_at.slice(0, 4)}</span></span>
            <span>Order <span className="tabular font-medium">{o.order_code}</span></span>
          </div>
        </header>

        <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
          <div><div className="text-xs font-semibold uppercase tracking-wider text-muted">Billed to</div><div className="mt-1 font-medium">{o.customer_name}</div><div>{o.address}</div><div className="tabular">{o.phone}{o.email ? `, ${o.email}` : ''}</div></div>
          <div className="sm:text-right"><div className="text-xs font-semibold uppercase tracking-wider text-muted">Rental</div><div className="mt-1">{o.purpose} use, {fmtDate(o.start_date)} to {fmtDate(o.end_date)}</div><div>Place of supply: Tamil Nadu</div><div>Payment: {o.payment_method}, {o.payment_status}</div></div>
        </section>

        <div className="overflow-x-auto py-6">
          <table className="w-full min-w-[560px]">
            <thead><tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">Description</th><th className="px-3 py-2 font-medium">SAC</th><th className="px-3 py-2 text-right font-medium">Qty</th><th className="px-3 py-2 text-right font-medium">Days</th><th className="px-3 py-2 text-right font-medium">Rate / day</th><th className="py-2 pl-3 text-right font-medium">Amount</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-line/60 align-top">
                  <td className="py-3 pr-3"><div className="font-medium">{r.desc}</div><div className="text-xs text-muted">{r.sub}</div></td>
                  <td className="tabular px-3 py-3">{seller.sac}</td>
                  <td className="tabular px-3 py-3 text-right">{r.qty}</td>
                  <td className="tabular px-3 py-3 text-right">{r.days}</td>
                  <td className="tabular px-3 py-3 text-right">{r.rate !== '' ? inr(r.rate) : ''}</td>
                  <td className="tabular py-3 pl-3 text-right">{inr(r.amount)}</td>
                </tr>
              ))}
              {o.extensions?.map((x) => (
                <tr key={`x${x.id}`} className="border-b border-line/60 text-xs text-muted"><td colSpan={6} className="py-2">Includes extension from {fmtDate(x.old_end)} to {fmtDate(x.new_end)} ({x.extra_days} days, {inr(x.rent)} + GST, paid by {x.payment_method})</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="grid gap-6 sm:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-2 text-muted">
            {o.discount > 0 && <span>Discounts applied (duration and packs): {inr(o.discount)}</span>}
            <span>Amount in words: <span className="text-ink">Rupees {amountInWords(invoiceTotal)} only</span></span>
            <span>The refundable security deposit is not a taxable supply and is shown separately below.</span>
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
            <dt className="text-muted">Taxable value</dt><dd className="tabular text-right">{inr(taxable)}</dd>
            <dt className="text-muted">CGST 9%</dt><dd className="tabular text-right">{inr(half(gst))}</dd>
            <dt className="text-muted">SGST 9%</dt><dd className="tabular text-right">{inr(gst - half(gst))}</dd>
            <dt className="text-muted">Delivery and pick-up</dt><dd className="tabular text-right">{o.delivery ? inr(o.delivery) : 'Free'}</dd>
            <dt className="border-t border-line pt-2 font-semibold">Invoice total</dt><dd className="tabular border-t border-line pt-2 text-right font-semibold">{inr(invoiceTotal)}</dd>
            <dt className="pt-3 text-muted">Security deposit held</dt><dd className="tabular pt-3 text-right">{inr(o.deposit)}</dd>
            {o.status === 'Returned' && <>
              {o.damage_charge > 0 && <><dt className="text-muted">Damage deducted ({o.damage_level})</dt><dd className="tabular text-right">- {inr(o.damage_charge)}</dd></>}
              <dt className="text-muted">Deposit refunded</dt><dd className="tabular text-right">{inr(o.deposit_refund ?? o.deposit)}</dd>
              {o.balance_due > 0 && <><dt className="font-semibold text-bad">Balance due</dt><dd className="tabular text-right font-semibold text-bad">{inr(o.balance_due)}</dd></>}
            </>}
          </dl>
        </section>

        <footer className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-line pt-6 text-xs text-muted">
          <span>This is a computer-generated invoice for a hackathon prototype. Payments shown were simulated.</span>
          <span className="text-right">For {seller.name}<br /><span className="mt-6 inline-block text-ink">Authorised signatory</span></span>
        </footer>
      </motion.article>
    </div>
  );
}
