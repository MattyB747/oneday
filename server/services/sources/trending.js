'use strict';

// TRENDING signal — Wikipedia pageviews. What people are actually looking up right
// now is a real, free, keyless interest signal. We compare the last 3 days to the
// prior baseline; a rise = trending. Cached daily (pageviews update daily).
const https = require('https');

const WIKI = require('../../data/wiki'); // shared titles (trending + images)

const cache = new Map(); // id -> { day, trend, views }
const today = () => new Date().toISOString().slice(0, 10);

function get(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Best Day/0.1 (cape-town concierge)' } }, (res) => {
      let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (_) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

function ymd(d) { return d.toISOString().slice(0, 10).replace(/-/g, ''); }

async function trendFor(attrId) {
  const title = WIKI[attrId];
  if (!title) return null;
  const c = cache.get(attrId);
  if (c && c.day === today()) return c;
  const end = new Date(); const start = new Date(Date.now() - 14 * 864e5);
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${title}/daily/${ymd(start)}00/${ymd(end)}00`;
  const data = await get(url);
  const items = (data && data.items) || [];
  if (items.length < 7) { const r = { day: today(), trend: null, views: 0 }; cache.set(attrId, r); return r; }
  const views = items.map((i) => i.views);
  const recent = views.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const prior = views.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, views.length - 3);
  const trend = prior > 0 ? (recent - prior) / prior : 0;
  const r = { day: today(), trend, views: Math.round(recent) };
  cache.set(attrId, r);
  return r;
}

module.exports = { trendFor, hasWiki: (id) => !!WIKI[id] };
