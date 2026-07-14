// SECTION 1 (the menu, Netflix-style) + SECTION 2 (the planner). Category rows that
// swipe left→right; tap + and the tile drops into a fixed bottom carousel. "Weave"
// sends your picks to the logic, which lays them out on the right day/time with why.
import { api } from '../core/api.js';

const $ = (id) => document.getElementById(id);
const CAPE_TOWN = { lat: -33.9249, lon: 18.4241 };
let ctx = null;
let items = [];
let featured = [];
let tripDays = 3;
const chosen = new Set();
const byId = new Map();

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); }
function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400); }

const CAT = {
  viewpoint: { icon: '🏔️', label: 'Views & Peaks', tint: '#12a8a0' }, hike: { icon: '🥾', label: 'Hikes & Trails', tint: '#0e8c85' },
  beach: { icon: '🏖️', label: 'Beaches', tint: '#2aa9d8' }, wine: { icon: '🍷', label: 'Wine & Estates', tint: '#a4508b' },
  wildlife: { icon: '🐧', label: 'Wildlife', tint: '#e0873a' }, nature: { icon: '🌿', label: 'Nature', tint: '#3f9d4f' },
  garden: { icon: '🌳', label: 'Gardens', tint: '#3f9d4f' }, culture: { icon: '🎨', label: 'Culture', tint: '#c0497b' },
  history: { icon: '🏛️', label: 'History & Heritage', tint: '#8a6d3b' }, art: { icon: '🖼️', label: 'Art', tint: '#c0497b' },
  food: { icon: '🥑', label: 'Food & Markets', tint: '#3f9d4f' }, market: { icon: '🛍️', label: 'Markets', tint: '#e0873a' },
  music: { icon: '🎶', label: 'Live Music', tint: '#7c3aed' }, comedy: { icon: '🎤', label: 'Comedy', tint: '#7c3aed' },
  festival: { icon: '🎉', label: 'Festivals', tint: '#d8514e' }, community: { icon: '🏃', label: 'Out & About', tint: '#2aa9d8' },
  film: { icon: '🎬', label: 'Film', tint: '#7c3aed' }, scenic: { icon: '🚗', label: 'Scenic Drives', tint: '#12a8a0' },
  walk: { icon: '🚶', label: 'Walks', tint: '#2aa9d8' },
};
const catOf = (c) => CAT[c] || { icon: '📍', label: c, tint: '#12a8a0' };
const CAT_ORDER = ['viewpoint', 'beach', 'wine', 'wildlife', 'hike', 'garden', 'nature', 'scenic', 'walk', 'culture', 'art', 'history', 'food', 'market', 'music', 'comedy', 'film', 'festival', 'community'];
const REGION = {
  city: { label: 'City Bowl & Table Mountain', icon: '🏙️' }, atlantic: { label: 'Atlantic Seaboard', icon: '🌊' },
  falsebay: { label: 'False Bay & the Penguins', icon: '🐧' }, peninsula: { label: 'The Cape Peninsula', icon: '🚗' },
  constantia: { label: 'Constantia & Southern Suburbs', icon: '🌳' }, winelands: { label: 'The Winelands', icon: '🍷' },
};
const REGION_ORDER = ['city', 'atlantic', 'constantia', 'falsebay', 'peninsula', 'winelands'];
let mode = 'vibe';
let map = null;
let markers = [];

function railTile(it) {
  const c = catOf(it.category);
  const media = it.image
    ? `<div class="rImg" style="background-image:url('${esc(it.image)}')"></div>`
    : `<div class="rImg rTile" style="background:linear-gradient(135deg,${c.tint},#0b3b3a)"><span class="rTileIco">${c.icon}</span></div>`;
  return `
    <article class="rCard${chosen.has(it.id) ? ' added' : ''}" data-id="${esc(it.id)}">
      ${media}
      <button class="rAdd" type="button" aria-label="Add to plan">${chosen.has(it.id) ? '✓' : '+'}</button>
      <div class="rInfo">
        <div class="rWhen">🗓️ ${esc(it.when)}</div>
        <h4>${esc(it.title)}</h4>
        <div class="rWhy">💡 ${esc(it.why)}</div>
        ${it.cost || it.area || it.where ? `<div class="rMeta">${it.cost ? esc(it.cost) : ''}${it.cost && (it.area || it.where) ? ' · ' : ''}${esc(it.where || it.area || '')}</div>` : ''}
      </div>
    </article>`;
}

