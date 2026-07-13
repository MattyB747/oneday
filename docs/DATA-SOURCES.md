# Best Day — Data Source Map

The data strategy IS the product strategy. Goal: one place that combines
weather + events + traffic + tides + wildlife + attractions so a visitor makes
informed choices without hunting 20 sites.

**Priority order for any data need:** official free API → affiliate/partner feed
→ open/government data → *scrape only as a last resort* (public pages, cached
hard, ToS-respecting). Several sources below that people assume need scraping
(Ticketmaster, GetYourGuide) have FREE official APIs — always use those.

Legend: ✅ free API · ⚠️ freemium (free tier) · 🔒 free but needs signup/affiliate · 🕷️ scrape-or-partner (no API)

---

## 1. Weather & environment  — *the biggest itinerary driver*
- ✅ **Open-Meteo** — no API key. Hourly + daily: temp, wind, cloud, rain/precip
  probability, UV. **Already wired.** This is the backbone.
- ✅ **Open-Meteo Marine** — wave height, swell period, sea-surface temp (beaches, surf).
- ✅ **Open-Meteo Air-Quality** — pollen/AQI.
- ✅ **sunrise-sunset.org** — sunrise/sunset/golden hour (Open-Meteo also gives this).

## 2. Tides & marine  — *partial gap*
- ⚠️ **Stormglass.io** / **WorldTides** — real tide heights (free tier is small; cache).
- ✅ Fallback: precompute from **SA Navy Hydrographic** tide tables (static, legal to encode).
- Use for: tidal pools (St James, Buffels Bay), kayaking, low-tide beach walks.

## 3. Events  — *the "what's on this weekend" need; hardest for SA coverage*
- ✅ **Ticketmaster Discovery API** — free dev key. Concerts, sport, venues. Official — **do NOT scrape Ticketmaster**.
- ⚠️ **PredictHQ** — aggregated events + built-in *attendance/impact* scores + holidays. Free tier.
- ⚠️ **SeatGeek / Meetup** — APIs with free tiers (variable SA coverage).
- 🕷️ **SA-local gap:** Quicket, Webtickets, Computicket, Cape Town Magazine "what's on",
  iol/News24 events → no clean public API. Careful, cached scraping of the *public
  listings* pages, or direct partnership, is the realistic path for local festivals/markets.
- **Strategy:** Ticketmaster + PredictHQ cover the big stuff; a small set of curated
  SA-listing scrapes fills the markets/festivals gap.

## 4. Attractions, tours & tickets  — *also the revenue engine*
- 🔒 **GetYourGuide Partner API** — free to join. Tours, prices, availability, booking
  links → **referral revenue**. Legal + monetizable. **Beats scraping GetYourGuide.**
- 🔒 **Viator (Tripadvisor) Partner API** — same model.
- 🕷️ **Table Mountain Cableway** — no API, but its public page shows **OPEN/CLOSED due to
  wind** — extremely high value, worth a careful status scrape.
- 🕷️ **SANParks / Cape Point / Kirstenbosch / Boulders** — hours + status via scrape or a
  hand-curated dataset (they change rarely — a maintained dataset is fine for MVP).

## 5. Base places data  — *the attraction backbone*
- ✅ **OpenStreetMap via Overpass API** — free. Viewpoints, beaches, restaurants, trails,
  many with `opening_hours` + coordinates. The legal backbone for the dataset.
- ✅ **Wikidata / Wikipedia / Wikivoyage** — descriptions + facts; **Wikimedia Commons** =
  properly-licensed images.
- ⚠️ **Foursquare Places** — free tier; categories + popularity.
- 💰 **Google Places** (paid, has credits) — richest, incl. *popular times / crowd levels*.
  Consider later for the crowd-avoidance feature; costs money.

## 6. Traffic, routing & travel time  — *for geographic efficiency*
- ✅ **OpenRouteService** — free key. Travel time, distance matrix, isochrones (no live traffic).
- ⚠️ **TomTom Traffic** — generous free tier; live traffic + incidents.
- ⚠️ **HERE / Mapbox** — freemium routing + traffic.
- 💰 **Google Distance Matrix** — best traffic-aware times (paid, credits).
- **Pick:** OpenRouteService (free base times) + TomTom free tier for the live-traffic layer.

## 7. Government / city / infrastructure  — *the "planned outages" need*
- ⚠️ **EskomSePush (ESP) API** — free tier. **Loadshedding schedules by area** — exactly
  "planned gov outages," and very Cape-Town-relevant (affects restaurants, attractions).
- ✅ **City of Cape Town Open Data Portal** (odp.capetown.gov.za) — roadworks, public
  facilities, beach water-quality datasets (coverage varies).
- ✅ **Nager.Date API** — SA public holidays. School terms → static (encode manually).

## 8. Wildlife & seasons  — *whales, penguins, flowers*
- ✅ **iNaturalist API** — free. Recent *crowdsourced, geolocated* sightings — surface real
  recent whale/penguin/wildlife sightings near Cape Town. Genuinely cool + free.
- **Seasonal norms (encode as knowledge, label as seasonal not live):** Southern Right
  whales Jun–Nov (False Bay/Hermanus); West Coast flowers Aug–Sep; penguins year-round
  (Boulders). Historical/predictive "trends" are EARNED from usage over time — not launch data.

## 9. Cruise ships
- ⚠️ **MarineTraffic** (freemium) or 🕷️ the Cape Town cruise-terminal published schedule.
  Cruise days = crowded Waterfront → useful for crowd avoidance.

---

## Recommended Phase-1 free stack (build against these first)
| Need | Source | Cost |
|---|---|---|
| Weather / wind / rain / marine | Open-Meteo (+Marine) | ✅ free, no key |
| Sun times | Open-Meteo daily | ✅ free |
| Base attractions | OpenStreetMap Overpass + curated dataset + Wikidata | ✅ free |
| Travel time / distances | OpenRouteService | ✅ free key |
| Events (big) | Ticketmaster Discovery API | ✅ free key |
| Public holidays | Nager.Date | ✅ free |
| Loadshedding | EskomSePush | ⚠️ free tier |
| Wildlife sightings | iNaturalist | ✅ free |
| Tours + booking (revenue) | GetYourGuide / Viator affiliate | 🔒 free signup |

**Add later:** PredictHQ (event richness), TomTom (live traffic), tides (Stormglass),
Cableway status scrape, curated SA-events scrapes, Google Places (crowd levels, paid).

## Architecture principle
Every source is a small **adapter** behind one interface
(`services/sources/<name>.js` → normalised shape + `kind: live|historical|seasonal`).
The scoring engine never knows where data came from. This lets us start with the free
stack and slot in each new feed (or swap a scrape for an API) without touching logic —
and always label certainty (live vs seasonal vs predicted) per the product principles.

## Honest scraping rules (when there's truly no API)
- Only public pages; never behind logins/paywalls; respect robots.txt + ToS.
- Cache aggressively (hours/days) — never hammer a site per user request.
- Attribute the source; expect breakage; always have a fallback.
- If a site forbids scraping AND offers an API (Ticketmaster, GetYourGuide) → use the API.
