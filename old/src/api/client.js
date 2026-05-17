// ============================================================
// src/api/client.js
// Base HTTP client — ALL server calls go through here.
// To swap from mock → real backend, change BASE_URL only.
//
// Auth (login session) stays in localStorage since json-server
// has no auth system — that is fine for a mock server.
// ============================================================

const BASE_URL = 'http://localhost:3000';

const APIClient = {

  async get(endpoint) {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.status}`);
    return res.json();
  },

  async post(endpoint, body) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`POST ${endpoint} failed: ${res.status}`);
    return res.json();
  },

  async put(endpoint, body) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`PUT ${endpoint} failed: ${res.status}`);
    return res.json();
  },

  async patch(endpoint, body) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`PATCH ${endpoint} failed: ${res.status}`);
    return res.json();
  },

  async delete(endpoint) {
    const res = await fetch(`${BASE_URL}${endpoint}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${endpoint} failed: ${res.status}`);
    return true;
  }
};

// ── Auth helpers (localStorage only — json-server has no auth) ──
const Auth = {
  getUser()       { return JSON.parse(localStorage.getItem('user') || '{}'); },
  setUser(user)   { localStorage.setItem('user', JSON.stringify(user)); },
  clearUser()     { localStorage.removeItem('user'); },
  isLoggedIn()    { return !!this.getUser().loggedIn; }
};

window.APIClient = APIClient;
window.Auth      = Auth;
