'use strict';

// LIVE WILDLIFE signal — iNaturalist. Real, recent, geolocated sightings near Cape
// Town (free, keyless). We surface notable ones (whales, dolphins, seals, sharks,
// penguins, otters, tortoises, chameleons) and attach them to nearby attractions.
// Cached ~30 min.
const https = require('https');
const { distanceKm } = require('../../lib/geo');

// Only truly iconic, "worth-a-detour" taxa — common garden birds/insects don't
// make a moment. This keeps the wildlife signal meaningful (and rare).
const NOTABLE = /\b(whale|dolphin|orca|seal|shark|penguin|otter|tortoise|chameleon|flamingo|octopus|stingray|sunfish|mongoose)\b/i;

let cache = { at: 0, list: [] };

function get(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Best Day/0.1' } }, (res) => {
      let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (_) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

async function recent() {
  if (Date.now() - cache.at < 30 * 60 * 1000 && cache.list.length) return cache.list;
  const url = 'https://api.inaturalist.org/v1/observations?nelat=-33.75&nelng=18.65&swlat=-34.4&swlng=18.28&order=desc&order_by=observed_on&per_page=60&quality_grade=research';
  const data = await get(url);
  const list = ((data && data.results) || [])
    .map((o) => ({
      common: (o.taxon && o.taxon.preferred_common_name) || o.species_guess || null,
      place: o.place_guess || 'Cape Town',
      date: o.observed_on,
      lat: o.geojson && o.geojson.coordinates ? o.geojson.coordinates[1] : null,
      lon: o.geojson && o.geojson.coordinates ? o.geojson.coordinates[0] : null,
    }))
    .filter((s) => s.common && s.lat != null && NOTABLE.test(s.common));
  cache = { at: Date.now(), list };
  return list;
}

// Notable sightings within ~12 km of an attraction (max 2).
async function near(attr) {
  const list = await recent();
  return list
    .filter((s) => distanceKm({ lat: s.lat, lon: s.lon }, attr) <= 12)
    .slice(0, 2);
}

module.exports = { recent, near };
