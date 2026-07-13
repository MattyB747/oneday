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

const CAT_ICON = { market: '🛍️', food: '🥑', music: '🎶', comedy: '🎤', culture: '🎨', film: '🎬', festival: '🎉', community: '🏃', sport: '🏅' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CAT_LABEL = { market: 'Markets', food: 'Food & markets', music: 'Live music', comedy: 'Comedy', culture: 'Culture', film: 'Film', festival: 'Festivals', community: 'Out & about', sport: 'Sport' };

// A compact stat chip (weather metric, sun, moon, tide).
const stat = (label, value) => value == null || value === '' ? '' : `<div class="wStat"><span class="sl">${label}</span><span class="sv">${esc(value)}</span></div>`;

function dayCard(d) {
  const w = d.weather;
  // Group "what's on" by category so a busy day reads cleanly.
  const groups = {};
  (d.events || []).forEach((e) => { (groups[e.category] = groups[e.category] || []).push(e); });
  const order = ['festival', 'market', 'food', 'music', 'comedy', 'culture', 'film', 'community', 'sport'];
  const eventsHtml = order.filter((c) => groups[c]).map((c) => {
    const items = groups[c].map((e) => `<div class="wEvent"><b>${esc(e.name)}</b><small>${esc(e.where)}</small></div>`).join('');
    return `<div class="wGroup"><div class="wgHead">${CAT_ICON[c] || '📍'} ${CAT_LABEL[c] || c}</div>${items}</div>`;
  }).join('');
  const count = (d.events || []).length;

  const season = (d.inSeason || []).map((s) => `<span class="wPill">${s.icon || '✨'} ${esc(s.name)}</span>`).join('');
  const caution = (d.cautions || []).map((c) => `<span class="wPill warn">⚠︎ ${esc(c.name || c)}</span>`).join('');
  const nature = (d.nature || []).map((n) => `<div class="wNat">🐾 ${esc(n)}</div>`).join('');

  return `
    <div class="wCard">
      <div class="wHeadRow">
        <div><div class="wDate">${esc(d.label)}</div>${d.holiday ? `<div class="wHol">🇿🇦 ${esc(d.holiday)}</div>` : ''}</div>
        <div class="wWx"><span class="wIco">${w.icon}</span><span class="wTemp">${w.hi}°${w.lo != null ? `<small>/${w.lo}°</small>` : ''}</span></div>
      </div>
      <div class="wCond">${esc(w.text)}</div>

      <div class="wStats">
        ${stat('WIND', w.windKmh + ' km/h')}
        ${stat('RAIN', w.rainProb + '%')}
        ${stat('UV', w.uvBand ? `${w.uv} ${w.uvBand}` : null)}
        ${stat('SUNRISE', d.sun.rise)}
        ${stat('SUNSET', d.sun.set)}
        ${stat('LOW TIDE', (d.tide.low || []).join(' & ') || null)}
        ${stat('MOON', d.moon)}
      </div>

      ${(season || caution) ? `<div class="wPills">${season}${caution}</div>` : ''}

      <div class="wOnHead">What’s on <span class="wCount">${count}</span></div>
      ${eventsHtml || '<div class="wQuiet">A quiet day — perfect for the beach or a hike.</div>'}
      ${nature ? `<div class="wNature">${nature}</div>` : ''}
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
