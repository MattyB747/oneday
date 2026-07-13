# Tempo

AI destination optimiser for Cape Town. See `docs/VISION.md` for the full brief.

## Principles (carried from hard-won experience)
1. **Vertical slices.** Every milestone is demoable end-to-end. Never "all backend then all frontend."
2. **No god-files.** Any file over ~300 lines splits. One feature per module.
3. **Clean seams for external data.** Each data source (weather, events, tides, traffic…)
   lives behind a small adapter interface, so real feeds drop in without touching logic.
   Start with the ONE that drives the most decisions (weather), stub the rest.
4. **Explainable by design.** The scoring engine records *why* each score is what it is —
   the WHY button reads real reasons, never a black box.
5. **Label certainty.** Every datum is tagged live / historical / predicted.
6. **Tests are part of done.** The scoring + itinerary logic is pure and unit-tested.

## Stack (proven, minimal)
- **Backend:** Node 20 + Express + Socket.IO-free to start (simple REST). In-memory state
  behind a `store` seam (swap to a DB later without touching handlers).
- **Frontend:** Vanilla JS ES modules, mobile-first. No framework, no build step.
- **Live data (MVP):** [Open-Meteo](https://open-meteo.com) — free, **no API key**, gives
  hourly weather + wind + cloud + rain + marine + sunrise/sunset. This is the biggest
  itinerary driver, so it's the first real feed.
- **AI:** Claude API for natural-language itinerary edits + richer WHY explanations + chat.
  Wired behind an interface so the rule-based engine works WITHOUT a key, and AI enhances it
  when a key is present. (The core recommendation math is deterministic + free.)
- **Attractions:** a curated Cape Town dataset (`server/data/attractions.js`) with the
  metadata the engine needs: location, category, ideal conditions, duration, indoor/outdoor,
  best time of day, scenic value.

## Architecture
```
server/
  index.js            bootstrap only
  config.js           env (optional CLAUDE_API_KEY; degrades gracefully without it)
  data/               attractions.js  (curated Cape Town dataset)
  lib/                geo.js  scoring.js  (pure, unit-tested)
  services/           weather.js (Open-Meteo adapter)  trip.js (state)  itinerary.js
  routes/             trip.js (setup + feed + react + itinerary + why + rebuild)
public/
  index.html          the 4-question setup → discovery cards → itinerary
  app.css             mobile-first look
  js/
    app.js            entry: mount features
    core/             api.js  state.js  ui.js
    features/         setup.js  discover.js  itinerary.js  chat.js
```

## Milestones (each demoable)
- **M0** — Skeleton boots (Express serves the shell, /health, weather adapter returns live data).
- **M1** — The 4-question setup (people / days / stay / arrival) → trip created in seconds.
- **M2** — Live data kicks in: fetch weather for the stay + show a "what's happening" summary.
- **M3** — Discovery cards + LOVE/MAYBE/NOT reactions → preference profile builds from behaviour.
- **M4** — Scoring engine ranks attractions (weather-fit + preference + travel efficiency),
  each with a real WHY.
- **M5** — Generate a day-by-day itinerary into the best time slots.
- **M6** — Continuous re-optimise ("we found a better option") + REBUILD TODAY.
- **M7** — Natural-language AI edits ("find a hidden beach", "more wine", "slower tomorrow").
- **M8** — Polish, PWA, deploy. Then: more data feeds (events, tides, traffic), partners.

## Run
```
PORT=4000 node server/index.js
```