function rowsFrom(groups, order, labeler) {
  const keys = order.filter((k) => groups[k]).concat(Object.keys(groups).filter((k) => !order.includes(k)));
  return keys.map((k) => {
    const info = labeler(k);
    return `
      <section class="galRow">
        <div class="galRowHead"><span class="grIco">${info.icon}</span>${esc(info.label)}<span class="grCount">${groups[k].length}</span></div>
        <div class="galRail">${groups[k].map(railTile).join('')}</div>
      </section>`;
  }).join('');
}

const rowHtml = (icon, label, list, cls = '') => `
  <section class="galRow${cls}">
    <div class="galRowHead"><span class="grIco">${icon}</span>${esc(label)}<span class="grCount">${list.length}</span></div>
    <div class="galRail">${list.map(railTile).join('')}</div>
  </section>`;
const stubRow = (icon, label, text) => `
  <section class="galRow stubRow">
    <div class="galRowHead"><span class="grIco">${icon}</span>${esc(label)}<span class="grSoon">soon</span></div>
    <div class="galStub">${esc(text)}</div>
  </section>`;

// The editorial rows for "By vibe" — the curated buckets, not raw categories.
const VIBE_BUCKETS = [
  ['mustsee', '⭐', 'Tourism must-sees'],
  ['outdoor', '🌄', 'The great outdoors'],
  ['food', '🍽️', 'Food, wine & markets'],
  ['seasonal', '🗓️', 'Seasonal musts — on now'],
];

function renderRows() {
  const avail = (list) => list.filter((i) => !chosen.has(i.id)); // hide what's already added
  if (mode === 'area') {
    const groups = {};
    avail([...items].sort((a, b) => (b.scenic || 0) - (a.scenic || 0))).forEach((it) => { const r = it.region || 'city'; (groups[r] = groups[r] || []).push(it); });
    $('galRows').innerHTML = rowsFrom(groups, REGION_ORDER, (k) => REGION[k] || { label: k, icon: '📍' }) || '<div class="wLoading">All added — weave your plan below.</div>';
    return;
  }
  // By vibe: Today's suggestions → editorial buckets → what's on → honest stubs.
  const places = avail(items.filter((i) => i.kind === 'place'));
  const events = avail(items.filter((i) => i.kind === 'event'));
  const rows = [];
  const feat = avail(featured);
  if (feat.length) rows.push(rowHtml('✨', 'Today’s suggestions', feat, ' featured'));
  VIBE_BUCKETS.forEach(([k, ic, lb]) => { const list = places.filter((p) => (p.buckets || []).includes(k)); if (list.length) rows.push(rowHtml(ic, lb, list)); });
  if (events.length) rows.push(rowHtml('🎟️', 'What’s on this week', events));
  rows.push(stubRow('🧭', 'Off the beaten track', 'Hidden gems & lesser-known spots — coming with the local place harvest.'));
  rows.push(stubRow('💚', 'Local SMMEs who rock', 'A curated list of small local businesses worth your rand — coming soon.'));
  $('galRows').innerHTML = rows.join('');
}

function trayItem(it) {
  const c = catOf(it.category);
  const thumb = it.image
    ? `<span class="ptThumb" style="background-image:url('${esc(it.image)}')"></span>`
    : `<span class="ptThumb ptTile" style="background:linear-gradient(135deg,${c.tint},#0b3b3a)">${c.icon}</span>`;
  return `<div class="ptItem" data-id="${esc(it.id)}">${thumb}<span class="ptName">${esc(it.title)}</span><button class="ptX" aria-label="Remove">×</button></div>`;
}

function renderTray() {
  const picks = [...chosen].map((id) => byId.get(id)).filter(Boolean);
  $('ptNum').textContent = picks.length;
  $('planTray').hidden = picks.length === 0;
  $('ptRail').innerHTML = picks.map(trayItem).join('');
  renderDayPick();
}
function renderDayPick() {
  const el = $('ptDayPick'); if (!el) return;
  el.innerHTML = [2, 3, 4, 5, 6, 7].map((n) => `<button class="ptDay${n === tripDays ? ' on' : ''}" data-n="${n}">${n}</button>`).join('');
}

