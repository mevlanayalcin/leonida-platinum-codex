// The tracker list core: progress header, truthful filter pills and all 55 rows.
// Loaded by app.js right after the trophy data, so the first HTML/CSS paint stays tiny.
import { state, emit, toggleEarned, select, reveal, setPane } from './state.js';
import { FILTERS, filterTrophies, countFor, isMasked, maskName } from './filters.js';

const $ = (s) => document.querySelector(s);
const ui = {
  list: $('#trophy-list'), filters: $('#trophy-filters'), search: $('#trophy-search'), count: $('#list-count'),
  label: $('#progress-label'), pct: $('#progress-pct'), fill: $('#progress-fill'),
  spoiler: $('#spoiler-toggle'), spoilerState: $('#spoiler-state'),
};
const GRADE = { platinum: '◆ Platinum', gold: '★ Gold', silver: '✦ Silver', bronze: '● Bronze' };
let doc;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const badge = (grade) => {
  const [icon, label] = GRADE[grade].split(' ');
  return `<span class="grade ${grade}" title="${label} trophy"><i>${icon}</i>${label}</span>`;
};

function renderHeader() {
  const total = doc.trophies.length;
  const earned = doc.trophies.filter((t) => state.earned.has(t.id)).length;
  const pct = Math.round((earned / total) * 100);
  ui.label.textContent = `${earned} of ${total} earned`;
  ui.pct.textContent = `${pct}%`;
  ui.fill.style.width = `${pct}%`;
  ui.fill.parentElement.setAttribute('aria-valuenow', String(pct));
  ui.spoiler.setAttribute('aria-pressed', String(state.spoiler));
  ui.spoilerState.textContent = state.spoiler ? 'On' : 'Off';
}

function renderFilters() {
  ui.filters.innerHTML = FILTERS.map((f) => {
    const on = f.kind === 'all' ? !state.cats.size && !state.flags.size
      : f.kind === 'cat' ? state.cats.has(f.id) : state.flags.has(f.id);
    return `<button type="button" class="chip ${f.kind}" data-filter="${f.id}" aria-pressed="${on}">${f.label}<span class="n">${countFor(f.id, doc.trophies, state.earned)}</span></button>`;
  }).join('');
}

function emptyHTML() {
  if (state.cats.has('online') && state.cats.size === 1) return '<div class="callout"><h3>0 online trophies at launch</h3><p>All 55 are earned in single-player. Try Story, Collectibles or Activities.</p></div>';
  if (state.query.trim()) return `<div class="callout"><h3>No trophy matches “${esc(state.query.trim())}”</h3><p>Try a name, a mission, a source or a number from a walkthrough.</p></div>`;
  return '<div class="callout"><h3>Nothing matches these filters</h3><p>Clear a filter or press All for the full official list.</p></div>';
}

function rowHTML(t) {
  const earned = state.earned.has(t.id);
  const masked = isMasked(t, state);
  const name = masked ? maskName(t) : t.name;
  const flag = t.missable ? '<span class="flag missable">Missable</span>'
    : t.missableNote ? '<span class="flag save">Chapter save</span>' : '';
  const count = !masked && t.count && t.category !== 'story' ? `<span class="flag tracked">Tracked ${t.count}</span>` : '';
  const hide = masked ? `<span class="redacted">${name}<i></i></span>` : esc(name);
  const desc = masked ? 'Spoiler shielded — press Peek to reveal.' : esc(t.description);
  return `<div class="row${earned ? ' earned' : ''}${t.id === state.selected ? ' sel' : ''}" role="button" tabindex="0" data-id="${t.id}" aria-label="${esc(name)}, ${t.grade}${earned ? ', earned' : ''}">
<button class="tick" type="button" aria-pressed="${earned}" aria-label="${earned ? 'Unmark' : 'Mark'} ${esc(name)} as earned">${earned ? '✓' : ''}</button>
<div class="rowmain"><div class="rowname">${hide}</div><div class="rowdesc">${desc}</div></div>
<div class="rowmeta">${badge(t.grade)}${flag}${count}${masked ? '<button class="flag peek" type="button">Peek</button>' : ''}</div></div>`;
}

function renderList() {
  const shown = filterTrophies(doc.trophies, state);
  const scroll = ui.list.scrollTop;
  ui.list.innerHTML = shown.length ? shown.map(rowHTML).join('') : emptyHTML();
  ui.list.scrollTop = scroll;
  const labels = FILTERS.filter((f) => (f.kind === 'cat' && state.cats.has(f.id)) || (f.kind === 'flag' && state.flags.has(f.id))).map((f) => f.label);
  ui.count.textContent = !state.cats.size && !state.flags.size && !state.query.trim() ? `All ${doc.trophies.length} trophies`
    : `${shown.length} of ${doc.trophies.length} shown${labels.length ? ` · ${labels.join(' + ')}` : ''}`;
  if (state.autoScroll) {
    state.autoScroll = false;
    const row = ui.list.querySelector('.row.sel');
    if (row) {
      const box = ui.list.getBoundingClientRect();
      const rect = row.getBoundingClientRect();
      if (rect.top < box.top || rect.bottom > box.bottom) ui.list.scrollTop += rect.top - box.top - box.height / 2 + rect.height / 2;
    }
  }
}

/** Render every tracker surface; called on boot and after each state change. */
export function renderTracker() {
  renderHeader();
  renderFilters();
  renderList();
}

export function mountTracker(data) {
  doc = data;
  ui.search.value = state.query;
  ui.search.oninput = () => { state.query = ui.search.value; renderList(); };

  ui.filters.onclick = (event) => {
    const chip = event.target.closest('[data-filter]');
    if (!chip) return;
    const filter = FILTERS.find((f) => f.id === chip.dataset.filter);
    if (filter.kind === 'all') { state.cats.clear(); state.flags.clear(); }
    else if (filter.kind === 'cat') { if (state.cats.has(filter.id)) state.cats.delete(filter.id); else state.cats.add(filter.id); }
    else if (state.flags.has(filter.id)) state.flags.delete(filter.id);
    else state.flags.add(filter.id);
    state.autoScroll = false;
    emit();
    ui.list.scrollTop = 0;
  };

  ui.list.onclick = (event) => {
    const row = event.target.closest('.row');
    if (!row) return;
    const id = Number(row.dataset.id);
    if (event.target.closest('.tick')) toggleEarned(id);
    else if (event.target.closest('.peek')) reveal(id);
    else select(id);
  };
  ui.list.onkeydown = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('row')) {
      event.preventDefault();
      select(Number(event.target.dataset.id));
    }
  };
  document.onkeydown = (event) => {
    if (event.key === 'Escape' && state.pane === 'io') setPane('detail');
    if (event.key === '/' && event.target.tagName !== 'INPUT') { event.preventDefault(); ui.search.focus(); }
  };
}
