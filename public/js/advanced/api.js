/**
 * Advanced Mode API Client
 * Centralizes all network requests to /api/advanced endpoints with zero UI logic.
 */

export async function fetchDashboardMetrics() {
  const res = await fetch('/api/advanced/dashboard');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPeople(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/advanced/people?${q}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchDonations(urlOrParams = {}) {
  const url = typeof urlOrParams === 'string' 
    ? urlOrParams 
    : `/api/advanced/donations?${new URLSearchParams(urlOrParams).toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchRankings(metric, limit, offset) {
  const res = await fetch(`/api/advanced/rankings?metric=${encodeURIComponent(metric)}&limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPersonProfile(personId) {
  const res = await fetch(`/api/advanced/people/${encodeURIComponent(personId)}/profile`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPersonWealth(personId) {
  const res = await fetch(`/api/advanced/people/${encodeURIComponent(personId)}/wealth`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchParity(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchComparison(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCitations(donationId) {
  const res = await fetch(`/api/advanced/donations/${encodeURIComponent(donationId)}/sources`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchDiscovery(limit = 10, billionaire = '') {
  const bParam = billionaire ? `&billionaire=${encodeURIComponent(billionaire)}` : '';
  const res = await fetch(`/api/advanced/discover?limit=${limit}${bParam}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
