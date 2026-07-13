'use strict';

// The Daily Briefing composer — the heart of Layer 1. For a location it builds a
// rolling per-day briefing by combining signals from adapters. Each signal is
// tagged with `kind` (live | seasonal | scheduled) so the UI can be honest about
// certainty. Free-no-key sources are wired now (weather, sun, seasons, holidays);
// keyed/other sources (tides, events, loadshedding, wildlife) slot in as adapters
// and simply add fields when configured — the shape never changes.

const weather = require('./weather');
const holidays = require('./holidays');
const seasons = require('../data/seasons');

function windLabel(kmh) { return kmh >= 45 ? 'Very windy' : kmh >= 30 ? 'Breezy' : 'Calm'; }
function tempLabel(c) { return c >= 26 ? 'Hot' : c >= 20 ? 'Warm' : c >= 14 ? 'Mild' : 'Cool'; }

function weatherCautions(day) {
  const out = [];
  if (day.maxRainProb >= 60) out.push({ icon: '☔', text: `High chance of rain (${day.maxRainProb}%) — keep indoor options handy.` });
  if (day.maxWindKmh >= 45) out.push({ icon: '💨', text: `Strong wind (${Math.round(day.maxWindKmh)} km/h) — the cableway and exposed beaches may be rough.` });
  return out;
}

// Build a 7-day (default) briefing for a location.
async function build(lat, lon, days = 7) {
  const forecast = await weather.forecast(lat, lon, days).catch(() => ({ days: [] }));
  const out = [];
  for (const d of forecast.days || []) {
    const date = new Date(d.date + 'T12:00:00');
    const season = seasons.forDate(date);
    const holiday = await holidays.on(d.date).catch(() => null);

    out.push({
      date: d.date,
      weekday: date.toLocaleDateString('en-ZA', { weekday: 'long' }),
      label: date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }),
      weather: {
        kind: 'live',
        maxTempC: d.maxTempC, maxWindKmh: d.maxWindKmh, rainProb: d.maxRainProb,
        sunrise: d.sunrise, sunset: d.sunset,
        summary: `${tempLabel(d.maxTempC)} · ${windLabel(d.maxWindKmh)}${d.maxRainProb >= 40 ? ' · showers likely' : ''}`,
      },
      // Placeholders wired to adapters as they come online; kept in the shape now.
      tides: null,        // → tides adapter (Stormglass/precomputed) — first-class, coming next
      events: [],         // → Ticketmaster / PredictHQ (needs key)
      disruptions: [],    // → EskomSePush loadshedding (needs key) + City roadworks
      holiday,            // Nager.Date (live/scheduled)
      inSeason: season.nudges,   // encoded seasonal knowledge (kind: seasonal)
      cautions: [...weatherCautions(d), ...season.cautions],
    });
  }
  return { location: { lat, lon }, generatedAt: Date.now(), days: out };
}

module.exports = { build };
