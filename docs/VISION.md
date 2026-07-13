# Best Day — AI Destination Optimiser

## v1.6 (2026-07-13) — PRODUCT ARCHITECTURE: organise by QUESTIONS
We replace ~20 apps (Google, TripAdvisor, Instagram, weather, maps, events,
bookings, Reddit, SANParks, tides…). The insight: don't organise by data source or
category — organise by the QUESTIONS a visitor actually asks. Every screen answers
ONE question and returns a confident decision (never raw data).

The home = a menu of questions:
- ⭐ Plan My Trip (3–7 days)          → BUILT ✅ (the itinerary, live on real data)
- 📍 What's Best Near Me? (few hours) → quick win: engine ranks nearby by
     best-moment-now, filtered to what fits the hours you have + travel time
- 🎉 What's Special Today?            → needs EVENTS feed (Ticketmaster+curated) +
     "only today" logic (whale spotted, market today, rare weather); half-buildable
     now (sightings/weather/seasonal), festivals need the events feed
- 🍷 Find Me Something I'll Love      → needs the PREFERENCE layer (LOVE/MAYBE/NOT)
- 🌅 Surprise Me                      → quick win: engine's single highest-scoring
     unexpected pick today + a "trust me" why

Never "here's weather" → instead "today is the best day this week for Table
Mountain." Never "here's events" → "a food festival 12 min away, once a year,
matches you." We transform disconnected sources into clear decisions.

**Build-readiness (honest):** Plan My Trip live; Surprise Me + What's Best Near Me
are quick wins on the existing engine; What's Special Today needs events; Find Me
Something I'll Love needs the preference layer. Next: question-oriented home + ship
the two quick-win questions, then events, then preferences.

## v1.5 (2026-07-13) — LOCKED: GLOBAL coordinate-native engine, Cape Town first
OneDay is NOT a Cape Town app — it's a global, location-aware experience engine
that launches in Cape Town. Built around COORDINATES, not city names. Every request
begins with { lat, lon, localTime, availableDuration }. Setup asks ONLY location
(no people count — dropped; group size only matters at booking).

Flow: detect location → identify city + timezone + currency → load GLOBAL baseline
data → load LOCAL data where available → find nearby candidates → score for the
time available → build the day → recalc continuously.

**Two coverage layers:**
- GLOBAL BASELINE (works anywhere): weather, AQI, daylight, places (OSM/Google),
  routes+traffic, global activities (GetYourGuide/Viator), major events
  (Ticketmaster), Wikipedia trending, iNaturalist wildlife, reviews. PROVEN working
  for Sydney (weather+wildlife+trending returned real data 2026-07-13).
- DESTINATION ENHANCEMENT (featured cities e.g. Cape Town): curated attractions,
  tides, local events/markets, road closures, transit status, booking integrations,
  seasonal patterns.

