'use strict';

// THE DECISION LAYER. Turns the 7-day evidence into 7 verdicts — "the best version
// of each day". For every day we know the conditions (wind, rain, warmth, what's on);
// each candidate THEME has a fit-function over those conditions. We score every
// (day × theme) pair and greedily assign the single best day to each theme, so the
// week self-organises into a varied, weather-matched plan: Table Mountain lands on
// the calmest day, the beach on the warmest, culture on the wettest, markets on the
// busiest. Each day returns a verdict headline + reason + a plan; the raw signals
// (from week.build) ride underneath as the "why".

const week = require('./week');
const { byId } = require('../data/attractions');
const restaurants = require('../data/restaurants');
const { detailsFor } = require('../data/details');

const clamp = (n) => Math.max(0, Math.min(1, n));

// Normalise a day's weather into 0..1 decision signals.
function signals(day) {
  const w = day.weather || {};
  const windy = clamp((w.windKmh || 0) / 45);
  const wet = clamp((w.rainProb || 0) / 100);
  return {
    calm: 1 - windy,
    dry: 1 - wet,
    clear: 1 - wet,                       // rain-prob proxy for clarity (no daily cloud field)
    warm: clamp(((w.hi || 0) - 14) / 12), // 14°→0, 26°+→1
    windy, wet,
    firstThu: (day.events || []).some((e) => /First Thursdays/i.test(e.name)) ? 1 : 0,
    eventCount: (day.events || []).length,
  };
}

// Candidate day-themes. fit(s, day) -> 0..1. reason(s, w, day) -> string.
const THEMES = [
  { key: 'tablemountain', emoji: '🚡', label: 'Table Mountain day', region: 'city',
    spots: ['table-mountain', 'lions-head', 'signal-hill', 'bo-kaap'],
    fit: (s) => s.calm * 0.5 + s.clear * 0.3 + s.dry * 0.2,
    reason: (s, w) => `the calmest, clearest day of the week — the cableway runs in wind like today’s (${w.windKmh} km/h)` },
  { key: 'beach', emoji: '🏖️', label: 'Beach & Seaboard', region: 'atlantic',
    spots: ['clifton', 'camps-bay', 'maidens-cove', 'sea-point-promenade'],
    fit: (s) => s.warm * 0.5 + s.calm * 0.3 + s.dry * 0.2,
    reason: (s, w) => `the warmest day (${w.hi}°) with light wind — made for Clifton and Camps Bay` },
  { key: 'winelands', emoji: '🍷', label: 'The Winelands', region: 'winelands',
    spots: ['stellenbosch', 'spier', 'franschhoek-tram'],
    fit: (s) => s.dry * 0.4 + s.calm * 0.3 + s.warm * 0.3,
    reason: () => `warm, still and dry — the day to head east for long lunches among the vines` },
  { key: 'falsebay', emoji: '🐧', label: 'False Bay & Penguins', region: 'falsebay',
    spots: ['boulders-penguins', 'simons-town', 'kalk-bay', 'muizenberg'],
    fit: (s) => s.calm * 0.5 + s.dry * 0.3 + s.warm * 0.2,
    reason: () => `sheltered and low-wind — the Boulders penguins and Kalk Bay’s harbour` },
  { key: 'peninsula', emoji: '🚗', label: 'Cape Peninsula drive', region: 'peninsula',
    spots: ['cape-point', 'chapmans-peak', 'hout-bay', 'noordhoek'],
    fit: (s) => s.clear * 0.4 + s.calm * 0.3 + s.dry * 0.3,
    reason: () => `clear skies for Chapman’s Peak Drive and the cliffs at Cape Point` },
  { key: 'constantia', emoji: '🌳', label: 'Constantia & Gardens', region: 'constantia',
    spots: ['kirstenbosch', 'groot-constantia', 'rhodes-memorial'],
    fit: (s) => s.calm * 0.4 + s.dry * 0.4 + s.warm * 0.2,
    reason: () => `mild and calm — Kirstenbosch gardens and a long Constantia wine lunch` },
  { key: 'culture', emoji: '🎨', label: 'City & Culture', region: 'cityIndoor',
    spots: ['zeitz-mocaa', 'district-six', 'two-oceans-aquarium', 'va-waterfront'],
    fit: (s) => s.wet * 0.6 + s.windy * 0.2 + s.firstThu * 0.5,
    reason: (s, w, day) => day && signals(day).firstThu ? `First Thursdays tonight — galleries and shops stay open late` : `cloud and wind about — a day for Zeitz MOCAA, museums and the Waterfront` },
  { key: 'markets', emoji: '🛍️', label: 'Markets & Food', region: null,
    fit: (s) => clamp(s.eventCount / 10),
    reason: (s, w, day) => `the busiest day for markets — ${day.events.length} things on, from food halls to live music` },
];

function buildPlan(theme, day) {
  // Market/food day → lead with the day's actual markets & music.
  if (!theme.spots) {
    return (day.events || [])
      .filter((e) => ['market', 'food', 'music', 'festival'].includes(e.category))
      .slice(0, 5)
      .map((e) => ({ name: e.name, where: e.where, why: e.note }));
  }
  const spots = theme.spots.map(byId).filter(Boolean).slice(0, 3);
  const times = ['09:30', '13:30', '16:00'];
  const stops = spots.map((a, i) => {
    const d = detailsFor(a.id);
    return { time: times[i], name: a.name, where: a.area, why: a.blurb, cost: d.cost, know: d.know };
  });
  // Slot a nearby lunch in.
  const lunch = theme.region && (restaurants.byRegion(theme.region, 'lunch')[0]);
  if (lunch) stops.splice(1, 0, { time: '12:30', name: lunch.name, where: lunch.cuisine, meal: true, cost: lunch.priceText, why: lunch.note });
  return stops;
}

async function build(base) {
  const w = await week.build(base, 7);
  const days = w.days || [];

  // Score every (day, theme) and greedily assign each theme its single best day.
  const pairs = [];
  days.forEach((d, di) => { const s = signals(d); THEMES.forEach((t) => pairs.push({ di, t, score: t.fit(s, d) })); });
  pairs.sort((a, b) => b.score - a.score);
  const dayTaken = new Set(), themeTaken = new Set(), assign = {};
  for (const p of pairs) {
    if (dayTaken.has(p.di) || themeTaken.has(p.t.key)) continue;
    assign[p.di] = p; dayTaken.add(p.di); themeTaken.add(p.t.key);
  }

  days.forEach((d, di) => {
    const p = assign[di] || { t: THEMES[0], score: 0 };
    const s = signals(d);
    d.verdict = { emoji: p.t.emoji, label: p.t.label, theme: p.t.key, reason: p.t.reason(s, d.weather, d) };
    d.plan = buildPlan(p.t, d);
  });

  return w;
}

module.exports = { build };
