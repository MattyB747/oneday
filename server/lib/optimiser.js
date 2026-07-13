'use strict';

// The constraint optimiser — the heart of Best Day. Given where you're based, a set
// of days (each with weather + tides + sun times), and a basket of activity types,
// it anchors each activity to its best time + place using constraints, then builds
// each day around the anchors. Every placement records a real WHY (the factors
// that drove the day/time/place choice) — never a black box. Pure + deterministic.

const { distanceKm } = require('./geo');
const attractionsData = require('../data/attractions');
const activitiesData = require('../data/activities');

// --- constraint helpers ---
const PEAK = (h) => (h >= 7 && h < 9) || (h >= 16.5 && h < 18);           // traffic peaks
const TRAFFIC_AREAS = new Set(['Atlantic Seaboard', 'City Bowl', 'Southern Suburbs']); // clog to/from the CBD at peak
const hhmm = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const sunHour = (iso) => { try { const d = new Date(iso); return d.getUTCHours() + 2 + d.getUTCMinutes() / 60; } catch (_) { return null; } }; // SAST

// Scheduling rigidity — most-constrained first so anchors land before flexible fill.
const RIGIDITY = { lowtide: 0, sunset: 1, 'morning-lowwind': 2, morning: 3, afternoon: 4, flexible: 5 };

function daylightLows(day) {
  const rise = sunHour(day.weather && day.weather.sunrise) || 7;
  const set = sunHour(day.weather && day.weather.sunset) || 18;
  return (day.tides && day.tides.lows ? day.tides.lows : []).filter((l) => l.hour >= rise + 0.5 && l.hour <= set - 1);
}

// Pick which day an activity lands on (spreading load, matching weather to need).
function chooseDay(type, days, load) {
  const open = days.map((d, i) => ({ d, i })).filter(({ i }) => load[i] < 3);
  if (!open.length) return 0;
  const rain = (x) => (x.d.weather ? x.d.weather.rainProb : 0) || 0;
  const wind = (x) => (x.d.weather ? x.d.weather.maxWindKmh : 0) || 0;
  let pick;
  if (type.anchor === 'morning-lowwind') pick = open.slice().sort((a, b) => wind(a) - wind(b) || load[a.i] - load[b.i])[0];
  else if (type.anchor === 'flexible') pick = open.slice().sort((a, b) => rain(b) - rain(a) || load[a.i] - load[b.i])[0]; // indoor/flexible on the wettest day
  else if (type.anchor === 'lowtide') pick = open.slice().sort((a, b) => (daylightLows(b.d).length - daylightLows(a.d).length) || load[a.i] - load[b.i] || rain(a) - rain(b))[0];
  else pick = open.slice().sort((a, b) => load[a.i] - load[b.i] || rain(a) - rain(b))[0]; // spread across days first, then prefer clear
  return pick.i;
}

// Choose the best beach for a low-tide walk — the flagship constraint case.
function chooseBeachWalk(base, day) {
  const A = attractionsData;
  const lows = daylightLows(day);
  const cands = activitiesData.byId('beach-walk').candidates.map((id) => A.byId(id)).filter(Boolean);
  if (!lows.length) {
    const nearest = cands.slice().sort((a, b) => distanceKm(base, a) - distanceKm(base, b))[0];
    return { attraction: nearest, hour: 11, why: ['No daytime low tide today, so the walk is less about the tide — picked the closest good beach.'] };
  }
  let best = null;
  for (const low of lows) {
    for (const beach of cands) {
      const dist = distanceKm(base, beach);
      const clash = PEAK(low.hour) && TRAFFIC_AREAS.has(beach.area);
      const score = dist + (clash ? 30 : 0) - beach.scenic * 3;
      if (!best || score < best.score) best = { beach, low, dist, clash, score };
    }
  }
  const nearest = cands.slice().sort((a, b) => distanceKm(base, a) - distanceKm(base, b))[0];
  const why = [`Low tide around ${best.low.hhmm} — the sand is widest and firmest for a walk then.`];
  if (best.beach.id !== nearest.id) {
    const nearLowClash = PEAK(best.low.hour) && TRAFFIC_AREAS.has(nearest.area);
    why.push(nearLowClash
      ? `${nearest.name} is closer (${Math.round(distanceKm(base, nearest))} km) but that low tide falls in the traffic peak — ${best.beach.name} (${Math.round(best.dist)} km) is an easy run at ${best.low.hhmm} and a spectacular low-tide beach.`
      : `${best.beach.name} (${Math.round(best.dist)} km) is the best low-tide walk that fits your base and the tide.`);
  } else {
    why.push(`${best.beach.name} is ${Math.round(best.dist)} km from your base — closest good low-tide beach.`);
  }
  return { attraction: best.beach, hour: Math.max(9, Math.min(best.low.hour, 16)), why };
}

