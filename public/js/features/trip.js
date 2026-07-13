// The planned holiday — location + days → a complete day-by-day itinerary, each
// stop with why-now, cost, what to wear, things to know, a swap (✕) and a book link.
import { api } from '../core/api.js';
import { ic } from '../core/icons.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400); }

let ctx = { days: 3 };            // { tripId, lat, lon, days }
const seenByKey = {};             // region|kind|mealType -> [ids shown] (swap exclusion)

const swapKey = (s) => `${s.region}|${s.kind || 'activity'}|${s.mealType || ''}`;

function stopHtml(s) {
  const d = s.details || {};
  const isMeal = s.kind === 'meal';
  const detailBits = [
    d.cost ? `<span class="db">${ic('tag')} ${esc(d.cost)}${d.costNote ? ' · ' + esc(d.costNote) : ''}</span>` : '',
    d.wear ? `<span class="db">${ic('shirt')} ${esc(d.wear)}</span>` : '',
  ].join('');
  return `<div class="stop${isMeal ? ' meal' : ''}" data-region="${esc(s.region)}" data-kind="${esc(s.kind || 'activity')}" data-meal="${esc(s.mealType || '')}" data-id="${esc(s.attraction.id)}">
    <div class="stopImg" ${s.image ? `style="background-image:url('${esc(s.image)}')"` : ''}>${isMeal ? `<span class="mealTag">${ic('fork')} ${esc(s.mealType || 'Meal')}</span>` : ''}</div>
    <div class="stopBody">
      <div class="stopTop"><span class="stopTime">${esc(s.hhmm || '')}</span><button class="swapX" title="Swap this out">✕</button></div>
      <h3>${esc(s.attraction.name)}</h3>
      <div class="stopArea">${esc(s.attraction.area)}${s.match ? ` · <b>${esc(s.match)} match</b>` : ''}</div>
      <div class="whys">${(s.why || []).map((w) => `<div class="why">${ic('spark')} ${esc(w)}</div>`).join('')}</div>
      <div class="detailRow">${detailBits}</div>
      ${d.know ? `<div class="know">${ic('info')} ${esc(d.know)}</div>` : ''}
      <a class="bookLink" href="${esc(s.bookUrl || '#')}" target="_blank" rel="noopener">${isMeal ? 'Book a table' : 'Check availability & book'} ${ic('ext')}</a>
    </div>
  </div>`;
}

function render(plan) {
  const total = (plan.days || []).reduce((n, d) => n + d.slots.length, 0);
  $('tripTitle').textContent = `We’ve planned your perfect ${plan.days.length}-day trip.`;
  $('tripSub').textContent = `${total} hand-picked experiences, each at its best time — and here’s why.`;
  $('tripDays').innerHTML = (plan.days || []).map((day, i) => `
    <div class="tripDay">
      <div class="dayHead"><span class="dnum">Day ${i + 1}</span><span class="dlabel">${esc(day.label)}</span>
        <span class="dwx">${ic('temp')} ${Math.round(day.weather.maxTempC)}° · ${ic('wind')} ${Math.round(day.weather.maxWindKmh)} · ${ic('rain')} ${day.weather.rainProb}%</span></div>
      <div class="stops">${day.slots.map(stopHtml).join('')}</div>
    </div>`).join('');
  // Seed swap-exclusion with everything shown.
  (plan.days || []).forEach((day) => day.slots.forEach((s) => { const k = swapKey(s); (seenByKey[k] = seenByKey[k] || []).push(s.attraction.id); }));
}

async function doSwap(stopEl) {
  const region = stopEl.dataset.region, kind = stopEl.dataset.kind, mealType = stopEl.dataset.meal || undefined;
  const key = `${region}|${kind}|${mealType || ''}`;
  const btn = stopEl.querySelector('.swapX'); if (btn) { btn.textContent = '…'; btn.disabled = true; }
  try {
    const s = await api('/api/itinerary/swap', { method: 'POST', body: { tripId: ctx.tripId, lat: ctx.lat, lon: ctx.lon, days: ctx.days, region, kind, mealType, exclude: seenByKey[key] || [] } });
    (seenByKey[key] = seenByKey[key] || []).push(s.attraction.id);
    s.hhmm = stopEl.querySelector('.stopTime')?.textContent || '';
    const wrap = document.createElement('div'); wrap.innerHTML = stopHtml(s);
    stopEl.replaceWith(wrap.firstElementChild);
  } catch (err) { if (btn) { btn.textContent = '✕'; btn.disabled = false; } toast(err.message || 'No more options'); }
}

export async function loadTrip(opts) {
  ctx = { ...ctx, ...opts };
  $('tripDays').innerHTML = '<div class="planning"><div class="spin"></div>Planning your perfect trip…</div>';
  const q = new URLSearchParams();
  if (ctx.tripId) q.set('tripId', ctx.tripId);
  if (Number.isFinite(ctx.lat)) { q.set('lat', ctx.lat); q.set('lon', ctx.lon); }
  q.set('days', ctx.days);
  try {
    const plan = await api('/api/itinerary?' + q.toString());
    render(plan);
  } catch (err) { $('tripDays').innerHTML = `<div class="planning">Couldn’t plan: ${esc(err.message)}</div>`; }
}

export function mountTrip() {
  $('tripDays')?.addEventListener('click', (e) => { const b = e.target.closest('.swapX'); if (b) doSwap(b.closest('.stop')); });
}
