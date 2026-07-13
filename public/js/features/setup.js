// Setup — one question: where are you staying. Then into the dashboard.
import { api } from '../core/api.js';
import { loadDashboard } from './dashboard.js';

const $ = (id) => document.getElementById(id);
function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400); }
function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); }

async function go(payload) {
  $('goBtn').disabled = true;
  try {
    const res = await api('/api/trip', { method: 'POST', body: payload });
    try { sessionStorage.setItem('tempoTrip', res.tripId); } catch (_) {}
    show('dash');
    await loadDashboard(res.tripId, res.stay);
  } catch (err) {
    toast(err.message || 'Could not set up — try again');
  } finally { $('goBtn').disabled = false; }
}

export function mountSetup() {
  $('useLocation')?.addEventListener('click', () => {
    if (!navigator.geolocation) { toast('Location unavailable — type an area instead'); return; }
    $('useLocation').textContent = '📍 Locating…';
    navigator.geolocation.getCurrentPosition(
      (p) => go({ lat: p.coords.latitude, lon: p.coords.longitude, label: 'Your location' }),
      () => { $('useLocation').textContent = '📍 Use my current location'; toast('Could not get location — type an area'); },
      { timeout: 8000 }
    );
  });
  const submit = () => {
    const v = ($('stayInput')?.value || '').trim();
    if (!v) { toast('Type where you’re staying, or use your location'); return; }
    go({ stay: v });
  };
  $('goBtn')?.addEventListener('click', submit);
  $('stayInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  // Resume an existing trip if we have one.
  try {
    const t = sessionStorage.getItem('tempoTrip');
    if (t) { show('dash'); loadDashboard(t); }
  } catch (_) {}
}
