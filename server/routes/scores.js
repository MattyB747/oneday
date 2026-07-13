'use strict';

// Live Best Moment Scores — for today, rank attractions by how good a moment they
// are RIGHT NOW, aggregating real free signals (weather + tide + Wikipedia trending
// + live iNaturalist sightings) via the decision-object engine. This is the
// "go today (98), not tomorrow (61)" magic.

const express = require('express');
const { getTrip } = require('../services/trip');
const { attractions } = require('../data/attractions');
const weather = require('../services/weather');
const tides = require('../services/tides');
const trending = require('../services/sources/trending');
const wildlife = require('../services/sources/wildlife');
const { scoreAttraction } = require('../lib/signals');

const router = express.Router();

router.get('/api/scores', async (req, res) => {
  try {
    let lat = Number(req.query.lat), lon = Number(req.query.lon);
    if (req.query.tripId) { const t = getTrip(req.query.tripId); if (t && t.stay) { lat = t.stay.lat; lon = t.stay.lon; } }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'Location required' });

    const fc = await weather.forecast(lat, lon, 1).catch(() => ({ days: [] }));
    const today = fc.days && fc.days[0];
    const w = today ? { maxTempC: today.maxTempC, maxWindKmh: today.maxWindKmh, rainProb: today.maxRainProb } : {};
    const tide = today ? tides.forDate(today.date) : null;

    // Aggregate signals per attraction (trending + live sightings are real API calls,
    // cached inside the adapters so this stays fast).
    const scored = await Promise.all(attractions.map(async (a) => {
      const ctx = { weather: w, tide };
      if (trending.hasWiki(a.id)) ctx.trending = await trending.trendFor(a.id);
      if (/wildlife|nature|beach/.test(a.category) || a.tags.includes('wildlife')) ctx.sightings = await wildlife.near(a);
      const { score, reasons } = scoreAttraction(a, ctx);
      return { id: a.id, name: a.name, area: a.area, category: a.category, blurb: a.blurb, score, reasons: reasons.slice(0, 4) };
    }));

    scored.sort((x, y) => y.score - x.score);
    res.json({ date: today ? today.date : null, attractions: scored });
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || 'Could not score moments' });
  }
});

module.exports = router;
