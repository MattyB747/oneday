'use strict';

// Trip setup: the 4-question onboarding creates a trip, geocodes where they're
// staying, and fetches the live weather for their stay window so the AI can start
// working immediately.

const express = require('express');
const { createTrip, getTrip } = require('../services/trip');
const { geocode } = require('../services/geocode');
const weather = require('../services/weather');

const router = express.Router();

// Compact weather summary for the stay — enough to headline "what's happening".
function summarise(forecast) {
  return (forecast.days || []).map((d) => ({
    date: d.date,
    maxTempC: d.maxTempC,
    maxWindKmh: d.maxWindKmh,
    rainProb: d.maxRainProb,
    sunrise: d.sunrise,
    sunset: d.sunset,
    // A one-word headline the UI can badge.
    headline: d.maxRainProb >= 60 ? 'Wet' : d.maxWindKmh >= 40 ? 'Windy' : d.maxTempC >= 24 ? 'Warm & clear' : 'Mild',
  }));
}

router.post('/api/trip', async (req, res) => {
  try {
    const b = req.body || {};
    // Resolve where they're staying: explicit coords (current location) or a name to geocode.
    let stay;
    if (Number.isFinite(b.lat) && Number.isFinite(b.lon)) stay = { lat: b.lat, lon: b.lon, label: b.label || 'Current location' };
    else stay = await geocode(b.stay);

    const trip = createTrip({ people: b.people, days: b.days, stay, arrival: b.arrival });
    const forecast = await weather.forecast(stay.lat, stay.lon, trip.days).catch(() => ({ days: [] }));
    res.json({ tripId: trip.id, stay, days: trip.days, people: trip.people, weather: summarise(forecast) });
  } catch (err) {
    res.status(400).json({ error: (err && err.message) || 'Could not set up your trip' });
  }
});

router.get('/api/trip/:id', (req, res) => {
  const trip = getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json({ tripId: trip.id, stay: trip.stay, days: trip.days, people: trip.people });
});

module.exports = router;
