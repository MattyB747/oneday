'use strict';

// SECTION 1 (the menu) + the weave logic for SECTION 2 (the planner).
//   build(base)  -> everything on in the next 7 days as image-led items, each with
//                   its BEST day and a strong WHY.
//   weave(base, ids) -> takes the items a user picked and weaves them into a plan:
//                   each on its best day, ordered by best time-of-day, with the why
//                   for every placement. The human picks WHAT; we own WHEN/WHERE/WHY.

const weather = require('./weather');
const events = require('../data/events');
const { attractions, byId } = require('../data/attractions');
const { detailsFor } = require('../data/details');
const restaurants = require('../data/restaurants');
let IMAGES = {};
try { IMAGES = require('../data/images.json'); } catch (_) { IMAGES = {}; }

const clamp = (n) => Math.max(0, Math.min(1, n));
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dayName = (dateStr) => new Date(dateStr + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' });

async function sevenDays(base) {
  const fc = await weather.forecast(base.lat, base.lon, 7).catch(() => ({ days: [] }));
  return (fc.days || []).slice(0, 7).map((d) => ({
    date: d.date, label: dayName(d.date),
    weekday: new Date(d.date + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'short' }),
    hi: Math.round(d.maxTempC), windKmh: Math.round(d.maxWindKmh || 0), rainProb: d.maxRainProb || 0,
    windN: clamp((d.maxWindKmh || 0) / 45), rainN: clamp((d.maxRainProb || 0) / 100), warmN: clamp(((d.maxTempC || 0) - 14) / 12),
  }));
}

// Score a place for a given day from its own weather-sensitivity, and say why.
function scorePlaceDay(a, day) {
  let s = 100;
  s -= (a.wind || 0) * day.windN * 45;
  s -= (a.rain || 0) * day.rainN * 45;
  s -= (a.cloud || 0) * day.rainN * 20;
  if (a.best === 'afternoon' || a.best === 'sunset' || a.category === 'beach') s += day.warmN * 10;
  return s;
}

function whyForPlace(a, day, allDays) {
  const calmest = allDays.every((d) => d.windN >= day.windN);
  if ((a.wind || 0) >= 0.7) {
    if (a.id === 'table-mountain') return `Best on ${day.label.split(',')[0]} — the week's calmest morning (wind ${day.windKmh} km/h), when the cableway is most reliable.`;
    return `Best on ${day.label.split(',')[0]} — light wind (${day.windKmh} km/h) makes the exposed top far better.`;
  }
  if (a.category === 'beach') return `Best on ${day.label.split(',')[0]} — the warmest, calmest beach day of the week (${day.hi}°, wind ${day.windKmh}).`;
  if (a.best === 'sunset') return `A golden-hour spot — ${day.label.split(',')[0]} looks clear for sunset.`;
  if ((a.rain || 0) <= 0.2) return `Good any day, but ${day.label.split(',')[0]} is mild and dry — an easy pick.`;
  return `Best on ${day.label.split(',')[0]} — the driest, clearest of the week for it.`;
}

async function build(base) {
  const days = await sevenDays(base);
  if (!days.length) return { days: [], items: [] };

  // PLACES — each with its single best day + why.
  const places = attractions.map((a) => {
    const scored = days.map((d, i) => ({ i, s: scorePlaceDay(a, d) })).sort((x, y) => y.s - x.s);
    const best = scored[0]; const bd = days[best.i];
    const det = detailsFor(a.id);
    return {
      id: a.id, kind: 'place', title: a.name, category: a.category, area: a.area,
      image: IMAGES[a.id] || null, blurb: a.blurb,
      bestDayIndex: best.i, when: bd.label, why: whyForPlace(a, bd, days),
      cost: det.cost || null, tags: a.tags || [],
    };
  });

  // EVENTS — de-duped across the 7 days, listing which days they're on.
  const evMap = new Map();
  days.forEach((d) => {
    events.forDate(d.date).forEach((e) => {
      const key = e.name + '|' + e.where;
      if (!evMap.has(key)) evMap.set(key, { id: 'ev-' + slug(key), kind: 'event', title: e.name, category: e.category, area: e.area, where: e.where, image: null, why: e.note, _days: [] });
      evMap.get(key)._days.push({ label: d.label, weekday: d.weekday });
    });
  });
  const eventItems = [...evMap.values()].map((e) => {
    const wk = e._days.map((x) => x.weekday);
    const when = wk.length >= 5 ? 'Most days' : e._days.map((x) => x.label.split(',')[0]).join(', ');
    return { id: e.id, kind: 'event', title: e.title, category: e.category, area: e.area, where: e.where, image: null, when, why: e.why, cost: null, tags: [] };
  });

  return { location: base, days: days.map((d) => ({ date: d.date, label: d.label, weekday: d.weekday, hi: d.hi, windKmh: d.windKmh })), items: [...places, ...eventItems] };
}

