// The Platinum maths: counters, hours left, roadmap order, missable windows and the audit numbers, plus the one-line
// Platinum Progress bar above the tracker and the Next Up card in its rail. Every count is read from trophies.json.
import { el, btn, medal, css, GRADE_LABEL } from './dom.js';
import { state, commit, openTrophy } from './state.js';
import { isMasked, maskName } from './filters.js';

export const POINTS = { platinum: 300, gold: 90, silver: 30, bronze: 15 };
/** PowerPyx's estimate (60-80 h story, ~100 h checklist, ~10 h clean-up); Push Square says up to 300 h. */
export const BASE_HOURS = 200;
const STAGE_HOURS = { 1: 70, 2: 100, 3: 30 };
export const STAGES = {
  1: ['Story & Missables', 'Ch.1–5'], 2: ['Collectibles & 100%', 'A Long Road'], 3: ['Activities & Clean-up', 'Post-game'],
};

// [trophy id, what its count counts, step of the +/- buttons]; the goal is the trophy's own count.
const TABLE = [[28, 'meditations'], [15, 'stunts', 5], [17, 'range golds'], [32, 'challenges'], [25, 'strands'], [18, 'drone races'],
  [19, 'races'], [16, 'activity types'], [30, 'card sets'], [31, 'WAiNK spots', 5], [35, 'vehicles', 5], [42, 'places', 2],
  [43, 'gangs'], [40, 'vaults'], [54, 'garages'], [55, 'scooters'], [48, 'choices', 10], [52, '$ laundered', 10000],
  [53, '$ spent', 5000], [14, '% complete']];
export const COUNTERS = Object.fromEntries(TABLE.map(([id, label, unit = 1]) => [`t${id}`, { id, label, unit }]));

/** The counter a trophy carries (goal = its official count), or null. */
export function counterFor(t) {
  const c = COUNTERS[`t${t.id}`];
  return c && t.count ? { key: `t${t.id}`, goal: t.count, label: c.label, unit: c.unit } : null;
}

/** A Long Road's 100% checklist (missions, vehicles, animals...) as counters, each with its cite key. */
export const longRoad = (t) => (t.checklist ?? []).filter(([n]) => /^\d+$/.test(n))
  .map(([n, label, cite]) => ({ key: `alr:${label}`, goal: Number(n), label, unit: n >= 100 ? 5 : 1, cite }));

/** 0..1: earned is 1, a counter is its share, otherwise half the share of ticked steps. */
export function counterProgress(t) {
  if (state.earned.has(t.id)) return 1;
  const c = counterFor(t);
  if (c && state.counters[c.key]) return Math.min(1, state.counters[c.key] / c.goal);
  return t.steps.length ? ((state.steps[t.id] ?? []).length / t.steps.length) / 2 : 0;
}

export function hoursLeft(doc) {
  const per = {};
  for (const t of doc.trophies) per[t.stage] = (per[t.stage] ?? 0) + 1;
  const left = doc.trophies.reduce((h, t) => h + (STAGE_HOURS[t.stage] / per[t.stage]) * (1 - counterProgress(t)), 0);
  return Math.round(left * (BASE_HOURS / 200));
}

/** Save slots pair up per chapter (S1-S2 = Ch.1 ... S9-S10 = Ch.5). */
export const chapterOf = (t) => (t.saveSlot ? `Ch.${Math.min(5, Math.ceil(t.saveSlot / 2))}` : t.missableChapter ?? null);

/** Unearned trophies in roadmap order: missables first, then stage, save slot and list order; the platinum last. */
export function computeNextUpTrophies(trophies, earned, limit = 4) {
  const rank = (t) => [t.grade === 'platinum' ? 1 : 0, t.missable ? 0 : 1, t.stage, t.saveSlot ?? 99, t.id];
  const cmp = (a, b) => {
    const x = rank(a), y = rank(b);
    const i = x.findIndex((v, j) => v !== y[j]);
    return i < 0 ? 0 : x[i] - y[i];
  };
  return trophies.filter((t) => !earned.has(t.id)).sort(cmp).slice(0, limit);
}

