'use strict';

// Distance + rough travel-time helpers for scheduling.
function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Rough drive time (min). Cape Town average ~40 km/h door-to-door + a little overhead.
function travelMin(a, b) {
  const km = distanceKm(a, b);
  if (km == null) return null;
  return Math.round((km / 40) * 60 + 5);
}

module.exports = { distanceKm, travelMin };
