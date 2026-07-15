'use strict';

// Stage 1 of the data mechanism: HARVEST. Pulls thousands of real Cape Town places
// from OpenStreetMap (Overpass API — free, keyless) and normalises them into our
// canonical place schema. Sensitivity to wind/rain/cloud/tide and a best-time guess
// are DERIVED from each place's category — not hand-typed. This is the breadth
// layer; enrichment (Wikipedia text/images) and the LLM "why/when" pass sit on top.
//
// Run:  node server/ingest/harvest-osm.js  ->  writes server/data/places.osm.json

const fs = require('fs');
const path = require('path');
const https = require('https');

// Greater Cape Town bbox (peninsula + into the Winelands): S,W,N,E
const BBOX = '-34.40,18.30,-33.80,19.05';

// Which OSM tags we ingest, and how each maps into our schema. Each rule sets a
// category + physical sensitivity profile that the decision engine already speaks.
// sens: [outdoor, wind, rain, cloud, tideMatters, best]. High-signal VISITOR categories
// only — we skip the noisy/huge ones (every restaurant/cafe/bar, generic historic) which
// add volume but little value without ratings. Curated data covers food already.
const RULES = [
  ['tourism=attraction',       'attraction',[true, 0.4, 0.6, 0.4, 0, 'any']],
  ['tourism=viewpoint',        'viewpoint', [true, 0.6, 0.7, 0.9, 0, 'any']],
  ['tourism=museum',           'culture',   [false,0.0, 0.0, 0.0, 0, 'any']],
  ['tourism=gallery',          'art',       [false,0.0, 0.0, 0.0, 0, 'any']],
  ['tourism=zoo',              'wildlife',  [true, 0.2, 0.5, 0.1, 0, 'morning']],
  ['tourism=theme_park',       'family',    [true, 0.3, 0.6, 0.2, 0, 'any']],
  ['tourism=artwork',          'art',       [true, 0.2, 0.4, 0.1, 0, 'any']],
  ['natural=beach',            'beach',     [true, 0.8, 0.7, 0.3, 1, 'afternoon']],
  ['natural=peak',             'hike',      [true, 0.8, 0.8, 0.9, 0, 'morning']],
  ['leisure=garden',           'garden',    [true, 0.2, 0.6, 0.1, 0, 'morning']],
  ['leisure=nature_reserve',   'nature',    [true, 0.5, 0.7, 0.5, 0, 'morning']],
  ['amenity=winery',           'wine',      [true, 0.2, 0.4, 0.1, 0, 'afternoon']],
  ['craft=winery',             'wine',      [true, 0.2, 0.4, 0.1, 0, 'afternoon']],
  ['historic=castle',          'history',   [true, 0.2, 0.4, 0.2, 0, 'any']],
  ['historic=monument',        'history',   [true, 0.2, 0.4, 0.2, 0, 'any']],
];
// Scenic/quality prior per category (a rough popularity proxy until real ratings).
const SCENIC = { viewpoint: 0.8, beach: 0.75, hike: 0.75, wine: 0.7, nature: 0.7, wildlife: 0.7, garden: 0.65, attraction: 0.6, art: 0.55, culture: 0.55, family: 0.55, history: 0.55 };
const REGION_DISPLAY = { city: 'City Bowl', atlantic: 'Atlantic Seaboard', falsebay: 'False Bay', peninsula: 'Cape Peninsula', constantia: 'Constantia', winelands: 'Winelands' };

// Rough sub-region assignment by coordinate box (so places land in the right day
// cluster — the same real geography the itinerary uses).
const REGION_BOXES = [
  ['winelands',  -34.10, 18.66, -33.60, 19.10],
  ['falsebay',   -34.25, 18.42, -34.02, 18.52],
  ['peninsula',  -34.40, 18.30, -34.02, 18.46],
  ['constantia', -34.05, 18.40, -33.96, 18.48],
  ['atlantic',   -34.02, 18.34, -33.86, 18.43],
  ['city',       -33.96, 18.39, -33.88, 18.48],
];
function regionOf(lat, lon) {
  for (const [key, s, w, n, e] of REGION_BOXES) if (lat >= s && lat <= n && lon >= w && lon <= e) return key;
  return 'city';
}

// Public Overpass mirrors — we rotate on busy/timeout (the main server is often busy).
const MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function post(url, query) {
  const body = 'data=' + encodeURIComponent(query);
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body), 'User-Agent': 'OneDay/harvest' } },
      (res) => { let d = ''; res.on('data', (c) => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d })); });
    req.on('error', reject); req.setTimeout(120000, () => req.destroy(new Error('socket timeout'))); req.write(body); req.end();
  });
}

