'use strict';

// Hero images per attraction — Wikipedia REST "summary" gives a licensed Wikimedia
// Commons thumbnail (free, keyless). Cached in-process (images don't change).
const https = require('https');
const WIKI = require('../../data/wiki');

const cache = new Map(); // id -> url|null

function get(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'OneDay/0.1 (cape town concierge)' } }, (res) => {
      let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (_) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

async function forAttraction(id) {
  if (cache.has(id)) return cache.get(id);
  const title = WIKI[id];
  if (!title) { cache.set(id, null); return null; }
  const data = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
  const url = (data && ((data.originalimage && data.originalimage.source) || (data.thumbnail && data.thumbnail.source))) || null;
  cache.set(id, url);
  return url;
}

module.exports = { forAttraction };
