'use strict';

// The tourist MVP: location + days → a complete, planned Cape Town holiday, each
// stop with cost / wear / know / why-now. Plus per-stop swap.
const express = require('express');
const { getTrip } = require('../services/trip');
const itinerary = require('../services/itinerary');

const router = express.Router();

function baseFrom(req) {
  let lat = Number(req.query.lat ?? (req.body && req.body.lat));
  let lon = Number(req.query.lon ?? (req.body && req.body.lon));
  const tripId = req.query.tripId || (req.body && req.body.tripId);
  if (tripId) { const t = getTrip(tripId); if (t && t.stay) { lat = t.stay.lat; lon = t.stay.lon; } }
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

router.get('/api/itinerary', async (req, res) => {
  try {
    const base = baseFrom(req);
    if (!base) return res.status(400).json({ error: 'Location required' });
    const days = Math.min(Math.max(Number(req.query.days) || 3, 1), 7);
    res.json(await itinerary.build(base, days));
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || 'Could not plan your trip' });
  }
});

router.post('/api/itinerary/swap', async (req, res) => {
  try {
    const base = baseFrom(req);
    if (!base) return res.status(400).json({ error: 'Location required' });
    const b = req.body || {};
    const stop = await itinerary.swap(base, Number(b.days) || 3, b.typeId, Array.isArray(b.exclude) ? b.exclude : []);
    if (!stop) return res.status(404).json({ error: 'No more alternatives here' });
    res.json(stop);
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || 'Could not swap' });
  }
});

module.exports = router;
