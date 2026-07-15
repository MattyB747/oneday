'use strict';

// The canonical data model — the platform spine. Every source normalises into these
// factory functions so the rest of the system speaks ONE language. See docs/DATA-MODEL.md.
// Adding a source = writing an adapter that emits these objects; nothing downstream changes.

const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const prov = (source, sourceId, confidence = 0.8) => ({ source, sourceId: sourceId != null ? String(sourceId) : null, fetchedAt: Date.now(), confidence });

// A physical location.
function Place(o) {
  return {
    type: 'place',
    id: o.id || `${o.source || 'x'}:${slug(o.name)}`,
    name: o.name, kind: o.kind || 'attraction',
    lat: o.lat != null ? +o.lat : null, lon: o.lon != null ? +o.lon : null,
    area: o.area || null, region: o.region || null,
    tags: o.tags || [], image: o.image || null, about: o.about || null,
    links: { web: (o.links && o.links.web) || o.website || null, book: (o.links && o.links.book) || o.bookUrl || null },
    provenance: prov(o.source, o.sourceId, o.confidence),
  };
}

// Something you DO (often bookable) at/near a Place.
function Experience(o) {
  return {
    type: 'experience', id: o.id || `${o.source || 'x'}:exp:${slug(o.title)}`,
    placeId: o.placeId || null, title: o.title, category: o.category || null,
    durationMin: o.durationMin || null, priceFrom: o.priceFrom || null,
    provider: o.provider || null, bookUrl: o.bookUrl || null,
    provenance: prov(o.source, o.sourceId, o.confidence),
  };
}

// A time-bound happening.
function Event(o) {
  return {
    type: 'event', id: o.id || `${o.source || 'x'}:evt:${slug(o.title)}:${o.start || ''}`,
    title: o.title, category: o.category || 'event', placeId: o.placeId || null, where: o.where || null,
    area: o.area || null, region: o.region || null,
    start: o.start || null, end: o.end || null, recurrence: o.recurrence || null,
    ticketUrl: o.ticketUrl || null, note: o.note || null,
    provenance: prov(o.source, o.sourceId, o.confidence),
  };
}

// A time+place environmental / context reading (weather, tide, closure, traffic…).
function Condition(o) {
  return {
    type: 'condition', kind: o.kind, ref: o.ref || 'region', at: o.at || Date.now(),
    value: o.value != null ? o.value : null, unit: o.unit || null, text: o.text || null,
    effect: o.effect || null, magnitude: o.magnitude != null ? o.magnitude : null,
    provenance: prov(o.source, o.sourceId, o.confidence),
  };
}

// A commercial opportunity.
function Offer(o) {
  return {
    type: 'offer', id: o.id || `${o.source || 'x'}:offer:${slug(o.title)}`,
    placeId: o.placeId || null, title: o.title, kind: o.kind || 'special',
    validFrom: o.validFrom || null, validTo: o.validTo || null, price: o.price || null,
    provenance: prov(o.source, o.sourceId, o.confidence),
  };
}

// Travel between two Places (traffic-aware when the source supports it).
function Journey(o) {
  return {
    type: 'journey', fromPlaceId: o.fromPlaceId, toPlaceId: o.toPlaceId,
    mode: o.mode || 'driving', durationMin: o.durationMin || null, distanceKm: o.distanceKm || null,
    at: o.at || null, provenance: prov(o.source, o.sourceId, o.confidence),
  };
}

// A time-specific OPPORTUNITY — the decision unit ("great whale morning today").
function Moment(o) {
  return {
    type: 'moment', id: o.id || `${o.source || 'x'}:mom:${slug(o.title)}`,
    title: o.title, why: o.why || null, window: o.window || null, placeRefs: o.placeRefs || [],
    effect: o.effect || 'positive', magnitude: o.magnitude != null ? o.magnitude : 0.5,
    sources: o.sources || [o.source].filter(Boolean),
    provenance: prov(o.source, o.sourceId, o.confidence),
  };
}

module.exports = { Place, Experience, Event, Condition, Offer, Journey, Moment, slug, prov };