/** Missables still unearned after a story trophy past their chapter has popped: [{ t, closer }]. */
export function passedWindow(trophies, earned) {
  const out = [];
  for (const t of trophies) {
    if (!t.missable || earned.has(t.id)) continue;
    const end = 2 * Number(String(t.missableChapter).replace(/\D/g, ''));
    const closer = trophies.find((s) => s.saveSlot >= end && earned.has(s.id));
    if (closer) out.push({ t, closer });
  }
  return out;
}

/** Each page this guide cites, with how many of its claims name that page, most-cited first. */
export function buildGuideSourceSummary(trophy, sources, read) {
  const byKey = new Map(sources.map((s) => [s.key, s]));
  const claims = trophy.claims ?? trophy.steps;
  return trophy.sources.map((s) => byKey.get(s.key) ?? s)
    .map((s) => ({ ...s, read, claims: claims.filter((c) => c.cites.includes(s.key)).length }))
    .sort((a, b) => b.claims - a.claims || a.label.localeCompare(b.label));
}

export const disputesFor = (doc, id) => doc.conflicts.filter((c) => c.trophies.includes(id));

export function auditSummary(doc) {
  const a = doc.audit;
  return {
    official: `${a.n}/55`, grades: `${a.g.platinum}P ${a.g.gold}G ${a.g.silver}S ${a.g.bronze}B`, cited: `${a.claims}/${a.total}`,
    uncited: a.uncited, multi: `${a.multi}/${a.claims}`, multiN: a.multi, rate: Math.round((a.multi / a.claims) * 100),
    outlets: a.outlets, pages: a.pages, disputes: a.conflicts, read: a.read,
  };
}

const nameOf = (t) => (isMasked(t, state) ? maskName(t) : t.name);
const why = (t) => (t.missable ? `Missable · ${t.missableShort}` : `Stage ${t.stage} · ${chapterOf(t) ?? STAGES[t.stage][0]}`);

/** The rail's Next Up card: passed missable windows in crimson, then the next four in roadmap order. */
export function nextUpCard(doc) {
  const card = el('section', 'nextup', el('h3', 'railh', 'Next up · roadmap order'));
  for (const { t, closer } of passedWindow(doc.trophies, state.earned)) {
    card.append(el('p', 'passed', `⚠ ${nameOf(t)}: its ${t.missableChapter} window may have closed (${nameOf(closer)} is earned).`));
  }
  computeNextUpTrophies(doc.trophies, state.earned).forEach((t, i) => {
    const row = btn(`nrow${t.missable ? ' miss' : ''}${t.id === state.selected ? ' sel' : ''}`, null, () => openTrophy(t.id));
    row.innerHTML = `<i>${i + 1}</i>${medal(t.grade, 18)}`;
    row.append(el('span', null, el('b', null, nameOf(t)), el('small', null, why(t))));
    card.append(row);
  });
  return card;
}

const fmt = (n) => n.toLocaleString('en-US');

/** − n/goal + with a bar; values persist in state.counters and travel in the JSON backup. */
export function stepper(key, goal, label, unit = 1) {
  const n = state.counters[key] ?? 0;
  const set = (v) => { const x = Math.max(0, Math.min(goal, v)); if (x) state.counters[key] = x; else delete state.counters[key]; commit(); };
  const box = el('div', `stepper${n >= goal ? ' full' : ''}`,
    btn('sbtn', '−', () => set(n - unit)), el('b', 'sval', `${fmt(n)}/${fmt(goal)}`), el('span', 'slabel', label), btn('sbtn', '+', () => set(n + unit)),
    el('span', 'sbar', el('em')));
  box.querySelector('em').style.width = `${(n / goal) * 100}%`;
  box.firstChild.setAttribute('aria-label', `One fewer ${label}`);
  box.children[3].setAttribute('aria-label', `One more ${label}`);
  return box;
}

