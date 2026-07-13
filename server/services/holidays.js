'use strict';

// Public holidays via Nager.Date — free, no API key. Cached per year (holidays
// don't change mid-run). Used to flag holiday days in the briefing (crowds,
// closures, festive atmosphere).
const https = require('https');

const cache = new Map(); // year -> Map(YYYY-MM-DD -> name)

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => { let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
  });
}

async function forYear(year) {
  if (cache.has(year)) return cache.get(year);
  const map = new Map();
  try {
    const list = await getJson(`https://date.nager.at/api/v3/PublicHolidays/${year}/ZA`);
    (Array.isArray(list) ? list : []).forEach((h) => map.set(h.date, h.localName || h.name));
  } catch (_) { /* leave empty on failure — briefing still works */ }
  cache.set(year, map);
  return map;
}

// Returns holiday name for a YYYY-MM-DD, or null.
async function on(dateStr) {
  const year = Number(String(dateStr).slice(0, 4));
  const map = await forYear(year);
  return map.get(dateStr) || null;
}

module.exports = { on };
