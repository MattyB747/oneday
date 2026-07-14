// SECTION 1 (the menu, Netflix-style) + SECTION 2 (the planner). Category rows that
// swipe left→right; tap + and the tile drops into a fixed bottom carousel. "Weave"
// sends your picks to the logic, which lays them out on the right day/time with why.
import { api } from '../core/api.js';

const $ = (id) => document.getElementById(id);
const CAPE_TOWN = { lat: -33.9249, lon: 18.4241 };
let ctx = null;
let items = [];
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

function renderRows() {
  const groups = {};
  items.forEach((it) => { (groups[it.category] = groups[it.category] || []).push(it); });
  const cats = CAT_ORDER.filter((c) => groups[c]).concat(Object.keys(groups).filter((c) => !CAT_ORDER.includes(c)));
  $('galRows').innerHTML = cats.map((c) => {
    const info = catOf(c);
    return `
      <section class="galRow">
        <div class="galRowHead"><span class="grIco">${info.icon}</span>${esc(info.label)}<span class="grCount">${groups[c].length}</span></div>
        <div class="galRail">${groups[c].map(railTile).join('')}</div>
      </section>`;
  }).join('');
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
}

function setChosen(id, on) {
  if (on) chosen.add(id); else chosen.delete(id);
  // reflect on any visible rail card
  document.querySelectorAll(`.rCard[data-id="${CSS.escape(id)}"]`).forEach((card) => {
    card.classList.toggle('added', on);
    const b = card.querySelector('.rAdd'); if (b) b.textContent = on ? '✓' : '+';
  });
  renderTray();
}

export async function loadGallery(next) {
  ctx = next || ctx || { ...CAPE_TOWN };
  show('week');
  try {
    const q = ctx.tripId ? `tripId=${encodeURIComponent(ctx.tripId)}` : `lat=${ctx.lat}&lon=${ctx.lon}`;
    const g = await api(`/api/gallery?${q}`);
    items = g.items || [];
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
    const r = await api('/api/weave', { method: 'POST', body: { ...base, ids: placeIds } });
    renderWoven(r.days || []);
    show('woven'); window.scrollTo(0, 0);
  } catch (err) { toast(err.message || 'Could not weave'); }
  finally { $('weaveBtn').disabled = false; $('weaveBtn').textContent = 'Weave my plan →'; }
}

function renderWoven(days) {
  if (!days.length) { $('wovenDays').innerHTML = '<div class="wLoading">Add some places first.</div>'; return; }
  $('wovenDays').innerHTML = days.map((d) => `
    <div class="wvDay">
      <div class="wvHead"><div class="wvDate">${esc(d.label)}</div><div class="wvRegion">${esc(d.region)}</div></div>
      <div class="wvWhy">💡 ${esc(d.why)}</div>
      <div class="dPlan">${d.stops.map((s) => `
        <div class="dStop">
          <span class="dt">${esc(s.time)}</span>
          <div class="dStopBody">
            <b>${esc(s.name)}</b>${s.area ? ` <small>${esc(s.area)}</small>` : ''}${s.meal ? '<span class="dMeal">🍴 lunch</span>' : ''}
            ${s.why ? `<div class="dw">${esc(s.why)}</div>` : ''}
            ${s.cost ? `<span class="dc">${esc(s.cost)}</span>` : ''}
          </div>
        </div>`).join('')}</div>
    </div>`).join('');
}

export function mountGallery() {
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

  let boot = { ...CAPE_TOWN };
  try {
    const t = sessionStorage.getItem('odTrip'); const stay = JSON.parse(sessionStorage.getItem('odStay') || 'null');
    if (t && stay) boot = { tripId: t, lat: stay.lat, lon: stay.lon };
  } catch (_) {}
  loadGallery(boot);
}
