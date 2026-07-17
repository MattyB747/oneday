// SECTION 1 (the menu, Netflix-style) + SECTION 2 (the planner). Category rows that
// swipe left→right; tap + and the tile drops into a fixed bottom carousel. "Weave"
// sends your picks to the logic, which lays them out on the right day/time with why.
import { api } from '../core/api.js';
import { capture, captureSession } from '../core/capture.js';

const $ = (id) => document.getElementById(id);
const CAPE_TOWN = { lat: -33.9249, lon: 18.4241 };
let ctx = null;
let items = [];
let featured = [];
let forYou = [];
let likesLabel = '';
let bestToday = null;
let conditions = null;
let heroImage = null;
let thisWeek = [];
let tripDays = 3;
const chosen = new Set();
const byId = new Map();

// Concierge preferences — what YOU love. Persisted locally + captured.
let prefs = { name: '', likes: [] };
try { const p = JSON.parse(localStorage.getItem('odPrefs') || 'null'); if (p && Array.isArray(p.likes)) prefs = p; } catch (_) {}
const TASTES = [['beaches', '🏖️ Beaches'], ['wine', '🍷 Wine'], ['hikes', '🥾 Hikes & nature'], ['views', '📸 Views & photos'], ['culture', '🎨 Culture & history'], ['food', '🍽️ Food & markets'], ['sunsets', '🌅 Sunsets'], ['wildlife', '🐧 Wildlife'], ['family', '👨‍👩‍👧 Family']];
function savePrefs() { try { localStorage.setItem('odPrefs', JSON.stringify(prefs)); } catch (_) {} }

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
  walk: { icon: '🚶', label: 'Walks', tint: '#2aa9d8' }, attraction: { icon: '📸', label: 'Attractions', tint: '#12a8a0' },
  family: { icon: '👨‍👩‍👧', label: 'Family', tint: '#e0873a' },
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
// The smart "Today" hero — a reasoned mini-day (like Netflix's pick for tonight).
function todayHeroHtml() {
  const t = bestToday; if (!t) return '';
  const allAdded = t.ids.every((id) => chosen.has(id));
  const stops = t.stops.map((s, i) => `
    ${i ? '<div class="thArrow">↓</div>' : ''}
    <div class="thStop">
      ${s.image ? `<div class="thImg" style="background-image:url('${esc(s.image)}')"></div>` : '<div class="thImg thTile">📍</div>'}
      <div class="thBody"><span class="tht">${esc(s.time)}${s.km ? ` · ${s.km} km` : ''}</span><b>${esc(s.name)}</b><div class="thWhy">${esc(s.why)}</div></div>
    </div>`).join('');
  return `
    <section class="todayHero">
      <div class="thTop"><span class="thTag">✨ OneDay picks</span><div class="thHead">${esc(t.headline)}</div><div class="thSub">${esc(t.sub)}</div></div>
      <div class="thChain">${stops}</div>
      <button class="thAdd${allAdded ? ' on' : ''}" data-today type="button">${allAdded ? '✓ Added to your plan' : '+ Add this day to my plan'}</button>
    </section>`;
}

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
  // By vibe: smart Today plan → Today's suggestions → editorial buckets → what's on.
  const places = avail(items.filter((i) => i.kind === 'place'));
  const events = avail(items.filter((i) => i.kind === 'event'));
  const rows = [];
  rows.push(todayHeroHtml());
  const fy = avail(forYou);
  if (fy.length) rows.push(rowHtml('💛', `Because you love ${esc(likesLabel)}`, fy, ' featured'));
  const feat = avail(featured);
  if (feat.length) rows.push(rowHtml('✨', 'More for today', feat, ' featured'));
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
  const it = byId.get(id);
  capture(on ? 'place_added' : 'place_removed', { id, name: it && it.name, category: it && it.category, region: it && it.region, from: mode });
  if (on) {
    // Added → take it out of the gallery (no point offering what you already have).
    document.querySelectorAll(`.rCard[data-id="${CSS.escape(id)}"]`).forEach((c) => c.remove());
  } else if (mode !== 'map') {
    renderRows(); // removed from the plan → bring it back into the gallery
  }
  if (mode === 'map') renderArtMap(); // reflect selection on the illustrated map
  renderTray();
}

