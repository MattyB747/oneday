'use strict';

// Turn a place/suburb/hotel name into coordinates. Open-Meteo's geocoding API is
// free and needs NO key. Falls back to Cape Town centre so setup never blocks.
const https = require('https');
const { CAPE_TOWN } = require('../config');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function geocode(query) {
  const q = String(query || '').trim();
  if (!q) return { ...CAPE_TOWN, label: 'Cape Town', approximate: true };
  try {
    const data = await getJson('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=' + encodeURIComponent(q));
    const hit = data && data.results && data.results[0];
    if (hit) return { lat: hit.latitude, lon: hit.longitude, label: [hit.name, hit.admin1].filter(Boolean).join(', ') };
  } catch (_) { /* fall through */ }
  return { ...CAPE_TOWN, label: q + ' (approx.)', approximate: true };
}

module.exports = { geocode };
