'use strict';

// The tourist flow: location + days → the AI plans the whole holiday. It auto-picks
// a diverse, must-do-first set of experiences and places each on its BEST day + time
// across the stay (e.g. Table Mountain on the calmest morning), with a WHY on every
// stop. No user picking. Each stop is swappable. Reuses the constraint optimiser.

const optimiser = require('../lib/optimiser');
const weather = require('./weather');
const tides = require('./tides');
const images = require('./sources/images');
const { scoreAttraction } = require('../lib/signals');
const { distanceKm } = require('../lib/geo');
const attractionsData = require('../data/attractions');
const activitiesData = require('../data/activities');
const { detailsFor } = require('../data/details');

// Must-do-first order, so short trips get the icons and longer trips add variety.
const AUTO = ['mountain', 'cape-point', 'wine', 'penguins', 'beach-walk', 'sunset', 'whales', 'culture', 'hike', 'market', 'scenic-drive', 'waterfront'];

function matchOf(attrId, day) {
  const a = attractionsData.byId(attrId); if (!a) return 85;
  const s = scoreAttraction(a, { weather: day.weather, tide: day.tides }).score;
  return Math.min(99, 80 + Math.round((s - 55) / 1.6));
}

async function daysWithConditions(base, nDays) {
  const fc = await weather.forecast(base.lat, base.lon, nDays).catch(() => ({ days: [] }));
  return (fc.days || []).slice(0, nDays).map((d) => ({
    date: d.date,
    weather: { maxTempC: d.maxTempC, maxWindKmh: d.maxWindKmh, rainProb: d.maxRainProb, sunrise: d.sunrise, sunset: d.sunset },
    tides: tides.forDate(d.date),
  }));
}

async function build(base, nDays) {
  const days = await daysWithConditions(base, nDays);
  if (!days.length) return { days: [], notes: [] };
  const basket = AUTO.slice(0, Math.min(AUTO.length, Math.max(nDays * 3, 4)));
  const plan = optimiser.plan({ base, days, basket });

  // Enrich each stop with an image, a match score and stable day/slot indices for swapping.
  for (let di = 0; di < plan.days.length; di++) {
    const day = days.find((d) => d.date === plan.days[di].date) || days[di];
    for (let si = 0; si < plan.days[di].slots.length; si++) {
      const slot = plan.days[di].slots[si];
      slot.dayIndex = di; slot.slotIndex = si;
      slot.match = matchOf(slot.attraction.id, day);
      slot.image = await images.forAttraction(slot.attraction.id).catch(() => null);
      slot.details = detailsFor(slot.attraction.id);       // cost, wear, know
      slot.bookUrl = 'https://www.getyourguide.com/s/?q=' + encodeURIComponent(slot.attraction.name + ' Cape Town'); // link-out (no integrated booking in v1)
    }
  }
  return plan;
}

// Swap one stop for the next-best alternative of the SAME activity type (e.g. a
// different beach for the beach-walk), excluding everything already shown there.
async function swap(base, nDays, typeId, exclude) {
  const type = activitiesData.byId(typeId); if (!type) return null;
  const days = await daysWithConditions(base, nDays);
  const ex = new Set(exclude || []);
  const cands = type.candidates.map(attractionsData.byId).filter((a) => a && !ex.has(a.id));
  if (!cands.length) return null;
  // Score against the best remaining day for a fair pick.
  const day = days[0] || { weather: {}, tides: null };
  const top = cands.map((a) => ({ a, s: scoreAttraction(a, { weather: day.weather, tide: day.tides }).score }))
    .sort((x, y) => y.s - x.s)[0];
  const image = await images.forAttraction(top.a.id).catch(() => null);
  return {
    typeId, label: type.label,
    attraction: { id: top.a.id, name: top.a.name, area: top.a.area, blurb: top.a.blurb },
    match: matchOf(top.a.id, day),
    image,
    details: detailsFor(top.a.id),
    bookUrl: 'https://www.getyourguide.com/s/?q=' + encodeURIComponent(top.a.name + ' Cape Town'),
    why: [`Swapped in — ${top.a.name} is the next-best ${type.label.toLowerCase()} for this slot, ${Math.round(distanceKm(base, top.a))} km from your base.`],
  };
}

module.exports = { build, swap };
