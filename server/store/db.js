'use strict';

// Layer 9/10 CAPTURE — a durable, append-only event stream. This is the moat: every
// recommendation shown and every outcome (added / dropped / weaved / exported) is stored,
// so over time OneDay knows what makes a great day, for whom, under which conditions —
// data nobody can buy. Uses Postgres when DATABASE_URL is set (Railway), else buffers in
// memory for dev. Best-effort: capture never blocks or breaks a request.

let pool = null;
let ready = false;
const mem = [];
const HAS_DB = !!process.env.DATABASE_URL;

async function init() {
  if (!HAS_DB) { console.log('[store] no DATABASE_URL — capturing to memory only (add a Railway Postgres to persist the moat)'); return; }
  try {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 4 });
    await pool.query(`CREATE TABLE IF NOT EXISTS events (
      id      BIGSERIAL PRIMARY KEY,
      ts      TIMESTAMPTZ NOT NULL DEFAULT now(),
      session TEXT,
      kind    TEXT NOT NULL,
      payload JSONB
    )`);
    await pool.query('CREATE INDEX IF NOT EXISTS events_kind_ts ON events (kind, ts DESC)');
    ready = true;
    console.log('[store] Postgres capture ready');
  } catch (e) { console.log('[store] Postgres init failed — capturing to memory:', e.message); }
}

// Fire-and-forget append. kind e.g. 'recommendations_shown' | 'place_added' | 'weave' | 'export'.
function capture(kind, session, payload) {
  const k = String(kind || 'unknown').slice(0, 48);
  const s = session ? String(session).slice(0, 64) : null;
  const p = payload && typeof payload === 'object' ? payload : {};
  if (ready && pool) {
    pool.query('INSERT INTO events (session, kind, payload) VALUES ($1,$2,$3)', [s, k, p]).catch(() => {});
  } else {
    mem.push({ ts: new Date().toISOString(), session: s, kind: k, payload: p });
    if (mem.length > 5000) mem.shift();
  }
}

async function stats() {
  if (ready && pool) {
    try {
      const [byKind, total] = await Promise.all([
        pool.query('SELECT kind, count(*)::int AS n FROM events GROUP BY kind ORDER BY n DESC'),
        pool.query('SELECT count(*)::int AS n FROM events'),
      ]);
      return { store: 'postgres', total: total.rows[0].n, byKind: byKind.rows };
    } catch (e) { return { store: 'postgres', error: e.message }; }
  }
  const byKind = {}; mem.forEach((e) => { byKind[e.kind] = (byKind[e.kind] || 0) + 1; });
  return { store: 'memory', total: mem.length, byKind };
}

module.exports = { init, capture, stats };
