// Formatting and the client-side price preview (the server recalculates everything at checkout).
export const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

export function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const today = () => toISO(new Date());
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + n));
}
export function daysInclusive(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}
const parse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
export const fmtDate = (iso) => (iso ? parse(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
export const fmtDateLong = (iso) => (iso ? parse(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const weekday = (iso) => parse(iso).toLocaleDateString('en-IN', { weekday: 'narrow' });
export const dayNum = (iso) => parse(iso).getDate();
export const fmtRange = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} to ${fmtDate(b)}`);

export const discountRate = (days) => (days >= 30 ? 0.25 : days >= 7 ? 0.1 : 0);

// Same rules as the server: daily price, 10% off from 7 days, monthly plan price from 30 days.
export function quoteLine(item, qty, start, end, bundlePct = 0) {
  const days = daysInclusive(start, end);
  const base = item.price_per_day * days * qty;
  let discount;
  let plan;
  let rate = 0;
  if (days >= 30 && item.price_per_month > 0) {
    // Monthly plan: its own price list, charged pro rata (not shown as a discount).
    const rent = Math.min(base, Math.round((item.price_per_month * qty * days) / 30));
    let d = 0;
    if (bundlePct) d = Math.round(rent * bundlePct / 100);
    return { days, base: rent, rate: 0, plan: 'monthly', discount: d, rent: rent - d, deposit: item.deposit * qty };
  } else {
    rate = discountRate(days);
    discount = Math.round(base * rate);
    plan = rate ? 'weekly' : 'daily';
  }
  if (bundlePct) discount += Math.round((base - discount) * bundlePct / 100); // pack discount on top, same as the server
  return { days, base, rate, plan, discount, rent: base - discount, deposit: item.deposit * qty };
}

// Indian-style amount in words for invoices, e.g. 45843 -> "Forty Five Thousand Eight Hundred Forty Three".
export function amountInWords(n) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x) => (x < 20 ? a[x] : `${b[Math.floor(x / 10)]} ${a[x % 10]}`.trim());
  const three = (x) => (x >= 100 ? `${a[Math.floor(x / 100)]} Hundred ${two(x % 100)}`.trim() : two(x));
  n = Math.round(n);
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (n) parts.push(three(n));
  return parts.join(' ');
}

export function totals(lines) {
  const subtotal = lines.reduce((s, l) => s + l.rent, 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  const gst = Math.round(subtotal * 0.18);
  const delivery = subtotal === 0 || subtotal >= 5000 ? 0 : 299;
  const deposit = lines.reduce((s, l) => s + l.deposit, 0);
  return { subtotal, discount, gst, delivery, deposit, total: subtotal + gst + delivery + deposit };
}

export function periodError(start, end) {
  if (!start || !end) return 'Choose a start and end date.';
  if (start < today()) return 'The start date cannot be in the past.';
  if (end < start) return 'The end date must be on or after the start date.';
  if (daysInclusive(start, end) > 180) return 'Rentals can run for at most 180 days.';
  return null;
}