function setChosen(id, on) {
  if (on) chosen.add(id); else chosen.delete(id);
  if (on) {
    // Added → take it out of the gallery (no point offering what you already have).
    document.querySelectorAll(`.rCard[data-id="${CSS.escape(id)}"]`).forEach((c) => c.remove());
  } else if (mode !== 'map') {
    renderRows(); // removed from the plan → bring it back into the gallery
  }
  if (map) buildMarkers();
  renderTray();
}

export async function loadGallery(next) {
  ctx = next || ctx || { ...CAPE_TOWN };
  show('week');
  try {
    const q = ctx.tripId ? `tripId=${encodeURIComponent(ctx.tripId)}` : `lat=${ctx.lat}&lon=${ctx.lon}`;
    const g = await api(`/api/gallery?${q}`);
    items = g.items || [];
    featured = g.featured || [];
    byId.clear(); items.forEach((it) => byId.set(it.id, it));
    renderRows(); renderTray();
  } catch (err) {
    $('galRows').innerHTML = `<div class="wLoading">Couldn’t load what’s on — ${esc(err.message)}</div>`;
  }
}

async function weave() {
  const placeIds = [...chosen].filter((id) => byId.get(id) && byId.get(id).kind === 'place');
  if (!placeIds.length) { toast('Add a few places to weave a plan'); return; }
  $('weaveBtn').disabled = true; $('weaveBtn').textContent = 'Weaving…';
  try {
    const base = ctx.tripId ? { tripId: ctx.tripId } : { lat: ctx.lat, lon: ctx.lon };
    const r = await api('/api/weave', { method: 'POST', body: { ...base, ids: placeIds, days: tripDays } });
    renderWoven(r);
    show('woven'); window.scrollTo(0, 0);
  } catch (err) { toast(err.message || 'Could not weave'); }
  finally { $('weaveBtn').disabled = false; $('weaveBtn').textContent = 'Weave my plan →'; }
}

const stopHtml = (s) => `
  <div class="dStop">
    <span class="dt">${esc(s.time)}</span>
    <div class="dStopBody">
      <b>${esc(s.name)}</b>${s.area ? ` <small>${esc(s.area)}</small>` : ''}${s.meal ? '<span class="dMeal">🍴 lunch</span>' : ''}
      ${s.why ? `<div class="dw">${esc(s.why)}</div>` : ''}
      ${s.cost ? `<span class="dc">${esc(s.cost)}</span>` : ''}
    </div>
  </div>`;

function renderWoven(res) {
  const days = (res && res.days) || [];
  const dropped = (res && res.dropped) || [];
  if (!days.length) { $('wovenDays').innerHTML = '<div class="wLoading">Add some places first.</div>'; return; }
  const banner = dropped.length ? `
    <div class="dropBanner">
      <div class="dropHead">⚠︎ ${dropped.length} pick${dropped.length > 1 ? 's' : ''} didn’t fit your ${tripDays}-day trip — here’s why:</div>
      ${dropped.map((d) => `<div class="dropItem"><b>${esc(d.title)}</b> <span>${esc(d.reason)}</span></div>`).join('')}
      <div class="dropTip">Add a day, or drop something else — then weave again.</div>
    </div>` : '';
  $('wovenDays').innerHTML = banner + days.map((d) => `
    <div class="wvDay">
      <div class="wvHead"><div class="wvDate">${esc(d.label)}</div><div class="wvRegion">${esc(d.region)}</div></div>
      <div class="wvWhy">💡 ${esc(d.why)}</div>
      <div class="dPlan">${d.stops.map(stopHtml).join('')}</div>
      ${d.traffic ? `<div class="wvTraffic">🚗 ${esc(d.traffic)}</div>` : ''}
      ${d.nearby ? `
        <div class="wvNearby">
          ${d.nearby.image ? `<div class="nbImg" style="background-image:url('${esc(d.nearby.image)}')"></div>` : '<div class="nbImg nbTile">📍</div>'}
          <div class="nbBody"><div class="nbLbl">You’re right here — also worth it${d.nearby.km != null ? ` (${d.nearby.km} km)` : ''}</div><b>${esc(d.nearby.name)}</b><div class="nbWhy">${esc(d.nearby.why)}</div></div>
          <button class="nbAdd" data-id="${esc(d.nearby.id)}" type="button">+ Add</button>
        </div>` : ''}
    </div>`).join('');
}

