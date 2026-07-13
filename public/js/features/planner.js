// Plan a Trippie — pick days + activity types into a basket, build, and view the
// optimised itinerary with a WHY behind every stop.
import { api } from '../core/api.js';
import { ic } from '../core/icons.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); }
function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); }

const basket = new Set();
let days = 3;
let tripId = null;

function renderDays() {
  $('daysPick').innerHTML = [1, 2, 3, 4, 5, 6, 7].map((n) => `<button class="dayChip${n === days ? ' on' : ''}" data-n="${n}">${n}</button>`).join('');
}
function updateBasketUI() {
  $('basketCount').textContent = `${basket.size} chosen`;
  $('buildTrippie').disabled = basket.size === 0;
  document.querySelectorAll('#libGrid .libChip').forEach((c) => c.classList.toggle('on', basket.has(c.dataset.id)));
}

async function openPlanner(id) {
  tripId = id || tripId;
  show('planner');
  renderDays();
  if (!$('libGrid').dataset.loaded) {
    const { activities } = await api('/api/activities');
    $('libGrid').innerHTML = activities.map((a) => `<button class="libChip" data-id="${esc(a.id)}">${ic(a.icon)}<span>${esc(a.label)}</span><span class="chk">✓</span></button>`).join('');
    $('libGrid').dataset.loaded = '1';
  }
  updateBasketUI();
}

function slotHtml(s) {
  return `<div class="slot">
    <div class="time">${esc(s.hhmm)}</div>
    <div class="card">
      <h4>${esc(s.label)} — ${esc(s.attraction.name)}</h4>
      <div class="area">${esc(s.attraction.area)} · ${esc(s.attraction.blurb || '')}</div>
      <div class="why">${(s.why || []).map((w) => `<div class="r">${esc(w)}</div>`).join('')}</div>
    </div>
  </div>`;
}

function renderItinerary(plan) {
  const wrap = $('itinScroll');
  if (!plan.days || !plan.days.length) { wrap.innerHTML = '<p class="pLbl">Couldn’t place anything — try different days.</p>'; return; }
  wrap.innerHTML = plan.days.map((d) => `
    <div class="itinDay">
      <h2>${esc(d.label)}</h2>
      <div class="wx">${ic('temp')} ${Math.round(d.weather.maxTempC)}° · ${ic('wind')} ${Math.round(d.weather.maxWindKmh)} km/h · ${ic('rain')} ${d.weather.rainProb}%</div>
      ${d.slots.map(slotHtml).join('')}
    </div>`).join('')
    + (plan.notes || []).map((n) => `<div class="itinNote">${esc(n)}</div>`).join('');
}

async function build() {
  $('buildTrippie').disabled = true;
  $('buildTrippie').textContent = 'Optimising…';
  try {
    // Include the stored location so a memory-cleared server still has a base.
    let stay = null; try { stay = JSON.parse(sessionStorage.getItem('onedayStay') || 'null'); } catch (_) {}
    const body = { tripId, days, basket: [...basket] };
    if (stay && Number.isFinite(stay.lat)) { body.lat = stay.lat; body.lon = stay.lon; }
    const plan = await api('/api/plan', { method: 'POST', body });
    renderItinerary(plan);
    show('itinerary');
  } catch (err) {
    toast(err.message || 'Could not build');
  } finally { $('buildTrippie').disabled = false; $('buildTrippie').textContent = 'Build my Trippie'; }
}

export function mountPlanner() {
  document.getElementById('planBtn')?.addEventListener('click', () => {
    let t = null; try { t = sessionStorage.getItem('onedayTrip'); } catch (_) {}
    openPlanner(t);
  });
  $('daysPick')?.addEventListener('click', (e) => { const b = e.target.closest('.dayChip'); if (!b) return; days = Number(b.dataset.n); renderDays(); });
  $('libGrid')?.addEventListener('click', (e) => {
    const c = e.target.closest('.libChip'); if (!c) return;
    const id = c.dataset.id; basket.has(id) ? basket.delete(id) : basket.add(id); updateBasketUI();
  });
  $('buildTrippie')?.addEventListener('click', build);
  $('planBack')?.addEventListener('click', () => show('dash'));
  $('itinBack')?.addEventListener('click', () => show('planner'));
}
