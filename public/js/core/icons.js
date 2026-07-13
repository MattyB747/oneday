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
};

export const ic = (name) => icons[name] || '';