**Coverage rating (integrity):** each destination shows its honest data coverage
("Sydney: Excellent — live weather/traffic/events/transport" vs "Limited live-event
coverage — recommendations from places/weather/hours/travel"). Never imply data we
don't have.

**Auto-localisation on city change:** currency, language, units, timezone, transport
assumptions, booking partners, weather model, event providers, tipping/hours norms.

**Time-aware (drives frequent use, not just holidays):** 2 hours before a flight /
one day near the hotel / 3-day stay / "what's unusually good near me this weekend" /
business-trip evening ("finish 17:30 → one great dinner + one memorable thing").

**The one real bottleneck:** curated PLACES don't scale to every city by hand. Cape
Town is hand-curated (30 spots). Global coverage needs automatic place discovery via
**OpenStreetMap Overpass (free, worldwide)** + Google Places; featured cities keep
hand curation. The ENGINE (signals/scoring/optimiser/weather/AQI/trending/wildlife)
is already location-agnostic — only the DATA layer is Cape-Town-specific today.

**Next architecture step:** a `destination` layer (coords → city/tz/currency + which
data layer) + OSM global place discovery + the coverage rating. Then the same Today
engine runs anywhere. Brand: OneDay (oneday.capetown / oneday.sydney / …).

## v1.3 (2026-07-13) — LOCKED: auto-planned 3-persona "Trippies"
Replaces the manual basket picker. "Plan a Trippie" = pick number of days → Trippie
plans everything from ALL data → presents **3 complete plans** to choose from:
  1. **Tourist** — the big-ticket must-sees.
  2. **Local** — skip the tourist traps; how a local spends a fun few days.
  3. **Surprise me** (wildcard) — Trippie's "trust me" pick of the single best days
     from all data, ignoring persona.
User curates NOTHING — just picks a vibe. Each plan is a full day-by-day itinerary;
every stop shows **cost (ZAR, approx) · what it is · why it's best done then · how it
links to the next**. Curated AND sequenced from weather + tides + events + specials +
traffic. The sequencer (lib/optimiser.js) is reused; a new CURATION engine sits on top.

**Decisions locked:** 3rd plan = Surprise/wildcard. Narrative = rule-based now
(free, deterministic), add Claude persona-voice later (needs API key, pennies/plan).

**Build order (build-once):**
  1. Expand + persona-tag (tourist↔local) + COST the dataset (~60–80 spots incl. real
     local gems: coffee/food/live-music/neighbourhoods/hidden beaches).
  2. Curated events/specials seed + adapter (recurring markets, First Thursdays,
     festivals by date) → weave into plans; wire Ticketmaster (free) later.
  3. Curation engine — persona selection (balanced, non-repetitive, geo-sane) → feeds
     the sequencer.
  4. 3-plan UI: days → 3 plan cards → full itinerary (cost + linking narrative).
  5. Real free feeds (real tides, CoCT/SANParks/Cableway status) + AI narrative later.
The old basket picker (planner.js) is superseded by this.

## v1.2 (2026-07-13) — the real thesis: DATA is the product; recommend MOMENTS
Owner's key insight: **the data is the product; the AI just joins the dots.** Best
Day/Best Day becomes a data-aggregation platform continuously ingesting many free
sources, layered:
  L1 Government (City of Cape Town Open Data, SANParks, SA Weather Service,
     Hydrographic tides/sun/moon, environmental AQI/UV/fire) — the free gold.
  L2 Events (one giant calendar). L3 Nature (whales/penguins/surf/water temp —
     the unique layer). L4 Roads/traffic/rail/bus. L5 Food (Dineplan/specials).
  L6 Experiences (GetYourGuide/Viator affiliate = data + revenue). L7 Hotels.
  L8 Historical intelligence (store every day for years → AI discovers patterns,
     e.g. "Kalk Bay 09:00-11:00 rates 22% higher"). L9 Social signals (compliant
     APIs only). L10 Commercial (in-context deals: "you're in Kalk Bay — lunch, 20% off").

**Data model = "Decision Objects."** Don't treat sources as separate datasets.
Normalise every signal into one shape answering: *does this make an experience
better, worse, or different?* e.g. for Kalk Bay: sunny 22° = +, strong SE wind =
− (outdoor dining), low tide = + (rock pools), live jazz = + (if user likes music),
road closure = − (access), restaurant special = + (value), whale sighting = +
(nature). The engine weighs these vs the user's prefs → a **Best Moment Score**.

**We recommend MOMENTS, not attractions.** Not "go to Table Mountain" but
"Tue 07:15 Table Mountain — cloud inversion, low wind, quiet, perfect sunrise."
Plus a **live score per attraction** (Table Mountain: today 98/100 ✔perfect weather
✔no queue ✔light wind; tomorrow 61/100 ✗high wind ✗cloud ✗buses → go today).
The product answers not "what to do" but **"when is the BEST time to do it?"**

Name in the running: **Best Day** ("we help you have the best day possible, every
day you're here") — emotional, plain-English, captures the promise. (Rename is 1
command; not locked yet.)

Architecture already leans this way: adapters per source + a deterministic scoring
engine that records WHY. Next step = formalise signals as Decision Objects and add
the Best Moment Score + per-attraction live scores. See docs/DATA-SOURCES.md.

## Refined model (v1.1, 2026-07-13) — supersedes the setup/discovery flow below
Two layers:

**Layer 1 — Daily Briefing (dashboard).** Setup = ONE question: *where are you
staying* (or use my location). No people count, no day count. Then land in a
dashboard = a swipeable **card per day** (like Vapor's profile carousel), showing
a rolling ~7 days. Each day card briefs that date: weather · tides · sunrise/
sunset · what's on (events/markets/festivals) · disruptions (loadshedding,
roadworks) · cautions/things to know · in-season nudges (whale season → whales,
flower season → West Coast). Immediate value, zero planning.

**Layer 2 — "Plan a Trippie" (optimiser).** The app is **Best Day**; a plan you build
is **a Trippie**. Tap Plan a Trippie → a LIBRARY of activity types (mountain,
wine, hike, beach, whale trip, red bus…) you **swipe into a basket** + pick dates
(e.g. 3 days). Best Day then schedules each chosen element into its **optimal time +
place** using CONSTRAINTS.

**The constraint-scheduling is the whole product.** Each activity is anchored to
its best window, then the day is built around the anchors like a puzzle. Flagship
example: a beach walk = low tide + avoid the Camps Bay traffic-peak clash +
closest to your base → "Noordhoek at 2pm," and the rest of the day fits around it.
Anchors: tide windows (beach walks/tidal pools), low-wind mornings (mountain),
traffic avoidance, proximity to accommodation, specials/opening hours.
→ **Tides are now first-class data** (the demo depends on tide timing).

The sections below are the original v1.0 brief (kept for reference).

## Vision
Best Day is an AI-powered destination optimiser that creates and continuously
improves the perfect Cape Town itinerary. Not a travel guide — an **optimisation
engine**. Uses live data + historical data + AI to decide *what* to do, *when*,
*in what order*, *why*, and *how the plan should change as conditions change*.
It should feel like the world's best local concierge travelling with you.

## Core statement
> Give every visitor the best possible Cape Town experience based on what is
> happening during their exact stay.

## Design philosophy
Travel apps fail by making users fill in long questionnaires. Best Day does the
opposite: **learn from behaviour, not forms.** The first experience must feel
effortless — value within seconds.

## First-launch experience — only 4 questions
1. How many people? (1 / 2 / Family / Group)
2. How many days? (1/2/3/4/5/7+)
3. Where are you staying? (search / hotel / current location / address)
4. When do you arrive? (date + optional arrival time)

No budgets. No interests. No long forms. **No account required.**

## Then the AI immediately works
Retrieves before asking anything else: current weather, hourly forecast, wind,
cloud, rain, tides, sunrise/sunset, traffic, road closures/works, transport,
parking, beach + marine conditions, current/upcoming events (markets, concerts,
festivals, wine/food events), restaurant availability + specials, tour
availability + specials, cruise arrivals, public + school holidays, wildlife +
whale + penguin sightings, historical popularity/traffic/crowds/weather,
seasonality, opening hours, travel times, distances.

## Discovery instead of questionnaires
Show intelligent recommendation cards; the visitor just reacts:
**LOVE / MAYBE / NOT FOR ME** (+ SAVE, ALREADY BOOKED, SKIP). Each reaction
tunes preference weights. After a handful of taps the profile has built itself.

## Build the itinerary
Once enough feedback: generate a complete itinerary considering weather, travel
time, opening hours, roads, events, specials, historic demand, seasonality,
sunset, tides, traffic, restaurant availability, user + group preferences,
activity duration, energy levels — all working together.

## Every recommendation explains itself — the WHY button
Never a black box. e.g. "Table Mountain Friday because: lowest forecast wind,
lower historical cloud, fewest visitors before 09:30, 18 min from your hotel,
leaves the afternoon for the Waterfront."

## Continuous optimisation
Every few minutes re-check weather/traffic/events/closures/availability. On a
significant change: "We found a better option — move Table Mountain to tomorrow?
YES/NO" → one tap re-plans everything.

## Rebuild My Day
Core feature: **REBUILD TODAY** — running late / bad weather / changed our minds
/ more wine / less driving / child-friendly / indoor. Everything recalculates.

## Natural-language AI
"We want seafood tonight." "Make tomorrow slower." "Find a hidden beach." "Avoid
crowds." "We've already seen penguins." "Find the best sunset." → itinerary
updates instantly.

## Historical + future intelligence
Build patterns from history (weather/wind/traffic/demand/seasons/festivals/
cruises). Eventually surface trends ("event attendance up 4 years running, expect
it especially popular"). **Predictions must always be labelled as predictions.**

## Recommendation engine
Every activity gets a score from: interest match, weather suitability, travel
efficiency, current events, historic popularity, seasonality, availability,
bookings, specials, local recs, scenic value, satisfaction, feedback, duration,
energy, traffic, wind, rain, time of day, sunset, tides. Schedule the
highest-value experiences into the best time slots.

## Partner ecosystem (later)
Cape Town Tourism, City of Cape Town, Table Mountain Cableway, SANParks,
Dineplan, GetYourGuide, Viator, wine estates, museums, transport, tour operators,
event organisers, weather + marine + wildlife services.

## Revenue (traveller experiences it as free)
Hotel/tourism-board licensing, restaurant + experience + wine referrals,
affiliate bookings, sponsored offers (**always clearly labelled**), premium
concierge subscription, business analytics. Never rank sponsored above relevance.

## Product principles
1. Never overwhelm. 2. Learn instead of asking. 3. Explain every recommendation.
4. Continuously improve. 5. Be transparent about certainty. 6. Distinguish live /
historical / predicted data. 7. Traveller first. 8. Geographically efficient.
9. Never recommend sponsored just because it pays. 10. Objective is unforgettable
trips, not selling attractions.

## MVP success
Set up a trip in **under a minute**, then generate an itinerary that feels
personal, intelligent and dynamic. Defining reaction: *"This understands what I
want better than I could have planned it myself."*

## Long-term
The world's first **AI Destination Operating System**. Cape Town first; then
Sydney, Melbourne, Vancouver, Barcelona, Amsterdam, Lisbon, Tokyo, Singapore,
Dubai, New York. Same platform — only the destination data changes.

## Product promise
Best Day doesn't tell you what's in Cape Town. It tells you **how to experience
the very best of Cape Town, at exactly the right time, for you.**
