// Customer notifications: event messages (booked, extended, delivered, returned) and automatic
// due-date reminders. Every message is stored for the in-app bell and logged as an SMS/email send.
// To send real SMS or email, plug a provider (MSG91, Twilio, SMTP) into deliver() below.
import { all, get, run } from './db.js';
import { today, addDays, lateCharges } from './logic.js';

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const fmt = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); };

function deliver(order, title) {
  // Simulated channels for the prototype. Replace with a real SMS / email API call here.
  console.log(`[notify] SMS to ${order.phone}${order.email ? ` and email to ${order.email}` : ''}: ${title}`);
}

// Creates a notification once per dedupe key. Returns true when a new one was created.
export function notify(order, type, title, body, key) {
  const dedupe = key || `${type}:${order.id}:${Date.now()}`;
  const before = get('SELECT id FROM notifications WHERE dedupe_key = ?', [dedupe]);
  if (before) return false;
  run(`INSERT INTO notifications (user_id, order_id, type, title, body, channels, dedupe_key) VALUES (?,?,?,?,?,?,?)`,
    [order.user_id || null, order.id, type, title, body, order.email ? 'In-app, SMS, Email' : 'In-app, SMS', dedupe]);
  deliver(order, title);
  return true;
}

export const events = {
  booked: (o) => notify(o, 'booked', `Booking ${o.order_code} confirmed`,
    `${o.items.length} item${o.items.length === 1 ? '' : 's'} from ${fmt(o.start_date)} to ${fmt(o.end_date)}. Delivery on ${fmt(o.start_date)} between 9 am and 1 pm.`, `booked:${o.id}`),
  extended: (o, x) => notify(o, 'extended', `${o.order_code} extended to ${fmt(x.new_end)}`,
    `${x.extra_days} extra day${x.extra_days === 1 ? '' : 's'} added. Paid ${inr(x.rent + x.gst)}. Pick-up moves to ${fmt(x.new_end)}.`, `extended:${o.id}:${x.new_end}`),
  delivered: (o) => notify(o, 'delivered', `${o.order_code} delivered`,
    `Your furniture has been delivered and set up. It is due back on ${fmt(o.end_date)}.`, `delivered:${o.id}`),
  returned: (o) => notify(o, 'returned', `${o.order_code} picked up`,
    `Thanks for renting with us. Deposit refund of ${inr(o.deposit_refund ?? o.deposit)} is on its way${o.balance_due ? `. Balance to pay: ${inr(o.balance_due)}` : ''}. You can now rate the items you rented.`, `returned:${o.id}`),
  cancelled: (o) => notify(o, 'cancelled', `${o.order_code} cancelled`,
    o.payment_status === 'Refunded' ? `Your refund of ${inr(o.total)} has been initiated.` : 'Your booking has been cancelled.', `cancelled:${o.id}`),
};

// Scans active orders and sends any reminder that is due today. Safe to run as often as you like:
// the dedupe key (type + order + date) makes each reminder go out once.
export function runReminders(orderDetail) {
  const t = today();
  let sent = 0;
  for (const { id } of all(`SELECT id FROM orders WHERE status IN ('Confirmed','Delivered')`)) {
    const o = orderDetail(id);
    if (o.status === 'Confirmed' && o.start_date === addDays(t, 1)) {
      sent += notify(o, 'delivery_tomorrow', `Delivery tomorrow for ${o.order_code}`,
        `We deliver on ${fmt(o.start_date)} between 9 am and 1 pm. Please keep someone available at the address.`, `delivery_tomorrow:${o.id}:${o.start_date}`);
    }
    if (o.status !== 'Delivered') continue;
    const perDay = lateCharges(o.items, addDays(o.end_date, 1)).perDayWithGst;
    if (o.end_date === addDays(t, 2)) {
      sent += notify(o, 'due_soon', `${o.order_code} ends in 2 days`,
        `Your rental ends on ${fmt(o.end_date)}. Need it longer? Extend it in My bookings. Otherwise we will pick it up that day.`, `due_soon:${o.id}:${o.end_date}`);
    } else if (o.end_date === addDays(t, 1)) {
      sent += notify(o, 'due_tomorrow', `Pick-up tomorrow for ${o.order_code}`,
        `Your rental ends tomorrow, ${fmt(o.end_date)}. Extend now to avoid late charges of ${inr(perDay)} per day.`, `due_tomorrow:${o.id}:${o.end_date}`);
    } else if (o.end_date === t) {
      sent += notify(o, 'due_today', `${o.order_code} ends today`,
        `Please keep the furniture ready for pick-up today. From tomorrow a late charge of ${inr(perDay)} per day applies.`, `due_today:${o.id}:${o.end_date}`);
    } else if (o.end_date < t) {
      const late = lateCharges(o.items, t);
      sent += notify(o, 'overdue', `${o.order_code} is ${late.days} day${late.days === 1 ? '' : 's'} overdue`,
        `Late charges so far: ${inr(late.total)}, growing by ${inr(late.perDayWithGst)} per day. Reply or call us to schedule the pick-up.`, `overdue:${o.id}:${t}`);
    }
  }
  return sent;
}
