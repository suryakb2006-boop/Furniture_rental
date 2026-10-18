// Rental Life Planner: turns a situation (what, how long, which rooms, budget) into a complete,
// budget-checked furniture plan. Pure rules over the live catalogue and stock, no AI model.
//
// Steps: situation -> list of "slots" (e.g. Bedroom 1: bed) -> candidates from the catalogue that are
// free for the whole period -> pick by priority (value or comfort) -> fit the budget by downgrading,
// then dropping nice-to-haves -> priced plan with alternatives the customer can swap.
import { addDays, daysInclusive, freeUnits, quoteLine, orderTotals, today, validatePeriod } from './logic.js';

const has = (re) => (f) => re.test(f.name);
const cat = (c, re) => (f) => f.category === c && (!re || re.test(f.name));

// What each situation needs. essential = always planned; optional = added while the budget allows.
function buildSlots(p) {
  const s = [];
  // weight: how much an optional item matters (dropped lowest first when the budget is tight)
  const add = (key, room, label, match, qty, essential, weight = 1) => qty > 0 && s.push({ key, room, label, match, qty, essential, weight });
  if (p.situation === 'home') {
    if (p.rooms.living) {
      add('living-sofa', 'Living room', 'Sofa', cat('Sofa'), 1, true);
      add('living-coffee', 'Living room', 'Coffee table', has(/coffee/i), 1, false, 2);
      add('living-armchair', 'Living room', 'Accent chair', has(/armchair|accent/i), 1, false);
      add('living-rug', 'Living room', 'Rug', has(/rug/i), 1, false);
      add('living-lamp', 'Living room', 'Floor lamp', has(/lamp/i), 1, false);
    }
    for (let i = 1; i <= p.rooms.bedrooms; i++) {
      add(`bed-${i}`, `Bedroom ${i}`, 'Bed with mattress', cat('Bed'), 1, true);
      add(`wardrobe-${i}`, `Bedroom ${i}`, 'Wardrobe', has(/wardrobe/i), 1, false, 4 - i * 0.1);
    }
    if (p.rooms.dining) add('dining', 'Dining', 'Dining table set', has(/dining/i), 1, true);
    if (p.rooms.work) {
      add('work-desk', 'Work corner', 'Desk', (f) => f.category === 'Desk' && !/workstation/i.test(f.name), 1, true);
      add('work-chair', 'Work corner', 'Office chair', cat('Chair', /office|ergonomic|mesh/i), 1, true);
      add('work-shelf', 'Work corner', 'Bookshelf', has(/bookshelf|shelf/i), 1, false, 2);
    }
  } else if (p.situation === 'office') {
    const n = p.teamSize;
    add('office-ws', 'Team area', `Workstations for ${n}`, has(/workstation/i), Math.ceil(n / 4), true);
    add('office-chairs', 'Team area', 'Office chairs', cat('Chair', /office|ergonomic|mesh/i), n, true);
    add('office-conf', 'Meeting room', 'Conference table', has(/conference/i), n >= 5 ? 1 : 0, false, 3);
    add('office-filing', 'Storage', 'Filing cabinet', has(/filing|cabinet/i), Math.max(1, Math.round(n / 8)), false, 2);
    add('office-sofa', 'Reception', 'Reception sofa', cat('Sofa'), 1, false);
  } else if (p.situation === 'event') {
    const g = p.guests;
    add('event-chairs', 'Seating', `Chairs for ${g} guests`, (f) => f.category === 'Chair' && /banquet|chiavari/i.test(f.name), g, true);
    add('event-tables', 'Seating', 'Round tables (8 to 10 per table)', has(/banquet table|round/i), Math.ceil(g / 9), true);
    add('event-stage', 'Stage', 'Stage backdrop', has(/backdrop|stage/i), 1, false, 3);
    add('event-cocktail', 'Networking area', 'Cocktail tables', has(/cocktail/i), Math.max(2, Math.round(g / 25)), false);
    add('event-lamps', 'Decor', 'Floor lamps', has(/lamp/i), Math.max(2, Math.round(g / 50)), false);
  }
  return s;
}

const CONDITION_RANK = { New: 3, 'Like New': 2, Good: 1 };

// Room Fit Check. A piece fits an empty room if it fits in either orientation (rugs lie under furniture).
export const FT = 30.48;
export function fitsRoom(f, size) {
  if (!size || !f.width_cm || !f.depth_cm || /rug/i.test(f.name)) return true;
  const W = size.w * FT;
  const L = size.l * FT;
  return (f.width_cm <= W && f.depth_cm <= L) || (f.depth_cm <= W && f.width_cm <= L);
}
const ROOM_DEFAULTS = { 'Living room': [12, 14], Dining: [10, 10], 'Work corner': [6, 8] };
function roomSizesFor(raw, rooms) {
  const out = {};
  const names = [];
  if (rooms.living) names.push('Living room');
  for (let i = 1; i <= rooms.bedrooms; i++) names.push(`Bedroom ${i}`);
  if (rooms.dining) names.push('Dining');
  if (rooms.work) names.push('Work corner');
  for (const n of names) {
    const r = raw?.[n] || {};
    const [dw, dl] = ROOM_DEFAULTS[n] || [10, 12];
    const clamp = (v, d) => Math.min(40, Math.max(4, Number(v) || d));
    out[n] = { w: clamp(r.w, dw), l: clamp(r.l, dl) };
  }
  return out;
}

