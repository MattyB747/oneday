'use strict';

// The Today home screen data — one call powering the hero: experience score, why
// chips, live conditions, and the Best Day Plan.
const express = require('express');
const { getTrip } = require('../services/trip');
const bestday = require('./../services/bestday');

const router = express.Router();

function baseFrom(req) {
  let lat = Number(req.query.lat ?? (req.body && req.body.lat)), lon = Number(req.query.lon ?? (req.body && req.body.lon));
  const tripId = req.query.tripId || (req.body && req.body.tripId);
  if (tripId) { const t = getTrip(tripId); if (t && t.stay) { lat = t.stay.lat; lon = t.stay.lon; } }
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

router.get('/api/today', async (req, res) => {
  try {
    const base = baseFrom(req);
    if (!base) return res.status(400).json({ error: 'Location required' });
    res.json(await bestday.build(base));
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || 'Could not build today' });
  }
});

// Swap a single plan stop for the next-best alternative in that slot.
router.post('/api/swap', async (req, res) => {
  try {
    const base = baseFrom(req);
    if (!base) return res.status(400).json({ error: 'Location required' });
    const slotIndex = Number(req.body && req.body.slotIndex);
    const exclude = (req.body && Array.isArray(req.body.exclude)) ? req.body.exclude : [];
    const stop = await bestday.swap(base, slotIndex, exclude);
    if (!stop) return res.status(404).json({ error: 'No more alternatives for this slot' });
    res.json(stop);
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || 'Could not swap' });
  }
});

module.exports = router;
