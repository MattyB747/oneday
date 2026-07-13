'use strict';

// The 7-Day Everything dashboard — each day packed with every free signal we can
// stitch: weather (hi/lo, wind, rain, UV), sun (rise/set), moon phase, tides,
// what's on (markets/music/comedy/festivals), what's in season, public holidays,
// and live wildlife nearby. No day should ever look empty.

const weather = require('./weather');
const tides = require('./tides');
const events = require('../data/events');
const seasons = require('../data/seasons');
const holidays = require('./holidays');
const wildlife = require('./sources/wildlife');

function condition(d) {
  const r = d.maxRainProb || 0, w = d.maxWindKmh || 0;
  if (r >= 55) return { icon: '🌧️', text: 'Rain likely' };
  if (r >= 30) return { icon: '⛅', text: 'Some cloud' };
  if (w >= 40) return { icon: '💨', text: 'Windy' };
  return { icon: '☀️', text: 'Clear' };
}

// Moon phase (0=new … 0.5=full) via a simple well-known approximation.
function moon(date) {
  const lp = 2551443; // synodic month in seconds
  const now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 1000;
  const newMoonRef = Date.UTC(2000, 0, 6, 18, 14) / 1000;
  const phase = (((now - newMoonRef) % lp) + lp) % lp / lp;
  const names = [
    [0.03, '🌑 New moon'], [0.22, '🌒 Waxing crescent'], [0.28, '🌓 First quarter'],
    [0.47, '🌔 Waxing gibbous'], [0.53, '🌕 Full moon'], [0.72, '🌖 Waning gibbous'],
    [0.78, '🌗 Last quarter'], [0.97, '🌘 Waning crescent'], [1.01, '🌑 New moon'],
  ];
  for (const [t, label] of names) if (phase <= t) return label;
  return '🌑 New moon';
}

const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' }); } catch (_) { return null; } };
const uvBand = (uv) => uv == null ? null : uv >= 8 ? 'Very high' : uv >= 6 ? 'High' : uv >= 3 ? 'Moderate' : 'Low';

async function build(base, nDays = 7) {
  const fc = await weather.forecast(base.lat, base.lon, nDays).catch(() => ({ days: [] }));
  const sightings = await wildlife.recent().catch(() => []);
  const natureNow = sightings.slice(0, 3).map((s) => `${s.common} near ${s.place} (${s.date})`);

  const days = await Promise.all((fc.days || []).map(async (d) => {
    const date = new Date(d.date + 'T12:00:00');
    const season = seasons.forDate(date);
    const tide = tides.forDate(d.date);
    const lowsDay = (tide.lows || []).filter((l) => l.hour >= 6 && l.hour <= 19);
    const cond = condition(d);
    const holiday = await holidays.on(d.date).catch(() => null);
    return {
      date: d.date,
      label: date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' }),
      weekday: date.toLocaleDateString('en-ZA', { weekday: 'short' }),
      weather: {
        icon: cond.icon, text: cond.text,
        hi: Math.round(d.maxTempC), lo: d.minTempC != null ? Math.round(d.minTempC) : null,
        windKmh: Math.round(d.maxWindKmh || 0), rainProb: d.maxRainProb || 0,
        uv: d.uvMax != null ? Math.round(d.uvMax) : null, uvBand: uvBand(d.uvMax),
      },
      sun: { rise: fmtTime(d.sunrise), set: fmtTime(d.sunset) },
      moon: moon(date),
      tide: {
        low: lowsDay.map((l) => l.hhmm),
        high: (tide.highs || []).filter((h) => h.hour >= 6 && h.hour <= 19).map((h) => h.hhmm),
      },
      events: events.forDate(d.date),
      inSeason: season.nudges,
      cautions: season.cautions.slice(0, 1),
      holiday,
      nature: natureNow.slice(0, 2),
    };
  }));

  return { location: base, natureNow, days };
}

module.exports = { build };
