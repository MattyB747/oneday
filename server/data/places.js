'use strict';

// The unified Place layer: curated attractions (rich — images, history, details) +
// harvested OpenStreetMap breadth (hundreds more, deduped). Curated always wins a
// name clash. Everything downstream (gallery, weave, map) reads from here, so adding
// the OSM file — or any future source — instantly deepens the app. Graceful: if the
// harvest file isn't present yet, we just serve the curated set.

const { attractions } = require('./attractions');
let OSM = [];
try { OSM = require('./places-osm.json'); } catch (_) { OSM = []; }

const AREA_TO_REGION = { 'City Bowl': 'city', 'Atlantic Seaboard': 'atlantic', 'False Bay': 'falsebay', 'Cape Peninsula': 'peninsula', 'Constantia': 'constantia', 'Southern Suburbs': 'constantia', 'Winelands': 'winelands', 'Woodstock': 'city' };

const curated = attractions.map((a) => ({ ...a, region: AREA_TO_REGION[a.area] || 'city', curated: true }));
const curatedNames = new Set(curated.map((a) => a.name.toLowerCase().trim()));

// OSM breadth: drop anything we already curate, cap to the best by popularity proxy.
const osm = OSM
  .filter((p) => p.name && !curatedNames.has(p.name.toLowerCase().trim()))
  .sort((a, b) => (b.scenic || 0) - (a.scenic || 0))
  .slice(0, 240)
  .map((p) => ({ ...p, blurb: p.blurb || '', tags: p.tags || [], curated: false }));

const all = curated.concat(osm);
const map = new Map(all.map((p) => [p.id, p]));

module.exports = {
  all, curated, osm,
  byId: (id) => map.get(id),
  counts: { curated: curated.length, osm: osm.length, total: all.length },
};
