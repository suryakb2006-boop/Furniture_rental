// Core business rules: dates, pricing and availability. Shared by the API and the seed script.

export const ACTIVE_STATUSES = ['Confirmed', 'Delivered'];
export const GST_RATE = 0.18;
export const DELIVERY_FEE = 299;
export const FREE_DELIVERY_ABOVE = 5000;
export const MAX_RENTAL_DAYS = 180;
// Late returns: each day past the end date is charged at this multiple of the booked daily rate (no discount), plus GST.
export const LATE_FEE_MULTIPLIER = 1;

// ---------- Dates (YYYY-MM-DD strings, local time) ----------
export function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export const today = () => toISO(new Date());
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + n));
}
export function daysInclusive(start, end) {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}
export const isISODate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function validatePeriod(start, end) {
  if (!isISODate(start) || !isISODate(end)) return 'Choose a start and end date.';
  if (start < today()) return 'The start date cannot be in the past.';
  if (end < start) return 'The end date must be on or after the start date.';
  if (daysInclusive(start, end) > MAX_RENTAL_DAYS) return `Rentals can run for at most ${MAX_RENTAL_DAYS} days.`;
  return null;
}

// ---------- Pricing ----------
// Short rentals use the daily price (10% off from 7 days). From 30 days the item's monthly plan price applies,
// charged pro rata per day, the way long-term furniture rental is priced in practice.
export const MONTHLY_FROM_DAYS = 30;
export function discountRate(days) {
  if (days >= 30) return 0.25; // only used for items without a monthly price
  if (days >= 7) return 0.1;
  return 0;
}

export function quoteLine(item, qty, start, end) {
  const days = daysInclusive(start, end);
  const base = item.price_per_day * days * qty;
  const deposit = item.deposit * qty;
  if (days >= MONTHLY_FROM_DAYS && item.price_per_month > 0) {
    const rent = Math.min(base, Math.round((item.price_per_month * qty * days) / 30));
    // Monthly plans are a separate price list, not a discount, so base = rent here.
    return { days, base: rent, plan: 'monthly', discountRate: 0, discount: 0, rent, deposit, rate: Math.round(item.price_per_month / 30) };
  }
  const r = discountRate(days);
  const discount = Math.round(base * r);
  return { days, base, plan: r ? (days >= 30 ? 'monthly' : 'weekly') : 'daily', discountRate: r, discount, rent: base - discount, deposit, rate: item.price_per_day };
}

export function orderTotals(lines) {
  const base = lines.reduce((s, l) => s + l.base, 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  const subtotal = lines.reduce((s, l) => s + l.rent, 0);
  const gst = Math.round(subtotal * GST_RATE);
  const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const deposit = lines.reduce((s, l) => s + l.deposit, 0);
  return { base, discount, subtotal, gst, delivery, deposit, total: subtotal + gst + delivery + deposit };
}

// ---------- Availability ----------
// Returns { 'YYYY-MM-DD': unitsBooked } for one item over [start, end].
export function bookedByDay(all, furnitureId, start, end, extraLines = []) {
  // A Delivered line past its end date has not come back yet, so it keeps holding stock up to today.
  const rows = all(
    `SELECT oi.qty, oi.start_date, oi.end_date, o.status FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.furniture_id = ? AND o.status IN ('Confirmed','Delivered')
       AND oi.start_date <= ? AND (oi.end_date >= ? OR o.status = 'Delivered')`,
    [furnitureId, end, start]
  ).map((r) => ({ ...r, end_date: r.status === 'Delivered' && r.end_date < today() ? today() : r.end_date }));
  const lines = rows.concat(extraLines.filter((l) => l.furniture_id === furnitureId));
  const map = {};
  for (let d = start; d <= end; d = addDays(d, 1)) {
    let q = 0;
    for (const r of lines) if (r.start_date <= d && d <= r.end_date) q += r.qty;
    map[d] = q;
  }
  return map;
}

// Late charges for items returned (or still out) after their end date.
// items need: rate (booked price per day), qty, end_date. returnDate is the day the furniture came back (or today).
export function lateCharges(items, returnDate) {
  const lines = items.map((i) => {
    const days = returnDate > i.end_date ? daysInclusive(i.end_date, returnDate) - 1 : 0;
    const perDay = Math.round(i.rate * i.qty * LATE_FEE_MULTIPLIER);
    return { id: i.id, name: i.name, qty: i.qty, rate: i.rate, days, perDay, fee: perDay * days };
  });
  const fee = lines.reduce((s, l) => s + l.fee, 0);
  const gst = Math.round(fee * GST_RATE);
  const lateLines = lines.filter((l) => l.days > 0);
  const perDay = lateLines.reduce((s, l) => s + l.perDay, 0);
  return {
    days: Math.max(0, ...lines.map((l) => l.days)), fee, gst, total: fee + gst,
    perDayWithGst: Math.round(perDay * (1 + GST_RATE)), lines: lateLines,
  };
}

// Damage found at pick-up, charged as a share of the order's deposit (the admin can adjust the amount).
export const DAMAGE_LEVELS = { None: 0, Minor: 0.1, Major: 0.5, Lost: 1 };
export const damagePreset = (level, deposit) => Math.round((DAMAGE_LEVELS[level] ?? 0) * deposit);

// Price of extending an order's lines to a later end date, at the booked daily rate.
// Extra days use the booked plan's daily rate (monthly plans keep their low rate).
export function extensionQuote(items, newEnd) {
  const lines = items.filter((i) => i.end_date < newEnd).map((i) => {
    const days = daysInclusive(i.end_date, newEnd) - 1;
    const base = i.rate * i.qty * days;
    // Lines already on a monthly plan extend at the plan's daily equivalent; daily-plan lines get 10% off from 7 extra days.
    const monthlyPlan = i.price_per_day && i.rate < i.price_per_day;
    const discount = monthlyPlan ? 0 : Math.round(base * (days >= 7 ? 0.1 : 0));
    return { id: i.id, furniture_id: i.furniture_id, name: i.name, qty: i.qty, rate: i.rate, from: addDays(i.end_date, 1), days, base, discount, rent: base - discount };
  });
  const rent = lines.reduce((s, l) => s + l.rent, 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  const gst = Math.round(rent * GST_RATE);
  return { lines, days: Math.max(0, ...lines.map((l) => l.days)), rent, discount, gst, total: rent + gst };
}

// Late and damage charges are taken from the refundable deposit first; anything above it is a balance due.
export const settle = (deposit, lateTotal) => ({ refund: Math.max(0, deposit - lateTotal), due: Math.max(0, lateTotal - deposit) });

// Free units for the whole period = stock minus the busiest day.
export function freeUnits(all, item, start, end, extraLines = []) {
  if (item.status !== 'Available') return 0;
  const byDay = bookedByDay(all, item.id, start, end, extraLines);
  const peak = Math.max(0, ...Object.values(byDay));
  return Math.max(0, item.stock - peak);
}
