'use strict';

// Enrichment stage: fetch a real licensed Wikimedia hero photo for every attraction
// once, and cache it to server/data/images.json so the immersive gallery is fast
// (no per-request Wikipedia calls). Re-run when the attraction list changes.
// Run:  node server/ingest/enrich-images.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const { attractions } = require('../data/attractions');
const WIKI = require('../data/wiki');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'OneDay/0.1 (cape town concierge)' } }, (res) => {
      let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (_) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

async function imageFor(title) {
  if (!title) return null;
  const d = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
  return (d && ((d.originalimage && d.originalimage.source) || (d.thumbnail && d.thumbnail.source))) || null;
}

async function main() {
  const out = {};
  let hit = 0;
  for (const a of attractions) {
    const url = await imageFor(WIKI[a.id]);
    out[a.id] = url;
    if (url) hit++;
    console.log(`${url ? '✓' : '·'} ${a.id}`);
    await new Promise((r) => setTimeout(r, 150)); // be polite to Wikipedia
  }
  const file = path.join(__dirname, '..', 'data', 'images.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 0));
  console.log(`\n${hit}/${attractions.length} attractions have a hero image → ${path.relative(process.cwd(), file)}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
