'use strict';

// SECTION 1 (the menu) + the weave logic for SECTION 2 (the planner).
//   build(base)  -> everything on in the next 7 days as image-led items, each with
//                   its BEST day and a strong WHY.
//   weave(base, ids) -> takes the items a user picked and weaves them into a plan:
//                   each on its best day, ordered by best time-of-day, with the why
//                   for every placement. The human picks WHAT; we own WHEN/WHERE/WHY.

const weather = require('./weather');
const tides = require('./tides');
const events = require('../data/events');
const placesLib = require('../data/places');
const attractions = placesLib.all;      // curated (rich) + OSM (breadth)
const byId = placesLib.byId;
const { detailsFor } = require('../data/details');
const restaurants = require('../data/restaurants');
const { distanceKm } = require('../lib/geo');
let IMAGES = {};
try { IMAGES = require('../data/images.json'); } catch (_) { IMAGES = {}; }
let ABOUT = {};
try { ABOUT = require('../data/about.json'); } catch (_) { ABOUT = {}; }

const clamp = (n) => Math.max(0, Math.min(1, n));
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Which categories are "in season" this month (drives the Seasonal musts row).
function seasonCategories() {
  const m = new Date().getMonth() + 1; const s = new Set();
  if ([6, 7, 8, 9, 10, 11].includes(m)) { s.add('wildlife'); s.add('viewpoint'); } // whale season — coast & lookouts
  if ([12, 1, 2].includes(m)) { s.add('beach'); s.add('wine'); }                    // summer
  if ([2, 3, 4].includes(m)) s.add('wine');                                          // harvest
  if ([8, 9].includes(m)) { s.add('garden'); s.add('nature'); }                      // spring flowers
  return s;
}

// Concierge personalisation — how much a place matches what YOU told us you love.
const LIKE_MATCH = {
  beaches: (p) => p.category === 'beach' || (p.tags || []).includes('beach'),
  wine: (p) => p.category === 'wine' || (p.tags || []).includes('wine'),
  hikes: (p) => ['hike', 'nature'].includes(p.category) || (p.tags || []).some((t) => ['hiking', 'nature', 'adventure'].includes(t)),
  culture: (p) => ['culture', 'history', 'art'].includes(p.category) || (p.tags || []).some((t) => ['culture', 'history'].includes(t)),
  views: (p) => p.category === 'viewpoint' || (p.tags || []).some((t) => ['views', 'photography', 'scenic'].includes(t)),
  food: (p) => ['food', 'market'].includes(p.category) || (p.tags || []).includes('food'),
  sunsets: (p) => p.best === 'sunset' || (p.tags || []).some((t) => ['romantic', 'sunset'].includes(t)),
  wildlife: (p) => p.category === 'wildlife' || (p.tags || []).includes('wildlife'),
  family: (p) => (p.tags || []).includes('family'),
};
const LIKE_WORD = { beaches: 'beaches', wine: 'wine', hikes: 'hikes & nature', culture: 'culture', views: 'views & photography', food: 'food', sunsets: 'sunsets', wildlife: 'wildlife', family: 'family days' };
const affinity = (p, likes) => (likes || []).reduce((n, k) => n + (LIKE_MATCH[k] && LIKE_MATCH[k](p) ? 1 : 0), 0);
const prettyLikes = (likes) => (likes || []).slice(0, 2).map((k) => LIKE_WORD[k] || k).join(' & ');

// Editorial buckets for a place, derived honestly from its data.
function editorialBuckets(a, seasonCats) {
  const b = [];
  if ((a.scenic || 0) >= 0.9) b.push('mustsee');
  if (a.outdoor && ['hike', 'beach', 'viewpoint', 'nature', 'garden', 'scenic-drive', 'walk', 'wildlife'].includes(a.category)) b.push('outdoor');
  if (['food', 'market', 'wine'].includes(a.category)) b.push('food');
  if (seasonCats.has(a.category)) b.push('seasonal');
  return b;
}
const dayName = (dateStr) => new Date(dateStr + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' });

async function sevenDays(base) {
  const fc = await weather.forecast(base.lat, base.lon, 7).catch(() => ({ days: [] }));
  return (fc.days || []).slice(0, 7).map((d) => ({
    date: d.date, label: dayName(d.date),
    weekday: new Date(d.date + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'short' }),
    hi: Math.round(d.maxTempC), windKmh: Math.round(d.maxWindKmh || 0), rainProb: d.maxRainProb || 0,
    windDir: d.windDir, uv: d.uvMax, sunrise: d.sunrise, sunset: d.sunset,
    windN: clamp((d.maxWindKmh || 0) / 45), rainN: clamp((d.maxRainProb || 0) / 100), warmN: clamp(((d.maxTempC || 0) - 14) / 12),
  }));
}

