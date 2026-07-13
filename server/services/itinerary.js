'use strict';

// The tourist itinerary — planned by REGION so each day is a sensible geographic
// cluster (you do all of False Bay in one day, not criss-cross the city), with
// meals woven in. The wind-sensitive City/Table-Mountain day is placed on the
// calmest day of the stay. Every stop carries a why, price, what-to-know, and is
// swappable. Real signals: weather, tide, images; restaurants curated for now.

const weather = require('./weather');
const tides = require('./tides');
const images = require('./sources/images');
const { scoreAttraction } = require('../lib/signals');
const { distanceKm, travelMin } = require('../lib/geo');
const { byId } = require('../data/attractions');
const { detailsFor } = require('../data/details');
const restaurants = require('../data/restaurants');

// Geographic day-clusters (what a local would actually tour together).
const REGIONS = [
  { key: 'city', name: 'City Bowl & Table Mountain', windSensitive: true,
    spots: ['table-mountain', 'lions-head', 'bo-kaap', 'companys-garden', 'va-waterfront', 'zeitz-mocaa', 'district-six', 'rhodes-memorial'], sunset: ['signal-hill'] },
  { key: 'peninsula', name: 'The Cape Peninsula', spots: ['cape-point', 'hout-bay', 'noordhoek', 'silvermine'], sunset: ['chapmans-peak'] },
  { key: 'falsebay', name: 'False Bay & the Penguins', spots: ['boulders-penguins', 'kalk-bay', 'muizenberg', 'simons-town'], sunset: [] },
  { key: 'atlantic', name: 'Atlantic Seaboard', spots: ['clifton', 'maidens-cove', 'sea-point-promenade'], sunset: ['camps-bay', 'llandudno'] },
  { key: 'winelands', name: 'Constantia Winelands', spots: ['groot-constantia', 'kirstenbosch', 'stellenbosch'], sunset: [] },
];

