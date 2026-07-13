'use strict';

// The 7-Day Everything dashboard — what's on across Cape Town for the next week:
// weather + tides + events + a nature highlight, per day. The "you don't need to
// know, we do" landing.

const weather = require('./weather');
const tides = require('./tides');
const events = require('../data/events');
const seasons = require('../data/seasons');
const wildlife = require('./sources/wildlife');

function wxSummary(d) {
  const w = d.maxWindKmh || 0, r = d.maxRainProb || 0, t = d.maxTempC || 0;
  const cond = r >= 55 ? 'Rainy' : r >= 25 ? 'Some cloud' : w >= 40 ? 'Windy' : 'Clear';
  return `${cond} · ${Math.round(t)}°`;
}

async function build(base, nDays = 7) {
  const fc = await weather.forecast(base.lat, base.lon, nDays).catch(() => ({ days: [] }));
  const sightings = await wildlife.recent().catch(() => []);
  const notable = sightings.slice(0, 1).map((s) => `${s.common} spotted near ${s.place} on ${s.date}`);

  const days = (fc.days || []).map((d) => {
    const date = new Date(d.date + 'T12:00:00');
    const season = seasons.forDate(date);
    const tide = tides.forDate(d.date);
    const lowsDay = (tide.lows || []).filter((l) => l.hour >= 8 && l.hour <= 18);
    return {
      date: d.date,
      label: date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' }),
      weather: { tempC: Math.round(d.maxTempC), windKmh: Math.round(d.maxWindKmh), rainProb: d.maxRainProb, sunrise: d.sunrise, sunset: d.sunset, summary: wxSummary(d) },
      tide: lowsDay.length ? `Low tide ${lowsDay.map((l) => l.hhmm).join(' & ')}` : (tide.lows[0] ? `Low tide ${tide.lows[0].hhmm}` : null),
      events: events.forDate(d.date),
      inSeason: season.nudges.slice(0, 1),
      cautions: season.cautions.slice(0, 1),
    };
  });

  return { location: base, natureNow: notable, days };
}

module.exports = { build };
