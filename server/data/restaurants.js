'use strict';

// Curated Cape Town restaurants (people must eat). Tagged by region so meals are
// suggested near that day's activities, with meal type + price + a note. Reliable
// starting layer; live availability/ratings come from Google Places / Dineplan later.
// price: R budget · RR mid · RRR upmarket · RRRR fine-dining. meal: breakfast|lunch|dinner|both

const R = [
  { id: 'truth-coffee', name: 'Truth Coffee Roasting', region: 'city', lat: -33.9276, lon: 18.4256, cuisine: 'Coffee & breakfast', price: 'R', priceText: 'R80–150pp', meal: 'breakfast', note: 'Steampunk café roasting some of the city’s best coffee.' },
  { id: 'jason-bakery', name: 'Jason Bakery', region: 'city', lat: -33.9203, lon: 18.4175, cuisine: 'Bakery & brunch', price: 'R', priceText: 'R90–180pp', meal: 'lunch', note: 'Cult pastries and a buzzy Bree Street brunch.' },
  { id: 'kloof-street-house', name: 'Kloof Street House', region: 'city', lat: -33.9316, lon: 18.4093, cuisine: 'Eclectic', price: 'RRR', priceText: 'R300–500pp', meal: 'dinner', note: 'Candlelit Victorian house and garden — book ahead.' },
  { id: 'bo-kaap-kombuis', name: 'Bo-Kaap Kombuis', region: 'city', lat: -33.9198, lon: 18.4108, cuisine: 'Cape Malay', price: 'RR', priceText: 'R220–350pp', meal: 'dinner', note: 'Traditional Cape Malay with Table Mountain views.' },
  { id: 'pot-luck-club', name: 'The Pot Luck Club', region: 'city', lat: -33.9273, lon: 18.4573, cuisine: 'Tapas', price: 'RRR', priceText: 'R350–550pp', meal: 'dinner', note: 'Small plates and city views atop the Old Biscuit Mill — book ahead.' },
  { id: 'willoughby', name: 'Willoughby & Co', region: 'city', lat: -33.9068, lon: 18.4197, cuisine: 'Sushi & seafood', price: 'RR', priceText: 'R200–400pp', meal: 'lunch', note: 'A Waterfront institution — no bookings, worth the wait.' },

  { id: 'codfather', name: 'The Codfather', region: 'atlantic', lat: -33.9512, lon: 18.3781, cuisine: 'Seafood', price: 'RRR', priceText: 'R350–600pp', meal: 'dinner', note: 'Pick your own fresh seafood in Camps Bay.' },
  { id: 'the-bungalow', name: 'The Bungalow', region: 'atlantic', lat: -33.9432, lon: 18.3776, cuisine: 'Contemporary', price: 'RRR', priceText: 'R300–500pp', meal: 'dinner', note: 'Sunset deck right over Clifton — time it for golden hour.' },
  { id: 'grand-africa', name: 'Grand Africa Café & Beach', region: 'atlantic', lat: -33.9026, lon: 18.4123, cuisine: 'Beachy Mediterranean', price: 'RRR', priceText: 'R300–500pp', meal: 'both', note: 'Beach-club vibes with feet in the sand.' },

  { id: 'foodbarn', name: 'The Foodbarn', region: 'peninsula', lat: -34.1005, lon: 18.3773, cuisine: 'Bistro', price: 'RR', priceText: 'R220–400pp', meal: 'lunch', note: 'A country bistro in the Noordhoek farm village.' },
  { id: 'mariners-wharf', name: 'Mariner’s Wharf', region: 'peninsula', lat: -34.0473, lon: 18.3467, cuisine: 'Seafood', price: 'RR', priceText: 'R180–350pp', meal: 'lunch', note: 'Harbour fish market and eatery in Hout Bay.' },
  { id: 'two-oceans', name: 'Two Oceans Restaurant', region: 'peninsula', lat: -34.3567, lon: 18.4972, cuisine: 'Seafood', price: 'RR', priceText: 'R250–450pp', meal: 'lunch', note: 'Clifftop views at Cape Point itself.' },

  { id: 'kalkys', name: 'Kalky’s', region: 'falsebay', lat: -34.1281, lon: 18.4489, cuisine: 'Fish & chips', price: 'R', priceText: 'R90–180pp', meal: 'lunch', note: 'The no-frills harbour-shack classic in Kalk Bay.' },
  { id: 'harbour-house-kb', name: 'Harbour House Kalk Bay', region: 'falsebay', lat: -34.1275, lon: 18.4497, cuisine: 'Seafood', price: 'RRR', priceText: 'R300–550pp', meal: 'both', note: 'Fine seafood with waves breaking below.' },
  { id: 'berthas', name: 'Bertha’s', region: 'falsebay', lat: -34.1935, lon: 18.4318, cuisine: 'Seafood', price: 'RR', priceText: 'R200–380pp', meal: 'lunch', note: 'Waterfront dining in Simon’s Town, near the penguins.' },

  // Constantia (Southern Suburbs) — close to the city, NOT the far-east Winelands.
  { id: 'la-colombe', name: 'La Colombe', region: 'constantia', lat: -34.0206, lon: 18.4106, cuisine: 'Fine dining', price: 'RRRR', priceText: 'R1200+pp', meal: 'lunch', note: 'World-renowned tasting menu on Silvermist estate — book well ahead.' },
  { id: 'beau-constantia', name: 'Chef’s Warehouse at Beau Constantia', region: 'constantia', lat: -34.0261, lon: 18.4189, cuisine: 'Modern tapas', price: 'RRR', priceText: 'R550–750pp', meal: 'lunch', note: 'Spectacular vineyard views over Constantia.' },
  { id: 'groot-constantia-jonkershuis', name: 'Jonkershuis, Groot Constantia', region: 'constantia', lat: -34.0284, lon: 18.4230, cuisine: 'Cape heritage', price: 'RR', priceText: 'R250–450pp', meal: 'lunch', note: 'Cape classics under the oaks at the historic estate.' },

  // Cape Winelands (Stellenbosch / Franschhoek) — a real day-trip east.
  { id: 'tokara', name: 'Tokara', region: 'winelands', lat: -33.9146, lon: 18.9200, cuisine: 'Fine dining', price: 'RRRR', priceText: 'R900+pp', meal: 'lunch', note: 'Acclaimed food with sweeping views over the Stellenbosch valley — book ahead.' },
  { id: 'spier-vadas', name: 'Vadas Smokehouse, Spier', region: 'winelands', lat: -33.9727, lon: 18.7856, cuisine: 'Smokehouse', price: 'RR', priceText: 'R220–420pp', meal: 'lunch', note: 'Farm-to-table smokehouse on the Spier estate — relaxed and family-friendly.' },
  { id: 'reuben-franschhoek', name: 'Reuben’s, Franschhoek', region: 'winelands', lat: -33.9124, lon: 19.1197, cuisine: 'Contemporary', price: 'RRR', priceText: 'R450–650pp', meal: 'both', note: 'A Franschhoek institution on the main street — a natural tram-day lunch.' },
];

const byRegion = (region, meal) => R.filter((r) => r.region === region && (r.meal === meal || r.meal === 'both'));

module.exports = { restaurants: R, byRegion, byId: (id) => R.find((r) => r.id === id) };
