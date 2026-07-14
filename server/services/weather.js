'use strict';

// Weather adapter — the first real live feed. Open-Meteo is free and needs NO API
// key. Gives hourly temperature, wind, cloud, rain/precip probability, plus daily
// sunrise/sunset. This is the biggest single driver of Cape Town itinerary
// decisions (wind kills Table Mountain, rain kills beaches, etc.).
//
// Returns a normalised shape the scoring engine reads. All values are LIVE data.

const https = require('https');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); return reject(new Error('weather HTTP ' + res.statusCode)); }
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// forecast(lat, lon, days) -> { source, fetchedAt, days: [{ date, sunrise, sunset, hours: [...] }] }
async function forecast(lat, lon, days = 5) {
  const params = new URLSearchParams({
    latitude: String(lat), longitude: String(lon), timezone: 'auto',
    forecast_days: String(Math.min(Math.max(days, 1), 16)),
    hourly: 'temperature_2m,precipitation_probability,precipitation,cloud_cover,wind_speed_10m',
    daily: 'sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max',
  });
  const data = await getJson('https://api.open-meteo.com/v1/forecast?' + params.toString());

  const h = data.hourly || {};
  const byDate = new Map();
  (h.time || []).forEach((t, i) => {
    const date = t.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push({
      time: t,
      hour: Number(t.slice(11, 13)),
      tempC: h.temperature_2m ? h.temperature_2m[i] : null,
      rainProb: h.precipitation_probability ? h.precipitation_probability[i] : null,
      rainMm: h.precipitation ? h.precipitation[i] : null,
      cloudPct: h.cloud_cover ? h.cloud_cover[i] : null,
      windKmh: h.wind_speed_10m ? h.wind_speed_10m[i] : null,
    });
  });

  const d = data.daily || {};
  const outDays = (d.time || []).map((date, i) => ({
    date,
    sunrise: d.sunrise ? d.sunrise[i] : null,
    sunset: d.sunset ? d.sunset[i] : null,
    maxTempC: d.temperature_2m_max ? d.temperature_2m_max[i] : null,
    minTempC: d.temperature_2m_min ? d.temperature_2m_min[i] : null,
    maxRainProb: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null,
    maxWindKmh: d.wind_speed_10m_max ? d.wind_speed_10m_max[i] : null,
    windDir: d.wind_direction_10m_dominant ? d.wind_direction_10m_dominant[i] : null,
    uvMax: d.uv_index_max ? d.uv_index_max[i] : null,
    hours: byDate.get(date) || [],
  }));

  return { source: 'open-meteo', kind: 'live', fetchedAt: Date.now(), timezone: data.timezone, days: outDays };
}

module.exports = { forecast };
