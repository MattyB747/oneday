'use strict';

// The Today home screen data — one call powering the hero: experience score, why
// chips, live conditions, and the Best Day Plan.
const express = require('express');
const { getTrip } = require('../services/trip');
const bestday = require('./../services/bestday');

const router = express.Router();

router.get('/api/today', async (req, res) => {
  try {
    let lat = Number(req.query.lat), lon = Number(req.query.lon);
    if (req.query.tripId) { const t = getTrip(req.query.tripId); if (t && t.stay) { lat = t.stay.lat; lon = t.stay.lon; } }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'Location required' });
    res.json(await bestday.build({ lat, lon }));
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || 'Could not build today' });
  }
});

module.exports = router;
