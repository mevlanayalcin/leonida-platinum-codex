// The tracker list (chips, search, sort, 55 rows with flags and 2+ site counts) and the shell keys: 1-5 views,
// / search, J / K next / previous row, M earned, S spoilers, Esc back.
import { state, emit, toggleEarned, select, togglePeek, setView, setPane, toggleSpoilerShield, resetProgress } from './state.js';
import { FILTERS, filterByKind, countFor, isMasked, isShieldable, maskName, MASK_DESCRIPTION } from './filters.js';
import { medal, css, GRADE_LABEL } from './dom.js';

const $ = (s) => document.querySelector(s);
const ui = { list: $('#trophy-list'), filters: $('#trophy-filters'), search: $('#trophy-search'), count: $('#list-count') };
const VIEWS = ['tracker', 'roadmap', 'map', 'audit', 'backup'];
let doc, shown = [];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function renderFilters() {
  ui.filters.innerHTML = FILTERS.map((f) => {
    const on = f.kind === 'all' ? !state.cats.size && !state.flags.size : (f.kind === 'cat' ? state.cats : state.flags).has(f.id);
    return `<button type="button" class="chip k-${f.kind}" data-filter="${f.id}" aria-pressed="${on}">${f.label}<b>${countFor(f.id, doc.trophies, state)}</b></button>`;
  }).join('');
}

function flagsHTML(t, earned) {
  if (isMasked(t, state)) return '<button class="flag peekbtn" type="button" data-peek>Peek</button>';
  let f = '';
  if (state.spoiler && isShieldable(t) && earned) f += '<span class="flag tracked">Unshielded</span>';
  if (state.peek.has(t.id)) f += '<button class="flag peeked" type="button" data-peek>Peeked · hide</button>';
  if (t.missable) f += '<span class="flag missable">Missable</span>';
  if (t.conflicts.length) f += `<span class="flag conflict" title="${esc(t.conflicts.map((c) => c.title).join(' · '))}">⚖ Sources differ</span>`;
  if (t.saveSlot && !state.spoiler) f += `<span class="flag save" title="Chapter save slot ${t.saveSlot}">S${t.saveSlot}</span>`;
  return f;
}

function rowHTML(t) {
  const earned = state.earned.has(t.id);
  const masked = isMasked(t, state);
  const name = esc(masked ? maskName(t) : t.name);
  return `<div class="row${earned ? ' earned' : ''}${t.id === state.selected ? ' sel' : ''}" role="button" tabindex="0" data-id="${t.id}">`
    + `<button class="tick" type="button" aria-pressed="${earned}" aria-label="${earned ? 'Unmark' : 'Mark'} ${name} as earned">${earned ? '✓' : ''}</button>${medal(t.grade, 26)}`
    + `<div class="rowmain"><div class="rowname"><span${masked ? ' class="masked"' : ''}>${name}</span>${flagsHTML(t, earned)}</div><div class="rowdesc">${masked ? MASK_DESCRIPTION : esc(t.description)}</div></div>`
    + `<div class="rowmeta"><span class="gword ${t.grade}">${GRADE_LABEL[t.grade]}</span><span class="flag cited" title="${t.multi} of ${t.claims.length} claims on 2+ sites">${t.multi}/${t.claims.length} 2+</span></div></div>`;
}

function renderList() {
  shown = filterByKind(doc.trophies, state);
  const scroll = ui.list.scrollTop;
  ui.list.innerHTML = shown.length ? shown.map(rowHTML).join('') : '<p class="empty"><b>Nothing matches.</b> All 55 are single-player, 0 online (PowerPyx, Push Square). Press All for the full list.</p>';
  ui.list.scrollTop = scroll;
  const labels = FILTERS.filter((f) => state.cats.has(f.id) || state.flags.has(f.id)).map((f) => f.label);
  ui.count.textContent = !labels.length && !state.query.trim() ? `All ${doc.trophies.length} · PS5 order`
    : `${shown.length} of ${doc.trophies.length}${labels.length ? ` · ${labels.join(' + ')}` : ''}`;
  if (state.autoScroll) {
    state.autoScroll = false;
    ui.list.querySelector('.row.sel')?.scrollIntoView({ block: 'nearest' });
  }
}

/** Render the chips and rows; called after each state change. */
export function renderTracker() {
  renderFilters();
  renderList();
}

/** J / K: select the next or previous row of the filtered, sorted list, wrapping at the ends. */
export function moveSelection(delta) {
  if (!shown.length) return;
  const at = shown.findIndex((t) => t.id === state.selected);
  state.view = 'tracker';
  select(shown[at < 0 ? (delta > 0 ? 0 : shown.length - 1) : (at + delta + shown.length) % shown.length].id);
}

const go = (v) => (v === 'backup' ? setPane('io') : (state.pane = 'detail', setView(v)));