// ----- Map (Leaflet + free OpenStreetMap tiles) -----
function popupHtml(it) {
  const c = catOf(it.category), added = chosen.has(it.id);
  return `<div class="mapPop">
    ${it.image ? `<div class="mpImg" style="background-image:url('${esc(it.image)}')"></div>` : ''}
    <div class="mpCat" style="color:${c.tint}">${c.icon} ${esc(c.label)}</div>
    <b>${esc(it.title)}</b>
    <div class="mpWhy">💡 ${esc(it.why)}</div>
    <button class="mpAdd${added ? ' on' : ''}" data-id="${esc(it.id)}">${added ? '✓ Added' : '+ Add to plan'}</button>
  </div>`;
}
function buildMarkers() {
  if (!map || !window.L) return;
  markers.forEach((m) => m.remove()); markers = [];
  items.filter((it) => it.kind === 'place' && it.lat && it.lon).forEach((it) => {
    const sel = chosen.has(it.id);
    const m = L.circleMarker([it.lat, it.lon], sel
      ? { radius: 13, color: '#0e8c85', weight: 4, fillColor: '#12a8a0', fillOpacity: 1 }   // selected — big teal pin
      : { radius: 9, color: '#fff', weight: 2, fillColor: catOf(it.category).tint, fillOpacity: 1 })
      .bindPopup(popupHtml(it), { minWidth: 210 });
    m.addTo(map); markers.push(m);
  });
}
function initMap() {
  if (!window.L) { $('mapEl').innerHTML = '<div class="wLoading">Map unavailable offline.</div>'; return; }
  map = L.map('mapEl', { zoomControl: true, scrollWheelZoom: true }).setView([-34.05, 18.42], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map);
  buildMarkers();
}
function setMode(m) {
  mode = m;
  document.querySelectorAll('.galMode').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  if (m === 'map') {
    $('galRows').hidden = true; $('mapWrap').hidden = false;
    if (!map) initMap(); else buildMarkers();
    setTimeout(() => map && map.invalidateSize(), 80);
  } else {
    $('mapWrap').hidden = true; $('galRows').hidden = false;
    renderRows();
  }
}

export function mountGallery() {
  document.querySelector('.galModes')?.addEventListener('click', (e) => { const b = e.target.closest('.galMode'); if (b) setMode(b.dataset.mode); });
  // Add from a map popup.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.mpAdd'); if (!b) return;
    const id = b.dataset.id, on = !chosen.has(id);
    setChosen(id, on);
    b.classList.toggle('on', on); b.textContent = on ? '✓ Added' : '+ Add to plan';
  });
  // Add from a rail card.
  $('galRows')?.addEventListener('click', (e) => {
    const card = e.target.closest('.rCard'); if (!card) return;
    const id = card.dataset.id;
    setChosen(id, !chosen.has(id));
  });
  // Remove from the bottom carousel.
  $('ptRail')?.addEventListener('click', (e) => {
    const item = e.target.closest('.ptItem'); if (!item) return;
    setChosen(item.dataset.id, false);
  });
  $('weaveBtn')?.addEventListener('click', weave);
  $('wovenBack')?.addEventListener('click', () => show('week'));
  // Day-count selector.
  $('ptDayPick')?.addEventListener('click', (e) => { const b = e.target.closest('.ptDay'); if (!b) return; tripDays = Number(b.dataset.n); renderDayPick(); });
  // "Add" a nearby gem straight from the plan → re-weave with it included.
  $('wovenDays')?.addEventListener('click', (e) => { const b = e.target.closest('.nbAdd'); if (!b) return; setChosen(b.dataset.id, true); weave(); });

  let boot = { ...CAPE_TOWN };
  try {
    const t = sessionStorage.getItem('odTrip'); const stay = JSON.parse(sessionStorage.getItem('odStay') || 'null');
    if (t && stay) boot = { tripId: t, lat: stay.lat, lon: stay.lon };
  } catch (_) {}
  loadGallery(boot);
}
