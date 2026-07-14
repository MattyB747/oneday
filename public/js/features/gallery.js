// SECTION 1 (the menu) + SECTION 2 entry (the planner). A visual gallery of what's
// on across Cape Town's next 7 days; tap + to add anything to your plan; "Weave"
// sends your picks to the logic, which lays them out on the right day/time with why.
import { api } from '../core/api.js';

const $ = (id) => document.getElementById(id);
const CAPE_TOWN = { lat: -33.9249, lon: 18.4241 };
let ctx = null;
let items = [];
let filter = 'all';
const chosen = new Set();

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); }
function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400); }

const CAT = {
  viewpoint: { icon: '🏔️', label: 'Views', tint: '#12a8a0' }, hike: { icon: '🥾', label: 'Hikes', tint: '#0e8c85' },
  beach: { icon: '🏖️', label: 'Beaches', tint: '#2aa9d8' }, wine: { icon: '🍷', label: 'Wine', tint: '#a4508b' },
  wildlife: { icon: '🐧', label: 'Wildlife', tint: '#e0873a' }, nature: { icon: '🌿', label: 'Nature', tint: '#3f9d4f' },
  garden: { icon: '🌳', label: 'Gardens', tint: '#3f9d4f' }, culture: { icon: '🎨', label: 'Culture', tint: '#c0497b' },
  history: { icon: '🏛️', label: 'History', tint: '#8a6d3b' }, art: { icon: '🖼️', label: 'Art', tint: '#c0497b' },
  food: { icon: '🥑', label: 'Food', tint: '#3f9d4f' }, market: { icon: '🛍️', label: 'Markets', tint: '#e0873a' },
  music: { icon: '🎶', label: 'Live music', tint: '#7c3aed' }, comedy: { icon: '🎤', label: 'Comedy', tint: '#7c3aed' },
  festival: { icon: '🎉', label: 'Festivals', tint: '#d8514e' }, community: { icon: '🏃', label: 'Out & about', tint: '#2aa9d8' },
  film: { icon: '🎬', label: 'Film', tint: '#7c3aed' }, scenic: { icon: '🚗', label: 'Scenic', tint: '#12a8a0' },
  walk: { icon: '🚶', label: 'Walks', tint: '#2aa9d8' },
};
const catOf = (c) => CAT[c] || { icon: '📍', label: c, tint: '#12a8a0' };

function card(it) {
  const c = catOf(it.category);
  const added = chosen.has(it.id);
  const media = it.image
    ? `<div class="gImg" style="background-image:url('${esc(it.image)}')"></div>`
    : `<div class="gImg gTile" style="background:linear-gradient(135deg,${c.tint},#0b3b3a)"><span class="gTileIco">${c.icon}</span></div>`;
  return `
    <article class="gCard${added ? ' added' : ''}" data-id="${esc(it.id)}" data-cat="${esc(it.category)}" data-kind="${esc(it.kind)}">
      ${media}
      <span class="gCat" style="background:${c.tint}">${c.icon} ${esc(c.label)}</span>
      <button class="gAdd" type="button" aria-label="Add to plan">${added ? '✓' : '+'}</button>
      <div class="gBody">
        <div class="gWhen">🗓️ ${esc(it.when)}</div>
        <h3>${esc(it.title)}</h3>
        <div class="gWhy"><span>💡</span> ${esc(it.why)}</div>
        <div class="gMeta">${it.cost ? `<span>${esc(it.cost)}</span>` : ''}${it.where ? `<span>${esc(it.where)}</span>` : it.area ? `<span>${esc(it.area)}</span>` : ''}</div>
      </div>
    </article>`;
}

function renderFilters() {
  const cats = [...new Set(items.map((i) => i.category))];
  const chips = [['all', 'Everything']].concat(cats.map((c) => [c, catOf(c).label]));
  $('galFilters').innerHTML = chips.map(([k, label]) => `<button class="galChip${filter === k ? ' on' : ''}" data-cat="${k}">${esc(label)}</button>`).join('');
}

function renderGrid() {
  const list = filter === 'all' ? items : items.filter((i) => i.category === filter);
  $('galleryGrid').innerHTML = list.map(card).join('') || '<div class="wLoading">Nothing in this category.</div>';
}

function updateTray() {
  const n = chosen.size;
  $('ptNum').textContent = n;
  $('planTray').hidden = n === 0;
}

export async function loadGallery(next) {
  ctx = next || ctx || { ...CAPE_TOWN };
  show('week');
  try {
    const q = ctx.tripId ? `tripId=${encodeURIComponent(ctx.tripId)}` : `lat=${ctx.lat}&lon=${ctx.lon}`;
    const g = await api(`/api/gallery?${q}`);
    items = g.items || [];
    renderFilters(); renderGrid(); updateTray();
    const nn = $('natureNow');
    // (natureNow banner reserved for live wildlight; gallery already shows wildlife items)
    if (nn) nn.hidden = true;
  } catch (err) {
    $('galleryGrid').innerHTML = `<div class="wLoading">Couldn’t load what’s on — ${esc(err.message)}</div>`;
  }
}

async function weave() {
  const placeIds = items.filter((i) => chosen.has(i.id) && i.kind === 'place').map((i) => i.id);
  if (!placeIds.length) { toast('Add a few places to weave a plan'); return; }
  $('weaveBtn').disabled = true; $('weaveBtn').textContent = 'Weaving…';
  try {
    const base = ctx.tripId ? { tripId: ctx.tripId } : { lat: ctx.lat, lon: ctx.lon };
    const r = await api('/api/weave', { method: 'POST', body: { ...base, ids: placeIds } });
    renderWoven(r.days || []);
    show('woven');
    window.scrollTo(0, 0);
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
  $('galFilters')?.addEventListener('click', (e) => { const b = e.target.closest('.galChip'); if (!b) return; filter = b.dataset.cat; renderFilters(); renderGrid(); });
  $('galleryGrid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.gCard'); if (!card) return;
    const id = card.dataset.id;
    if (chosen.has(id)) chosen.delete(id); else chosen.add(id);
    card.classList.toggle('added', chosen.has(id));
    card.querySelector('.gAdd').textContent = chosen.has(id) ? '✓' : '+';
    updateTray();
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
