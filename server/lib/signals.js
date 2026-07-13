'use strict';

// The decision-object engine — the core of "data is the product". Every source
// (weather, tide, trending, sightings, events, traffic…) normalises into the SAME
// shape answering one question: does this make an experience better, worse, or
// different? The engine then weighs them into a Best Moment Score (0-100) and
// keeps the reasons, so nothing is a black box and any new source just plugs in.
//
// DecisionObject: { source, effect:'positive'|'negative', magnitude:0..1, text }

const { distanceKm } = require('./geo');

function obj(source, effect, magnitude, text) { return { source, effect, magnitude: Math.max(0, Math.min(1, magnitude)), text }; }

// Build the decision objects for one attraction given the day's context.
// context: { weather, tide, trending:{trend,views}, sightings:[{name,place,dist,common}] }
function signalsFor(attr, ctx) {
  const out = [];
  const w = ctx.weather || {};

  // WEATHER — matched to the attraction's own sensitivities.
  const wind = w.maxWindKmh || 0, rain = w.rainProb || 0;
  if (attr.wind >= 0.6 && wind >= 35) out.push(obj('wind', 'negative', attr.wind * Math.min(1, wind / 60), `Strong wind (${Math.round(wind)} km/h) — rough for ${attr.name}${attr.id === 'table-mountain' ? ' (cableway often closes)' : ''}.`));
  else if (attr.outdoor && wind < 15) out.push(obj('wind', 'positive', 0.3, `Light wind (${Math.round(wind)} km/h) — calm conditions.`));
  if (attr.rain >= 0.4 && rain >= 50) out.push(obj('rain', 'negative', attr.rain * (rain / 100), `Rain likely (${rain}%) — an outdoor visit will be wet.`));
  else if (attr.outdoor && rain < 20) out.push(obj('rain', 'positive', 0.25, `Dry day (${rain}% rain).`));
  if (attr.cloud >= 0.7 && w.maxTempC != null) { /* viewpoints: clear skies matter — proxy via low rain/wind already captured */ }
  if (!attr.outdoor && rain >= 50) out.push(obj('indoor', 'positive', 0.4, `Indoor — perfect for a wet day (${rain}% rain).`));

  // TIDE — a DAYLIGHT low tide is a plus for beaches/tidal pools (a 2am low is useless).
  if (ctx.tide && ctx.tide.lows && /beach|tide/.test(attr.category + attr.tags.join())) {
    const day = ctx.tide.lows.find((l) => l.hour >= 8 && l.hour <= 17);
    if (day) out.push(obj('tide', 'positive', 0.3, `Low tide around ${day.hhmm} — widest, firmest sand for a walk (approx.).`));
  }

  // TRENDING — Wikipedia pageview momentum = real interest right now.
  if (ctx.trending && ctx.trending.trend != null) {
    if (ctx.trending.trend > 0.25) out.push(obj('trending', 'positive', Math.min(0.5, ctx.trending.trend), `Trending — searches for ${attr.name} are up ${Math.round(ctx.trending.trend * 100)}% this week.`));
    else if (ctx.trending.trend < -0.2) out.push(obj('trending', 'negative', 0.15, `Quieter than usual — interest is down this week (fewer crowds).`));
  }

  // LIVE WILDLIFE — real recent iNaturalist sightings near a nature/marine spot.
  (ctx.sightings || []).forEach((s) => {
    out.push(obj('wildlife', 'positive', 0.4, `${s.common} spotted near ${attr.name} on ${s.date} — nature is active here right now.`));
  });

  return out;
}

// Aggregate signals → a 0-100 Best Moment Score + the ranked reasons. Positives
// have diminishing returns (the 3rd good thing matters less than the 1st) so scores
// actually spread out and differentiate; a negative bites harder (it's a reason to
// avoid). This is what lets "today 92 vs tomorrow 54" mean something.
function scoreFrom(signals) {
  let score = 55; // neutral baseline — an ordinary moment
  const pos = signals.filter((s) => s.effect === 'positive').sort((a, b) => b.magnitude - a.magnitude);
  const neg = signals.filter((s) => s.effect === 'negative');
  pos.forEach((s, i) => { score += s.magnitude * 26 * Math.pow(0.6, i); }); // diminishing returns
  neg.forEach((s) => { score -= s.magnitude * 34; });                        // negatives bite
  score = Math.round(Math.max(2, Math.min(99, score)));
  const reasons = signals.slice().sort((a, b) => b.magnitude - a.magnitude);
  return { score, reasons };
}

function scoreAttraction(attr, ctx) { return scoreFrom(signalsFor(attr, ctx)); }

module.exports = { signalsFor, scoreFrom, scoreAttraction, distanceKm };
