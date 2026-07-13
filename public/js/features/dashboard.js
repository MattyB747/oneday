// Dashboard — the rolling Daily Briefing. A Vapor-style carousel of day cards,
// each a briefing for that date (weather, tides, events, disruptions, in-season,
// cautions). Signals that aren't wired yet show a subtle "coming soon" line so the
// framework is visible and honest.
import { api } from '../core/api.js';
import { ic } from '../core/icons.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function itemsHtml(list, caution) {
  return list.map((x) => `<div class="item${caution ? ' caution' : ''}"><span class="ic">${esc(x.icon || (caution ? '⚠️' : '•'))}</span><span class="tx">${x.name ? `<b>${esc(x.name)}</b> — ` : ''}${esc(x.text)}</span></div>`).join('');
}

function fmtTime(iso) { try { return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }); } catch (_) { return ''; } }

function dayCardHtml(d) {
  const w = d.weather || {};
  const sec = [];

  if (d.holiday) sec.push(`<div class="holiday">🎉 Public holiday — ${esc(d.holiday)} (expect crowds & some closures)</div>`);

  // What's on
  sec.push(`<div class="sec"><h3>What's on</h3>${
    d.events && d.events.length ? itemsHtml(d.events) : '<div class="soon">Live events feed connects next (Ticketmaster + local listings).</div>'
  }</div>`);

  // Tides
  sec.push(`<div class="sec"><h3>Tides</h3>${
    d.tides ? itemsHtml([{ icon: '🌊', text: d.tides.summary }]) : '<div class="soon">Tide times connect next (key for beach-walk timing).</div>'
  }</div>`);

  // Disruptions
  sec.push(`<div class="sec"><h3>Disruptions</h3>${
    d.disruptions && d.disruptions.length ? itemsHtml(d.disruptions) : '<div class="soon">Loadshedding & roadworks connect next.</div>'
  }</div>`);

  // In season
  if (d.inSeason && d.inSeason.length) sec.push(`<div class="sec"><h3>In season now</h3>${itemsHtml(d.inSeason)}</div>`);

  // Cautions / things to know
  if (d.cautions && d.cautions.length) sec.push(`<div class="sec"><h3>Good to know</h3>${itemsHtml(d.cautions, true)}</div>`);

  return `<article class="dayCard">
    <div class="dayTop">
      <div class="d">${esc(d.weekday)}<small>${esc(d.label)}</small></div>
      <div class="wxBadge"><div class="t">${Math.round(w.maxTempC)}°</div><div class="s">${esc(w.summary || '')}</div></div>
    </div>
    <div class="wxRow"><span>${ic('wind')} wind <b>${Math.round(w.maxWindKmh)}</b> km/h</span><span>${ic('rain')} rain <b>${w.rainProb}%</b></span>${w.sunrise ? `<span>${ic('sunrise')} <b>${fmtTime(w.sunrise)}</b></span>` : ''}${w.sunset ? `<span>${ic('sunset')} <b>${fmtTime(w.sunset)}</b></span>` : ''}</div>
    ${sec.join('')}
  </article>`;
}

export async function loadDashboard(tripId, stay) {
  if (!stay) { try { stay = JSON.parse(sessionStorage.getItem('tempoStay') || 'null'); } catch (_) {} }
  if (stay && $('stayLabel')) $('stayLabel').textContent = stay.label;
  const wrap = $('dayCarousel');
  if (wrap) wrap.innerHTML = '<div class="soon" style="padding:24px">Reading the days…</div>';
  // Pass lat/lon as a fallback so a restarted (memory-cleared) server still works.
  const q = new URLSearchParams();
  if (tripId) q.set('tripId', tripId);
  if (stay && Number.isFinite(stay.lat)) { q.set('lat', stay.lat); q.set('lon', stay.lon); }
  try {
    const b = await api('/api/briefing?' + q.toString());
    if (wrap) wrap.innerHTML = (b.days || []).map(dayCardHtml).join('');
  } catch (err) {
    if (wrap) wrap.innerHTML = `<div class="soon" style="padding:24px">Couldn't load the briefing: ${esc(err.message)}</div>`;
  }
}

export function mountDashboard() { /* dashboard has no extra wiring yet; planner owns the Plan button */ }
