'use strict';

// Tide times — first-class for the optimiser (beach walks want LOW tide). If a
// tide API key is later configured this adapter swaps to real data; for now it
// returns an APPROXIMATE semidiurnal model for Cape Town so the constraint logic
// works and is demonstrable. Everything is tagged kind:'approximate' so the UI is
// honest until a real feed (Stormglass/WorldTides/SA Navy tables) is wired.
//
// Cape Town tides are semidiurnal: 2 highs + 2 lows per lunar day (~24h50m), so
// successive lows are ~12h25m apart and drift ~50 min later each calendar day.

const LUNAR_HALF_MS = 12.42 * 3600 * 1000;           // ~12h25m between lows
// Reference low tide (approx, SAST). Only the phase matters for the model.
const EPOCH_LOW = Date.UTC(2026, 0, 1, 0, 30) - 2 * 3600 * 1000; // 02:30 SAST on 2026-01-01

// Low tides (as Date objects, local-ish) intersecting a given calendar date.
function lowTidesForDate(dateStr) {
  const dayStart = new Date(dateStr + 'T00:00:00+02:00').getTime();
  const dayEnd = dayStart + 24 * 3600 * 1000;
  // First low at/after dayStart:
  const k = Math.ceil((dayStart - EPOCH_LOW) / LUNAR_HALF_MS);
  const lows = [];
  for (let i = k; ; i++) {
    const t = EPOCH_LOW + i * LUNAR_HALF_MS;
    if (t >= dayEnd) break;
    if (t >= dayStart) lows.push(new Date(t));
  }
  return lows;
}

// Public: { kind, lows: [{ time, hhmm, hour }], summary } for a date.
function forDate(dateStr) {
  const lows = lowTidesForDate(dateStr).map((d) => {
    const hh = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Johannesburg' });
    return { time: d.toISOString(), hhmm: hh, hour: Number(hh.slice(0, 2)) + Number(hh.slice(3)) / 60 };
  });
  return { kind: 'approximate', lows, summary: lows.length ? `Low tides ~${lows.map((l) => l.hhmm).join(' & ')}` : 'No low tide in daylight' };
}

module.exports = { forDate };