// SECTION 2 — weave the chosen items into a plan. Two rules: (1) one geographic
// region per day (no criss-crossing), (2) each region lands on the day that suits
// it best. So we group the picks by region, then assign each region its best day.
const TIME_RANK = { sunrise: 0, morning: 1, any: 2, afternoon: 3, sunset: 4, evening: 5 };
const ACT_CLOCK = ['09:00', '10:30', '14:00', '16:00', '17:30', '19:00']; // lunch slots in separately
const AREA_TO_REGION = { 'City Bowl': 'city', 'Atlantic Seaboard': 'atlantic', 'False Bay': 'falsebay', 'Cape Peninsula': 'peninsula', 'Constantia': 'constantia', 'Southern Suburbs': 'constantia', 'Winelands': 'winelands', 'Woodstock': 'city' };
const REGION_NAME = { city: 'the City Bowl', atlantic: 'the Atlantic Seaboard', falsebay: 'False Bay', peninsula: 'the Cape Peninsula', constantia: 'Constantia', winelands: 'the Winelands' };

async function weave(base, ids) {
  const days = await sevenDays(base);
  const chosen = (ids || []).map((id) => byId(id)).filter(Boolean); // places (v1)
  if (!chosen.length || !days.length) return { days: [] };

  // 1) Group picks by real region.
  const groups = {}; // region -> [places]
  chosen.forEach((a) => { const r = AREA_TO_REGION[a.area] || 'city'; (groups[r] = groups[r] || []).push(a); });

  // 2) Assign each region its best day (greedy: best region-day score first, one region/day).
  const pairs = [];
  Object.entries(groups).forEach(([region, places]) => {
    days.forEach((d, i) => { const score = places.reduce((sum, a) => sum + scorePlaceDay(a, d), 0) / places.length; pairs.push({ region, i, score }); });
  });
  pairs.sort((a, b) => b.score - a.score);
  const regionDay = {}, dayTaken = new Set();
  for (const p of pairs) { if (regionDay[p.region] != null || dayTaken.has(p.i)) continue; regionDay[p.region] = p.i; dayTaken.add(p.i); }

  // 3) Build each region's day: order by time-of-day, weave a lunch in.
  const out = Object.entries(regionDay).map(([region, di]) => {
    const day = days[di];
    const ordered = groups[region].slice().sort((a, b) => (TIME_RANK[a.best] ?? 2) - (TIME_RANK[b.best] ?? 2));
    const stops = [];
    ordered.forEach((a, idx) => {
      if (idx === 2) { const l = restaurants.byRegion(region, 'lunch')[0]; if (l) stops.push({ time: '12:30', id: l.id, name: l.name, area: l.cuisine, meal: true, cost: l.priceText, why: `Lunch in ${REGION_NAME[region]} — right by your other stops.` }); }
      stops.push({ time: ACT_CLOCK[Math.min(stops.filter((s) => !s.meal).length, ACT_CLOCK.length - 1)], id: a.id, name: a.name, area: a.area, why: whyForPlace(a, day, days), cost: (detailsFor(a.id).cost) || null, image: IMAGES[a.id] || null });
    });
    return { date: day.date, dayIndex: di, label: day.label, hi: day.hi, windKmh: day.windKmh,
      region: REGION_NAME[region], why: `${REGION_NAME[region]} on ${day.label.split(',')[0]} — ${day.windKmh <= 15 ? 'calm and clear' : 'the best-matched day'} for your picks here.`, stops };
  }).sort((a, b) => a.dayIndex - b.dayIndex);

  return { days: out };
}

module.exports = { build, weave };
