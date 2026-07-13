// The Today hero — renders the Experience Score, why chips, live conditions and
// Best Day Plan from /api/today (all real aggregated signals).
import { api } from '../core/api.js';
import { ic } from '../core/icons.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const WHY_ITEMS = [
  { icon: 'event', t: 'Best times based on real conditions, not guesswork' },
  { icon: 'trending', t: 'Live signals refresh through the day' },
  { icon: 'people', t: 'Tuned to what’s great right now' },
  { icon: 'shield', t: 'Trusted local + open data sources' },
];

function render(d) {
  animateScore(d.experienceScore || 0);
  $('chips').innerHTML = (d.chips || []).map((c) => `<span class="chip">${ic(c.icon)}${esc(c.text)}</span>`).join('');

  const w = d.weather || {};
  $('wxTemp').textContent = (w.tempC != null ? w.tempC : '–') + '°C';
  $('wxCond').textContent = w.condition || '';
  $('wxMeta').innerHTML = `Wind ${esc(w.windKmh)} km/h<br>Rain ${esc(w.rainProb)}%${w.uv != null ? `<br>UV ${esc(w.uv)}` : ''}`;

  $('condList').innerHTML = (d.live || []).map((l) => `
    <div class="condRow">${ic(l.icon)}<span class="lbl">${esc(l.label)}</span><span class="val ${esc(l.tone)}">${esc(l.value)}</span></div>`).join('');

  $('planRow').innerHTML = (d.plan || []).map((p) => `
    <div class="planCard" ${p.image ? `style="background-image:url('${esc(p.image)}')"` : ''}>
      <span class="time">${esc(p.time)}</span>
      <div class="body">
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.tip)}</p>
        <div class="foot"><span class="m">★ ${esc(p.match)} Match</span><span class="d">${p.driveMin != null ? esc(p.driveMin) + ' min drive' : ''} ${ic('car')}</span></div>
      </div>
    </div>`).join('');

  $('whyRow').innerHTML = WHY_ITEMS.map((x) => `<div class="whyItem">${ic(x.icon)}<span class="t">${esc(x.t)}</span></div>`).join('');

  // Hero background = the day's first plan image (usually Table Mountain).
  const heroImg = (d.plan || []).find((p) => p.image);
  if (heroImg) $('heroImg').style.backgroundImage = `url('${heroImg.image}')`;
}

function animateScore(target) {
  const el = $('scoreNum'); if (!el) return;
  let n = 0; const step = Math.max(1, Math.round(target / 28));
  const t = setInterval(() => { n = Math.min(target, n + step); el.textContent = n; if (n >= target) clearInterval(t); }, 28);
}

export async function loadToday(tripId, stay) {
  if (!stay) { try { stay = JSON.parse(sessionStorage.getItem('odStay') || 'null'); } catch (_) {} }
  if (stay && $('stayCity')) $('stayCity').textContent = (stay.label || 'Cape Town').split(',')[0];
  const q = new URLSearchParams();
  if (tripId) q.set('tripId', tripId);
  if (stay && Number.isFinite(stay.lat)) { q.set('lat', stay.lat); q.set('lon', stay.lon); }
  try {
    const d = await api('/api/today?' + q.toString());
    render(d);
  } catch (err) {
    const t = $('toast'); if (t) { t.textContent = 'Could not load: ' + err.message; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 3000); }
  }
}

export function mountToday() {
  $('viewPlan')?.addEventListener('click', () => { document.querySelector('.planWrap')?.scrollIntoView({ behavior: 'smooth' }); });
}
