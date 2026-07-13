// The 7-Day Everything dashboard — the landing after a location. Shows the next
// week of Cape Town (weather, tides, markets/events, what's in season) as day
// cards, then hands off to the itinerary planner.
import { api } from '../core/api.js';
import { loadTrip } from './trip.js';

const $ = (id) => document.getElementById(id);
const CAPE_TOWN = { lat: -33.9249, lon: 18.4241 }; // city default — no "where are you staying?" needed
let days = 5;
let ctx = null; // { tripId, lat, lon }

function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400); }
function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); }

const CAT_ICON = { market: '🛍️', food: '🥑', music: '🎶', culture: '🎨', festival: '🎉' };

function wxIcon(w) {
  if (w.rainProb >= 55) return '🌧️';
  if (w.rainProb >= 25) return '⛅';
  if (w.windKmh >= 40) return '💨';
  return '☀️';
}

function dayCard(d) {
  const events = (d.events || []).map((e) =>
    `<div class="wEvent"><span class="ec">${CAT_ICON[e.category] || '📍'}</span><div><b>${e.name}</b><small>${e.where}</small></div></div>`).join('');
  const season = (d.inSeason || []).map((s) => `<span class="wPill">${s.icon || '✨'} ${s.name}</span>`).join('');
  const caution = (d.cautions || []).map((c) => `<span class="wPill warn">⚠︎ ${c.name || c}</span>`).join('');
  return `
    <div class="wCard">
      <div class="wTop">
        <div class="wDate">${d.label}</div>
        <div class="wWx"><span class="wIco">${wxIcon(d.weather)}</span><span class="wTemp">${d.weather.tempC}°</span></div>
      </div>
      <div class="wMeta">${d.weather.summary} · wind ${d.weather.windKmh} km/h${d.tide ? ` · ${d.tide}` : ''}</div>
      ${events ? `<div class="wEvents">${events}</div>` : `<div class="wQuiet">No markets today — a great day to explore.</div>`}
      ${(season || caution) ? `<div class="wPills">${season}${caution}</div>` : ''}
    </div>`;
}

export async function loadWeek(next) {
  ctx = next;
  $('weekGrid').innerHTML = '<div class="wLoading">Reading Cape Town’s next 7 days…</div>';
  show('week');
  try {
    const q = ctx.tripId ? `tripId=${encodeURIComponent(ctx.tripId)}` : `lat=${ctx.lat}&lon=${ctx.lon}`;
    const w = await api(`/api/week?${q}`);
    $('weekGrid').innerHTML = (w.days || []).map(dayCard).join('');
    const nn = $('natureNow');
    if (w.natureNow && w.natureNow.length) { nn.innerHTML = `🐾 <b>Right now:</b> ${w.natureNow[0]}`; nn.hidden = false; }
    else nn.hidden = true;
  } catch (err) {
    $('weekGrid').innerHTML = `<div class="wLoading">Couldn’t load the week — ${err.message}</div>`;
  }
}

function renderDays() {
  $('dayPick').innerHTML = [2, 3, 4, 5, 7].map((n) => `<button class="dayChip${n === days ? ' on' : ''}" data-n="${n}">${n === 7 ? '7+' : n} day${n === 1 ? '' : 's'}</button>`).join('');
}

export function mountWeek() {
  renderDays();
  $('dayPick')?.addEventListener('click', (e) => { const b = e.target.closest('.dayChip'); if (!b) return; days = Number(b.dataset.n); renderDays(); });
  $('planBtn')?.addEventListener('click', async () => {
    if (!ctx) return;
    $('planBtn').disabled = true; $('planBtn').textContent = 'Planning…';
    try {
      try { sessionStorage.setItem('odDays', String(days)); } catch (_) {}
      show('trip');
      await loadTrip({ tripId: ctx.tripId, lat: ctx.lat, lon: ctx.lon, days });
    } catch (err) { toast(err.message || 'Could not plan — try again'); show('week'); }
    finally { $('planBtn').disabled = false; $('planBtn').textContent = 'Plan my trip →'; }
  });

  // Land straight on Cape Town's 7 days — unless a base was set this session.
  let boot = { ...CAPE_TOWN };
  try {
    const t = sessionStorage.getItem('odTrip'); const stay = JSON.parse(sessionStorage.getItem('odStay') || 'null');
    if (t && stay) boot = { tripId: t, lat: stay.lat, lon: stay.lon };
  } catch (_) {}
  loadWeek(boot);
}
