# OneDay — Canonical Data Model

The platform's spine. **Every source — GetYourGuide, City of Cape Town, SAWS, Dineplan,
SANParks, a local market organiser, or our own captured history — maps into these same
core objects.** Once a source speaks this language, adding the 10th / 100th / 500th
provider is a small adapter, not a rebuild. This is the moat, not any single API.

## Provenance (on every object)
Every object carries where it came from, so we can trust, refresh, and rank it:
`source` (e.g. `osm`, `open-meteo`, `curated`, `getyourguide`, `coct`, `user`),
`sourceId`, `fetchedAt`, `confidence` (0–1).

## The core objects

| Object | What it is | Key fields |
|---|---|---|
| **Place** | A physical location | id, name, kind, lat, lon, area, region, tags[], image, about, links{web,book} |
| **Experience** | Something you *do* (often bookable) at/near a Place | id, placeId, title, category, durationMin, priceFrom, provider, bookUrl |
| **Event** | A time-bound happening | id, title, category, placeId?, where, start, end, recurrence, ticketUrl |
| **Condition** | A time+place environmental/context reading | kind (weather\|marine\|tide\|air\|traffic\|closure\|loadshedding), ref(region\|placeId), at, value, text |
| **Offer** | A commercial opportunity | id, placeId, title, kind (special\|availability\|discount), validFrom, validTo, price |
| **Journey** | Travel between two Places | fromPlaceId, toPlaceId, mode, durationMin, distanceKm, at (traffic-aware) |
| **Moment** | A time-specific *opportunity* (the decision unit) | id, title, why, window{start,end}, placeRefs[], effect, magnitude, sources[] |
| **UserPreference** | What a traveller likes / their context | userId, likes[], dislikes[], pace, budget, stayLat, stayLon |
| **Recommendation** | Something we suggested + why + the context we saw | id, userId, sessionId, at, targetType, targetId, score, reasons[], contextSnapshot |
| **Outcome** | What the user actually did (the gold) | recommendationId, sessionId, at, action (shown\|added\|removed\|weaved\|dropped\|exported\|booked\|skipped) |

## Relationships → the Destination Knowledge Graph
Objects link, so the engine reasons over structure, not rows. e.g.
`Place(Kalk Bay) —bestIn→ winter · —needs→ lowWind · —pairsWith→ Simon's Town ·
—near→ Olympia Bakery · —bestTime→ morning · —hosts→ Event(live music, Fri) ·
—historicalSatisfaction→ 0.96 · —avoidDuring→ Marathon`.
Moments are the time-sliced projection of the graph given today's Conditions.

## Adapter pattern
```
source adapter  ──fetch()──►  [canonical objects]  ──►  store / knowledge graph
                                                            │
                              Conditions + Preferences  ──► decision engine ──► "best use of today"
```
Each adapter (`server/model/adapters/*`) implements `fetch(ctx) -> {places?, events?,
conditions?, offers?, moments?}` and declares its `tier` (1–9) and `source`. A registry
lists them; the loader fans out, normalises, de-dupes by (name, ~coords), and merges.

## Capture (Layers 8–10) — start now, worthless to delay
Every Recommendation shown and every Outcome is appended to a durable event log
(`server/store` → Postgres `events` jsonb stream). Over time this becomes the
proprietary dataset — "Camps-Bay wine-lovers rate Kalk Bay Tuesday mornings highest" —
that nobody else can buy. It's the cheapest thing to start and impossible to backfill.
