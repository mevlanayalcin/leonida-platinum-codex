// The tracker list: filter chips with live counts, search, a sort menu,
// and all 55 rows with medallion, official name and description, flags (missable, sources differ) and cited-source count.
import { state, emit, toggleEarned, select, togglePeek, setView, setPane, toggleSpoilerShield, resetProgress } from './state.js';
import { FILTERS, filterByKind, countFor, isMasked, isShieldable, maskName, MASK_DESCRIPTION } from './filters.js';
import { medal, GRADE_LABEL } from './dom.js';

const $ = (s) => document.querySelector(s);
const ui = {
  list: $('#trophy-list'), filters: $('#trophy-filters'), search: $('#trophy-search'), count: $('#list-count'),
};
let doc;
const RANK = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const SORTS = {
  ps5: ['PS5 order', (a, b) => a.id - b.id],
  stage: ['Roadmap phase', (a, b) => a.stage - b.stage || a.id - b.id],
  grade: ['Grade', (a, b) => RANK[a.grade] - RANK[b.grade] || a.id - b.id],
  todo: ['Unearned first', (a, b) => state.earned.has(a.id) - state.earned.has(b.id) || a.id - b.id],
};
let sortBy = 'ps5';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderFilters() {
  ui.filters.innerHTML = FILTERS.map((f) => {
    const on = f.kind === 'all' ? !state.cats.size && !state.flags.size
      : f.kind === 'cat' ? state.cats.has(f.id) : state.flags.has(f.id);
    return `<button type="button" class="chip k-${f.kind}" data-filter="${f.id}" aria-pressed="${on}">${f.label}<b>${countFor(f.id, doc.trophies, state)}</b></button>`;
  }).join('');
}

function emptyHTML() {
  if (state.cats.has('online') && state.cats.size === 1) return '<p class="empty"><b>0 online trophies.</b> All 55 are single-player (PowerPyx, Push Square).</p>';
  return '<p class="empty"><b>Nothing matches.</b> Clear a filter or press All for the full official list.</p>';
}

function rowHTML(t) {
  const earned = state.earned.has(t.id);
  const masked = isMasked(t, state);
  const name = masked ? maskName(t) : t.name;
  let flags = '';
  if (masked) flags = '<button class="flag peekbtn" type="button" data-peek>Peek</button>';
  else {
    if (state.spoiler && isShieldable(t) && earned) flags += '<span class="flag tracked">Earned · unshielded</span>';
    if (state.peek.has(t.id)) flags += '<button class="flag peeked" type="button" data-peek>Peeked · hide</button>';
    if (t.missable) flags += '<span class="flag missable">Missable</span>';
    if (t.conflicts.length) flags += `<span class="flag conflict" title="${t.conflicts.map((c) => esc(c.title)).join(' · ')}">⚖ Sources differ</span>`;
    if (t.saveSlot && !state.spoiler) flags += `<span class="flag save" title="Chapter save slot ${t.saveSlot}">S${t.saveSlot}</span>`;
    if (t.count && t.category !== 'story') flags += `<span class="flag tracked">Tracked ${t.count.toLocaleString('en-US')}</span>`;
  }
  return `<div class="row${earned ? ' earned' : ''}${t.id === state.selected ? ' sel' : ''}" role="button" tabindex="0" data-id="${t.id}">
<button class="tick" type="button" aria-pressed="${earned}" aria-label="${earned ? 'Unmark' : 'Mark'} ${esc(name)} as earned">${earned ? '✓' : ''}</button>${medal(t.grade, 26)}
<div class="rowmain"><div class="rowname${masked ? ' masked' : ''}">${esc(name)}</div><div class="rowdesc">${masked ? MASK_DESCRIPTION : esc(t.description)}</div></div>
<div class="rowmeta">${flags}<span class="gword ${t.grade}">${GRADE_LABEL[t.grade]}</span><span class="flag cited" title="${t.sources.length} pages cited">${t.multi}/${t.claims.length} on 2+</span></div></div>`;
}

function renderList() {
  const shown = filterByKind(doc.trophies, state).sort(SORTS[sortBy][1]);
  const scroll = ui.list.scrollTop;
  ui.list.innerHTML = shown.length ? shown.map(rowHTML).join('') : emptyHTML();
  ui.list.scrollTop = scroll;
  const labels = FILTERS.filter((f) => state.cats.has(f.id) || state.flags.has(f.id)).map((f) => f.label);
  ui.count.textContent = !labels.length && !state.query.trim() ? `All ${doc.trophies.length} trophies · ${SORTS[sortBy][0]}`
    : `${shown.length} of ${doc.trophies.length} shown${labels.length ? ` · ${labels.join(' + ')}` : ''}`;
  if (state.autoScroll) {
    state.autoScroll = false;
    ui.list.querySelector('.row.sel')?.scrollIntoView({ block: 'nearest' });
  }
}

/** Render every tracker surface; called on boot and after each state change. */
export function renderTracker() {
  renderFilters();
  renderList();
}