// Choose attraction + time for a non-beach activity.
function schedule(type, base, day) {
  const A = attractionsData;
  if (type.anchor === 'lowtide') return chooseBeachWalk(base, day);

  const cands = type.candidates.map((id) => A.byId(id)).filter(Boolean);
  // Prefer the nearest suitable candidate (penalise wind-sensitive picks on windy days).
  const wind = (day.weather && day.weather.maxWindKmh) || 0;
  const pick = cands.slice().sort((a, b) =>
    (distanceKm(base, a) + a.wind * wind * 0.2) - (distanceKm(base, b) + b.wind * wind * 0.2))[0];
  const dist = Math.round(distanceKm(base, pick));
  const setH = sunHour(day.weather && day.weather.sunset) || 18;
  const why = [];
  let hour;
  if (type.anchor === 'sunset') { hour = Math.max(15, setH - pick.duration / 60); why.push(`Timed to end at sunset (${hhmm(setH)}) for the golden hour.`); }
  else if (type.anchor === 'morning-lowwind') { hour = 9; why.push(`Clear, calm morning (${Math.round(wind)} km/h — your lowest-wind day) before the wind picks up; the cableway is far more reliable in the morning.`); }
  else if (type.anchor === 'morning') { hour = 9; why.push('Early is better — softer light, fewer crowds and calmer conditions.'); }
  else if (type.anchor === 'afternoon') { hour = 14; why.push('A relaxed afternoon slot.'); }
  else { hour = 11; if (!pick.outdoor && (day.weather ? day.weather.rainProb : 0) >= 40) why.push('An indoor pick placed on your wettest day — stays great whatever the weather.'); else why.push('Flexible timing — slotted to balance the day.'); }
  why.push(`${pick.name} · ${dist} km from your base.`);
  return { attraction: pick, hour, why };
}

// Lay a single day's activities on a timeline so they don't overlap. Each starts
// at its ideal hour or after the previous one finishes (duration + ~30min travel),
// whichever is later. Adds a "shifted from Xh" note to the WHY when moved.
function packDay(slots, day) {
  slots.sort((a, b) => a.hour - b.hour);
  let cursor = null;
  for (const s of slots) {
    const ideal = s.hour;
    let start = cursor == null ? ideal : Math.max(ideal, cursor);
    if (start !== ideal && Math.abs(start - ideal) >= 0.5) s.why.push(`Shifted to ${hhmm(start)} so it doesn’t clash with your earlier stop (allowing travel time).`);
    s.hour = start; s.hhmm = hhmm(start);
    const durH = (s.attraction.duration || 90) / 60;
    cursor = start + durH + 0.5; // + ~30 min travel/transition buffer
  }
}

// Build the full plan.
function plan({ base, days, basket }) {
  const types = basket.map((id) => activitiesData.byId(id)).filter(Boolean)
    .sort((a, b) => (RIGIDITY[a.anchor] ?? 9) - (RIGIDITY[b.anchor] ?? 9));
  const load = days.map(() => 0);
  const slotsByDay = days.map(() => []);
  const notes = [];

  for (const type of types) {
    // Seasonal relevance note (still schedulable, just flagged).
    if (type.seasonalMonths) {
      const m = new Date(days[0].date + 'T12:00:00').getMonth() + 1;
      if (!type.seasonalMonths.includes(m)) notes.push(`${type.label} is best in season (${type.seasonalMonths.join(', ')}); included but conditions may be quieter.`);
    }
    const di = chooseDay(type, days, load);
    const s = schedule(type, base, days[di]);
    slotsByDay[di].push({ typeId: type.id, label: type.label, icon: type.icon, hour: s.hour, hhmm: hhmm(s.hour), attraction: { id: s.attraction.id, name: s.attraction.name, area: s.attraction.area, blurb: s.attraction.blurb, duration: s.attraction.duration }, why: s.why });
    load[di] += 1;
  }

  // Lay each day out on a real timeline: sort by ideal hour, then push each start
  // to clear the previous activity's duration + a travel buffer, so nothing stacks
  // at the same time. Sunset-anchored items keep their end-at-sunset intent.
  for (let i = 0; i < days.length; i++) packDay(slotsByDay[i], days[i]);

  const out = days.map((d, i) => ({
    date: d.date,
    label: new Date(d.date + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' }),
    weather: d.weather,
    slots: slotsByDay[i],
  })).filter((d) => d.slots.length);

  return { days: out, notes };
}

module.exports = { plan };
