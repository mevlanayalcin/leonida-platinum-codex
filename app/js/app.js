import {
  state, loadProgress, subscribe, emit, saveProgress, toggleEarned, select, setView,
  setSpoiler, reveal, resetProgress,
} from './state.js';
import {
  FILTERS, visible, sortTrophies, countFor, isFiltered, isMasked, maskTitle,
} from './filters.js';
import { el, gradeBadge, renderDetail, renderWatchlist } from './detail.js';

let roadmapMod = null;
let ioMod = null;
const loadRoadmap = () => import('./roadmap.js');
const loadIO = () => import('./io.js');

const $ = (selector) => document.querySelector(selector);
const els = {
  list: $('#list'),
  detail: $('#detail'),
  roadmap: $('#roadmap'),
  watchlist: $('#watchlist'),
  filters: $('#filters'),
  search: $('#search'),
  listcount: $('#listcount'),
  gradebar: $('#gradebar'),
  ptext: $('#ptext'),
  ppct: $('#ppct'),
  pfill: $('#pfill'),
  spoilerBtn: $('#spoiler-btn'),
  spoilerState: $('#spoiler-state'),
  backdrop: $('#backdrop'),
};
const GRADES = [['platinum', 'P'], ['gold', 'G'], ['silver', 'S'], ['bronze', 'B']];
let doc;
let byId;
let lastSelected = null;
let resetArmed = false;
let resetTimer = 0;

function renderHeader() {
  const total = doc.trophies.length;
  const earned = doc.trophies.filter((t) => state.earned.has(t.id)).length;
  const pct = total ? Math.round((earned / total) * 100) : 0;
  els.ptext.textContent = `${earned} of ${total} earned`;
  els.ppct.textContent = `${pct}%`;
  els.pfill.style.width = `${pct}%`;
  els.pfill.parentElement.setAttribute('aria-valuenow', String(pct));

  els.gradebar.replaceChildren(el('span', 'gtotal', `${total} trophies`));
  for (const [grade, letter] of GRADES) {
    const inGrade = doc.trophies.filter((t) => t.grade === grade);
    const got = inGrade.filter((t) => state.earned.has(t.id)).length;
    const item = el('span', 'gcount');
    item.title = `${inGrade.length} ${grade} trophies, ${got} earned`;
    item.append(el('span', `gdot ${grade}`), document.createTextNode(letter), el('b', null, `${got}/${inGrade.length}`));
    els.gradebar.append(item);
  }

  els.spoilerBtn.setAttribute('aria-pressed', String(state.spoiler));
  els.spoilerState.textContent = state.spoiler ? 'On' : 'Off';
}

function renderFilters() {
  els.filters.replaceChildren();
  for (const filter of FILTERS) {
    const pressed = filter.kind === 'all'
      ? state.cats.size === 0 && state.flags.size === 0
      : filter.kind === 'cat' ? state.cats.has(filter.id) : state.flags.has(filter.id);
    const chip = el('button', `chip${filter.kind === 'flag' ? ' flag' : ''}`);
    chip.type = 'button';
    chip.dataset.filter = filter.id;
    chip.setAttribute('aria-pressed', String(pressed));
    chip.append(document.createTextNode(filter.label), el('span', 'n', String(countFor(filter.id, doc.trophies, state.earned))));
    chip.addEventListener('click', () => {
      if (filter.kind === 'all') {
        state.cats.clear();
        state.flags.clear();
      } else if (filter.kind === 'cat') {
        if (state.cats.has(filter.id)) state.cats.delete(filter.id); else state.cats.add(filter.id);
      } else if (state.flags.has(filter.id)) state.flags.delete(filter.id);
      else state.flags.add(filter.id);
      emit();
    });
    els.filters.append(chip);
  }
}

function activeFilterLabels() {
  const labels = [];
  for (const filter of FILTERS) {
    if (filter.kind === 'cat' && state.cats.has(filter.id)) labels.push(filter.label);
    if (filter.kind === 'flag' && state.flags.has(filter.id)) labels.push(filter.label);
  }
  return labels;
}

