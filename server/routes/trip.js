'use strict';

// Setup (location only) + the Daily Briefing. Setup asks ONE thing: where are you
// staying. From that we drop the visitor into a rolling 7-day briefing dashboard.

const express = require('express');
const { createTrip, getTrip } = require('../services/trip');
const { geocode } = require('../services/geocode');
const briefing = require('../services/briefing');

const router = express.Router();

// Create a trip from just a location (name to geocode, or explicit coords).
router.post('/api/trip', async (req, res) => {
  try {
    const b = req.body || {};
    let stay;
    if (Number.isFinite(b.lat) && Number.isFinite(b.lon)) stay = { lat: b.lat, lon: b.lon, label: b.label || 'Your location' };
    else stay = await geocode(b.stay);
    const trip = createTrip({ stay });
    res.json({ tripId: trip.id, stay });
  } catch (err) {
    res.status(400).json({ error: (err && err.message) || 'Could not set up your trip' });
  }
});

// Rolling daily briefing for a trip (or ad-hoc lat/lon).
router.get('/api/briefing', async (req, res) => {
  try {
    let lat = Number(req.query.lat), lon = Number(req.query.lon);
    if (req.query.tripId) { const t = getTrip(req.query.tripId); if (t && t.stay) { lat = t.stay.lat; lon = t.stay.lon; } }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'Location required' });
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 14);
    res.json(await briefing.build(lat, lon, days));
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || 'Could not build the briefing' });
  }
});

module.exports = router;
