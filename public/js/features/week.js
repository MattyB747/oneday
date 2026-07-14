// THE DECISION LAYER (landing). The week as 7 verdicts — "the best version of each
// day" — each a headline + reason, tap to expand the plan and the evidence behind
// it. Raw data rides underneath as the "why", not the hero.
import { api } from '../core/api.js';
import { loadTrip } from './trip.js';

const $ = (id) => document.getElementById(id);
const CAPE_TOWN = { lat: -33.9249, lon: 18.4241 };
let days = 5;
let ctx = null;

function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400); }
function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); }
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stat = (label, value) => value == null || value === '' ? '' : `<div class="wStat"><span class="sl">${label}</span><span class="sv">${esc(value)}</span></div>`;

function planHtml(plan) {
  if (!plan || !plan.length) return '';
  return `<div class="dPlan">${plan.map((p) => `
    <div class="dStop">
      <span class="dt">${p.time ? esc(p.time) : '•'}</span>
      <div class="dStopBody">
        <b>${esc(p.name)}</b>${p.where ? ` <small>${esc(p.where)}</small>` : ''}
        ${p.why ? `<div class="dw">${esc(p.why)}</div>` : ''}
        ${p.cost ? `<span class="dc">${esc(p.cost)}</span>` : ''}${p.meal ? '<span class="dMeal">🍴 lunch</span>' : ''}
      </div>
    </div>`).join('')}</div>`;
}

function evidenceHtml(d) {
  const w = d.weather;
  const season = (d.inSeason || []).map((s) => `<span class="wPill">${s.icon || '✨'} ${esc(s.name)}</span>`).join('');
  const caution = (d.cautions || []).map((c) => `<span class="wPill warn">⚠︎ ${esc(c.name || c)}</span>`).join('');
  return `
    <div class="dEvidence">
      <div class="dEvHead">The conditions behind this</div>
      <div class="wStats">
        ${stat('HIGH / LOW', `${w.hi}° / ${w.lo != null ? w.lo + '°' : '—'}`)}
        ${stat('WIND', w.windKmh + ' km/h')}
        ${stat('RAIN', w.rainProb + '%')}
        ${stat('UV', w.uvBand ? `${w.uv} ${w.uvBand}` : null)}
        ${stat('SUNRISE', d.sun.rise)}
        ${stat('SUNSET', d.sun.set)}
        ${stat('LOW TIDE', (d.tide.low || []).join(' & ') || null)}
        ${stat('MOON', d.moon)}
      </div>
      ${(season || caution) ? `<div class="wPills">${season}${caution}</div>` : ''}
      <div class="dEvHead">Also on today <span class="wCount">${(d.events || []).length}</span></div>
      <div class="dEvents">${(d.events || []).slice(0, 8).map((e) => `<div class="dEvent"><b>${esc(e.name)}</b> <small>${esc(e.where)}</small></div>`).join('') || '<div class="wQuiet">Quiet day.</div>'}</div>
    </div>`;
}

function decisionRow(d, i) {
  const w = d.weather, v = d.verdict;
  return `
    <div class="dRow" data-i="${i}">
      <button class="dHead" type="button">
        <span class="dEmoji">${v.emoji}</span>
        <span class="dMain">
          <span class="dDay">${esc(d.label)}${d.holiday ? ` · <em>${esc(d.holiday)}</em>` : ''}</span>
          <span class="dVerdict">${esc(v.label)}</span>
          <span class="dWhy">${esc(v.reason)}</span>
        </span>
        <span class="dWx">${w.icon}<b>${w.hi}°</b></span>
        <span class="dChev">›</span>
      </button>
      <div class="dBody">${planHtml(d.plan)}${evidenceHtml(d)}</div>
    </div>`;
}

export async function loadWeek(next) {
  ctx = next;
  $('weekGrid').innerHTML = '<div class="wLoading">Reading Cape Town’s week — weather, tides, what’s on…</div>';
  show('week');
  try {
    const q = ctx.tripId ? `tripId=${encodeURIComponent(ctx.tripId)}` : `lat=${ctx.lat}&lon=${ctx.lon}`;
    const w = await api(`/api/weekplan?${q}`);
    $('weekGrid').innerHTML = (w.days || []).map(decisionRow).join('');
    // Expand/collapse a day.
    $('weekGrid').querySelectorAll('.dHead').forEach((btn) => btn.addEventListener('click', () => {
      const row = btn.closest('.dRow');
      const open = row.classList.contains('open');
      $('weekGrid').querySelectorAll('.dRow.open').forEach((r) => r.classList.remove('open'));
      if (!open) row.classList.add('open');
    }));
    const nn = $('natureNow');
    if (w.natureNow && w.natureNow.length) { nn.innerHTML = `🐾 <b>Live in nature right now:</b> ${esc(w.natureNow[0])}`; nn.hidden = false; }
    else nn.hidden = true;
  } catch (err) {
    $('weekGrid').innerHTML = `<div class="wLoading">Couldn’t read the week — ${esc(err.message)}</div>`;
  }
}

function renderDays() {
  $('dayPick').innerHTML = [2, 3, 4, 5, 7].map((n) => `<button class="dayChip${n === days ? ' on' : ''}" data-n="${n}">${n === 7 ? '7+' : n} day${n === 1 ? '' : 's'}</button>`).join('');
}

export function mountWeek() {
  renderDays();
  $('dayPick')?.addEventListener('click', (e) => { const b = e.target.closest('.dayChip'); if (!b) return; days = Number(b.dataset.n); renderDays(); });
  $('planBtn')?.addEventListener('click', async () => {
    if (!ctx) return;
    $('planBtn').disabled = true; $('planBtn').textContent = 'Planning…';
    try {
      try { sessionStorage.setItem('odDays', String(days)); } catch (_) {}
      show('trip');
      await loadTrip({ tripId: ctx.tripId, lat: ctx.lat, lon: ctx.lon, days });
    } catch (err) { toast(err.message || 'Could not plan — try again'); show('week'); }
    finally { $('planBtn').disabled = false; $('planBtn').textContent = 'Plan my trip →'; }
  });

  let boot = { ...CAPE_TOWN };
  try {
    const t = sessionStorage.getItem('odTrip'); const stay = JSON.parse(sessionStorage.getItem('odStay') || 'null');
    if (t && stay) boot = { tripId: t, lat: stay.lat, lon: stay.lon };
  } catch (_) {}
  loadWeek(boot);
}
