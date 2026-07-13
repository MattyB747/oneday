'use strict';

// Bootstrap only: wire config → express → routes → listen. Keep this thin.
const path = require('path');
const express = require('express');
const config = require('./config');
const weather = require('./services/weather');

const app = express();
app.use(express.json({ limit: '256kb' }));

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.get('/health', (_req, res) => res.json({ ok: true, app: 'oneday', ai: config.hasAI() }));

// Proof-of-life: live Cape Town weather via the free adapter (M0).
app.get('/api/weather', async (_req, res) => {
  try {
    const f = await weather.forecast(config.CAPE_TOWN.lat, config.CAPE_TOWN.lon, 3);
    res.json(f);
  } catch (err) {
    res.status(502).json({ error: 'weather unavailable', detail: String(err && err.message) });
  }
});

// Trip setup + optimisation routes.
app.use('/', require('./routes/trip'));
app.use('/', require('./routes/plan'));
app.use('/', require('./routes/scores'));
app.use('/', require('./routes/today'));

app.use(express.static(PUBLIC_DIR, { index: false, setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') }));
app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(config.PORT, () => {
  console.log(`Best Day [${config.NODE_ENV}] on :${config.PORT} (AI: ${config.hasAI() ? 'on' : 'off — rule-based'})`);
});

module.exports = app;