export async function loadGallery(next) {
  ctx = next || ctx || { ...CAPE_TOWN };
  show('week');
  try {
    let q = ctx.tripId ? `tripId=${encodeURIComponent(ctx.tripId)}` : `lat=${ctx.lat}&lon=${ctx.lon}`;
    if (prefs.likes.length) q += `&likes=${prefs.likes.join(',')}`;
    const g = await api(`/api/gallery?${q}`);
    items = g.items || [];
    featured = g.featured || [];
    forYou = g.forYou || [];
    likesLabel = g.likesLabel || '';
    bestToday = g.bestToday || null;
    conditions = g.conditions || null;
    heroImage = g.heroImage || null;
    thisWeek = g.thisWeek || [];
    byId.clear(); items.forEach((it) => byId.set(it.id, it));
    renderHero();
    capture('gallery_shown', { items: items.length, conditions });
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
    const r = await api('/api/weave', { method: 'POST', body: { ...base, ids: placeIds, days: tripDays, session: captureSession() } });
    renderWoven(r);
    show('woven'); window.scrollTo(0, 0);
  } catch (err) { toast(err.message || 'Could not weave'); }
  finally { $('weaveBtn').disabled = false; $('weaveBtn').textContent = 'Weave my plan →'; }
}

const DAY_COLORS = ['#12a8a0', '#e0873a', '#7c3aed', '#d8514e', '#2aa9d8', '#3f9d4f', '#c0497b'];

const stopHtml = (s, n, color) => `
  <div class="dStop">
    <span class="dNum" style="background:${color}">${n}</span>
    <span class="dt">${esc(s.time)}</span>
    <div class="dStopBody">
      <b>${esc(s.name)}</b>${s.area ? ` <small>${esc(s.area)}</small>` : ''}${s.meal ? '<span class="dMeal">🍴 lunch</span>' : ''}
      ${s.why ? `<div class="dw">${esc(s.why)}</div>` : ''}
      ${s.wear ? `<div class="dWear">👕 ${esc(s.wear)}</div>` : ''}
      ${s.about ? `<div class="dAbout">📖 ${esc(s.about)}</div>` : ''}
      ${s.cost ? `<span class="dc">${esc(s.cost)}</span>` : ''}
    </div>
  </div>`;

// Build a Google Maps directions URL from a day's stops (opens the app on device).
function gmapsUrl(stops) {
  const pts = stops.filter((s) => s.lat && s.lon).map((s) => `${s.lat},${s.lon}`);
  if (!pts.length) return null;
  const dest = pts[pts.length - 1];
  const waypoints = pts.slice(0, -1).join('|');
  return `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(dest)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}`;
}

// Illustrated plan map: day-coloured, numbered markers for every stop.
function renderPlanMap(days) {
  const allStops = [];
  days.forEach((d, di) => d.stops.filter((s) => s.lat && s.lon).forEach((s, si) => allStops.push({ s, di, n: si + 1 })));
  if (!allStops.length) { $('planMapWrap').innerHTML = ''; return; }
  const pins = allStops.map(({ s, di, n }) => {
    const [x, y] = projectXY(s.lat, s.lon); const color = DAY_COLORS[di % DAY_COLORS.length];
    return `<g transform="translate(${x},${y})"><circle r="11" fill="${color}" stroke="#fff" stroke-width="2.5"/><text y="4" text-anchor="middle" class="pmNum">${n}</text></g>`;
  }).join('');
  const legend = days.map((d, di) => `<span class="pmLeg"><i style="background:${DAY_COLORS[di % DAY_COLORS.length]}"></i>${esc(d.label.split(',')[0])} · ${esc(d.region)}</span>`).join('');
  $('planMapWrap').innerHTML = `
    <div class="planMap">
      <svg class="artSvg" viewBox="0 0 ${AW} ${AH}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="sea2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ef"/><stop offset="1" stop-color="#7fc2d9"/></linearGradient>
          <linearGradient id="land2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9ddc4"/><stop offset="1" stop-color="#d8cba9"/></linearGradient></defs>
        <rect width="${AW}" height="${AH}" fill="url(#sea2)"/>
        <path d="M0,0 L400,0 L400,150 C360,168 300,150 262,168 C250,240 244,320 232,398 C222,470 210,520 182,552 C168,566 150,560 146,532 C132,452 120,352 116,262 C112,206 92,168 44,156 C24,151 8,150 0,146 Z" fill="url(#land2)" stroke="#c9b98f" stroke-width="2"/>
        <path d="M120,150 L100,120 Q140,108 178,122 L162,150 Z" fill="#b7a878" opacity="0.9"/>
        <text x="40" y="300" class="artSea">ATLANTIC</text><text x="300" y="430" class="artSea">FALSE BAY</text>
        ${pins}
      </svg>
    </div>
    <div class="pmLegend">${legend}</div>`;
}

