'use strict';

// Per-attraction practical detail shown on each itinerary stop: approximate cost
// (ZAR), what to wear, and things to know. Curated (verify/refresh from partner
// feeds later). Availability is left to the booking partner (GetYourGuide etc).

const D = {
  'table-mountain': { cost: 'From R400', costNote: 'return cableway', wear: 'Layers + closed shoes + sun hat', know: 'The cableway closes in high wind — check the status first. Book online to skip the queue.' },
  'lions-head': { cost: 'Free', wear: 'Hiking shoes, water; a headlamp for a sunset descent', know: 'Steep chain sections near the top. About 2 hours return.' },
  'signal-hill': { cost: 'Free', wear: 'A warm layer for the breeze', know: 'The classic sundowner spot — arrive before sunset as it fills up. Gate closes in the evening.' },
  'va-waterfront': { cost: 'Free entry', wear: 'Casual', know: 'Busiest on weekends and cruise-ship days. Dozens of restaurants and the aquarium here.' },
  'robben-island': { cost: 'From R600', costNote: 'ferry + tour', wear: 'A windproof jacket', know: 'The ferry is weather-dependent — book ahead. Allow ~3.5 hours round trip.' },
  'boulders-penguins': { cost: 'From R190', costNote: 'conservation fee', wear: 'Sunscreen; swimwear if you’ll swim', know: 'Go early to beat the crowds. Boardwalks only — don’t touch the penguins.' },
  'cape-point': { cost: 'From R400', costNote: 'reserve entry', wear: 'Windproof layers + walking shoes', know: 'A full-day trip. Baboons about — don’t feed them. The funicular is extra.' },
  'kirstenbosch': { cost: 'From R220', wear: 'Comfortable shoes + a hat', know: 'Don’t miss the Boomslang canopy walkway. Summer sunset concerts on Sundays.' },
  'camps-bay': { cost: 'Free', wear: 'Swimwear + sunscreen; a wrap for the SE wind', know: 'The Atlantic is cold. Buzzing strip of bars and restaurants behind the beach.' },
  'clifton': { cost: 'Free', wear: 'Swimwear + sunscreen', know: 'Four coves sheltered from the wind. Steep stairs down to the sand.' },
  'muizenberg': { cost: 'From R100', costNote: 'surf lesson / board hire', wear: 'A wetsuit — the water is cool', know: 'The warmest water in Cape Town and the best learn-to-surf beach. Shark Spotters on duty.' },
  'chapmans-peak': { cost: 'From R58', costNote: 'toll', wear: 'Casual', know: 'A toll road that can close after rain or rockfall — check it’s open before you go.' },
  'groot-constantia': { cost: 'From R120', costNote: 'tasting', wear: 'Smart casual', know: 'The oldest wine estate in the country — tastings, cellar tours and two restaurants.' },
  'bo-kaap': { cost: 'Free', wear: 'Comfy walking shoes', know: 'A residential area — be respectful photographing homes. Great Cape Malay food nearby.' },
  'companys-garden': { cost: 'Free', wear: 'Casual', know: 'Historic city gardens ringed by museums, with a good café and resident squirrels.' },
  'two-oceans-aquarium': { cost: 'From R270', wear: 'Casual (indoor)', know: 'A great rainy-day option with kids’ activities and a kelp forest tank.' },
  'zeitz-mocaa': { cost: 'From R250', wear: 'Casual (indoor)', know: 'Africa’s leading contemporary art museum — the sculpted grain-silo building is a highlight itself.' },
  'district-six': { cost: 'From R60', wear: 'Casual (indoor)', know: 'A moving, personal account of apartheid-era forced removals. Allow about an hour.' },
  'old-biscuit-mill': { cost: 'Free entry', wear: 'Casual', know: 'The Neighbourgoods food market runs Saturdays only — go before 11am. Cash and card.' },
  'sea-point-promenade': { cost: 'Free', wear: 'Walking shoes + a light layer', know: 'A flat 3 km ocean-front walk with playgrounds and an outdoor gym.' },
  'hout-bay': { cost: 'From R100', costNote: 'seal-island boat', wear: 'A windproof layer', know: 'Harbour market, a short boat to the seal colony, and famous fish & chips.' },
  'kalk-bay': { cost: 'Free', wear: 'Casual', know: 'Seafood, antique shops and a working harbour. Parking is tight around lunchtime.' },
  'silvermine': { cost: 'From R80', wear: 'Hiking shoes + water', know: 'An easy reservoir walk with views over both oceans; you can swim in summer.' },
  'stellenbosch': { cost: 'From R100', costNote: 'tastings vary', wear: 'Smart casual', know: 'About 45 min away — designate a driver or book a wine tour so everyone can taste.' },
  'simons-town': { cost: 'Free', wear: 'Casual', know: 'A historic naval town and the gateway to the Boulders penguins.' },
  'bree-street': { cost: 'R250–500pp', costNote: 'dinner', wear: 'Smart casual', know: 'The city’s hottest restaurant strip — book ahead, and it’s liveliest in the evening.' },
  'llandudno': { cost: 'Free', wear: 'Swimwear + a windbreaker', know: 'No shops or facilities — bring everything. One of the best sunsets in the city.' },
  'noordhoek': { cost: 'Free', costNote: 'horse rides from R650', wear: 'Layers for the wind', know: 'A vast wild beach for long walks and horse rides; Cape Point Vineyards is nearby.' },
  'rhodes-memorial': { cost: 'Free', wear: 'Casual', know: 'A short walk up to sweeping city views, with a popular café on site.' },
  'maidens-cove': { cost: 'Free', wear: 'Swimwear', know: 'Sheltered tidal pools that are great for kids, with braai spots alongside.' },
};

module.exports = { detailsFor: (id) => D[id] || { cost: null, wear: null, know: null } };
