// The 4-question setup — the effortless first experience. Collects who / how long
// / where / when, then creates the trip and shows a live "what's happening" summary.
import { api } from '../core/api.js';

const $ = (id) => document.getElementById(id);
const answers = { people: null, days: null, stay: null, lat: null, lon: null, arrival: {} };
let step = 0;
const STEPS = 4;

function renderDots() {
  const d = $('dots');
  if (d) d.innerHTML = Array.from({ length: STEPS }, (_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('');
}
function show(n) {
  step = n;
  document.querySelectorAll('#setup .step').forEach((s) => s.classList.toggle('on', Number(s.dataset.step) === n));
  renderDots();
}
function toast(msg) { const t = $('toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400); }

// Auto-advance question groups where a tap is the whole answer.
function pickGroup(groupId, key, advanceTo) {
  $(groupId)?.addEventListener('click', (e) => {
    const b = e.target.closest('.opt'); if (!b) return;
    $(groupId).querySelectorAll('.opt').forEach((o) => o.classList.remove('on'));
    b.classList.add('on');
    answers[key] = b.dataset.val;
    setTimeout(() => show(advanceTo), 180);
  });
}

async function build() {
  answers.arrival = { date: $('arriveDate')?.value || '', time: $('arriveTime')?.value || '' };
  showResultWorking();
  try {
    const payload = {
      people: answers.people, days: answers.days, arrival: answers.arrival,
      stay: answers.stay || '',
      lat: Number.isFinite(answers.lat) ? answers.lat : undefined,
      lon: Number.isFinite(answers.lon) ? answers.lon : undefined,
    };
    const res = await api('/api/trip', { method: 'POST', body: payload });
    try { sessionStorage.setItem('tempoTrip', res.tripId); } catch (_) {}
    showSummary(res);
  } catch (err) {
    toast(err.message || 'Something went wrong — try again');
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === 'setup'));
  }
}

function showResultWorking() {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === 'result'));
  $('working').hidden = false; $('summary').hidden = true;
}

function fmtDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function showSummary(res) {
  $('working').hidden = true; $('summary').hidden = false;
  $('stayLine').textContent = `Based at ${res.stay.label} · ${res.days} day${res.days > 1 ? 's' : ''}`;
  $('wxDays').innerHTML = (res.weather || []).map((w) => {
    const warn = w.headline === 'Wet' || w.headline === 'Windy';
    return `<div class="wxDay">
      <span class="day">${fmtDay(w.date)}</span>
      <span class="stat">${Math.round(w.maxTempC)}°C · wind ${Math.round(w.maxWindKmh)}km/h · rain ${w.rainProb}%</span>
      <span class="badge ${warn ? 'warn' : ''}">${w.headline}</span>
    </div>`;
  }).join('');
}

export function mountSetup() {
  renderDots();
  pickGroup('q-people', 'people', 1);
  pickGroup('q-days', 'days', 2);

  // Q3 — where staying
  $('useLocation')?.addEventListener('click', () => {
    if (!navigator.geolocation) { toast('Location not available — type an area instead'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { answers.lat = p.coords.latitude; answers.lon = p.coords.longitude; answers.stay = 'Current location'; show(3); },
      () => toast('Could not get location — type an area instead'),
      { timeout: 8000 }
    );
  });
  $('stayNext')?.addEventListener('click', () => {
    const v = ($('stayInput')?.value || '').trim();
    if (!v) { toast('Type where you’re staying, or use your location'); return; }
    answers.stay = v; answers.lat = null; answers.lon = null; show(3);
  });

  // Q4 — arrival + build
  const today = new Date().toISOString().slice(0, 10);
  if ($('arriveDate')) { $('arriveDate').value = today; $('arriveDate').min = today; }
  $('buildBtn')?.addEventListener('click', build);
}