function emptyState(host, shown) {
  const box = el('div', 'empty');
  if (state.cats.size === 1 && state.cats.has('online')) {
    box.append(el('h3', null, '0 online trophies at launch'));
    box.append(el('p', null, '100% offline: no multiplayer, no server-gated trophies. All 55 are earned in single-player (PowerPyx Roadmap, Exophase PS5 List).'));
    return box;
  }
  if (state.query.trim()) {
    box.append(el('h3', null, `No trophy matches “${state.query.trim()}”`));
    box.append(el('p', null, 'Try a trophy, mission, number or phrase from a walkthrough.'));
    return box;
  }
  if (shown === 0) {
    box.append(el('h3', null, 'Nothing matches these filters'));
    box.append(el('p', null, 'Clear a filter or press All for the full official list.'));
    return box;
  }
  return box;
}

function makeRow(trophy) {
  const earned = state.earned.has(trophy.id);
  const masked = isMasked(trophy, state);
  const row = el('div', `row${earned ? ' earned' : ''}${trophy.id === state.selected ? ' sel' : ''}`);
  row.tabIndex = 0;
  row.setAttribute('role', 'button');
  row.dataset.id = String(trophy.id);
  row.setAttribute('aria-label', `${masked ? maskTitle(trophy) : trophy.name}, ${trophy.grade}${earned ? ', earned' : ''}`);

  const tick = el('button', 'tick', earned ? '✓' : '');
  tick.type = 'button';
  tick.setAttribute('aria-pressed', String(earned));
  const tickName = masked ? maskTitle(trophy) : trophy.name;
  tick.setAttribute('aria-label', earned ? `Unmark ${tickName}` : `Mark ${tickName} as earned`);
  tick.addEventListener('click', (event) => { event.stopPropagation(); toggleEarned(trophy.id); });

  const main = el('div', 'rowmain');
  const name = el('div', 'rowname');
  if (masked) {
    const spoiler = el('span', 'redacted');
    spoiler.append(document.createTextNode(maskTitle(trophy)), el('i'));
    name.append(spoiler);
  } else {
    name.append(document.createTextNode(trophy.name));
  }
  main.append(name);
  main.append(el('div', 'rowdesc', masked ? 'Spoiler shielded · reveal to read the description' : trophy.description));

  const meta = el('div', 'rowmeta');
  meta.append(gradeBadge(trophy.grade));
  if (trophy.missable) meta.append(el('span', 'flag missable', 'Missable'));
  else if (trophy.missableNote) meta.append(el('span', 'flag watch', 'Save'));
  if (!masked && trophy.count && trophy.category !== 'story') meta.append(el('span', 'flag count', `${trophy.count}`));
  if (masked) {
    const peek = el('button', 'peekbtn', 'Peek');
    peek.type = 'button';
    peek.setAttribute('aria-label', `Reveal ${maskTitle(trophy)}`);
    peek.addEventListener('click', (event) => { event.stopPropagation(); reveal(trophy.id); });
    meta.append(peek);
  }

  row.append(tick, main, meta);
  row.addEventListener('click', () => select(trophy.id));
  row.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(trophy.id); }
  });
  return row;
}

function renderList() {
  const scroll = els.list.scrollTop;
  const shown = sortTrophies(doc.trophies.filter((trophy) => visible(trophy, state)), state.sort);
  els.list.replaceChildren();
  if (!shown.length) {
    els.list.append(emptyState(els.list, shown.length));
  } else {
    for (const trophy of shown) els.list.append(makeRow(trophy));
  }
  els.list.scrollTop = scroll;

  const labels = activeFilterLabels();
  const base = shown.length === doc.trophies.length && !isFiltered(state)
    ? `All ${doc.trophies.length} trophies`
    : `${shown.length} of ${doc.trophies.length} shown${labels.length ? ` · ${labels.join(' + ')}` : ''}`;
  els.listcount.textContent = base;

  if (state.autoScroll) {
    state.autoScroll = false;
    const row = els.list.querySelector('.row.sel');
    if (row) {
      const view = els.list.getBoundingClientRect();
      const rect = row.getBoundingClientRect();
      if (rect.top < view.top || rect.bottom > view.bottom) {
        els.list.scrollTop += rect.top - view.top - (view.height / 2) + (rect.height / 2);
      }
    }
  }
}

function renderDetailPanel() {
  const trophy = byId.get(state.selected);
  const changed = lastSelected !== state.selected;
  const scroll = els.detail.scrollTop;
  renderDetail(els.detail, trophy, doc.trophies.length);
  els.detail.scrollTop = changed ? 0 : scroll;
  lastSelected = state.selected;
}