export function normalize(raw = {}) {
  const situation = ['home', 'office', 'event'].includes(raw.situation) ? raw.situation : 'home';
  const start = raw.start && raw.start >= today() ? raw.start : addDays(today(), 2);
  const months = Math.min(6, Math.max(1, Math.round(Number(raw.months) || 1)));
  const days = situation === 'event' ? Math.min(14, Math.max(1, Math.round(Number(raw.days) || 1))) : months * 30;
  return {
    situation, start, months, days, end: addDays(start, days - 1),
    rooms: {
      living: raw.rooms?.living !== false, dining: !!raw.rooms?.dining, work: !!raw.rooms?.work,
      bedrooms: Math.min(3, Math.max(0, Math.round(Number(raw.rooms?.bedrooms ?? 1)))),
    },
    teamSize: Math.min(40, Math.max(2, Math.round(Number(raw.teamSize) || 4))),
    guests: Math.min(300, Math.max(10, Math.round(Number(raw.guests) || 50))),
    budget: Math.max(0, Math.round(Number(raw.budget) || 0)),
    priority: raw.priority === 'comfort' ? 'comfort' : 'value',
    choices: raw.choices && typeof raw.choices === 'object' ? raw.choices : {},
    skip: Array.isArray(raw.skip) ? raw.skip : [],
    include: Array.isArray(raw.include) ? raw.include : [],
    fitCheck: raw.fitCheck !== false,
    roomSizes: raw.roomSizes,
  };
}

