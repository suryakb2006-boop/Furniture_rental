// RentRoom API server (Express + SQLite).
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, all, get, run, transaction } from './db.js';
import { hashPassword, verifyPassword, createSession, userFromToken, validateRegistration } from './auth.js';
import { events, runReminders } from './notify.js';
import { buildPlan } from './planner.js';
import {
  today, addDays, validatePeriod, quoteLine, orderTotals, freeUnits, bookedByDay, isISODate, daysInclusive, lateCharges, settle,
  extensionQuote, DAMAGE_LEVELS, damagePreset, MAX_RENTAL_DAYS,
} from './logic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DECLINED_CARD = '4000000000000002';

await openDatabase();

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' })); // large enough for image uploads sent as data URLs
const UPLOADS = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });
app.use('/uploads', express.static(UPLOADS, { maxAge: '7d' }));

class ApiError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}
const wrap = (fn) => (req, res, next) => { try { const out = fn(req, res); if (out !== undefined) res.json(out); } catch (e) { next(e); } };

const CATEGORIES = ['Sofa', 'Bed', 'Chair', 'Table', 'Desk', 'Storage', 'Decor'];
const CONDITIONS = ['New', 'Like New', 'Good'];
const USES = ['Home', 'Office', 'Event'];
const STATUSES = ['Available', 'Maintenance', 'Unlisted'];

function ratingOf(furnitureId) {
  const r = get('SELECT ROUND(AVG(rating), 1) AS avg, COUNT(*) AS n FROM reviews WHERE furniture_id = ?', [furnitureId]);
  return { avg: r.avg || 0, count: r.n };
}

function shapeItem(row, start, end) {
  const s = start || today();
  const e = end || s;
  return {
    ...row,
    rating: ratingOf(row.id),
    uses: row.uses ? row.uses.split(',') : [],
    free: freeUnits(all, row, s, e),
    period: { start: s, end: e },
  };
}

// ---------------- Public: furniture ----------------
app.get('/api/meta', wrap(() => ({ categories: CATEGORIES, conditions: CONDITIONS, uses: USES, today: today() })));

