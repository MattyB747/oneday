'use strict';

// Encoded Cape Town seasonal knowledge — free, no API needed. Given a date, returns
// in-season nudges + cautions. Labelled kind:'seasonal' so the UI is honest that
// these are seasonal norms, not live readings. (Live sightings come later from
// iNaturalist.) Months are 1-12.

const SEASONS = [
  { name: 'Whale season', months: [6, 7, 8, 9, 10, 11], type: 'nudge', icon: '🐋',
    text: 'Southern Right whales are calving — best viewing in False Bay & along the coast (peak Aug–Oct).' },
  { name: 'Wildflowers', months: [8, 9], type: 'nudge', icon: '🌼',
    text: 'West Coast & Namaqualand wildflowers are blooming — a spectacular day trip north.' },
  { name: 'Summer beach season', months: [12, 1, 2], type: 'nudge', icon: '🏖️',
    text: 'Peak summer — long warm evenings, ideal for beaches and sundowners.' },
  { name: 'Wine harvest', months: [2, 3, 4], type: 'nudge', icon: '🍇',
    text: 'Harvest season in the Winelands — estates are lively with festivals and fresh vintages.' },
  { name: 'Penguins', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], type: 'nudge', icon: '🐧',
    text: 'African penguins are at Boulders Beach year-round — go early to beat the crowds.' },
  // Cautions
  { name: 'Cape Doctor', months: [11, 12, 1, 2, 3], type: 'caution', icon: '💨',
    text: 'The south-easter (“Cape Doctor”) can gust hard in summer — it often closes the cableway and whips up the Atlantic beaches. Mornings are usually calmer.' },
  { name: 'Winter rains', months: [6, 7, 8], type: 'caution', icon: '🌧️',
    text: 'Cape Town’s wet season — pack a layer and keep indoor options (aquarium, museums, wine tastings) handy.' },
];

// Returns { nudges: [...], cautions: [...] } for a given Date.
function forDate(date) {
  const m = date.getMonth() + 1;
  const hit = SEASONS.filter((s) => s.months.includes(m));
  return {
    nudges: hit.filter((s) => s.type === 'nudge').map((s) => ({ icon: s.icon, name: s.name, text: s.text })),
    cautions: hit.filter((s) => s.type === 'caution').map((s) => ({ icon: s.icon, name: s.name, text: s.text })),
  };
}

module.exports = { forDate };
