'use strict';

// Air Quality + UV — Open-Meteo Air Quality API (free, no key). Feeds the "Air
// Quality: Good" live condition and a UV caution for beach/hike days.
const https = require('https');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => { let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (_) { resolve(null); } }); }).on('error', () => resolve(null));
  });
}

function aqiLabel(aqi) {
  if (aqi == null) return { label: 'Unknown', tone: 'muted' };
  if (aqi <= 50) return { label: 'Good', tone: 'good' };
  if (aqi <= 100) return { label: 'Moderate', tone: 'ok' };
  return { label: 'Poor', tone: 'bad' };
}

async function today(lat, lon) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi,uv_index&timezone=auto&forecast_days=1`;
  const d = await get(url);
  const h = (d && d.hourly) || {};
  const aqiArr = (h.us_aqi || []).filter((v) => v != null);
  const uvArr = (h.uv_index || []).filter((v) => v != null);
  const aqi = aqiArr.length ? Math.round(aqiArr.reduce((a, b) => Math.max(a, b), 0)) : null;
  const uv = uvArr.length ? Math.round(uvArr.reduce((a, b) => Math.max(a, b), 0)) : null;
  return { aqi, uv, ...aqiLabel(aqi) };
}

module.exports = { today };