function renderWoven(res) {
  const days = (res && res.days) || [];
  const dropped = (res && res.dropped) || [];
  if (!days.length) { $('wovenDays').innerHTML = '<div class="wLoading">Add some places first.</div>'; $('planMapWrap').innerHTML = ''; return; }
  renderPlanMap(days);
  const banner = dropped.length ? `
    <div class="dropBanner">
      <div class="dropHead">⚠︎ ${dropped.length} pick${dropped.length > 1 ? 's' : ''} didn’t fit your ${tripDays}-day trip — here’s why:</div>
      ${dropped.map((d) => `<div class="dropItem"><b>${esc(d.title)}</b> <span>${esc(d.reason)}</span></div>`).join('')}
      <div class="dropTip">Add a day, or drop something else — then weave again.</div>
    </div>` : '';
  $('wovenDays').innerHTML = banner + days.map((d, di) => {
    const color = DAY_COLORS[di % DAY_COLORS.length];
    const g = gmapsUrl(d.stops);
    return `
    <div class="wvDay" style="border-top:4px solid ${color}">
      <div class="wvHead"><div class="wvDate"><span class="wvDot" style="background:${color}"></span>${esc(d.label)}</div><div class="wvRegion">${esc(d.region)}</div></div>
      <div class="wvWhy">💡 ${esc(d.why)}</div>
      <div class="dPlan">${d.stops.map((s, i) => stopHtml(s, i + 1, color)).join('')}</div>
      ${g ? `<a class="gmapsBtn" href="${g}" target="_blank" rel="noopener">🧭 Open this day’s route in Google Maps</a>` : ''}
      ${d.traffic ? `<div class="wvTraffic">🚗 ${esc(d.traffic)}</div>` : ''}
      ${d.nearby ? `
        <div class="wvNearby">
          ${d.nearby.image ? `<div class="nbImg" style="background-image:url('${esc(d.nearby.image)}')"></div>` : '<div class="nbImg nbTile">📍</div>'}
          <div class="nbBody"><div class="nbLbl">You’re right here — also worth it${d.nearby.km != null ? ` (${d.nearby.km} km)` : ''}</div><b>${esc(d.nearby.name)}</b><div class="nbWhy">${esc(d.nearby.why)}</div></div>
          <button class="nbAdd" data-id="${esc(d.nearby.id)}" type="button">+ Add</button>
        </div>` : ''}
    </div>`; }).join('');
}

// ----- Illustrated Cape Town map with live conditions overlaid -----
// Bounding box for the peninsula; lat/lon project linearly onto the art so pins
// land in the right spot even though the coastline is stylised.
const ARTBB = { latMax: -33.76, latMin: -34.38, lonMin: 18.27, lonMax: 18.60 };
const AW = 400, AH = 580, APAD = 14;
function projectXY(lat, lon) {
  const x = APAD + (lon - ARTBB.lonMin) / (ARTBB.lonMax - ARTBB.lonMin) * (AW - 2 * APAD);
  const y = APAD + (ARTBB.latMax - lat) / (ARTBB.latMax - ARTBB.latMin) * (AH - 2 * APAD);
  return [Math.max(8, Math.min(AW - 8, x)), Math.max(8, Math.min(AH - 8, y))];
}

function conditionsHud() {
  const c = conditions || {};
  const rows = [
    ['🌡️', c.tempC != null ? `${c.tempC}°` : '–', 'temp'],
    ['💨', c.windKmh != null ? `${c.windKmh} km/h` : '–', 'wind'],
    ['🌧️', c.rainProb != null ? `${c.rainProb}%` : '–', 'rain'],
    ['🌊', c.lowTide ? `low ${c.lowTide}` : '–', 'tide'],
    ['🌅', c.sunset || '–', 'sunset'],
  ];
  return `<div class="artHud"><div class="artHudTitle">Right now in Cape Town</div>${rows.map(([i, v, l]) => `<div class="ahRow"><span>${i}</span><b>${esc(v)}</b><small>${l}</small></div>`).join('')}</div>`;
}

// Stylised fallback backdrop (used until the real illustrated basemap image is added).
function artBackdropSvg() {
  return `
    <svg class="artSvg" viewBox="0 0 ${AW} ${AH}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ef"/><stop offset="1" stop-color="#7fc2d9"/></linearGradient>
        <linearGradient id="land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9ddc4"/><stop offset="1" stop-color="#d8cba9"/></linearGradient>
      </defs>
      <rect width="${AW}" height="${AH}" fill="url(#sea)"/>
      <path d="M0,0 L400,0 L400,150 C360,168 300,150 262,168 C250,240 244,320 232,398 C222,470 210,520 182,552 C168,566 150,560 146,532 C132,452 120,352 116,262 C112,206 92,168 44,156 C24,151 8,150 0,146 Z" fill="url(#land)" stroke="#c9b98f" stroke-width="2"/>
      <path d="M120,150 L100,120 Q140,108 178,122 L162,150 Z" fill="#b7a878" opacity="0.9"/>
      <text x="40" y="300" class="artSea">ATLANTIC</text><text x="300" y="430" class="artSea">FALSE BAY</text>
    </svg>`;
}

