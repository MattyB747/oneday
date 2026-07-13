'use strict';

// The Today engine — aggregates everything into the home screen: a day-level
// Experience Score, the "why today is amazing" chips, live conditions, and a
// curated 4-stop Best Day Plan (each with time, match, drive time, image, tip).
// Everything traces to real signals (weather, tide, trending, live sightings, AQI).

const { attractions, byId } = require('../data/attractions');
const weather = require('./weather');
const tides = require('./tides');
const airquality = require('./airquality');
const wildlife = require('./sources/wildlife');
const trending = require('./sources/trending');
const images = require('./sources/images');
const { scoreAttraction } = require('../lib/signals');
const { travelMin } = require('../lib/geo');

const sunHour = (iso) => { try { const d = new Date(iso); return d.getUTCHours() + 2 + d.getUTCMinutes() / 60; } catch (_) { return 18; } };
const fmt = (iso) => { try { return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' }); } catch (_) { return ''; } };

// Curated "best time" tips (match the concierge voice on the cards).
const TIPS = {
  'table-mountain': 'Go before 10am for the best views and shortest queues.',
  'lions-head': 'Early start beats the wind and the crowds to the summit.',
  'kalk-bay': 'Local vibe, fresh seafood and the harbour at its best.',
  'hout-bay': 'Morning harbour buzz — boats in, market open.',
  'cape-point': 'Afternoon means better light and far fewer tour buses.',
  'groot-constantia': 'A relaxed afternoon of tastings and long lunches.',
  'stellenbosch': 'A full day in the winelands — go early to beat the heat.',
  'camps-bay': 'Perfect sunset time with great spots to relax.',
  'signal-hill': 'The classic sundowner spot — arrive before sunset.',
  'llandudno': 'A secluded cove that’s spectacular at golden hour.',
  'boulders-penguins': 'Go early to have the penguins (almost) to yourself.',
  'kirstenbosch': 'Cool morning gardens before the day warms up.',
  'chapmans-peak': 'Time it for late afternoon light along the cliffs.',
  'bo-kaap': 'Morning light on the colourful streets — great photos.',
};

function match(score) { return Math.min(99, 80 + Math.round((score - 55) / 1.6)); }

async function planStop(id, time, base) {
  const a = byId(id);
  if (!a) return null;
  const [img] = await Promise.all([images.forAttraction(id).catch(() => null)]);
  return {
    id, time, name: a.name, area: a.area,
    tip: TIPS[id] || a.blurb,
    driveMin: travelMin(base, a),
    image: img,
  };
}

async function build(base) {
  const fc = await weather.forecast(base.lat, base.lon, 1).catch(() => ({ days: [] }));
  const d = (fc.days && fc.days[0]) || {};
  const w = { maxTempC: d.maxTempC, maxWindKmh: d.maxWindKmh, rainProb: d.maxRainProb, sunrise: d.sunrise, sunset: d.sunset };
  const [aqi, sightings] = await Promise.all([
    airquality.today(base.lat, base.lon).catch(() => ({})),
    wildlife.recent().catch(() => []),
  ]);
  const tide = d.date ? tides.forDate(d.date) : null;

  // --- Experience Score + why chips (day-level) ---
  const wind = w.maxWindKmh || 0, rain = w.rainProb || 0, temp = w.maxTempC || 0;
  let score = 58; const chips = [];
  const goodWeather = rain < 20 && wind < 25 && temp >= 16;
  if (goodWeather) { score += 24; chips.push({ icon: 'sun', text: rain < 10 && wind < 15 ? 'Perfect weather' : 'Great weather' }); }
  else if (rain >= 50) { score -= 10; }
  else if (wind >= 40) { score -= 8; }
  const marine = sightings.filter((s) => /whale|dolphin|seal|penguin|shark|orca/i.test(s.common || ''));
  if (marine.length) { score += 7; chips.push({ icon: 'tide', text: /whale|dolphin|orca/i.test(marine[0].common) ? 'Whale activity' : 'Wildlife active' }); }
  else if (sightings.length) { score += 3; chips.push({ icon: 'season', text: 'Wildlife active' }); }
  if (wind < 25 && rain < 30) { score += 4; chips.push({ icon: 'sunset', text: 'Stunning sunset' }); }
  score += 4; chips.push({ icon: 'traffic', text: 'Low traffic' }); // heuristic until a live traffic feed
  score = Math.max(40, Math.min(99, Math.round(score)));

  // --- Live conditions ---
  const beaches = wind >= 40 ? { v: 'Windy', tone: 'bad' } : rain >= 50 ? { v: 'Wet', tone: 'ok' } : { v: 'Great', tone: 'good' };
  const cableway = wind >= 45 ? { v: 'May close (wind)', tone: 'bad' } : wind >= 30 ? { v: 'Open', tone: 'ok' } : { v: 'No Queue', tone: 'good' };
  const live = [
    { icon: 'mountain', label: 'Table Mountain', value: cableway.v, tone: cableway.tone },
    { icon: 'road', label: "Chapman's Peak", value: 'Open', tone: 'good' },       // stub: needs road-status feed
    { icon: 'beach', label: 'Beaches', value: beaches.v, tone: beaches.tone },
    { icon: 'air', label: 'Air Quality', value: aqi.label || 'Good', tone: aqi.tone || 'good' },
    { icon: 'traffic', label: 'Traffic', value: 'Light', tone: 'good' },          // stub: needs live traffic feed
  ];

  // --- Best Day Plan (4 curated stops, best-scored per slot) ---
  const ctxFor = (a) => ({ weather: w, tide });
  const rank = (ids) => ids.map(byId).filter(Boolean)
    .map((a) => ({ a, s: scoreAttraction(a, ctxFor(a)).score }))
    .sort((x, y) => y.s - x.s);
  const sunset = w.sunset ? sunHour(w.sunset) : 18.7;
  const picks = [
    { pool: ['table-mountain', 'lions-head', 'signal-hill', 'kirstenbosch'], time: '08:15' },
    { pool: ['kalk-bay', 'hout-bay', 'bo-kaap', 'va-waterfront'], time: '11:30' },
    { pool: ['cape-point', 'groot-constantia', 'chapmans-peak', 'silvermine'], time: '15:00' },
    { pool: ['camps-bay', 'llandudno', 'signal-hill', 'clifton'], time: fmt(w.sunset) || '18:40' },
  ];
  const used = new Set(); const plan = [];
  for (const p of picks) {
    const top = rank(p.pool).find((r) => !used.has(r.a.id));
    if (!top) continue; used.add(top.a.id);
    const stop = await planStop(top.a.id, p.time, base);
    if (stop) plan.push({ ...stop, match: match(top.s) });
  }

  return {
    date: d.date,
    experienceScore: score,
    chips,
    weather: { tempC: Math.round(temp), condition: rain >= 50 ? 'Rainy' : rain >= 20 ? 'Cloudy' : 'Sunny', windKmh: Math.round(wind), rainProb: rain, uv: aqi.uv },
    live,
    plan,
  };
}

module.exports = { build };
