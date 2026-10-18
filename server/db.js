// SQLite database layer (sql.js: real SQLite compiled to WebAssembly, no native build needed on Windows/Mac/Linux).
// The database lives in server/rental.db and is saved to disk after every write.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { seedDatabase, seedUsers, seedBundles, seedReviews, MONTHLY, SIZES } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.join(__dirname, 'rental.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS furniture (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Sofa','Bed','Chair','Table','Desk','Storage','Decor')),
  price_per_day INTEGER NOT NULL CHECK (price_per_day > 0),
  deposit INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL CHECK (condition IN ('New','Like New','Good')),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  uses TEXT NOT NULL DEFAULT 'Home',
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','Maintenance','Unlisted')),
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'Home',
  subtotal INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  gst INTEGER NOT NULL,
  delivery INTEGER NOT NULL,
  deposit INTEGER NOT NULL,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  payment_ref TEXT,
  payment_status TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed','Delivered','Returned','Cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  furniture_id INTEGER NOT NULL REFERENCES furniture(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days INTEGER NOT NULL,
  rent INTEGER NOT NULL,
  deposit INTEGER NOT NULL,
  rate INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_extensions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_end TEXT NOT NULL,
  new_end TEXT NOT NULL,
  extra_days INTEGER NOT NULL,
  rent INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  gst INTEGER NOT NULL,
  payment_method TEXT,
  payment_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS wishlist (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  furniture_id INTEGER NOT NULL REFERENCES furniture(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  PRIMARY KEY (user_id, furniture_id)
);

CREATE TABLE IF NOT EXISTS bundles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tagline TEXT,
  use TEXT NOT NULL,
  discount_pct INTEGER NOT NULL DEFAULT 10,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS bundle_items (
  bundle_id INTEGER NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  furniture_id INTEGER NOT NULL REFERENCES furniture(id),
  qty INTEGER NOT NULL,
  PRIMARY KEY (bundle_id, furniture_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  furniture_id INTEGER NOT NULL REFERENCES furniture(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  order_id INTEGER REFERENCES orders(id),
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (order_id, furniture_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  order_id INTEGER REFERENCES orders(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channels TEXT,
  dedupe_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  read_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_furniture ON order_items(furniture_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
`;

let db;

export async function openDatabase({ fresh = false } = {}) {
  const SQL = await initSqlJs();
  const exists = fs.existsSync(DB_PATH);
  db = !fresh && exists ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.run(SCHEMA);
  // Migration for databases created before customer accounts existed.
  if (!all('PRAGMA table_info(orders)').some((c) => c.name === 'user_id')) {
    db.run('ALTER TABLE orders ADD COLUMN user_id INTEGER REFERENCES users(id)');
  }
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)');
  // Migration: late-return charges.
  const orderCols = all('PRAGMA table_info(orders)').map((c) => c.name);
  for (const [col, type] of [['returned_on', 'TEXT'], ['late_days', 'INTEGER NOT NULL DEFAULT 0'], ['late_fee', 'INTEGER NOT NULL DEFAULT 0'],
    ['late_gst', 'INTEGER NOT NULL DEFAULT 0'], ['deposit_refund', 'INTEGER'], ['balance_due', 'INTEGER NOT NULL DEFAULT 0'],
    ['damage_level', "TEXT NOT NULL DEFAULT 'None'"], ['damage_charge', 'INTEGER NOT NULL DEFAULT 0'], ['damage_note', 'TEXT']]) {
    if (!orderCols.includes(col)) db.run(`ALTER TABLE orders ADD COLUMN ${col} ${type}`);
  }
  if (!all('PRAGMA table_info(furniture)').some((c) => c.name === 'price_per_month')) {
    db.run('ALTER TABLE furniture ADD COLUMN price_per_month INTEGER');
    for (const [name, m] of Object.entries(MONTHLY)) db.run('UPDATE furniture SET price_per_month = ? WHERE name = ?', [m, name]);
    db.run('UPDATE furniture SET price_per_month = price_per_day * 3 WHERE price_per_month IS NULL');
  }
  if (!all('PRAGMA table_info(furniture)').some((c) => c.name === 'width_cm')) {
    db.run('ALTER TABLE furniture ADD COLUMN width_cm INTEGER');
    db.run('ALTER TABLE furniture ADD COLUMN depth_cm INTEGER');
    for (const [name, [w, d]] of Object.entries(SIZES)) db.run('UPDATE furniture SET width_cm = ?, depth_cm = ? WHERE name = ?', [w, d, name]);
  }
  if (!all('PRAGMA table_info(furniture)').some((c) => c.name === 'image_url_2')) db.run("ALTER TABLE furniture ADD COLUMN image_url_2 TEXT DEFAULT ''");
  if (!all('PRAGMA table_info(order_items)').some((c) => c.name === 'bundle_id')) db.run('ALTER TABLE order_items ADD COLUMN bundle_id INTEGER');
  if (!all('PRAGMA table_info(order_items)').some((c) => c.name === 'rate')) db.run('ALTER TABLE order_items ADD COLUMN rate INTEGER');
  db.run('UPDATE order_items SET rate = (SELECT price_per_day FROM furniture f WHERE f.id = order_items.furniture_id) WHERE rate IS NULL');
  const { n } = get('SELECT COUNT(*) AS n FROM furniture');
  if (n === 0) {
    seedDatabase({ run, get, all, transaction });
    console.log('Seeded database with sample furniture and orders.');
  }
  if (get('SELECT COUNT(*) AS n FROM users').n === 0) {
    seedUsers({ run, get, transaction });
    console.log('Created demo customer accounts.');
  }
  if (get('SELECT COUNT(*) AS n FROM bundles').n === 0) seedBundles({ run, get, transaction });
  if (get('SELECT COUNT(*) AS n FROM reviews').n === 0) seedReviews({ run, get, transaction });
  persist();
  return db;
}

export function persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

export function get(sql, params = []) {
  return all(sql, params)[0];
}

export function run(sql, params = []) {
  db.run(sql, params);
  const row = get('SELECT last_insert_rowid() AS id, changes() AS changes');
  return { lastInsertRowid: row.id, changes: row.changes };
}

// Runs fn inside BEGIN/COMMIT, rolls back on error, saves the file on success.
export function transaction(fn) {
  db.run('BEGIN');
  try {
    const result = fn();
    db.run('COMMIT');
    persist();
    return result;
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}