// Run a query with mirror rotation + backoff. Returns parsed elements or throws.
async function overpass(query) {
  let lastErr;
  for (let attempt = 0; attempt < 10; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length];
    try {
      const { status, body } = await post(url, query);
      if (status === 200 && body.trim().startsWith('{')) return (JSON.parse(body).elements || []);
      lastErr = new Error(`HTTP ${status} from ${url}: ${body.slice(0, 100).replace(/\s+/g, ' ')}`);
    } catch (e) { lastErr = e; }
    await sleep(2000 * (attempt + 1)); // longer backoff for busy mirrors
  }
  throw lastErr;
}

// One small query per selector group (keeps each request light so busy mirrors cope).
function buildQuery(rules) {
  const clauses = rules.map(([sel]) => {
    const [k, v] = sel.split('=');
    const tag = v === '*' ? `["${k}"]` : `["${k}"="${v}"]`;
    return `  node${tag}(${BBOX});\n  way${tag}(${BBOX});`;
  }).join('\n');
  return `[out:json][timeout:90];\n(\n${clauses}\n);\nout tags center 4000;`;
}

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

function normalise(el) {
  const t = el.tags || {};
  if (!t.name) return null;
  const lat = el.lat ?? (el.center && el.center.lat);
  const lon = el.lon ?? (el.center && el.center.lon);
  if (lat == null || lon == null) return null;
  // First matching rule wins.
  let cat = 'attraction', sens = [true, 0.4, 0.6, 0.3, 0, 'any'];
  for (const [sel, category, profile] of RULES) {
    const [k, v] = sel.split('=');
    if (t[k] != null && (v === '*' || t[k] === v)) { cat = category; sens = profile; break; }
  }
  const [outdoor, wind, rain, cloud, tide, best] = sens;
  const isSunset = /sunset|sundowner/i.test(t.name) || (cat === 'viewpoint' && lon < 18.42);
  const region = regionOf(lat, lon);
  const website = t.website || t['contact:website'] || null;
  const wikidata = t.wikidata || null;
  // Popularity proxy: category prior, nudged up if OSM has a Wikidata link or website.
  let scenic = SCENIC[cat] || 0.5;
  if (wikidata) scenic += 0.15;
  if (website) scenic += 0.05;
  scenic = Math.min(0.98, scenic);
  return {
    id: 'osm-' + slug(t.name) + '-' + String(el.id).slice(-4),
    name: t.name, category: cat, region, area: REGION_DISPLAY[region] || region,
    lat: +lat.toFixed(5), lon: +lon.toFixed(5),
    outdoor, wind, rain, cloud, tideMatters: !!tide, best: isSunset ? 'sunset' : best,
    scenic: +scenic.toFixed(2), blurb: '', website, wikidata,
    openingHours: t.opening_hours || null, source: 'osm', osmId: el.id,
  };
}

// Keep quality places: named, and either a scenic category or backed by Wikidata/website.
const JUNK = /^(bench|toilet|parking|atm|bus|taxi|viewpoint$)/i;
function isQuality(p) {
  if (!p.name || p.name.length < 3 || JUNK.test(p.name)) return false;
  return p.scenic >= 0.6 || p.wikidata || p.website;
}

// Split the rules into small batches so each Overpass request stays light.
function chunk(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }

async function main() {
  const batches = chunk(RULES, 3);
  console.log(`Harvesting greater Cape Town in ${batches.length} batches…`);
  const raw = [];
  const failed = [];
  for (let i = 0; i < batches.length; i++) {
    try {
      const els = await overpass(buildQuery(batches[i]));
      raw.push(...els);
      console.log(`  batch ${i + 1}/${batches.length}: +${els.length} (total ${raw.length})`);
    } catch (e) {
      failed.push(i + 1);
      console.log(`  batch ${i + 1}/${batches.length}: FAILED (${e.message}) — skipping, keeping partial`);
    }
    await sleep(1200); // be polite to the mirrors
  }
  if (failed.length) console.log(`\n⚠ batches ${failed.join(',')} failed (busy mirrors) — re-run to fill them in.`);
  const seen = new Set();
  const places = [];
  for (const el of raw) {
    const p = normalise(el);
    if (!p || !isQuality(p)) continue;
    const dedupe = p.name.toLowerCase() + '|' + p.region;
    if (seen.has(dedupe)) continue; // drop node+way duplicates of the same place
    seen.add(dedupe);
    places.push(p);
  }
  places.sort((a, b) => b.scenic - a.scenic);
  const out = path.join(__dirname, '..', 'data', 'places-osm.json');
  fs.writeFileSync(out, JSON.stringify(places, null, 0));
  // Report
  const byCat = {}, byRegion = {};
  places.forEach((p) => { byCat[p.category] = (byCat[p.category] || 0) + 1; byRegion[p.region] = (byRegion[p.region] || 0) + 1; });
  console.log(`\nHarvested ${raw.length} raw → ${places.length} named, de-duped places → ${path.relative(process.cwd(), out)}`);
  console.log('By category:', JSON.stringify(byCat));
  console.log('By region:  ', JSON.stringify(byRegion));
}

if (require.main === module) main().catch((e) => { console.error('Harvest failed:', e.message); process.exit(1); });
module.exports = { normalise, regionOf };