// Map with an illustrated basemap image + HTML pin overlay. Falls back to the
// stylised SVG until public/img/cape-basemap.jpg is added, then it just appears.
function renderArtMap() {
  const places = items.filter((it) => it.kind === 'place' && it.lat && it.lon);
  const pins = places.map((p) => {
    const [x, y] = projectXY(p.lat, p.lon); const sel = chosen.has(p.id);
    const px = (x / AW * 100).toFixed(2), py = (y / AH * 100).toFixed(2);
    const left = x > AW * 0.55;
    return `<button class="imgPin${sel ? ' sel' : ''}${left ? ' lbl-left' : ''}" data-pin="${esc(p.id)}" style="left:${px}%;top:${py}%;--pc:${sel ? '#12a8a0' : catOf(p.category).tint}">${sel ? `<span class="ipLbl">${esc(p.title)}</span>` : ''}</button>`;
  }).join('');
  $('mapEl').innerHTML = `
    <div class="artMap noimg">
      <img class="baseImg" src="/img/cape-basemap.jpg" alt="Illustrated Cape Town map"
           onload="this.closest('.artMap').classList.remove('noimg')"
           onerror="this.closest('.artMap').classList.add('noimg')">
      <div class="svgFallback">${artBackdropSvg()}</div>
      <div class="pinLayer">${pins}</div>
      ${conditionsHud()}
    </div>`;
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('.galMode').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  if (m === 'map') {
    $('galRows').hidden = true; $('mapWrap').hidden = false;
    renderArtMap();
  } else {
    $('mapWrap').hidden = true; $('galRows').hidden = false;
    renderRows();
  }
}

// The immersive hero: Cape Town image + today's conditions (right) + what's on (left).
function renderHero() {
  const hero = $('heroTop'); if (!hero) return;
  if (heroImage) hero.style.backgroundImage = `url('${heroImage}')`;
  const h = new Date().getHours();
  const tod = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const ic = h < 12 ? '☀️' : h < 18 ? '🌤️' : '🌙';
  const gr = $('heroGreet'); if (gr) gr.textContent = `${tod} ${ic}`;
  const c = conditions || {};
  const conds = [
    ['🌡️', c.tempC != null ? `${c.tempC}°` : '–', 'Today'],
    ['💨', c.windKmh != null ? `${c.windKmh} km/h` : '–', 'Wind'],
    ['🌊', c.lowTide ? `Low ${c.lowTide}` : '–', 'Tide'],
    ['🌅', c.sunset || '–', 'Sunset'],
  ];
  const ce = $('heroConds'); if (ce) ce.innerHTML = `<div class="hcTitle">Right now</div>` + conds.map(([i, v, l]) => `<div class="hcRow"><span>${i}</span><b>${esc(v)}</b><small>${l}</small></div>`).join('');
  const ne = $('heroNow');
  if (ne) {
    if (thisWeek.length) { ne.innerHTML = `<div class="hnTitle">📣 On this week</div>` + thisWeek.slice(0, 3).map((e) => `<div class="hnRow"><b>${esc(e.name)}</b><small>${esc(e.day)} · ${esc(e.where)}</small></div>`).join(''); ne.hidden = false; }
    else ne.hidden = true;
  }
}

export function mountGallery() {
  document.querySelector('.galModes')?.addEventListener('click', (e) => { const b = e.target.closest('.galMode'); if (b) setMode(b.dataset.mode); });
  // Tap a pin on the illustrated map to add/remove it.
  $('mapEl')?.addEventListener('click', (e) => {
    const pin = e.target.closest('[data-pin]'); if (!pin) return;
    const id = pin.getAttribute('data-pin');
    setChosen(id, !chosen.has(id));
    const it = byId.get(id); if (it) toast(chosen.has(id) ? `Added ${it.title}` : `Removed ${it.title}`);
  });
  // Add from a rail card.
  $('galRows')?.addEventListener('click', (e) => {
    if (e.target.closest('[data-today]') && bestToday) {
      bestToday.ids.forEach((id) => setChosen(id, true));
      capture('today_plan_added', { ids: bestToday.ids });
      renderRows();
      return;
    }
    const card = e.target.closest('.rCard'); if (!card) return;
    setChosen(card.dataset.id, !chosen.has(card.dataset.id));
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
  $('wovenDays')?.addEventListener('click', (e) => {
    const add = e.target.closest('.nbAdd');
    if (add) { setChosen(add.dataset.id, true); weave(); return; }
    if (e.target.closest('.gmapsBtn')) capture('export_gmaps', { days: tripDays });
  });

  let boot = { ...CAPE_TOWN };
  try {
    const t = sessionStorage.getItem('odTrip'); const stay = JSON.parse(sessionStorage.getItem('odStay') || 'null');
    if (t && stay) boot = { tripId: t, lat: stay.lat, lon: stay.lon };
  } catch (_) {}
  loadGallery(boot);
}
