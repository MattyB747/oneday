'use strict';

// In-memory trip state (the seam to swap for a DB later). A trip is the whole
// context Tempo optimises around: who, how long, where they're based, when they
// arrive — plus the taste profile that builds from their reactions.

const crypto = require('crypto');
const store = new Map(); // tripId -> trip

function createTrip({ people, days, stay, arrival }) {
  const id = 't_' + crypto.randomBytes(8).toString('base64url');
  const trip = {
    id,
    people: String(people || '2'),
    days: Math.min(Math.max(Number(days) || 3, 1), 14),
    stay: stay || null,           // { lat, lon, label }
    arrival: arrival || null,     // { date, time }
    prefs: {},                    // tag -> weight, built from reactions
    reactions: {},                // attractionId -> 'love'|'maybe'|'no'|'save'
    createdAt: Date.now(),
  };
  store.set(id, trip);
  return trip;
}

const getTrip = (id) => store.get(id);

module.exports = { createTrip, getTrip };
