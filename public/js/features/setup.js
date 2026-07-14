// Setup — one question: where are you staying. Then show the 7-day Everything
// dashboard, from which you spin up an itinerary.
import { api } from '../core/api.js';
import { loadGallery } from './gallery.js';

const $ = (id) => document.getElementById(id);
function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400); }
function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); }

async function go(payload) {
  $('goBtn').disabled = true; $('goBtn').textContent = 'Loading…';
  try {
    const res = await api('/api/trip', { method: 'POST', body: payload });
    try { sessionStorage.setItem('odTrip', res.tripId); sessionStorage.setItem('odStay', JSON.stringify(res.stay)); } catch (_) {}
    await loadGallery({ tripId: res.tripId, lat: res.stay.lat, lon: res.stay.lon });
  } catch (err) { toast(err.message || 'Could not load — try again'); }
  finally { $('goBtn').disabled = false; $('goBtn').textContent = 'Show me Cape Town →'; }
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
  const submit = () => { const v = ($('stayInput')?.value || '').trim(); if (!v) return toast('Where are you staying?'); go({ stay: v }); };
  $('goBtn')?.addEventListener('click', submit);
  $('stayInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  // Boot + session-restore is owned by week.js; this screen is now just the optional base form.
}
