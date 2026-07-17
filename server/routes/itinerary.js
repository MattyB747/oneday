'use strict';

// The tourist MVP: location + days → a complete, planned Cape Town holiday, each
// stop with cost / wear / know / why-now. Plus per-stop swap.
const express = require('express');
const { getTrip } = require('../services/trip');
const itinerary = require('../services/itinerary');
const week = require('../services/week');
const weekplan = require('../services/weekplan');
const gallery = require('../services/gallery');
const db = require('../store/db');

const router = express.Router();

function baseFrom(req) {
  let lat = Number(req.query.lat ?? (req.body && req.body.lat));
  let lon = Number(req.query.lon ?? (req.body && req.body.lon));
  const tripId = req.query.tripId || (req.body && req.body.tripId);
  if (tripId) { const t = getTrip(tripId); if (t && t.stay) { lat = t.stay.lat; lon = t.stay.lon; } }
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

// The 7-day "Everything" dashboard (raw evidence).
router.get('/api/week', async (req, res) => {
  try {
    const base = baseFrom(req);
    if (!base) return res.status(400).json({ error: 'Location required' });
    res.json(await week.build(base, 7));
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || 'Could not load the week' });
  }
});

// The DECISION layer — "the best version of each day" (verdict + plan + evidence).
router.get('/api/weekplan', async (req, res) => {
  try {
    const base = baseFrom(req);
    if (!base) return res.status(400).json({ error: 'Location required' });
    res.json(await weekplan.build(base));
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || 'Could not read the week' });
  }
});

// SECTION 1 — the gallery of what's on (image-led menu, each with best day + why).
router.get('/api/gallery', async (req, res) => {
  try {
    const base = baseFrom(req);
    if (!base) return res.status(400).json({ error: 'Location required' });
    const likes = String(req.query.likes || '').split(',').map((s) => s.trim()).filter(Boolean);
    res.json(await gallery.build(base, { likes }));
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || 'Could not load what’s on' });
  }
});

// SECTION 2 — weave the user's chosen items into a plan.
router.post('/api/weave', async (req, res) => {
  try {
    const base = baseFrom(req);
    if (!base) return res.status(400).json({ error: 'Location required' });
    const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
    const result = await gallery.weave(base, ids, req.body && req.body.days);
    // Capture the plan the user built + what our engine kept/dropped (Layer 10).
    db.capture('weave', req.body && req.body.session, {
      picks: ids, days: (req.body && req.body.days) || null,
      kept: (result.days || []).map((d) => ({ region: d.region, date: d.date, stops: d.stops.filter((s) => s.id).map((s) => s.id) })),
      dropped: (result.dropped || []).map((x) => ({ id: x.id, reason: x.reason })),
    });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || 'Could not weave your plan' });
  }
});

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
    const stop = await itinerary.swap(base, Number(b.days) || 3, b.region, b.kind || 'activity', b.mealType, Array.isArray(b.exclude) ? b.exclude : []);
    if (!stop) return res.status(404).json({ error: 'No more alternatives here' });
    res.json(stop);
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || 'Could not swap' });
  }
});

module.exports = router;
