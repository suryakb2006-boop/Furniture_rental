// Thin wrapper around fetch for the RentRoom API.
const BASE = '/api';

export const adminToken = {
  get: () => { try { return sessionStorage.getItem('rr_admin') || ''; } catch { return ''; } },
  set: (t) => { try { t ? sessionStorage.setItem('rr_admin', t) : sessionStorage.removeItem('rr_admin'); } catch { /* ignore */ } },
};

export const customerToken = {
  get: () => { try { return localStorage.getItem('rr_token') || ''; } catch { return ''; } },
  set: (t) => { try { t ? localStorage.setItem('rr_token', t) : localStorage.removeItem('rr_token'); } catch { /* ignore */ } },
};

async function request(path, { method = 'GET', body, admin = false, auth = false, both = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (both) {
    if (customerToken.get()) headers.Authorization = 'Bearer ' + customerToken.get();
    if (adminToken.get()) headers['X-Admin-Token'] = adminToken.get();
  }
  if (admin) headers.Authorization = 'Bearer ' + adminToken.get();
  if (auth) headers.Authorization = 'Bearer ' + customerToken.get();
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw Object.assign(new Error('Cannot reach the server. Is `npm run dev` running?'), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed.'), { status: res.status, data });
  return data;
}

const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && v !== null)).toString();

export const api = {
  meta: () => request('/meta'),
  furniture: (filters = {}) => request('/furniture?' + qs(filters)),
  item: (id) => request(`/furniture/${id}`),
  availability: (id, from, days = 14) => request(`/furniture/${id}/availability?` + qs({ from, days })),
  quote: (lines) => request('/orders/quote', { method: 'POST', body: { lines } }),
  pay: (body) => request('/payments/mock', { method: 'POST', body }),
  placeOrder: (body) => request('/orders', { method: 'POST', body, auth: true }),
  myOrders: () => request('/my/orders', { auth: true }),
  orderByCode: (code) => request(`/orders/code/${encodeURIComponent(code)}`, { auth: true }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'PATCH', auth: true }),
  extendQuote: (id, end) => request(`/orders/${id}/extend?` + qs({ end }), { auth: true }),
  extend: (id, end, ref) => request(`/orders/${id}/extend`, { method: 'POST', body: { end, payment: { ref } }, auth: true }),
  planner: (body) => request('/planner', { method: 'POST', body }),
  bundles: (from, to) => request('/bundles?' + qs({ from, to })),
  bundle: (id, from, to) => request(`/bundles/${id}?` + qs({ from, to })),
  reviews: (id) => request(`/furniture/${id}/reviews`),
  addReview: (body) => request('/reviews', { method: 'POST', body, auth: true }),
  notifications: () => request('/my/notifications', { auth: true }),
  readNotifications: () => request('/my/notifications/read', { method: 'POST', auth: true }),
  invoice: (code) => request(`/invoice/${encodeURIComponent(code)}`, { both: true }),
  wishlist: () => request('/my/wishlist', { auth: true }),
  wishAdd: (id) => request(`/my/wishlist/${id}`, { method: 'POST', auth: true }),
  wishRemove: (id) => request(`/my/wishlist/${id}`, { method: 'DELETE', auth: true }),
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (identifier, password) => request('/auth/login', { method: 'POST', body: { identifier, password } }),
    me: () => request('/auth/me', { auth: true }),
    logout: () => request('/auth/logout', { method: 'POST', auth: true }),
  },
  admin: {
    login: (password) => request('/admin/login', { method: 'POST', body: { password } }),
    stats: () => request('/admin/stats', { admin: true }),
    furniture: () => request('/admin/furniture', { admin: true }),
    create: (body) => request('/admin/furniture', { method: 'POST', body, admin: true }),
    update: (id, body) => request(`/admin/furniture/${id}`, { method: 'PUT', body, admin: true }),
    remove: (id) => request(`/admin/furniture/${id}`, { method: 'DELETE', admin: true }),
    notifications: () => request('/admin/notifications', { admin: true }),
    runReminders: () => request('/admin/reminders/run', { method: 'POST', admin: true }),
    upload: (dataUrl) => request('/admin/upload', { method: 'POST', body: { dataUrl }, admin: true }),
    orders: (status) => request('/admin/orders?' + qs({ status }), { admin: true }),
    setStatus: (id, status, extra = {}) => request(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status, ...extra }, admin: true }),
    latePreview: (id, params) => request(`/admin/orders/${id}/late?` + qs(params), { admin: true }),
    // Downloads a CSV export through fetch so the admin token is sent, then saves it as a file.
    download: async (name) => {
      const res = await fetch(`${BASE}/admin/export/${name}`, { headers: { Authorization: 'Bearer ' + adminToken.get() } });
      if (!res.ok) throw Object.assign(new Error(res.status === 401 ? 'Please log in as admin again.' : 'Export failed.'), { status: res.status });
      const blob = await res.blob();
      const file = (res.headers.get('Content-Disposition') || '').match(/filename="(.+)"/)?.[1] || name;
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: file });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return file;
    },
    availability: (from, days = 14) => request('/admin/availability?' + qs({ from, days }), { admin: true }),
  },
};
