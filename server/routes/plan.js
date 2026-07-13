'use strict';

// "Plan a Trippie" — takes a basket of activity types + dates, assembles the
// per-day constraints (weather + tides + sun) and runs the optimiser.

const express = require('express');
const { getTrip } = require('../services/trip');
const weather = require('../services/weather');
const tides = require('../services/tides');
const { plan } = require('../lib/optimiser');
const { activities } = require('../data/activities');

const router = express.Router();

// The activity library the UI shows to pick from.
router.get('/api/activities', (_req, res) => {
  res.json({ activities: activities.map((a) => ({ id: a.id, label: a.label, icon: a.icon })) });
});

router.post('/api/plan', async (req, res) => {
  try {
    const b = req.body || {};
    const trip = getTrip(b.tripId);
    const stay = (trip && trip.stay) || (Number.isFinite(b.lat) && Number.isFinite(b.lon) ? { lat: b.lat, lon: b.lon } : null);
    if (!stay) return res.status(400).json({ error: 'No location for this trip' });
    const basket = Array.isArray(b.basket) ? b.basket : [];
    if (!basket.length) return res.status(400).json({ error: 'Pick at least one thing to do' });

    const nDays = Math.min(Math.max(Number(b.days) || 3, 1), 7);
    const forecast = await weather.forecast(stay.lat, stay.lon, nDays).catch(() => ({ days: [] }));
    const days = (forecast.days || []).slice(0, nDays).map((d) => ({
      date: d.date,
      weather: { maxTempC: d.maxTempC, maxWindKmh: d.maxWindKmh, rainProb: d.maxRainProb, sunrise: d.sunrise, sunset: d.sunset },
      tides: tides.forDate(d.date),
    }));

    res.json(plan({ base: stay, days, basket }));
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Could not build your Trippie' });
  }
});

module.exports = router;
