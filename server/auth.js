// Customer accounts: password hashing (scrypt with a random salt) and login sessions.
import crypto from 'node:crypto';

const SESSION_DAYS = 30;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(hash, 'hex');
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

export function createSession(run, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)', [token, userId, expires]);
  return token;
}

export function userFromToken(get, token) {
  if (!token) return null;
  return get(
    `SELECT u.id, u.name, u.email, u.phone, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`, [token, new Date().toISOString()]
  ) || null;
}

export function validateRegistration(b = {}) {
  const errors = {};
  if (!b.name || b.name.trim().length < 2) errors.name = 'Enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email || '')) errors.email = 'Enter a valid email address.';
  if (!/^[6-9]\d{9}$/.test(b.phone || '')) errors.phone = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.';
  const pw = b.password || '';
  if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) errors.password = 'Use at least 8 characters with a letter and a number.';
  return errors;
}