function renderView() {
  document.querySelectorAll('.tab').forEach((tab) => {
    const on = tab.dataset.view === state.view;
    tab.classList.toggle('active', on);
    tab.setAttribute('aria-selected', String(on));
  });
  $('#tracker-view').classList.toggle('hidden', state.view !== 'tracker');
  $('#roadmap-view').classList.toggle('hidden', state.view !== 'roadmap');
  if (state.view === 'roadmap' && roadmapMod) {
    roadmapMod.renderRoadmap(els.roadmap, doc);
    renderWatchlist(els.watchlist, doc.trophies);
  }
}

function renderAll() {
  renderHeader();
  renderFilters();
  renderList();
  renderDetailPanel();
  renderView();
}

async function openBackup(tab) {
  if (!ioMod) ioMod = await loadIO();
  ioMod.openIO(doc, tab);
}

function setSort(mode) {
  state.sort = mode;
  saveProgress();
  document.querySelectorAll('.sortbtn').forEach((button) => {
    button.classList.toggle('active', button.dataset.sort === mode);
  });
  renderList();
}

function bind() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', async () => {
      if (tab.dataset.view === 'roadmap' && !roadmapMod) roadmapMod = await loadRoadmap();
      setView(tab.dataset.view);
    });
  });
  document.querySelectorAll('.sortbtn').forEach((button) => {
    button.addEventListener('click', () => setSort(button.dataset.sort));
  });

  els.search.addEventListener('input', () => {
    state.query = els.search.value;
    renderList();
  });

  els.spoilerBtn.addEventListener('click', () => setSpoiler(!state.spoiler));
  $('#export-btn').addEventListener('click', () => openBackup('export'));
  $('#import-btn').addEventListener('click', () => openBackup('import'));
  $('#io-close').addEventListener('click', () => ioMod?.closeIO());
  document.querySelectorAll('.iotabs button').forEach((button) => {
    button.addEventListener('click', () => ioMod?.setIOTab(doc, button.dataset.io));
  });
  els.backdrop.addEventListener('click', (event) => {
    if (event.target === els.backdrop) ioMod?.closeIO();
  });

  const reset = $('#reset-btn');
  reset.addEventListener('click', () => {
    if (!resetArmed) {
      resetArmed = true;
      reset.textContent = 'Confirm reset';
      reset.classList.add('armed');
      resetTimer = window.setTimeout(() => {
        resetArmed = false;
        reset.textContent = 'Reset';
        reset.classList.remove('armed');
      }, 4000);
      return;
    }
    window.clearTimeout(resetTimer);
    resetArmed = false;
    reset.textContent = 'Reset';
    reset.classList.remove('armed');
    resetProgress();
  });

  $('#brand').addEventListener('click', (event) => {
    event.preventDefault();
    state.query = '';
    els.search.value = '';
    state.cats.clear();
    state.flags.clear();
    setView('tracker');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.backdrop.classList.contains('hidden')) { ioMod?.closeIO(); return; }
    const typing = event.target instanceof HTMLElement
      && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA');
    if (typing) return;
    if (event.key === '/' ) { event.preventDefault(); els.search.focus(); }
    if (event.key === 's' || event.key === 'S') setSpoiler(!state.spoiler);
    if (event.key === 'e' || event.key === 'E') openBackup('export');
    if (event.key === 'i' || event.key === 'I') openBackup('import');
  });
}

async function boot() {
  const response = await fetch('./data/trophies.json');
  if (!response.ok) throw new Error(`Trophy data could not be loaded (HTTP ${response.status}).`);
  doc = await response.json();
  byId = new Map(doc.trophies.map((trophy) => [trophy.id, trophy]));
  loadProgress();
  if (!byId.has(state.selected)) state.selected = 28;
  els.search.value = state.query;
  document.querySelectorAll('.sortbtn').forEach((button) => {
    button.classList.toggle('active', button.dataset.sort === state.sort);
  });
  bind();
  subscribe(renderAll);
  renderAll();
}

boot().catch((err) => {
  console.error('Leonida Platinum Codex failed to start:', err);
  const box = document.createElement('div');
  box.className = 'empty';
  box.innerHTML = '<h3>Trophy data unavailable</h3><p>Serve this folder over HTTP (node serve.ts) so the browser may fetch <code>data/trophies.json</code>.</p>';
  els.list.replaceChildren(box);
});