export function buildPlan({ all, get }, rawInput, ratingOf) {
  const p = normalize(rawInput);
  const periodErr = validatePeriod(p.start, p.end);
  if (periodErr) return { error: periodErr };
  const perMonth = p.situation !== 'event'; // homes and offices budget per month; events budget in total
  p.roomSizes = p.situation === 'home' && p.fitCheck ? roomSizesFor(p.roomSizes, p.rooms) : {};
  const unit = (rent) => (perMonth ? Math.round(rent / (p.days / 30)) : rent);

  const catalogue = all(`SELECT * FROM furniture WHERE status = 'Available'`);
  const used = []; // units already planned, so two slots never count on the same stock
  const slots = buildSlots(p).map((slot) => {
    const cands = catalogue.filter(slot.match).map((f) => {
      const q = quoteLine(f, slot.qty, p.start, p.end);
      return { f, q, cost: unit(q.rent), rating: ratingOf(f.id) };
    });
    return { ...slot, cands };
  });

  const byValue = (a, b) => a.cost - b.cost;
  const byComfort = (a, b) => (CONDITION_RANK[b.f.condition] - CONDITION_RANK[a.f.condition]) || (b.rating.avg - a.rating.avg) || (b.cost - a.cost);

  // Pick an item per slot, respecting stock across the whole plan.
  const lines = [];
  const dropped = [];
  for (const slot of slots) {
    const free = (c) => freeUnits(all, c.f, p.start, p.end, used) >= slot.qty;
    const available = slot.cands.filter(free);
    if (p.skip.includes(slot.key)) { dropped.push({ key: slot.key, room: slot.room, label: slot.label, essential: slot.essential, reason: 'Removed by you', from: available.length ? Math.min(...available.map((c) => c.cost)) : null }); continue; }
    if (!available.length) { dropped.push({ key: slot.key, room: slot.room, label: slot.label, essential: slot.essential, reason: slot.cands.length ? `Not enough stock for ${slot.qty} on these dates` : 'Not in the catalogue yet', from: null }); continue; }
    // With a room size, pieces that fit the room come first; a piece too big is used only if nothing else fits.
    const size = p.roomSizes[slot.room];
    const rank = p.priority === 'comfort' ? byComfort : byValue;
    const sorted = [...available].sort((a, b) => (fitsRoom(b.f, size) - fitsRoom(a.f, size)) || rank(a, b));
    const forced = available.find((c) => c.f.id === Number(p.choices[slot.key]));
    const pick = forced || sorted[0];
    lines.push({ slot, pick, available, forced: !!forced });
    used.push({ furniture_id: pick.f.id, qty: slot.qty, start_date: p.start, end_date: p.end });
  }

  // Room Fit Check, room by room: pieces plus walking space (20% around each) may cover at most 60% of the floor.
  // Too full? Swap the largest pieces for smaller ones that do the same job, then leave out optional pieces.
  const notes0 = [];
  const footprint = (f, qty) => (/rug/i.test(f.name) || !f.width_cm ? 0 : f.width_cm * f.depth_cm * qty * 1.2);
  for (const [room, size] of Object.entries(p.roomSizes)) {
    const limit = size.w * FT * size.l * FT * 0.6;
    const inRoom = () => lines.filter((l) => l.slot.room === room);
    const usedArea = () => inRoom().reduce((s, l) => s + footprint(l.pick.f, l.slot.qty), 0);
    if (usedArea() <= limit) continue;
    for (const l of [...inRoom()].filter((x) => !x.forced).sort((a, b) => footprint(b.pick.f, b.slot.qty) - footprint(a.pick.f, a.slot.qty))) {
      if (usedArea() <= limit) break;
      const smaller = l.available.filter((c) => fitsRoom(c.f, size) && footprint(c.f, l.slot.qty) < footprint(l.pick.f, l.slot.qty))
        .sort((a, b) => footprint(b.f, l.slot.qty) - footprint(a.f, l.slot.qty)); // largest that is still smaller
      for (const c of smaller) {
        const before = l.pick; l.pick = c;
        if (usedArea() <= limit || c === smaller[smaller.length - 1]) { notes0.push(`${room}: ${before.f.name} swapped for ${c.f.name} so the ${size.w} x ${size.l} ft room is not overcrowded.`); break; }
        l.pick = before;
      }
    }
    for (const l of [...inRoom()].filter((x) => !x.slot.essential && !p.include.includes(x.slot.key)).sort((a, b) => (a.slot.weight - b.slot.weight) || (footprint(b.pick.f, 1) - footprint(a.pick.f, 1)))) {
      if (usedArea() <= limit) break;
      lines.splice(lines.indexOf(l), 1);
      dropped.push({ key: l.slot.key, room, label: l.slot.label, essential: false, reason: `Not enough floor space in a ${size.w} x ${size.l} ft room`, from: Math.min(...l.available.map((c) => c.cost)) });
    }
  }

  // Fit the budget: first switch to cheaper options, then leave out nice-to-haves.
  const total = () => lines.reduce((s, l) => s + l.pick.cost, 0);
  const notes = [...notes0];
  if (p.budget > 0 && total() > p.budget) {
    const swaps = lines.filter((l) => !l.forced).map((l) => ({ l, cheapest: [...l.available].filter((c) => fitsRoom(c.f, p.roomSizes[l.slot.room])).sort(byValue)[0] }))
      .filter((x) => x.cheapest)
      .filter((x) => x.cheapest.cost < x.l.pick.cost).sort((a, b) => (b.l.pick.cost - b.cheapest.cost) - (a.l.pick.cost - a.cheapest.cost));
    for (const x of swaps) {
      if (total() <= p.budget) break;
      notes.push(`Switched ${x.l.slot.label.toLowerCase()} to ${x.cheapest.f.name} to stay in budget.`);
      x.l.pick = x.cheapest;
    }
  }
  if (p.budget > 0 && total() > p.budget) {
    const optional = lines.filter((l) => !l.slot.essential && !p.include.includes(l.slot.key)).sort((a, b) => (a.slot.weight - b.slot.weight) || (b.pick.cost - a.pick.cost));
    for (const l of optional) {
      if (total() <= p.budget) break;
      lines.splice(lines.indexOf(l), 1);
      dropped.push({ key: l.slot.key, room: l.slot.room, label: l.slot.label, essential: false, reason: 'Left out to stay in budget', from: Math.min(...l.available.map((c) => c.cost)) });
    }
  }

  const priced = lines.map((l) => ({ ...l.pick.q, qty: l.slot.qty }));
  const totals = orderTotals(priced);
  const planCost = total();
  return {
    input: p,
    period: { start: p.start, end: p.end, days: p.days, months: p.months },
    roomSizes: p.roomSizes,
    basis: perMonth ? 'month' : 'total',
    lines: lines.map((l) => ({
      key: l.slot.key, room: l.slot.room, label: l.slot.label, essential: l.slot.essential, qty: l.slot.qty,
      item: { id: l.pick.f.id, name: l.pick.f.name, category: l.pick.f.category, condition: l.pick.f.condition, image_url: l.pick.f.image_url, price_per_day: l.pick.f.price_per_day, price_per_month: l.pick.f.price_per_month, deposit: l.pick.f.deposit, rating: l.pick.rating, width_cm: l.pick.f.width_cm, depth_cm: l.pick.f.depth_cm },
      rent: l.pick.q.rent, cost: l.pick.cost, discount: l.pick.q.discount,
      alternatives: [...l.available].sort(byValue).map((c) => ({ id: c.f.id, name: c.f.name, condition: c.f.condition, cost: c.cost, rating: c.rating.avg, width_cm: c.f.width_cm, depth_cm: c.f.depth_cm, fits: fitsRoom(c.f, p.roomSizes[l.slot.room]) })),
      fits: fitsRoom(l.pick.f, p.roomSizes[l.slot.room]),
    })),
    dropped,
    notes,
    summary: {
      cost: planCost, budget: p.budget, remaining: p.budget ? p.budget - planCost : null, withinBudget: !p.budget || planCost <= p.budget,
      pieces: lines.reduce((s, l) => s + l.slot.qty, 0),
      savedVsDaily: priced.reduce((s, l) => s + l.discount, 0),
      ...totals,
    },
  };
}