app.get('/api/furniture', wrap((req) => {
  const { category, use, condition, maxPrice, q, from, to, sort, onlyAvailable } = req.query;
  const where = [`status != 'Unlisted'`];
  const params = [];
  if (category && category !== 'All') { where.push('category = ?'); params.push(category); }
  if (condition && condition !== 'All') { where.push('condition = ?'); params.push(condition); }
  if (use && use !== 'All') { where.push(`(',' || uses || ',') LIKE ?`); params.push(`%,${use},%`); }
  if (maxPrice) { where.push('price_per_day <= ?'); params.push(Number(maxPrice)); }
  if (q) { where.push('(name LIKE ? OR description LIKE ? OR category LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const order = { price_asc: 'price_per_day ASC', price_desc: 'price_per_day DESC', name: 'name ASC' }[sort] || 'id ASC';
  const validRange = isISODate(from) && isISODate(to) && to >= from;
  let items = all(`SELECT * FROM furniture WHERE ${where.join(' AND ')} ORDER BY ${order}`, params)
    .map((r) => shapeItem(r, validRange ? from : undefined, validRange ? to : undefined));
  if (onlyAvailable === 'true') items = items.filter((i) => i.free > 0);
  return items;
}));

app.get('/api/furniture/:id', wrap((req) => {
  const row = get(`SELECT * FROM furniture WHERE id = ? AND status != 'Unlisted'`, [req.params.id]);
  if (!row) throw new ApiError(404, 'This item is no longer listed.');
  return shapeItem(row);
}));

app.get('/api/furniture/:id/availability', wrap((req) => {
  const row = get('SELECT * FROM furniture WHERE id = ?', [req.params.id]);
  if (!row) throw new ApiError(404, 'Item not found.');
  const from = isISODate(req.query.from) ? req.query.from : today();
  const days = Math.min(Number(req.query.days) || 14, 60);
  const to = addDays(from, days - 1);
  const booked = bookedByDay(all, row.id, from, to);
  return Object.entries(booked).map(([date, b]) => ({
    date, booked: b, free: row.status === 'Available' ? Math.max(0, row.stock - b) : 0, stock: row.stock,
  }));
}));

app.get('/api/furniture/:id/reviews', wrap((req) =>
  all('SELECT id, reviewer_name, rating, comment, created_at, order_id IS NOT NULL AS verified FROM reviews WHERE furniture_id = ? ORDER BY created_at DESC LIMIT 30', [req.params.id])));

// ---------------- Bundles ----------------
function bundleDetail(b, from, to) {
  const valid = isISODate(from) && isISODate(to) && to >= from;
  const s = valid ? from : today();
  const e = valid ? to : s;
  const items = all(`SELECT f.*, bi.qty AS bundle_qty FROM bundle_items bi JOIN furniture f ON f.id = bi.furniture_id WHERE bi.bundle_id = ?`, [b.id])
    .map((f) => ({ ...shapeItem(f, s, e), qty: f.bundle_qty }));
  const perDay = items.reduce((sum, i) => sum + i.price_per_day * i.qty, 0);
  const deposit = items.reduce((sum, i) => sum + i.deposit * i.qty, 0);
  const available = items.every((i) => i.status === 'Available' && i.free >= i.qty);
  let quote = null;
  if (valid) {
    const lines = items.map((i) => withBundle(quoteLine(i, i.qty, s, e), b.discount_pct));
    quote = { days: lines[0]?.days || 0, ...orderTotals(lines) };
  }
  return { ...b, items, perDay, perDayPack: Math.round(perDay * (1 - b.discount_pct / 100)), deposit, available, period: { start: s, end: e }, quote };
}
// Applies the pack discount on top of any duration discount.
function withBundle(q, pct) {
  if (!pct) return q;
  const extra = Math.round(q.rent * pct / 100);
  return { ...q, discount: q.discount + extra, rent: q.rent - extra, bundlePct: pct };
}

app.get('/api/bundles', wrap((req) => all('SELECT * FROM bundles ORDER BY id').map((b) => bundleDetail(b, req.query.from, req.query.to))));
app.get('/api/bundles/:id', wrap((req) => {
  const b = get('SELECT * FROM bundles WHERE id = ?', [req.params.id]);
  if (!b) throw new ApiError(404, 'Pack not found.');
  return bundleDetail(b, req.query.from, req.query.to);
}));

// ---------------- Rental Life Planner ----------------
app.post('/api/planner', wrap((req) => {
  const plan = buildPlan({ all, get }, req.body, ratingOf);
  if (plan.error) throw new ApiError(400, plan.error);
  return plan;
}));

// ---------------- Public: quotes, payment, orders ----------------
// Validates cart lines against live stock and prices them from the database (never trust client prices).
function priceCart(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new ApiError(400, 'Your cart is empty.');
  const accepted = [];
  const priced = lines.map((l, i) => {
    const item = get('SELECT * FROM furniture WHERE id = ?', [l.furnitureId]);
    if (!item || item.status === 'Unlisted') throw new ApiError(400, `Line ${i + 1}: this item is no longer listed.`);
    const qty = Number(l.qty);
    if (!Number.isInteger(qty) || qty < 1) throw new ApiError(400, `${item.name}: quantity must be at least 1.`);
    const err = validatePeriod(l.start, l.end);
    if (err) throw new ApiError(400, `${item.name}: ${err}`);
    if (item.status !== 'Available') throw new ApiError(409, `${item.name} is under maintenance and cannot be booked right now.`);
    const free = freeUnits(all, item, l.start, l.end, accepted);
    if (free < qty) {
      throw new ApiError(409, `${item.name}: only ${free} of ${item.stock} free from ${l.start} to ${l.end}.`, { furnitureId: item.id, free });
    }
    accepted.push({ furniture_id: item.id, qty, start_date: l.start, end_date: l.end });
    let pct = 0;
    if (l.bundleId) {
      const inPack = get(`SELECT b.discount_pct FROM bundles b JOIN bundle_items bi ON bi.bundle_id = b.id WHERE b.id = ? AND bi.furniture_id = ?`, [l.bundleId, item.id]);
      if (!inPack) throw new ApiError(400, `${item.name} is not part of that pack.`);
      pct = inPack.discount_pct;
    }
    return { item, qty, start: l.start, end: l.end, bundleId: l.bundleId || null, ...withBundle(quoteLine(item, qty, l.start, l.end), pct) };
  });
  return { priced, totals: orderTotals(priced) };
}

app.post('/api/orders/quote', wrap((req) => {
  const { priced, totals } = priceCart(req.body.lines);
  return {
    lines: priced.map((p) => ({ furnitureId: p.item.id, name: p.item.name, qty: p.qty, start: p.start, end: p.end, days: p.days, rent: p.rent, discount: p.discount, deposit: p.deposit })),
    totals,
  };
}));

const payments = new Map(); // ref -> { amount, method, used }

app.post('/api/payments/mock', async (req, res, next) => {
  try {
    const { method, amount, upiId, cardNumber, expiry, cvv, name } = req.body;
    if (!['UPI', 'Card', 'Cash on delivery'].includes(method)) throw new ApiError(400, 'Choose UPI, card or cash on delivery.');
    if (!(Number(amount) > 0)) throw new ApiError(400, 'Invalid amount.');
    if (method === 'UPI' && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId || '')) throw new ApiError(400, 'Enter a UPI ID like name@okaxis.');
    if (method === 'Card') {
      const digits = String(cardNumber || '').replace(/\s/g, '');
      if (!/^\d{16}$/.test(digits)) throw new ApiError(400, 'Card number must have 16 digits.');
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry || '')) throw new ApiError(400, 'Expiry must be in MM/YY format.');
      const [mm, yy] = expiry.split('/').map(Number);
      const now = new Date();
      if (2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1)) throw new ApiError(400, 'This card has expired.');
      if (!/^\d{3}$/.test(cvv || '')) throw new ApiError(400, 'CVV must be 3 digits.');
      if (!name || !name.trim()) throw new ApiError(400, 'Enter the name on the card.');
      await new Promise((r) => setTimeout(r, 1500));
      if (digits === DECLINED_CARD) throw new ApiError(402, 'Payment declined by the bank. Try another card or pay by UPI.');
    } else {
      await new Promise((r) => setTimeout(r, 1500));
    }
    const ref = (method === 'Cash on delivery' ? 'COD' : 'PAY') + Date.now().toString().slice(-8) + crypto.randomInt(10, 99);
    payments.set(ref, { amount: Number(amount), method, used: false });
    res.json({ ok: true, ref, method, status: method === 'Cash on delivery' ? 'Due on delivery' : 'Paid' });
  } catch (e) { next(e); }
});

