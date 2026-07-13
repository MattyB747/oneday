'use strict';

// The "Plan a Trippie" library: pickable activity TYPES. Each maps to candidate
// attractions from the dataset and carries a CONSTRAINT PROFILE the optimiser uses
// to anchor it to the right time/place.
//
//   anchor: what dictates its timing —
//     'lowtide'        beach walks: schedule around a daytime low tide, avoid traffic peak
//     'morning-lowwind' the mountain: exposed + wind-sensitive, best calm mornings
//     'sunset'         sundowner spots: schedule to end near sunset
//     'morning'        wildlife/hikes: earlier is better (light, crowds, wind)
//     'afternoon'      wine/leisurely
//     'flexible'       anytime; used to fill gaps (rain-safe options prioritised when wet)
//   seasonalMonths: if set, only truly relevant in these months (whales)

const ACTIVITIES = [
  { id: 'mountain',    label: 'Table Mountain',   icon: 'season',  anchor: 'morning-lowwind', candidates: ['table-mountain'] },
  { id: 'beach-walk',  label: 'Beach walk',       icon: 'tide',    anchor: 'lowtide',         candidates: ['noordhoek', 'camps-bay', 'muizenberg', 'clifton', 'llandudno', 'maidens-cove'] },
  { id: 'wine',        label: 'Wine tasting',     icon: 'event',   anchor: 'afternoon',       candidates: ['groot-constantia', 'stellenbosch'] },
  { id: 'hike',        label: 'A hike',           icon: 'season',  anchor: 'morning',         candidates: ['lions-head', 'silvermine'] },
  { id: 'whales',      label: 'Whale watching',   icon: 'tide',    anchor: 'morning',         candidates: ['simons-town', 'kalk-bay', 'boulders-penguins'], seasonalMonths: [6, 7, 8, 9, 10, 11] },
  { id: 'penguins',    label: 'Penguins',         icon: 'season',  anchor: 'morning',         candidates: ['boulders-penguins'] },
  { id: 'sunset',      label: 'Sunset spot',      icon: 'sunset',  anchor: 'sunset',          candidates: ['signal-hill', 'camps-bay', 'llandudno', 'chapmans-peak'] },
  { id: 'culture',     label: 'City & culture',   icon: 'event',   anchor: 'flexible',        candidates: ['bo-kaap', 'zeitz-mocaa', 'district-six', 'companys-garden'] },
  { id: 'market',      label: 'Food market',      icon: 'event',   anchor: 'morning',         candidates: ['old-biscuit-mill'] },
  { id: 'waterfront',  label: 'The Waterfront',   icon: 'event',   anchor: 'flexible',        candidates: ['va-waterfront'] },
  { id: 'cape-point',  label: 'Cape Point',       icon: 'season',  anchor: 'morning',         candidates: ['cape-point'] },
  { id: 'scenic-drive',label: 'Scenic drive',     icon: 'sunset',  anchor: 'afternoon',       candidates: ['chapmans-peak'] },
];

module.exports = { activities: ACTIVITIES, byId: (id) => ACTIVITIES.find((a) => a.id === id) };