/** Keys: / search, 1-4 views, S spoiler shield, Esc back to the guide. */
const go = (v) => (v === 'backup' ? setPane('io') : (state.pane = 'detail', setView(v)));
function bindShell() {
  document.querySelectorAll('.tab').forEach((tab) => { tab.onclick = () => go(tab.dataset.view); });
  $('#spoiler-toggle').onclick = () => toggleSpoilerShield();
  $('#reset-progress').onclick = () => { if (confirm('Clear all local progress?')) resetProgress(); };
  document.onkeydown = (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const v = ['tracker', 'roadmap', 'map', 'backup'][e.key - 1];
    if (v) go(v);
    else if (e.key === 's' || e.key === 'S') toggleSpoilerShield();
    else if (e.key === 'Escape') go('tracker');
    else if (e.key === '/') { e.preventDefault(); go('tracker'); ui.search.focus(); }
  };
}

export function mountTracker(data) {
  doc = data;
  bindShell();
  ui.search.value = state.query;
  ui.search.oninput = () => { state.query = ui.search.value; renderList(); };
  const menu = document.createElement('select');
  menu.className = 'sort';
  menu.id = 'trophy-sort';
  menu.setAttribute('aria-label', 'Sort trophies');
  menu.innerHTML = Object.entries(SORTS).map(([id, [label]]) => `<option value="${id}">Sort · ${label}</option>`).join('');
  menu.onchange = () => { sortBy = menu.value; renderList(); };
  ui.search.parentElement.before(menu);
  ui.filters.onclick = (event) => {
    const id = event.target.closest('[data-filter]')?.dataset.filter;
    const f = FILTERS.find((x) => x.id === id);
    if (!f) return;
    const set = f.kind === 'cat' ? state.cats : state.flags;
    if (f.kind === 'all') { state.cats.clear(); state.flags.clear(); }
    else if (set.has(id)) set.delete(id);
    else set.add(id);
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

const LIST_CSS = '.listmeta .sort{margin-left:auto;margin-right:6px;height:28px;padding:0 6px;border:1px solid var(--line);border-radius:8px;background:#0a0f1c;color:var(--body);font:700 11.5px var(--font);text-transform:none;letter-spacing:0}'
  + '.chip{display:inline-flex;align-items:center;gap:4px;height:29px;padding:0 6px;border:1px solid var(--line);border-radius:8px;background:#1a2339;color:var(--body);font-size:11px;font-weight:750;white-space:nowrap}'
  + '.chip b{font-size:10.5px;color:var(--dim)}'
  + '.chip[aria-pressed=true]{color:#fff;border-color:#ff5c8aa6;background:#ff5c8a33}.chip[aria-pressed=true] b{color:#ffc2d3}'
  + '.chip.k-flag[aria-pressed=true]{border-color:#38e3cf99;background:#38e3cf26}.chip.k-flag[aria-pressed=true] b{color:#b5fbf1}'
  + '.chip[data-filter=conflicts]{border-color:#ffb24d59;color:#ffe1b0}.chip[data-filter=conflicts] b{color:#ffb24d}'
  + '.chip[data-filter=conflicts][aria-pressed=true]{border-color:#ffb24dcc;background:#ffb24d2e}'
  + '.flag.conflict{color:#ffe3b3;background:#ffb24d24;box-shadow:inset 0 0 0 1px #ffb24d73;text-transform:none;letter-spacing:0}'
  + '.row{display:grid;grid-template-columns:24px 26px minmax(0,1fr) auto;gap:11px;align-items:center;min-height:47px;padding:4px 14px 4px 12px;border-bottom:1px solid var(--line2);cursor:pointer}'
  + '.row.sel{background:linear-gradient(90deg,#ff5c8a2e,#ff5c8a0d);box-shadow:inset 3px 0 var(--coral)}'
  + '.tick{width:22px;height:22px;padding:0;border:1.5px solid #ffffff47;border-radius:6px;background:#0a101d;display:grid;place-items:center;font-size:12px;font-weight:900;color:#0000}'
  + '.row.earned .tick{background:var(--lagoon);border-color:var(--lagoon);color:#04241f}'
  + '.rowmain{min-width:0}.rowname{font-size:14.5px;font-weight:720;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.rowname.masked{color:#ffb7cb}.rowname.masked:after{content:"";display:inline-block;width:64px;height:8px;margin-left:8px;border-radius:2px;background:#ff5c8a59}'
  + '.rowdesc{font-size:12.3px;line-height:1.35;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.rowmeta{display:flex;align-items:center;gap:6px}'
  + '.gword{width:64px;font-size:10.5px;font-weight:850;letter-spacing:.05em;text-transform:uppercase;text-align:right}'
  + '.gword.platinum{color:#bff1ff}.gword.gold{color:#ffd56e}.gword.silver{color:#e3e9f3}.gword.bronze{color:#f0ab7c}'
  + '.peekbtn{color:#1d0a12;background:#ffc061;cursor:pointer}.peeked{color:#2a0612;background:#ff8fb0;cursor:pointer}'
  + '.empty{margin:0;padding:18px;color:var(--muted)}';
document.head.append(Object.assign(document.createElement('style'), { textContent: LIST_CSS }));