function validateCustomer(c = {}) {
  if (!c.name || c.name.trim().length < 2) return 'Enter your full name.';
  if (!/^[6-9]\d{9}$/.test(c.phone || '')) return 'Enter a 10-digit Indian mobile number.';
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) return 'Enter a valid email address.';
  if (!c.address || c.address.trim().length < 10) return 'Enter the full delivery address.';
  if (!['Home', 'Office', 'Event'].includes(c.purpose)) return 'Choose what the rental is for.';
  return null;
}

function orderDetail(id) {
  const o = get('SELECT * FROM orders WHERE id = ?', [id]);
  if (!o) return null;
  o.items = all(
    `SELECT oi.*, COALESCE(oi.rate, f.price_per_day) AS rate, f.name, f.category, f.image_url, f.price_per_day,
            b.name AS bundle_name, r.rating AS my_rating
     FROM order_items oi JOIN furniture f ON f.id = oi.furniture_id
     LEFT JOIN bundles b ON b.id = oi.bundle_id
     LEFT JOIN reviews r ON r.order_id = oi.order_id AND r.furniture_id = oi.furniture_id
     WHERE oi.order_id = ? ORDER BY oi.id`, [id]
  );
  o.start_date = o.items.reduce((m, i) => (i.start_date < m ? i.start_date : m), o.items[0]?.start_date || '');
  o.end_date = o.items.reduce((m, i) => (i.end_date > m ? i.end_date : m), o.items[0]?.end_date || '');
  o.overdue = o.status === 'Delivered' && o.end_date < today();
  o.late = lateSummary(o);
  o.extensions = all('SELECT * FROM order_extensions WHERE order_id = ? ORDER BY id', [id]);
  o.damage = o.status === 'Returned' ? { level: o.damage_level, charge: o.damage_charge, note: o.damage_note } : null;
  o.can_extend = (o.status === 'Confirmed' || o.status === 'Delivered') && o.end_date >= today();
  return o;
}

// Late-return picture for an order: live and still growing while it is overdue, fixed once returned.
function lateSummary(o) {
  if (o.status === 'Delivered' && o.overdue) {
    const l = lateCharges(o.items, today());
    return { ...l, accruing: true, asOf: today(), ...settle(o.deposit, l.total) };
  }
  if (o.status === 'Returned') {
    const total = o.late_fee + o.late_gst;
    return {
      days: o.late_days, fee: o.late_fee, gst: o.late_gst, total, accruing: false, returnedOn: o.returned_on,
      lines: o.returned_on ? lateCharges(o.items, o.returned_on).lines : [],
      refund: o.deposit_refund ?? o.deposit, due: o.balance_due,
    };
  }
  return null;
}

// ---------------- Customer accounts ----------------
const bearer = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/, '');
function requireCustomer(req, _res, next) {
  const user = userFromToken(get, bearer(req));
  if (!user) return next(new ApiError(401, 'Please sign in to continue.'));
  req.user = user;
  req.token = bearer(req);
  next();
}

app.post('/api/auth/register', wrap((req) => {
  const b = { ...req.body, name: (req.body.name || '').trim(), email: (req.body.email || '').trim().toLowerCase(), phone: String(req.body.phone || '').trim() };
  const errors = validateRegistration(b);
  if (!errors.email && get('SELECT id FROM users WHERE email = ?', [b.email])) errors.email = 'An account with this email already exists. Sign in instead.';
  if (!errors.phone && get('SELECT id FROM users WHERE phone = ?', [b.phone])) errors.phone = 'This mobile number is already registered. Sign in instead.';
  if (Object.keys(errors).length) throw new ApiError(400, Object.values(errors)[0], { fields: errors });
  const token = transaction(() => {
    const { lastInsertRowid } = run('INSERT INTO users (name, email, phone, password_hash) VALUES (?,?,?,?)', [b.name, b.email, b.phone, hashPassword(b.password)]);
    // Earlier guest bookings made with the same mobile number move into the new account.
    run('UPDATE orders SET user_id = ? WHERE phone = ? AND user_id IS NULL', [lastInsertRowid, b.phone]);
    return createSession(run, lastInsertRowid);
  });
  return { token, user: userFromToken(get, token) };
}));

app.post('/api/auth/login', wrap((req) => {
  const id = String(req.body.identifier || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!id || !password) throw new ApiError(400, 'Enter your email or mobile number and your password.');
  const row = get('SELECT * FROM users WHERE email = ? OR phone = ?', [id, id]);
  if (!row || !verifyPassword(password, row.password_hash)) throw new ApiError(401, 'That email or mobile number and password do not match.');
  const token = transaction(() => {
    run('DELETE FROM sessions WHERE expires_at <= ?', [new Date().toISOString()]);
    return createSession(run, row.id);
  });
  return { token, user: userFromToken(get, token) };
}));

app.get('/api/auth/me', requireCustomer, wrap((req) => ({
  user: req.user,
  stats: get(`SELECT COUNT(*) AS orders, COALESCE(SUM(CASE WHEN status IN ('Confirmed','Delivered') THEN 1 ELSE 0 END),0) AS active FROM orders WHERE user_id = ?`, [req.user.id]),
})));

app.post('/api/auth/logout', requireCustomer, wrap((req) => {
  transaction(() => run('DELETE FROM sessions WHERE token = ?', [req.token]));
  return { ok: true };
}));

