// Setup — one question: where are you staying. Then into the Today hero.
import { api } from '../core/api.js';
import { loadToday } from './today.js';

const $ = (id) => document.getElementById(id);
function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400); }
function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); }

async function go(payload) {
  $('goBtn').disabled = true; $('goBtn').textContent = 'Reading Cape Town…';
  try {
    const res = await api('/api/trip', { method: 'POST', body: payload });
    try { sessionStorage.setItem('odTrip', res.tripId); sessionStorage.setItem('odStay', JSON.stringify(res.stay)); } catch (_) {}
    show('today');
    await loadToday(res.tripId, res.stay);
  } catch (err) { toast(err.message || 'Could not set up — try again'); }
  finally { $('goBtn').disabled = false; $('goBtn').textContent = 'Show me my best day →'; }
}

export function mountSetup() {
  $('useLocation')?.addEventListener('click', () => {
    if (!navigator.geolocation) { toast('Location unavailable — type an area'); return; }
    $('useLocation').textContent = '📍 Locating…';
    navigator.geolocation.getCurrentPosition(
      (p) => go({ lat: p.coords.latitude, lon: p.coords.longitude, label: 'Your location' }),
      () => { $('useLocation').textContent = '📍 Use my current location'; toast('Could not get location — type an area'); },
      { timeout: 8000 }
    );
  });
  const submit = () => { const v = ($('stayInput')?.value || '').trim(); if (!v) return toast('Type where you’re staying'); go({ stay: v }); };
  $('goBtn')?.addEventListener('click', submit);
  $('stayInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  try {
    const t = sessionStorage.getItem('odTrip'); const stay = JSON.parse(sessionStorage.getItem('odStay') || 'null');
    if (t && stay) { show('today'); loadToday(t, stay); }
  } catch (_) {}
}
