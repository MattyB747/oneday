'use strict';

// Curated Cape Town events library — the recurring things every tourist would want
// to know but has to hunt across 10 sites for. Given a date we return what's on.
// This is the immediate layer; the Ticketmaster adapter (free key) + WebTickets/
// Quicket (partner/scrape) add live concerts/shows on top without changing shape.
//
// Each event: { name, where, area, category, note }. category: market|culture|music|food|festival

// Recurring by weekday (0=Sun … 6=Sat).
const WEEKLY = {
  5: [ // Friday
    { name: 'Bay Harbour Market', where: 'Hout Bay Harbour', area: 'peninsula', category: 'market', note: 'Live music, food stalls and crafts on the harbour (Fri evening).' },
  ],
  6: [ // Saturday
    { name: 'Neighbourgoods Market', where: 'Old Biscuit Mill, Woodstock', area: 'city', category: 'market', note: 'The famous artisanal food & design market — go before 11am. Saturdays only.' },
    { name: 'Oranjezicht City Farm Market', where: 'Granger Bay', area: 'city', category: 'food', note: 'Farm-fresh produce and food stalls by the sea (Sat mornings).' },
    { name: 'Bay Harbour Market', where: 'Hout Bay Harbour', area: 'peninsula', category: 'market', note: 'Weekend market with live music and 100+ stalls.' },
  ],
  0: [ // Sunday
    { name: 'Oranjezicht City Farm Market', where: 'Granger Bay', area: 'city', category: 'food', note: 'Sunday morning market by the ocean.' },
    { name: 'Bay Harbour Market', where: 'Hout Bay Harbour', area: 'peninsula', category: 'market', note: 'Weekend market with live music and 100+ stalls.' },
  ],
};

// Seasonal recurring (month is 1-12).
function seasonal(date) {
  const m = date.getMonth() + 1, dow = date.getDay();
  const out = [];
  if ([11, 12, 1, 2, 3, 4].includes(m) && dow === 0) out.push({ name: 'Kirstenbosch Summer Sunset Concert', where: 'Kirstenbosch Gardens', area: 'winelands', category: 'music', note: 'Live music on the lawns as the sun sets — bring a picnic (summer Sundays).' });
  return out;
}

// First Thursday of the month → galleries & shops open late in the city.
function firstThursday(date) {
  if (date.getDay() === 4 && date.getDate() <= 7) return [{ name: 'First Thursdays', where: 'City Bowl galleries', area: 'city', category: 'culture', note: 'Art galleries and shops stay open late with street food and music.' }];
  return [];
}

function forDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return [...(WEEKLY[date.getDay()] || []), ...seasonal(date), ...firstThursday(date)];
}

module.exports = { forDate };