export function mountTracker(data) {
  doc = data;
  document.querySelectorAll('.tab').forEach((tab) => { tab.onclick = () => go(tab.dataset.view); });
  $('#spoiler-toggle').onclick = () => toggleSpoilerShield();
  $('#reset-progress').onclick = () => { if (confirm('Clear all local progress?')) resetProgress(); };
  document.onkeydown = (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (VIEWS[e.key - 1]) go(VIEWS[e.key - 1]);
    else if (k === 'j' || k === 'k') moveSelection(k === 'j' ? 1 : -1);
    else if (k === 'm') toggleEarned(state.selected);
    else if (k === 's') toggleSpoilerShield();
    else if (k === 'escape') go('tracker');
    else if (k === '/') { e.preventDefault(); go('tracker'); ui.search.focus(); }
  };
  ui.search.value = state.query;
  ui.search.oninput = () => { state.query = ui.search.value; renderList(); };
  ui.search.onkeydown = (e) => { if (e.key === 'Escape' || e.key === 'Enter') ui.search.blur(); };
  ui.filters.onclick = (event) => {
    const f = FILTERS.find((x) => x.id === event.target.closest('[data-filter]')?.dataset.filter);
    if (!f) return;
    const set = f.kind === 'cat' ? state.cats : state.flags;
    if (f.kind === 'all') { state.cats.clear(); state.flags.clear(); } else if (!set.delete(f.id)) set.add(f.id);
    emit();
    ui.list.scrollTop = 0;
  };
  ui.list.onclick = (event) => {
    const row = event.target.closest('.row');
    if (!row) return;
    const id = Number(row.dataset.id);
    if (event.target.closest('.tick')) toggleEarned(id);
    else if (event.target.closest('[data-peek]')) togglePeek(id);
    else select(id);
  };
  ui.list.onkeydown = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('row')) {
      event.preventDefault();
      select(Number(event.target.dataset.id));
    }
  };
}

css('.split.tri{grid-template-columns:minmax(0,1fr) 412px 262px;gap:12px}.split.io{grid-template-columns:minmax(0,1fr) 470px}.io .rail{display:none}'
  + '.rail{min-height:0;overflow-y:auto;padding:10px 11px;border:1px solid var(--line);border-radius:13px;background:#111a2c}'
  + '.saved{font-size:11px;font-weight:800;color:#9dffbf;white-space:nowrap}.saved.off{color:#ffc2d3}'
  + '.chip{display:inline-flex;align-items:center;gap:4px;height:27px;padding:0 6px;border:1px solid var(--line);border-radius:8px;background:#1a2339;color:var(--body);font-size:11px;font-weight:750;white-space:nowrap}'
  + '.chip b{font-size:10.5px;color:var(--dim)}.chip[aria-pressed=true]{color:#fff;border-color:#ff5c8aa6;background:#ff5c8a33}'
  + '.k-flag[aria-pressed=true]{border-color:#38e3cf99;background:#38e3cf26}'
  + '[data-filter=conflicts]{border-color:#ffb24d59;color:#ffe1b0}[data-filter=conflicts] b{color:#ffb24d}'
  + '.flag.conflict{color:#ffe3b3;background:#ffb24d24;text-transform:none}'
  + '.row{display:grid;grid-template-columns:22px 26px minmax(0,1fr) auto;gap:10px;align-items:center;min-height:46px;padding:4px 10px;border-bottom:1px solid var(--line2);cursor:pointer}'
  + '.row.sel{background:linear-gradient(90deg,#ff5c8a2e,#ff5c8a0d);box-shadow:inset 3px 0 var(--coral)}'
  + '.tick{width:22px;height:22px;padding:0;border:1.5px solid #ffffff47;border-radius:6px;background:#0a101d;font-size:12px;font-weight:900}'
  + '.earned .tick{background:var(--lagoon);border-color:var(--lagoon);color:#04241f}'
  + '.rowmain{min-width:0}.rowname{display:flex;align-items:center;gap:5px;font-size:14px;font-weight:720;line-height:1.3;white-space:nowrap}'
  + '.rowname>span{min-width:0;overflow:hidden;text-overflow:ellipsis}.rowname .flag,.rowmeta .flag{height:17px;padding:0 5px;font-size:9.5px}.masked{color:#ffb7cb}'
  + '.rowdesc{font-size:12px;line-height:1.35;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.rowmeta{display:flex;flex-direction:column;align-items:flex-end;gap:2px}.gword{font-size:10px;font-weight:850;text-transform:uppercase}'
  + '.gword.platinum{color:#bff1ff}.gword.gold{color:#ffd56e}.gword.silver{color:#e3e9f3}.gword.bronze{color:#f0ab7c}'
  + '.peekbtn{color:#1d0a12;background:#ffc061}.peeked{color:#2a0612;background:#ff8fb0}.empty{margin:0;padding:18px;color:var(--muted)}');