const matchOf = (attrId, day) => { const a = byId(attrId); if (!a) return 85; return Math.min(99, 80 + Math.round((scoreAttraction(a, { weather: day.weather, tide: day.tides }).score - 55) / 1.6)); };
const fmt = (iso) => { try { return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' }); } catch (_) { return ''; } };
const bookAttr = (name) => 'https://www.getyourguide.com/s/?q=' + encodeURIComponent(name + ' Cape Town');
const bookRest = (name) => 'https://www.google.com/search?q=' + encodeURIComponent(name + ' Cape Town booking');

async function activityStop(attrId, hhmm, base, day, extraWhy) {
  const a = byId(attrId); if (!a) return null;
  const why = [...(extraWhy || [])];
  const w = day.weather || {};
  if ((w.maxWindKmh || 0) < 15 && a.outdoor) why.push('Clear and calm today — great conditions for it.');
  why.push(`${Math.round(distanceKm(base, a))} km from your base.`);
  return {
    kind: 'activity', region: null, id: a.id, hhmm,
    attraction: { id: a.id, name: a.name, area: a.area, blurb: a.blurb },
    match: matchOf(a.id, day), why,
    image: await images.forAttraction(a.id).catch(() => null),
    details: detailsFor(a.id), bookUrl: bookAttr(a.name),
    driveMin: travelMin(base, a),
  };
}

function mealStop(rest, hhmm, mealType, region) {
  if (!rest) return null;
  return {
    kind: 'meal', region, mealType, id: rest.id, hhmm,
    attraction: { id: rest.id, name: rest.name, area: rest.cuisine },
    why: [`${mealType === 'lunch' ? 'Lunch' : 'Dinner'} right by your ${mealType === 'lunch' ? 'afternoon' : 'evening'} stop — ${rest.cuisine.toLowerCase()}, no detour needed.`],
    details: { cost: rest.priceText, wear: null, know: rest.note },
    bookUrl: bookRest(rest.name), image: null,
  };
}

async function build(base, nDays) {
  const fc = await weather.forecast(base.lat, base.lon, nDays).catch(() => ({ days: [] }));
  const days = (fc.days || []).slice(0, nDays).map((d) => ({
    date: d.date, weather: { maxTempC: d.maxTempC, maxWindKmh: d.maxWindKmh, rainProb: d.maxRainProb, sunset: d.sunset }, tides: tides.forDate(d.date),
  }));
  if (!days.length) return { days: [], notes: [] };
  const maxWind = Math.max(...days.map((d) => d.weather.maxWindKmh || 0));

  // Assign one region per day; the wind-sensitive City day lands on the calmest day.
  const regions = []; for (let i = 0; i < nDays; i++) regions.push(REGIONS[i % REGIONS.length]);
  regions.sort((a, b) => (a.windSensitive ? 0 : 1) - (b.windSensitive ? 0 : 1)); // city first
  const calmOrder = days.map((d, i) => i).sort((a, b) => (days[a].weather.maxWindKmh || 0) - (days[b].weather.maxWindKmh || 0));
  const assign = {}; calmOrder.forEach((dayIdx, k) => { if (regions[k]) assign[dayIdx] = regions[k]; });

  const usedSpots = new Set(), usedRest = new Set();
  const outDays = [];
  for (let di = 0; di < days.length; di++) {
    const day = days[di]; const region = assign[di] || REGIONS[di % REGIONS.length];
    const slots = [];
    // Rank this region's spots by today's score.
    const ranked = region.spots.map(byId).filter((a) => a && !usedSpots.has(a.id))
      .map((a) => ({ id: a.id, s: scoreAttraction(a, { weather: day.weather, tide: day.tides }).score }))
      .sort((x, y) => y.s - x.s);

    // Morning hero (09:30). Cross-day why for the wind-sensitive Table Mountain.
    if (ranked[0]) {
      usedSpots.add(ranked[0].id);
      const extra = [];
      if (ranked[0].id === 'table-mountain') extra.push(`On day ${di + 1} — the calmest morning of your trip (${Math.round(day.weather.maxWindKmh)} km/h vs up to ${Math.round(maxWind)} later), when the cableway is most reliable.`);
      extra.push(`Do all of ${region.name} in one day — no criss-crossing the city.`);
      slots.push(await activityStop(ranked[0].id, '09:30', base, day, extra));
    }
    // Second activity (11:30).
    if (ranked[1]) { usedSpots.add(ranked[1].id); slots.push(await activityStop(ranked[1].id, '11:30', base, day, [`Close by, still in ${region.name}.`])); }
    // Lunch (13:00) near the region.
    const lunch = restaurants.byRegion(region.key, 'lunch').find((r) => !usedRest.has(r.id));
    if (lunch) { usedRest.add(lunch.id); slots.push(mealStop(lunch, '13:00', 'lunch', region.name)); }
    // Afternoon activity (15:00).
    if (ranked[2]) { usedSpots.add(ranked[2].id); slots.push(await activityStop(ranked[2].id, '15:00', base, day, [`Rounds out your ${region.name} day.`])); }
    // Sunset spot (if the region has one).
    const sunsetId = (region.sunset || []).map(byId).find((a) => a && !usedSpots.has(a.id));
    if (sunsetId) { usedSpots.add(sunsetId.id); slots.push(await activityStop(sunsetId.id, fmt(day.weather.sunset) || '18:15', base, day, [`Timed for sunset — the perfect end to the day.`])); }
    // Dinner (19:30) near the region (fall back to a city dinner).
    let dinner = restaurants.byRegion(region.key, 'dinner').find((r) => !usedRest.has(r.id))
      || restaurants.byRegion('city', 'dinner').find((r) => !usedRest.has(r.id));
    if (dinner) { usedRest.add(dinner.id); slots.push(mealStop(dinner, '19:30', 'dinner', region.name)); }

    const clean = slots.filter(Boolean).map((s, si) => ({ ...s, dayIndex: di, slotIndex: si, region: s.region || region.key }));
    outDays.push({ date: day.date, region: region.name, label: new Date(day.date + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' }), weather: day.weather, slots: clean });
  }
  return { days: outDays, notes: [] };
}

// Swap a stop for the next-best alternative in the SAME region (activity → another
// spot in that region; meal → another restaurant of the same meal type).
async function swap(base, nDays, region, kind, mealType, exclude) {
  const ex = new Set(exclude || []);
  const fc = await weather.forecast(base.lat, base.lon, 1).catch(() => ({ days: [] }));
  const d = (fc.days && fc.days[0]) || {};
  const day = { weather: { maxTempC: d.maxTempC, maxWindKmh: d.maxWindKmh, rainProb: d.maxRainProb, sunset: d.sunset }, tides: d.date ? tides.forDate(d.date) : null };
  if (kind === 'meal') {
    const r = restaurants.byRegion(region, mealType).find((x) => !ex.has(x.id));
    return r ? { ...mealStop(r, null, mealType, region), region } : null;
  }
  const reg = REGIONS.find((x) => x.key === region) || REGIONS[0];
  const pool = [...reg.spots, ...(reg.sunset || [])];
  const top = pool.map(byId).filter((a) => a && !ex.has(a.id))
    .map((a) => ({ a, s: scoreAttraction(a, { weather: day.weather, tide: day.tides }).score }))
    .sort((x, y) => y.s - x.s)[0];
  if (!top) return null;
  const stop = await activityStop(top.a.id, null, base, day, [`Another highlight of the ${reg.name}, ${Math.round(distanceKm(base, top.a))} km from your base.`]);
  return stop && { ...stop, region };
}

module.exports = { build, swap };
