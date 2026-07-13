'use strict';

// In-memory trip state (the seam to swap for a DB later). A trip is the whole
// context Tempo optimises around: who, how long, where they're based, when they
// arrive — plus the taste profile that builds from their reactions.

const crypto = require('crypto');
const store = new Map(); // tripId -> trip

function createTrip({ stay }) {
  const id = 't_' + crypto.randomBytes(8).toString('base64url');
  const trip = {
    id,
    stay: stay || null,   // { lat, lon, label } — the one thing setup asks
    basket: [],           // activity types chosen for "Plan a Trippie"
    plans: [],            // built itineraries ("Trippies")
    createdAt: Date.now(),
  };
  store.set(id, trip);
  return trip;
}

const getTrip = (id) => store.get(id);

module.exports = { createTrip, getTrip };
