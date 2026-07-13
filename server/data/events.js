'use strict';

// Cape Town "what's on" — the recurring, predictable happenings a visitor would
// otherwise hunt across 10 sites for. Given a date we return everything on that
// day: markets, live music, comedy, culture nights, community runs, plus seasonal
// festivals and monthly one-offs. Year-round coverage so no day is ever empty.
// Live ticketed concerts/shows layer on top later (Ticketmaster/Quicket adapters).
//
// Each event: { name, where, area, category, note }.
// category: market | music | comedy | culture | food | community | film | festival | sport
// Schedule is expressed by one of: days:[0-6] (0=Sun) · daily:true · months:[1-12]
//   · firstThursday:true · nthWeekend etc. Composed in forDate().

// ---- Recurring by weekday (year-round unless noted) ----
const RECURRING = [
  // Markets
  { days: [6], name: 'Neighbourgoods Market', where: 'Old Biscuit Mill, Woodstock', area: 'city', category: 'market', note: 'The famous artisanal food & design market — go before 11am. Saturdays only.' },
  { days: [6, 0], name: 'Oranjezicht City Farm Market', where: 'Granger Bay, V&A', area: 'city', category: 'food', note: 'Farm-fresh produce and food stalls right by the ocean.' },
  { days: [5, 6, 0], name: 'Bay Harbour Market', where: 'Hout Bay Harbour', area: 'peninsula', category: 'market', note: '100+ stalls, live music and food on the harbour (Fri eve + weekends).' },
  { days: [5], name: 'Blue Bird Garage Market', where: 'Muizenberg', area: 'falsebay', category: 'food', note: 'Friday-night food & goods market in a converted airmail hangar.' },
  { days: [0, 1, 2, 3, 4, 5, 6], name: 'Mojo Market', where: 'Sea Point', area: 'atlantic', category: 'food', note: 'Indoor food hall with 30+ vendors and live music — open daily.' },
  { days: [0, 1, 2, 3, 4, 5, 6], name: 'V&A Food Market', where: 'V&A Waterfront', area: 'city', category: 'food', note: 'Artisanal food hall in the old power station — open daily.' },
  { days: [3], name: 'Earth Fair Food Market', where: "St George's Mall, City", area: 'city', category: 'food', note: 'Midweek lunch market of ethical local food (Wednesdays).' },
  { days: [4], name: 'Earth Fair Food Market', where: 'Tokai', area: 'constantia', category: 'food', note: 'Thursday-evening food market in the southern suburbs.' },
  { days: [6, 0], name: 'Milnerton Flea Market', where: 'Marine Drive, Milnerton', area: 'city', category: 'market', note: 'Sprawling weekend bric-a-brac and antiques market by the lagoon.' },
  { days: [6, 0], name: 'Root44 Market', where: 'Audacia, Stellenbosch', area: 'winelands', category: 'market', note: 'Big weekend food, craft and live-music market in the Winelands.' },
  { days: [6], name: 'Stellenbosch Slow Market', where: 'Oude Libertas, Stellenbosch', area: 'winelands', category: 'food', note: 'Saturday-morning artisanal market among the oaks.' },
  { days: [0, 1, 2, 3, 4, 5, 6], name: 'Greenmarket Square', where: 'City Centre', area: 'city', category: 'market', note: 'Historic cobbled square of African craft and curio stalls (daily, weather permitting).' },

  // Live music / comedy / culture (year-round nightlife)
  { days: [2, 3, 4, 5, 6], name: 'Cape Town Comedy Club', where: 'The Pumphouse, V&A', area: 'city', category: 'comedy', note: 'Stand-up most nights — SA’s top comics and touring acts. Book ahead.' },
  { days: [4, 5, 6], name: 'Live music at Café Roux', where: 'Constantia / City', area: 'constantia', category: 'music', note: 'Intimate live-music sessions — local singer-songwriters and bands.' },
  { days: [5, 6], name: 'The Waiting Room', where: 'Long Street', area: 'city', category: 'music', note: 'Rooftop bar and DJ sets above Cape Town’s buzziest street.' },
  { days: [4, 5, 6], name: 'Jazz at The Crypt', where: 'Wale Street, City', area: 'city', category: 'music', note: 'Live jazz in an atmospheric cellar beneath St George’s Cathedral.' },

  // Community / sport
  { days: [6], name: 'parkrun (free 5 km)', where: 'Green Point, Constantia & more', area: 'city', category: 'community', note: 'Free timed 5 km run/walk at 8am — a great way to meet locals. Multiple locations.' },
  { days: [0], name: 'Sunday sessions on the Prom', where: 'Sea Point Promenade', area: 'atlantic', category: 'community', note: 'The promenade comes alive on Sundays — skaters, buskers and sundowners.' },
];

// First Thursday of the month → galleries & shops open late in the city.
function firstThursday(date) {
  if (date.getDay() === 4 && date.getDate() <= 7) return [{ name: 'First Thursdays', where: 'City Bowl galleries', area: 'city', category: 'culture', note: 'Art galleries and shops stay open late with street food and music — the city’s best night out.' }];
  return [];
}

// Seasonal / summer programming (month 1-12).
function seasonal(date) {
  const m = date.getMonth() + 1, dow = date.getDay(), out = [];
  if ([11, 12, 1, 2, 3, 4].includes(m) && dow === 0) out.push({ name: 'Kirstenbosch Summer Sunset Concert', where: 'Kirstenbosch Gardens', area: 'constantia', category: 'music', note: 'Live music on the lawns as the sun sets — bring a picnic (summer Sundays).' });
  if ([11, 12, 1, 2, 3].includes(m)) out.push({ name: 'Galileo Open Air Cinema', where: 'Kirstenbosch / V&A / Constantia', area: 'city', category: 'film', note: 'Films under the stars on summer evenings — check the week’s line-up and location.' });
  if ([12, 1, 2].includes(m) && [5, 6].includes(dow)) out.push({ name: 'Sunset sessions', where: 'Camps Bay & Clifton', area: 'atlantic', category: 'music', note: 'Peak-summer beach-bar DJ sets and sundowners along the Atlantic.' });
  return out;
}

// Named annual festivals (approximate windows — refined with live feeds later).
const FESTIVALS = [
  { months: [3], name: 'Cape Town Carnival', where: 'Green Point', area: 'city', category: 'festival', note: 'A giant street parade of costumes, floats and music (usually mid-March).' },
  { months: [3, 4], name: 'Wine Harvest Festivals', where: 'Stellenbosch & Franschhoek', area: 'winelands', category: 'festival', note: 'Harvest season — estates host festivals, grape-stomping and fresh vintages.' },
  { months: [9], name: 'Hermanus Whale Festival', where: 'Hermanus (day trip)', area: 'falsebay', category: 'festival', note: 'Southern Right whales offshore + a coastal festival (about 90 min away).' },
  { months: [12], name: 'MCQP Costume Party', where: 'City', area: 'city', category: 'festival', note: 'Cape Town’s legendary end-of-year costume party (mid-December).' },
];
function festivals(date) {
  const m = date.getMonth() + 1;
  return FESTIVALS.filter((f) => f.months.includes(m)).map(({ months, ...e }) => e);
}

function forDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const dow = date.getDay();
  const recurring = RECURRING.filter((e) => (e.days || []).includes(dow)).map(({ days, ...e }) => e);
  return [...recurring, ...firstThursday(date), ...seasonal(date), ...festivals(date)];
}

module.exports = { forDate };
