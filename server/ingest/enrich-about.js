'use strict';

// Enrichment: pull a short factual blurb / history for each place from the Wikipedia
// REST summary (free, keyless) → server/data/about.json. Powers the "curate the
// trip" touch — e.g. tapping Chapman's Peak shows a line of real history.
// Run:  node server/ingest/enrich-about.js

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

// Trim to ~2 sentences so it reads as a caption, not an essay.
function twoSentences(text) {
  if (!text) return null;
  const parts = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/);
  return parts.slice(0, 2).join(' ');
}

async function main() {
  const out = {}; let hit = 0;
  for (const a of attractions) {
    const title = WIKI[a.id];
    const d = title ? await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`) : null;
    const about = d && !d.type?.includes('not_found') ? twoSentences(d.extract) : null;
    out[a.id] = about;
    if (about) hit++;
    console.log(`${about ? '✓' : '·'} ${a.id}`);
    await new Promise((r) => setTimeout(r, 150));
  }
  const file = path.join(__dirname, '..', 'data', 'about.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 0));
  console.log(`\n${hit}/${attractions.length} places have a history blurb → ${path.relative(process.cwd(), file)}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