/** One sleek line: earned, grades, hours left and the verification counts. */
export function renderCodexStrip(host, doc) {
  const n = doc.trophies.length;
  const won = doc.trophies.filter((t) => state.earned.has(t.id));
  const pct = Math.round((won.length / n) * 100);
  const pts = won.reduce((p, t) => p + POINTS[t.grade], 0);
  const all = doc.trophies.reduce((p, t) => p + POINTS[t.grade], 0);
  const s = auditSummary(doc);
  const bar = el('span', 'pbar', el('em'), el('b', null, `${won.length}/${n} (${pct}%)`));
  bar.firstChild.style.width = `${Math.max(pct, 1)}%`;
  const grades = el('span', 'pgr', ...['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const c = el('span', g);
    c.innerHTML = medal(g, 15);
    c.append(`${doc.audit.g[g]}${g[0].toUpperCase()}`);
    c.title = `${doc.trophies.filter((t) => t.grade === g && state.earned.has(t.id)).length} of ${doc.audit.g[g]} ${GRADE_LABEL[g]} earned`;
    return c;
  }));
  host.title = `${fmt(pts)} of ${fmt(all)} trophy points · hours from PowerPyx's ~${BASE_HOURS} h estimate`;
  host.replaceChildren(el('span', 'plabel', 'Platinum progress'), bar, grades, el('span', 'pk hrs', el('b', null, `~${hoursLeft(doc)} h`), ' left'),
    el('span', 'pk ok', el('b', null, s.cited), ' cited'), el('span', 'pk ok', el('b', null, String(s.multiN)), ' on 2+ sites'),
    el('span', 'pk', el('b', null, `${s.outlets}`), ' outlets / ', el('b', null, `${s.pages}`), ' pages'), el('span', 'pk dis', el('b', null, String(s.disputes)), ' disputes'),
    el('span', 'pk dim', `read ${s.read.slice(0, -5)} · 100% offline`));
}

css('.codex{flex:none;display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;border:1px solid #ff5c8a40;border-radius:12px;background:linear-gradient(90deg,#1c1530,#111a2d 60%);white-space:nowrap;overflow:hidden;font-size:13px}'
  + '.plabel{font-size:10.5px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#ffb0c6}'
  + '.pbar{position:relative;flex:none;width:190px;height:24px;border-radius:12px;background:#ffffff14;overflow:hidden}.pbar em{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#ff5c8a,#ffc061)}'
  + '.pbar b{position:relative;display:block;text-align:center;line-height:24px;font-size:13px;color:#fff;text-shadow:0 1px 2px #000}'
  + '.pgr{display:flex;gap:6px;font-weight:850}.pgr span{display:inline-flex;align-items:center;gap:2px}'
  + '.pk{padding:3px 9px;border-radius:9px;background:#ffffff0d;color:var(--muted)}.pk b{color:#fff}.pk.ok b{color:#7dffa8}.pk.dis b{color:#ffc061}.pk.hrs b{color:#ffd0dc}.pk.dim{background:none;color:var(--dim)}'
  + '.railh{margin:0 0 6px;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--lagoon)}'
  + '.nrow{display:grid;grid-template-columns:18px 18px minmax(0,1fr);gap:7px;align-items:center;width:100%;padding:5px 6px;border-radius:9px;text-align:left}'
  + '.nrow:hover,.nrow.sel{background:#ffffff0f}.nrow i{font-style:normal;font-size:11px;font-weight:900;color:var(--dim)}.nrow b{display:block;font-size:13px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
  + '.nrow small{display:block;font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nrow.miss small{color:#ff9fb4;font-weight:750}'
  + '.passed{margin:0 0 6px;padding:6px 8px;border-radius:8px;background:#ff3b5c26;color:#ffd0da;font-size:12px}'
  + '.stepper{position:relative;display:flex;align-items:center;gap:8px;padding:4px 8px 8px;border:1px solid var(--line);border-radius:10px;background:#0d1424}'
  + '.sbtn{width:28px;height:26px;border-radius:7px;background:#ffffff14;font-size:16px;font-weight:900}.sbtn:hover{background:#ff5c8a40}'
  + '.sval{font-size:16px;color:#fff;font-variant-numeric:tabular-nums}.slabel{flex:1;font-size:12.5px;color:var(--muted)}'
  + '.sbar{position:absolute;left:8px;right:8px;bottom:4px;height:3px;border-radius:2px;background:#ffffff14}.sbar em{display:block;height:100%;border-radius:2px;background:var(--lagoon)}'
  + '.stepper.full{border-color:#38e3cf80}.stepper.full .sval{color:#7dffa8}');
