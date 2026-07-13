// Setup — two questions: how many days + where are you staying. Then plan the trip.
import { api } from '../core/api.js';
import { loadTrip } from './trip.js';

const $ = (id) => document.getElementById(id);
let days = 5;
function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400); }
function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); }

async function go(payload) {
  $('goBtn').disabled = true; $('goBtn').textContent = 'Planning…';
  try {
    const res = await api('/api/trip', { method: 'POST', body: payload });
    try { sessionStorage.setItem('odTrip', res.tripId); sessionStorage.setItem('odStay', JSON.stringify(res.stay)); sessionStorage.setItem('odDays', String(days)); } catch (_) {}
    show('trip');
    await loadTrip({ tripId: res.tripId, lat: res.stay.lat, lon: res.stay.lon, days });
  } catch (err) { toast(err.message || 'Could not plan — try again'); }
  finally { $('goBtn').disabled = false; $('goBtn').textContent = 'Build My Trip →'; }
}

function renderDays() {
  $('dayPick').innerHTML = [2, 3, 4, 5, 7].map((n) => `<button class="dayChip${n === days ? ' on' : ''}" data-n="${n}">${n === 7 ? '7+' : n}</button>`).join('');
}

export function mountSetup() {
  renderDays();
  $('dayPick')?.addEventListener('click', (e) => { const b = e.target.closest('.dayChip'); if (!b) return; days = Number(b.dataset.n); renderDays(); });
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

  try {
    const t = sessionStorage.getItem('odTrip'); const stay = JSON.parse(sessionStorage.getItem('odStay') || 'null'); const dd = Number(sessionStorage.getItem('odDays')) || 5;
    if (t && stay) { days = dd; show('trip'); loadTrip({ tripId: t, lat: stay.lat, lon: stay.lon, days: dd }); }
  } catch (_) {}
}