app.post('/api/orders', requireCustomer, wrap((req) => {
  const { customer, lines, payment } = req.body;
  const err = validateCustomer(customer);
  if (err) throw new ApiError(400, err);
  const pay = payments.get(payment?.ref);
  if (!pay || pay.used) throw new ApiError(402, 'Payment not found. Please complete the payment step again.');
  const id = transaction(() => {
    const { priced, totals } = priceCart(lines); // re-checks stock inside the transaction
    if (pay.amount !== totals.total) throw new ApiError(409, 'Your cart total changed. Please review and pay again.');
    const { lastInsertRowid } = run(
      `INSERT INTO orders (customer_name, phone, email, address, purpose, subtotal, discount, gst, delivery, deposit, total,
        payment_method, payment_ref, payment_status, status, user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'Confirmed', ?)`,
      [customer.name.trim(), customer.phone, customer.email || '', customer.address.trim(), customer.purpose,
        totals.subtotal, totals.discount, totals.gst, totals.delivery, totals.deposit, totals.total,
        pay.method, payment.ref, pay.method === 'Cash on delivery' ? 'Due on delivery' : 'Paid', req.user.id]
    );
    run('UPDATE orders SET order_code = ? WHERE id = ?', ['RR-' + (1000 + lastInsertRowid), lastInsertRowid]);
    for (const p of priced) {
      run(`INSERT INTO order_items (order_id, furniture_id, qty, start_date, end_date, days, rent, deposit, rate, bundle_id) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [lastInsertRowid, p.item.id, p.qty, p.start, p.end, p.days, p.rent, p.deposit, p.rate ?? p.item.price_per_day, p.bundleId]);
    }
    return lastInsertRowid;
  });
  pay.used = true;
  const created = orderDetail(id);
  events.booked(created);
  return created;
}));

app.get('/api/my/orders', requireCustomer, wrap((req) =>
  all('SELECT id FROM orders WHERE user_id = ? ORDER BY id DESC', [req.user.id]).map((r) => orderDetail(r.id))));

app.get('/api/orders/code/:code', requireCustomer, wrap((req) => {
  const o = get('SELECT id FROM orders WHERE order_code = ? AND user_id = ?', [req.params.code, req.user.id]);
  if (!o) throw new ApiError(404, 'Order not found in your account.');
  return orderDetail(o.id);
}));

app.patch('/api/orders/:id/cancel', requireCustomer, wrap((req) => {
  const o = orderDetail(req.params.id);
  if (!o || o.user_id !== req.user.id) throw new ApiError(404, 'Order not found in your account.');
  if (o.status !== 'Confirmed') throw new ApiError(409, `A ${o.status.toLowerCase()} order cannot be cancelled.`);
  if (o.start_date <= today()) throw new ApiError(409, 'Orders can be cancelled only before the rental starts.');
  transaction(() => run(`UPDATE orders SET status = 'Cancelled', payment_status = CASE WHEN payment_status = 'Paid' THEN 'Refunded' ELSE 'Void' END WHERE id = ?`, [o.id]));
  const cancelled = orderDetail(o.id);
  events.cancelled(cancelled);
  return cancelled;
}));

// ---------------- Extend a rental ----------------
function checkExtension(o, newEnd) {
  if (!o) throw new ApiError(404, 'Order not found in your account.');
  if (!['Confirmed', 'Delivered'].includes(o.status)) throw new ApiError(409, `A ${o.status.toLowerCase()} order cannot be extended.`);
  if (o.end_date < today()) throw new ApiError(409, 'This rental is already overdue. Please arrange the return, or call us to settle the late charge.');
  if (!isISODate(newEnd)) throw new ApiError(400, 'Choose a new end date.');
  if (newEnd <= o.end_date) throw new ApiError(400, 'The new end date must be after the current end date.');
  if (daysInclusive(o.start_date, newEnd) > MAX_RENTAL_DAYS) throw new ApiError(400, `A rental can run for at most ${MAX_RENTAL_DAYS} days in total.`);
  const q = extensionQuote(o.items, newEnd);
  for (const l of q.lines) {
    const item = get('SELECT * FROM furniture WHERE id = ?', [l.furniture_id]);
    const peak = Math.max(0, ...Object.values(bookedByDay(all, l.furniture_id, l.from, newEnd)));
    const free = Math.max(0, item.stock - peak);
    if (free < l.qty) throw new ApiError(409, `${l.name}: only ${free} free after ${l.from} because of other bookings. Choose an earlier date.`);
  }
  return q;
}

app.get('/api/orders/:id/extend', requireCustomer, wrap((req) => {
  const o = orderDetail(req.params.id);
  if (o && o.user_id !== req.user.id) throw new ApiError(404, 'Order not found in your account.');
  return { newEnd: req.query.end, currentEnd: o?.end_date, ...checkExtension(o, req.query.end) };
}));

app.post('/api/orders/:id/extend', requireCustomer, wrap((req) => {
  const o = orderDetail(req.params.id);
  if (o && o.user_id !== req.user.id) throw new ApiError(404, 'Order not found in your account.');
  const newEnd = req.body.end;
  const pay = payments.get(req.body.payment?.ref);
  if (!pay || pay.used) throw new ApiError(402, 'Payment not found. Please pay for the extension again.');
  transaction(() => {
    const q = checkExtension(o, newEnd);
    if (pay.amount !== q.total) throw new ApiError(409, 'The extension price changed. Please review and pay again.');
    for (const l of q.lines) {
      run('UPDATE order_items SET end_date = ?, days = days + ?, rent = rent + ? WHERE id = ?', [newEnd, l.days, l.rent, l.id]);
    }
    run('UPDATE orders SET subtotal = subtotal + ?, discount = discount + ?, gst = gst + ?, total = total + ? WHERE id = ?',
      [q.rent, q.discount, q.gst, q.total, o.id]);
    run(`INSERT INTO order_extensions (order_id, old_end, new_end, extra_days, rent, discount, gst, payment_method, payment_ref) VALUES (?,?,?,?,?,?,?,?,?)`,
      [o.id, o.end_date, newEnd, q.days, q.rent, q.discount, q.gst, pay.method, req.body.payment.ref]);
  });
  pay.used = true;
  const extended = orderDetail(o.id);
  events.extended(extended, extended.extensions[extended.extensions.length - 1]);
  return extended;
}));

// ---------------- Reviews ----------------
app.post('/api/reviews', requireCustomer, wrap((req) => {
  const { orderId, furnitureId, comment } = req.body;
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError(400, 'Choose a rating from 1 to 5 stars.');
  const o = orderDetail(orderId);
  if (!o || o.user_id !== req.user.id) throw new ApiError(404, 'Order not found in your account.');
  if (o.status !== 'Returned') throw new ApiError(409, 'You can rate items once the rental has been returned.');
  if (!o.items.some((i) => i.furniture_id === Number(furnitureId))) throw new ApiError(400, 'That item is not part of this order.');
  if (get('SELECT id FROM reviews WHERE order_id = ? AND furniture_id = ?', [o.id, furnitureId])) throw new ApiError(409, 'You already rated this item for this order.');
  transaction(() => run('INSERT INTO reviews (furniture_id, user_id, order_id, reviewer_name, rating, comment) VALUES (?,?,?,?,?,?)',
    [furnitureId, req.user.id, o.id, req.user.name, rating, String(comment || '').trim().slice(0, 500)]));
  return orderDetail(o.id);
}));

// ---------------- Notifications ----------------
app.get('/api/my/notifications', requireCustomer, wrap((req) => {
  const items = all('SELECT n.*, o.order_code FROM notifications n LEFT JOIN orders o ON o.id = n.order_id WHERE n.user_id = ? ORDER BY n.id DESC LIMIT 40', [req.user.id]);
  return { items, unread: items.filter((n) => !n.read_at).length };
}));
app.post('/api/my/notifications/read', requireCustomer, wrap((req) => {
  transaction(() => run(`UPDATE notifications SET read_at = datetime('now','localtime') WHERE user_id = ? AND read_at IS NULL`, [req.user.id]));
  return { ok: true };
}));

// ---------------- GST invoice ----------------
export const SELLER = {
  name: 'RentRoom Rentals Pvt. Ltd.', address: '12, Anna Salai, Teynampet, Chennai, Tamil Nadu 600018',
  gstin: '33AAKCR4821M1Z6', state: 'Tamil Nadu (33)', email: 'billing@rentroom.in', phone: '+91 44 4862 1937', sac: '997316',
};
app.get('/api/invoice/:code', wrap((req) => {
  const o = get('SELECT id, user_id FROM orders WHERE order_code = ?', [req.params.code]);
  if (!o) throw new ApiError(404, 'Invoice not found.');
  const user = userFromToken(get, bearer(req));
  const isAdmin = tokens.has(req.headers['x-admin-token'] || '');
  if (!isAdmin && (!user || user.id !== o.user_id)) throw new ApiError(401, 'Sign in to view this invoice.');
  const d = orderDetail(o.id);
  const fy = (() => { const [y, m] = d.created_at.slice(0, 7).split('-').map(Number); const s = m >= 4 ? y : y - 1; return `${s}-${String((s + 1) % 100).padStart(2, '0')}`; })();
  return { seller: SELLER, invoiceNo: `RR/${fy}/${String(d.id).padStart(4, '0')}`, order: d };
}));

// ---------------- Wishlist ----------------
app.get('/api/my/wishlist', requireCustomer, wrap((req) =>
  all(`SELECT f.* FROM wishlist w JOIN furniture f ON f.id = w.furniture_id WHERE w.user_id = ? AND f.status != 'Unlisted' ORDER BY w.created_at DESC`, [req.user.id])
    .map((r) => shapeItem(r))));

app.post('/api/my/wishlist/:furnitureId', requireCustomer, wrap((req) => {
  if (!get('SELECT id FROM furniture WHERE id = ?', [req.params.furnitureId])) throw new ApiError(404, 'Item not found.');
  transaction(() => run('INSERT OR IGNORE INTO wishlist (user_id, furniture_id) VALUES (?,?)', [req.user.id, req.params.furnitureId]));
  return { ok: true };
}));

app.delete('/api/my/wishlist/:furnitureId', requireCustomer, wrap((req) => {
  transaction(() => run('DELETE FROM wishlist WHERE user_id = ? AND furniture_id = ?', [req.user.id, req.params.furnitureId]));
  return { ok: true };
}));

// ---------------- Admin ----------------
const tokens = new Set();
app.post('/api/admin/login', wrap((req) => {
  if (req.body.password !== ADMIN_PASSWORD) throw new ApiError(401, 'Wrong password. The demo password is admin123.');
  const token = crypto.randomBytes(24).toString('hex');
  tokens.add(token);
  return { token };
}));
function requireAdmin(req, _res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!tokens.has(token)) return next(new ApiError(401, 'Please log in as admin again.'));
  next();
}
app.use('/api/admin', requireAdmin);

app.get('/api/admin/stats', wrap(() => {
  const t = today();
  const revenue = get(`SELECT COALESCE(SUM(subtotal + late_fee + damage_charge),0) AS v FROM orders WHERE status != 'Cancelled'`).v;
  const lateCollected = get(`SELECT COALESCE(SUM(late_fee),0) AS v FROM orders WHERE status = 'Returned'`).v;
  const damageRecovered = get(`SELECT COALESCE(SUM(damage_charge),0) AS v FROM orders WHERE status = 'Returned'`).v;
  const extensionRevenue = get(`SELECT COALESCE(SUM(rent),0) AS v FROM order_extensions`).v;
  const byStatus = Object.fromEntries(all('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').map((r) => [r.status, r.n]));
  const activeRentals = get(
    `SELECT COUNT(DISTINCT o.id) AS n FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE o.status = 'Delivered' AND oi.start_date <= ?`, [t]).n;
  const unitsOut = get(
    `SELECT COALESCE(SUM(oi.qty),0) AS n FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE o.status IN ('Confirmed','Delivered') AND oi.start_date <= ? AND oi.end_date >= ?`, [t, t]).n;
  const listings = get(`SELECT COUNT(*) AS n, COALESCE(SUM(stock),0) AS units FROM furniture WHERE status != 'Unlisted'`);
  const listingsInUse = get(
    `SELECT COUNT(DISTINCT oi.furniture_id) AS n FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE o.status IN ('Confirmed','Delivered') AND oi.start_date <= ? AND oi.end_date >= ?`, [t, t]).n;
  const revenueByCategory = all(
    `SELECT f.category, COALESCE(SUM(oi.rent),0) AS revenue FROM order_items oi
     JOIN orders o ON o.id = oi.order_id JOIN furniture f ON f.id = oi.furniture_id
     WHERE o.status != 'Cancelled' GROUP BY f.category ORDER BY revenue DESC`);
  const ids = (sql, p) => all(sql, p).map((r) => orderDetail(r.id));
  const deliveriesDue = ids(
    `SELECT DISTINCT o.id FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE o.status = 'Confirmed' AND oi.start_date <= ? ORDER BY oi.start_date`, [addDays(t, 5)]);
  const delivered = ids(`SELECT id FROM orders WHERE status = 'Delivered'`);
  const returnsDue = delivered.filter((o) => o.end_date >= t && o.end_date <= addDays(t, 3));
  const overdue = delivered.filter((o) => o.overdue);
  const lateAccruing = overdue.reduce((sum, o) => sum + (o.late?.fee || 0), 0);
  return {
    today: t, revenue, byStatus, activeRentals, unitsOut, totalUnits: listings.units, listings: listings.n,
    listingsInUse, utilization: listings.n ? Math.round((listingsInUse / listings.n) * 1000) / 10 : 0,
    revenueByCategory, deliveriesDue, returnsDue, overdue, lateCollected, lateAccruing, damageRecovered, extensionRevenue,
    maintenance: get(`SELECT COUNT(*) AS n FROM furniture WHERE status = 'Maintenance'`).n,
  };
}));

function validateFurniture(b) {
  if (!b.name || b.name.trim().length < 3) return 'Name must be at least 3 characters.';
  if (!CATEGORIES.includes(b.category)) return 'Choose a category.';
  if (!CONDITIONS.includes(b.condition)) return 'Choose a condition.';
  if (!(Number(b.price_per_day) > 0)) return 'Price per day must be more than 0.';
  if (!(Number(b.price_per_month) > 0)) return 'Monthly price must be more than 0.';
  for (const k of ['width_cm', 'depth_cm']) {
    const v = b[k];
    if (v !== undefined && v !== null && v !== '' && !(Number(v) >= 10 && Number(v) <= 1000)) return 'Width and depth must be between 10 and 1000 cm.';
  }
  if (Number(b.price_per_month) > Number(b.price_per_day) * 30) return 'Monthly price should be lower than 30 days at the daily price.';
  if (!(Number(b.deposit) >= 0)) return 'Deposit cannot be negative.';
  if (!Number.isInteger(Number(b.stock)) || Number(b.stock) < 0) return 'Stock must be a whole number.';
  if (b.status && !STATUSES.includes(b.status)) return 'Invalid status.';
  const uses = Array.isArray(b.uses) ? b.uses : String(b.uses || '').split(',');
  if (!uses.filter((u) => USES.includes(u)).length) return 'Pick at least one use: Home, Office or Event.';
  return null;
}
const furnitureParams = (b) => [
  b.name.trim(), b.category, Math.round(Number(b.price_per_day)), Math.round(Number(b.deposit || 0)), b.condition,
  Number(b.stock), (Array.isArray(b.uses) ? b.uses : String(b.uses).split(',')).filter((u) => USES.includes(u)).join(','),
  b.status || 'Available', (b.description || '').trim(), (b.image_url || '').trim(), (b.image_url_2 || '').trim(),
  Math.round(Number(b.price_per_month)),
  b.width_cm ? Math.round(Number(b.width_cm)) : null, b.depth_cm ? Math.round(Number(b.depth_cm)) : null,
];

// Image upload from the admin's computer, sent as a data URL. Saved to server/uploads and served at /uploads/...
app.post('/api/admin/upload', wrap((req) => {
  const m = /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/.exec(req.body.dataUrl || '');
  if (!m) throw new ApiError(400, 'Upload a PNG, JPG, WEBP or GIF image.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 5 * 1024 * 1024) throw new ApiError(400, 'Image must be 5 MB or smaller.');
  const file = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  fs.writeFileSync(path.join(UPLOADS, file), buf);
  return { url: `/uploads/${file}`, bytes: buf.length };
}));

app.get('/api/admin/furniture', wrap(() => all('SELECT * FROM furniture ORDER BY id DESC').map((r) => shapeItem(r))));

app.post('/api/admin/furniture', wrap((req) => {
  const err = validateFurniture(req.body);
  if (err) throw new ApiError(400, err);
  const { lastInsertRowid } = transaction(() => run(
    `INSERT INTO furniture (name, category, price_per_day, deposit, condition, stock, uses, status, description, image_url, image_url_2, price_per_month, width_cm, depth_cm)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, furnitureParams(req.body)));
  return shapeItem(get('SELECT * FROM furniture WHERE id = ?', [lastInsertRowid]));
}));

app.put('/api/admin/furniture/:id', wrap((req) => {
  const existing = get('SELECT * FROM furniture WHERE id = ?', [req.params.id]);
  if (!existing) throw new ApiError(404, 'Item not found.');
  const merged = { ...existing, ...req.body };
  const err = validateFurniture(merged);
  if (err) throw new ApiError(400, err);
  transaction(() => run(
    `UPDATE furniture SET name=?, category=?, price_per_day=?, deposit=?, condition=?, stock=?, uses=?, status=?, description=?, image_url=?, image_url_2=?, price_per_month=?, width_cm=?, depth_cm=?
     WHERE id = ?`, [...furnitureParams(merged), existing.id]));
  return shapeItem(get('SELECT * FROM furniture WHERE id = ?', [existing.id]));
}));

app.delete('/api/admin/furniture/:id', wrap((req) => {
  const active = get(
    `SELECT COUNT(*) AS n FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.furniture_id = ? AND o.status IN ('Confirmed','Delivered')`, [req.params.id]).n;
  if (active) throw new ApiError(409, `This item has ${active} active booking${active > 1 ? 's' : ''}. Set it to Unlisted instead, or wait until they are returned.`);
  const history = get('SELECT COUNT(*) AS n FROM order_items WHERE furniture_id = ?', [req.params.id]).n;
  transaction(() => {
    if (history) run(`UPDATE furniture SET status = 'Unlisted' WHERE id = ?`, [req.params.id]);
    else run('DELETE FROM furniture WHERE id = ?', [req.params.id]);
  });
  return { ok: true, archived: history > 0 };
}));

app.get('/api/admin/orders', wrap((req) => {
  const s = req.query.status;
  const rows = s && s !== 'All'
    ? all('SELECT id FROM orders WHERE status = ? ORDER BY id DESC', [s])
    : all('SELECT id FROM orders ORDER BY id DESC');
  return rows.map((r) => orderDetail(r.id));
}));

const FLOW = { Confirmed: ['Delivered', 'Cancelled'], Delivered: ['Returned'], Returned: [], Cancelled: [] };
function validReturnDate(o, d) {
  const date = d || today();
  if (!isISODate(date)) throw new ApiError(400, 'Choose a valid return date.');
  if (date > today()) throw new ApiError(400, 'The return date cannot be in the future.');
  if (date < o.start_date) throw new ApiError(400, 'The return date cannot be before the rental started.');
  return date;
}

function damageFrom(o, src) {
  const level = DAMAGE_LEVELS[src.damage_level] !== undefined ? src.damage_level : 'None';
  const raw = src.damage_charge;
  const charge = raw !== undefined && raw !== '' && raw !== null ? Math.round(Number(raw)) : damagePreset(level, o.deposit);
  if (!Number.isFinite(charge) || charge < 0) throw new ApiError(400, 'Damage charge must be 0 or more.');
  if (level === 'None' && charge > 0) throw new ApiError(400, 'Pick a damage level when charging for damage.');
  return { level, charge, note: (src.damage_note || '').trim() };
}

// Preview the late + damage charges for a chosen return date before marking the order returned.
app.get('/api/admin/orders/:id/late', wrap((req) => {
  const o = orderDetail(req.params.id);
  if (!o) throw new ApiError(404, 'Order not found.');
  const date = validReturnDate(o, req.query.returned_on);
  const l = lateCharges(o.items, date);
  const d = damageFrom(o, req.query);
  return {
    returnedOn: date, ...l, deposit: o.deposit, damage: d,
    presets: Object.fromEntries(Object.keys(DAMAGE_LEVELS).map((k) => [k, damagePreset(k, o.deposit)])),
    ...settle(o.deposit, l.total + d.charge),
  };
}));

app.patch('/api/admin/orders/:id/status', wrap((req) => {
  const o = orderDetail(req.params.id);
  if (!o) throw new ApiError(404, 'Order not found.');
  const next = req.body.status;
  if (!FLOW[o.status].includes(next)) throw new ApiError(409, `Cannot move an order from ${o.status} to ${next}.`);
  transaction(() => {
    let pay = o.payment_status;
    if (next === 'Cancelled') pay = o.payment_status === 'Paid' ? 'Refunded' : 'Void';
    if (next === 'Delivered' && o.payment_status === 'Due on delivery') pay = 'Paid';
    run('UPDATE orders SET status = ?, payment_status = ? WHERE id = ?', [next, pay, o.id]);
    if (next === 'Returned') {
      const date = validReturnDate(o, req.body.returned_on);
      const l = lateCharges(o.items, date);
      const d = damageFrom(o, req.body);
      const { refund, due } = settle(o.deposit, l.total + d.charge);
      run(`UPDATE orders SET returned_on = ?, late_days = ?, late_fee = ?, late_gst = ?, deposit_refund = ?, balance_due = ?,
             damage_level = ?, damage_charge = ?, damage_note = ? WHERE id = ?`,
        [date, l.days, l.fee, l.gst, refund, due, d.level, d.charge, d.note, o.id]);
      if (req.body.maintenance) {
        for (const i of o.items) run(`UPDATE furniture SET status = 'Maintenance' WHERE id = ? AND status = 'Available'`, [i.furniture_id]);
      }
    }
  });
  const updated = orderDetail(o.id);
  if (next === 'Delivered') events.delivered(updated);
  if (next === 'Returned') events.returned(updated);
  if (next === 'Cancelled') events.cancelled(updated);
  return orderDetail(o.id);
}));

// ---------------- CSV exports ----------------
const csvCell = (v) => { const t = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
const toCsv = (header, rows) => [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
function sendCsv(res, name, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.send('\ufeff' + csv); // BOM so Excel reads the rupee symbol and Tamil names correctly
}

app.get('/api/admin/export/orders.csv', (req, res, next) => {
  try {
    const rows = all('SELECT id FROM orders ORDER BY id').map((r) => orderDetail(r.id)).map((o) => [
      o.order_code, o.created_at, o.customer_name, o.phone, o.email, o.purpose, o.address,
      o.start_date, o.end_date, o.items.map((i) => `${i.qty} x ${i.name}`).join('; '), o.items.reduce((s, i) => s + i.qty, 0),
      o.subtotal, o.discount, o.gst, o.delivery, o.deposit, o.total,
      o.extensions.length, o.late?.days ?? 0, o.late?.total ?? 0, o.damage?.level ?? '', o.damage?.charge ?? 0,
      o.status === 'Returned' ? o.deposit_refund : '', o.status === 'Returned' ? o.balance_due : '',
      o.payment_method, o.payment_status, o.status, o.returned_on || '',
    ]);
    sendCsv(res, `rentroom-orders-${today()}.csv`, toCsv([
      'Order', 'Booked at', 'Customer', 'Mobile', 'Email', 'Purpose', 'Address', 'Start', 'End', 'Items', 'Units',
      'Rent (INR)', 'Discount (INR)', 'GST (INR)', 'Delivery (INR)', 'Deposit (INR)', 'Total paid (INR)',
      'Extensions', 'Late days', 'Late charge incl GST (INR)', 'Damage level', 'Damage charge (INR)',
      'Deposit refunded (INR)', 'Balance due (INR)', 'Payment method', 'Payment status', 'Status', 'Returned on',
    ], rows));
  } catch (e) { next(e); }
});

app.get('/api/admin/export/furniture.csv', (req, res, next) => {
  try {
    const rows = all('SELECT * FROM furniture ORDER BY category, name').map((f) => {
      const booked = get(`SELECT COUNT(DISTINCT oi.order_id) AS n, COALESCE(SUM(oi.rent),0) AS rev FROM order_items oi JOIN orders o ON o.id = oi.order_id
                          WHERE oi.furniture_id = ? AND o.status != 'Cancelled'`, [f.id]);
      return [f.id, f.name, f.category, f.condition, f.price_per_day, f.price_per_month, f.deposit, f.stock, freeUnits(all, f, today(), today()), f.uses, f.status, booked.n, booked.rev];
    });
    sendCsv(res, `rentroom-listings-${today()}.csv`, toCsv(
      ['ID', 'Name', 'Category', 'Condition', 'Price per day (INR)', 'Price per month (INR)', 'Deposit (INR)', 'Stock', 'Free today', 'Uses', 'Status', 'Orders', 'Rent earned (INR)'], rows));
  } catch (e) { next(e); }
});

app.get('/api/admin/notifications', wrap(() =>
  all(`SELECT n.*, o.order_code, o.customer_name, o.phone FROM notifications n LEFT JOIN orders o ON o.id = n.order_id ORDER BY n.id DESC LIMIT 60`)));
app.post('/api/admin/reminders/run', wrap(() => ({ sent: runReminders(orderDetail) })));

app.get('/api/admin/availability', wrap((req) => {
  const from = isISODate(req.query.from) ? req.query.from : today();
  const days = Math.min(Number(req.query.days) || 14, 31);
  const to = addDays(from, days - 1);
  const dates = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  const items = all(`SELECT * FROM furniture WHERE status != 'Unlisted' ORDER BY category, name`).map((f) => {
    const booked = bookedByDay(all, f.id, from, to);
    return {
      id: f.id, name: f.name, category: f.category, stock: f.stock, status: f.status,
      days: dates.map((d) => ({ date: d, booked: booked[d], free: f.status === 'Available' ? Math.max(0, f.stock - booked[d]) : 0 })),
    };
  });
  return { from, to, dates, items };
}));

// ---------------- Errors + static build ----------------
app.use('/api', (_req, _res, next) => next(new ApiError(404, 'Endpoint not found.')));
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Something went wrong on the server.' : err.message, ...(err.extra || {}) });
});

const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Automatic reminders: run at start-up and then every 30 minutes. Each reminder is sent once (deduplicated).
const reminderRun = () => { try { const n = transaction(() => runReminders(orderDetail)); if (n) console.log(`[reminders] sent ${n} reminder${n === 1 ? '' : 's'}`); } catch (e) { console.error('[reminders]', e); } };
reminderRun();
setInterval(reminderRun, 30 * 60 * 1000);

app.listen(PORT, () => console.log(`RentRoom API running on http://localhost:${PORT}`));

export { daysInclusive };