// Today's live conditions for the illustrated map overlay.
function todayConditions(days, base) {
  const d = days[0]; if (!d) return null;
  const tide = tides.forDate(d.date);
  const low = (tide.lows || []).find((l) => l.hour >= 6 && l.hour <= 19) || tide.lows[0] || null;
  const t = (iso) => { try { return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' }); } catch (_) { return null; } };
  return { tempC: d.hi, windKmh: d.windKmh, windDir: d.windDir, rainProb: d.rainProb, uv: d.uv != null ? Math.round(d.uv) : null,
    sunrise: t(d.sunrise), sunset: t(d.sunset), lowTide: low ? low.hhmm : null };
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

// The smart "Today" — an actively-reasoned mini-day. Picks a hero for today's
// conditions, then CHAINS nearby places by tide × proximity × time-of-day, with a
// why that quotes the real data ("low tide 14:00 makes this better; it's 3 km on").
function bestTodayPlan(days, likes, exclude) {
  const today = days[0];
  const tideInfo = tides.forDate(today.date);
  const lows = (tideInfo.lows || []).filter((l) => l.hour >= 7 && l.hour <= 18);
  const lowStr = lows.length ? lows[0].hhmm : null;
  const calm = (today.windKmh || 0) <= 16;
  const avail = placesLib.curated.filter((a) => !exclude.has(a.id));
  const scored = avail.map((a) => ({ a, s: scorePlaceDay(a, today) + (a.scenic || 0) * 25 + affinity(a, likes) * 22 })).sort((x, y) => y.s - x.s);
  if (!scored.length) return null;
  // Hero: a strong morning-ish outdoor pick that actually HAS nearby company.
  const heroCand = scored.filter((r) => ['morning', 'sunrise', 'any'].includes(r.a.best) && r.a.outdoor).map((r) => r.a);
  const hero = heroCand.find((h) => avail.some((a) => a.id !== h.id && distanceKm(h, a) <= 12)) || heroCand[0] || scored[0].a;
  // Nearest available places to the hero, best-scoring first among the close ones.
  const byNear = avail.filter((a) => a.id !== hero.id).sort((a, b) => distanceKm(hero, a) - distanceKm(hero, b));
  const pool = byNear.filter((a) => distanceKm(hero, a) <= 15);
  const use = pool.length >= 2 ? pool : byNear.slice(0, 5);
  const afternoon = use.find((a) => a.tideMatters && ['afternoon', 'any'].includes(a.best))
    || use.find((a) => ['afternoon', 'any', 'morning'].includes(a.best)) || use[0];
  const sunset = use.find((a) => a.best === 'sunset' && a !== afternoon)
    || use.find((a) => a !== afternoon);
  const chain = [hero, afternoon, sunset].filter((a, i, arr) => a && arr.indexOf(a) === i);
  if (chain.length < 2) return null;

  const stops = chain.map((a, i) => {
    const km = i === 0 ? 0 : Math.round(distanceKm(hero, a));
    let why;
    if (i === 0) why = calm ? `Start here while it's calm and clear (${today.hi}°, wind ${today.windKmh} km/h) — mornings are best for it.` : `Kick the day off here.`;
    else if (a.tideMatters && lowStr) why = `Low tide at ${lowStr} makes this better today — and it's only ${km} km from ${hero.name}.`;
    else if (a.best === 'sunset') why = `End with sunset here, ${km} km on — timed for golden hour.`;
    else why = `Just ${km} km on, and it flows straight from ${hero.name}.`;
    const clock = ['09:00', '13:00', '16:30'];
    return { id: a.id, name: a.name, time: a.best === 'sunset' ? '17:30' : clock[Math.min(i, clock.length - 1)], why, image: IMAGES[a.id] || null, km };
  });
  const headline = (likes && likes.length)
    ? `Because you love ${prettyLikes(likes)} — here's your day`
    : (calm ? `Today's calm and clear — here's your perfect day` : `Here's the best shape for today`);
  return {
    headline,
    sub: `${today.hi}° · wind ${today.windKmh} km/h${lowStr ? ` · low tide ${lowStr}` : ''}`,
    ids: chain.map((a) => a.id), stops,
  };
}

async function build(base, prefs) {
  const likes = (prefs && prefs.likes) || [];
  const exclude = new Set((prefs && prefs.exclude) || []); // dismissed — "not for me today"
  const days = await sevenDays(base);
  if (!days.length) return { days: [], items: [], featured: [] };
  const seasonCats = seasonCategories();

  // PLACES — each with best day + why + region + coordinates + editorial buckets.
  const places = attractions.filter((a) => !exclude.has(a.id)).map((a) => {
    const scored = days.map((d, i) => ({ i, s: scorePlaceDay(a, d) })).sort((x, y) => y.s - x.s);
    const best = scored[0]; const bd = days[best.i];
    const det = detailsFor(a.id);
    const region = a.region || AREA_TO_REGION[a.area] || 'city';
    return {
      id: a.id, kind: 'place', title: a.name, category: a.category, area: a.area,
      region, regionName: REGION_NAME[region] || a.area, lat: a.lat, lon: a.lon,
      image: IMAGES[a.id] || null, blurb: a.blurb,
      bestDayIndex: best.i, bestScore: best.s, when: bd.label, why: whyForPlace(a, bd, days),
      cost: det.cost || null, scenic: a.scenic || 0, buckets: editorialBuckets(a, seasonCats), tags: a.tags || [],
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
    return { id: e.id, kind: 'event', title: e.title, category: e.category, area: e.area, region: e.area, regionName: REGION_NAME[e.area] || e.area, where: e.where, image: null, when, why: e.why, cost: null, tags: [] };
  });

  // TODAY'S SUGGESTIONS — what today's weather/season actually favour (not just
  // rain-safe fallbacks). Rank by today's score BOOSTED by scenic standout + season,
  // capped at 2 per category for variety, each with a real "why now".
  const today = days[0];
  const whyNow = (a) => {
    if (a.outdoor && today.windN < 0.35 && today.rainN < 0.3) return `Clear and calm today (${today.hi}°, wind ${today.windKmh} km/h) — a great day for it.`;
    if (!a.outdoor && (today.rainN > 0.4 || today.windN > 0.55)) return `A rain-and-wind-safe pick for today — good whatever the sky does.`;
    if (seasonCats.has(a.category)) return `In season right now — one to catch while you can.`;
    return `A solid choice for today — ${today.hi}° and wind ${today.windKmh} km/h.`;
  };
  const rankedToday = placesLib.curated.filter((a) => !exclude.has(a.id))
    .map((a) => ({ a, s: scorePlaceDay(a, today) + (a.scenic || 0) * 28 + (seasonCats.has(a.category) ? 12 : 0) }))
    .sort((x, y) => y.s - x.s);
  const catCount = {}; const todayPlaces = [];
  for (const { a } of rankedToday) {
    if (todayPlaces.length >= 6) break;
    if ((catCount[a.category] || 0) >= 2) continue;
    catCount[a.category] = (catCount[a.category] || 0) + 1;
    const item = places.find((p) => p.id === a.id);
    if (item) todayPlaces.push({ ...item, when: 'Great today', why: whyNow(a) });
  }
  const todayEvents = events.forDate(today.date).slice(0, 3).map((e) => ({
    id: 'ev-' + slug(e.name + '|' + e.where), kind: 'event', title: e.name, category: e.category,
    area: e.area, region: e.area, regionName: REGION_NAME[e.area] || e.area, where: e.where, image: null, when: 'On today', why: e.note,
  }));
  const featured = [...todayPlaces, ...todayEvents];
  const itemById = new Map(places.map((it) => [it.id, it]));

  // "What's on this week" for the hero — marquee events across the 7 days (festivals,
  // culture, live music, First Thursdays). Sports fixtures come when we wire a feed.
  const seenEv = new Set(); const thisWeek = [];
  days.forEach((d) => events.forDate(d.date).forEach((e) => {
    if (['festival', 'music', 'culture'].includes(e.category) && !seenEv.has(e.name)) {
      seenEv.add(e.name); thisWeek.push({ name: e.name, where: e.where, day: d.label.split(',')[0], category: e.category });
    }
  }));
  const heroImage = IMAGES['table-mountain'] || IMAGES['camps-bay'] || null;

  return {
    location: base,
    days: days.map((d) => ({ date: d.date, label: d.label, weekday: d.weekday, hi: d.hi, windKmh: d.windKmh })),
    conditions: todayConditions(days, base),
    heroImage, thisWeek: thisWeek.slice(0, 5),
    bestToday: bestTodayPlan(days, likes, exclude),
    forYou: likes.length
      ? placesLib.all.filter((a) => !exclude.has(a.id)).map((a) => ({ a, s: affinity(a, likes) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 14).map((x) => itemById.get(x.a.id)).filter(Boolean)
      : [],
    likesLabel: likes.length ? prettyLikes(likes) : null,
    featured, items: [...places, ...eventItems],
  };
}

// SECTION 2 — weave the chosen items into a plan. Two rules: (1) one geographic
// region per day (no criss-crossing), (2) each region lands on the day that suits
// it best. So we group the picks by region, then assign each region its best day.
const TIME_RANK = { sunrise: 0, morning: 1, any: 2, afternoon: 3, sunset: 4, evening: 5 };
const ACT_CLOCK = ['09:00', '10:30', '14:00', '16:00', '17:30', '19:00']; // lunch slots in separately
const AREA_TO_REGION = { 'City Bowl': 'city', 'Atlantic Seaboard': 'atlantic', 'False Bay': 'falsebay', 'Cape Peninsula': 'peninsula', 'Constantia': 'constantia', 'Southern Suburbs': 'constantia', 'Winelands': 'winelands', 'Woodstock': 'city' };
const REGION_NAME = { city: 'the City Bowl', atlantic: 'the Atlantic Seaboard', falsebay: 'False Bay', peninsula: 'the Cape Peninsula', constantia: 'Constantia', winelands: 'the Winelands' };
// Encoded Cape Town commute knowledge — when to leave to beat the afternoon jam
// (generic patterns, not a live traffic feed; real-time routing comes with a key).
const COMMUTE = {
  city: 'The city bowl clogs on the N1/N2 from ~16:00 — you’re central, so no rush, but avoid driving out at 5pm.',
  atlantic: 'Victoria Rd along the Atlantic backs up 16:00–18:00 — aim to be leaving Camps Bay/Clifton by ~16:00.',
  constantia: 'The M3 through the southern suburbs jams 16:00–18:00 — leave Constantia by ~16:00 to keep it smooth.',
  falsebay: 'It’s ~40 min back up the M3/coast — leave False Bay by ~16:00 before the afternoon build-up.',
  peninsula: 'It’s a long, winding drive home from the Peninsula — start heading back by ~16:00 while there’s light.',
  winelands: 'The N1/N2 back from the Winelands is heavy 16:00–18:00 — leave by ~15:30, and sort a designated driver.',
};

async function weave(base, ids, nDays) {
  const days = await sevenDays(base);
  const chosen = (ids || []).map((id) => byId(id)).filter(Boolean); // places (v1)
  if (!chosen.length || !days.length) return { days: [], dropped: [] };
  const D = Math.min(Math.max(Number(nDays) || 3, 1), 7);
  const chosenIds = new Set(chosen.map((a) => a.id));

  // 1) Group picks by region; rank each region by weather-fit + scenery.
  const groups = {};
  chosen.forEach((a) => { const r = a.region || AREA_TO_REGION[a.area] || 'city'; (groups[r] = groups[r] || []).push(a); });
  const regionInfo = Object.entries(groups).map(([region, places]) => {
    let bestI = 0, bestScore = -1e9;
    days.forEach((d, i) => { const sc = places.reduce((s, a) => s + scorePlaceDay(a, d), 0) / places.length; if (sc > bestScore) { bestScore = sc; bestI = i; } });
    const scenic = Math.max(...places.map((a) => a.scenic || 0));
    return { region, places, bestI, rank: bestScore + scenic * 30 };
  }).sort((a, b) => b.rank - a.rank);

  // 2) Only D areas fit (one per day). Keep the top D; drop the rest, with reasons.
  const dropped = [];
  const kept = []; const dayTaken = new Set();
  regionInfo.forEach((ri, idx) => {
    if (idx >= D) {
      ri.places.forEach((a) => dropped.push({ id: a.id, title: a.name, area: REGION_NAME[ri.region],
        reason: `your ${D} day${D > 1 ? 's' : ''} fit ${D} area${D > 1 ? 's' : ''} — ${REGION_NAME[ri.region]} ranked below the areas we kept on scenery and this week's weather.` }));
      return;
    }
    let di = ri.bestI; if (dayTaken.has(di)) { for (let k = 0; k < days.length; k++) if (!dayTaken.has(k)) { di = k; break; } }
    dayTaken.add(di); kept.push({ ...ri, di });
  });
  kept.sort((a, b) => a.di - b.di);

  // 3) Build each kept day: sequence by time, cap ~4 activities, weave lunch, add
  //    a traffic advisory + a nearby "you're here, also worth it" suggestion.
  const outDays = kept.map((k) => {
    const day = days[k.di];
    const ordered = k.places.slice().sort((a, b) => (TIME_RANK[a.best] ?? 2) - (TIME_RANK[b.best] ?? 2));
    const capped = ordered.slice(0, 4);
    ordered.slice(4).forEach((a) => dropped.push({ id: a.id, title: a.name, area: REGION_NAME[k.region], reason: `only so much fits in a day — this ranked lowest of your ${REGION_NAME[k.region]} picks.` }));
    const stops = [];
    capped.forEach((a, idx) => {
      if (idx === 2) { const l = restaurants.byRegion(k.region, 'lunch')[0]; if (l) stops.push({ time: '12:30', name: l.name, area: l.cuisine, meal: true, cost: l.priceText, lat: l.lat, lon: l.lon, why: `Lunch in ${REGION_NAME[k.region]} — right by your stops.` }); }
      const det = detailsFor(a.id);
      stops.push({
        time: ACT_CLOCK[Math.min(stops.filter((s) => !s.meal).length, ACT_CLOCK.length - 1)],
        id: a.id, name: a.name, area: a.area, lat: a.lat, lon: a.lon,
        why: whyForPlace(a, day, days), cost: det.cost || null, wear: det.wear || null, about: ABOUT[a.id] || null,
        image: IMAGES[a.id] || null,
      });
    });
    // Nearby gem: nearest place in the same area they didn't pick.
    const anchor = capped[0];
    const nearby = attractions
      .filter((a) => (a.region || AREA_TO_REGION[a.area] || 'city') === k.region && !chosenIds.has(a.id))
      .map((a) => ({ a, d: distanceKm(anchor, a) }))
      .sort((x, y) => x.d - y.d)[0];
    return {
      date: day.date, dayIndex: k.di, label: day.label, region: REGION_NAME[k.region], hi: day.hi, windKmh: day.windKmh,
      why: `${REGION_NAME[k.region]} on ${day.label.split(',')[0]} — ${day.windKmh <= 15 ? 'calm and clear' : 'the best-matched day'} for your picks here.`,
      traffic: COMMUTE[k.region] || null,
      nearby: nearby ? { id: nearby.a.id, name: nearby.a.name, lat: nearby.a.lat, lon: nearby.a.lon, km: Math.round(nearby.d), why: nearby.a.blurb, about: ABOUT[nearby.a.id] || null, image: IMAGES[nearby.a.id] || null, cost: (detailsFor(nearby.a.id).cost) || null } : null,
      stops,
    };
  });

  return { days: outDays, dropped, summary: { picked: chosen.length, days: D, areas: regionInfo.length, fits: regionInfo.length <= D } };
}

module.exports = { build, weave };
