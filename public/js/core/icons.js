// Minimal line-drawing icons (stroke = currentColor). Clean vector, no emoji.
const S = (p, extra = '') => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;

export const icons = {
  temp: S('<path d="M12 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M14 15.5v-2"/>'),
  wind: S('<path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 12h15a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 16h9a2.5 2.5 0 1 1-2.5 2.5"/>'),
  rain: S('<path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 15"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>'),
  sunrise: S('<path d="M17 16a5 5 0 0 0-10 0"/><path d="M12 3v4M4.2 10.2l1.4 1.4M18.4 11.6l1.4-1.4M2 16h2M20 16h2M22 20H2"/><path d="M9 9l3-3 3 3"/>'),
  sunset: S('<path d="M17 16a5 5 0 0 0-10 0"/><path d="M12 7V3M4.2 10.2l1.4 1.4M18.4 11.6l1.4-1.4M2 16h2M20 16h2M22 20H2"/><path d="M15 6l-3 3-3-3"/>'),
  tide: S('<path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>'),
  event: S('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>'),
  alert: S('<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),
  bolt: S('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  season: S('<path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/>'),
  sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>'),
  mountain: S('<path d="M3 20l6-11 4 6 2-3 6 8z"/><path d="M9 9l2 3"/>'),
  road: S('<path d="M6 3l-2 18M18 3l2 18M12 4v3M12 11v3M12 18v3"/>'),
  beach: S('<path d="M2 20h20"/><path d="M12 20V8"/><path d="M12 8c-4-3-8 0-9 3 4-1 7 0 9-3z"/><path d="M12 8c4-3 8 0 9 3-4-1-7 0-9-3z"/>'),
  air: S('<path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 14h14a3 3 0 1 1-3 3"/>'),
  traffic: S('<rect x="7" y="2" width="10" height="14" rx="2"/><path d="M9 20h6M12 16v4"/><circle cx="12" cy="6" r="1.3"/><circle cx="12" cy="11" r="1.3"/>'),
  trending: S('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  people: S('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><path d="M16 6a3 3 0 0 1 0 6M17 15c2.5.4 4 1.9 4 5"/>'),
  shield: S('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  car: S('<path d="M5 12l1.5-4.5A2 2 0 0 1 8.4 6h7.2a2 2 0 0 1 1.9 1.5L19 12v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M5 12h14M7.5 15h.01M16.5 15h.01"/>'),
};

export const ic = (name) => icons[name] || '';
