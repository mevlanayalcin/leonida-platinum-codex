// Platinum command strip (tracker view): the progress donut with grade and PSN-point counts, a remaining-hours
// estimate, the Next Smart Step (open missable windows first, then story order) and the A Long Road counters.
// Every number is computed from app/data/trophies.json and this browser's progress; nothing is fetched.
import { el, medal, citePill, GRADE_LABEL } from './dom.js';
import { state, commit, openTrophy } from './state.js';
import { isMasked, maskName } from './filters.js';

const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
/** PSN trophy points per grade (the 2020 trophy-level scheme). */
export const POINTS = { platinum: 300, gold: 90, silver: 30, bronze: 15 };
export const BASE_HOURS = 200; // PowerPyx's ~200 h estimate, roadmap.hours in trophies.json

// [key, label, 100% goal, note, trophy whose sources hold the figure, that source, trophy goal, trophy id]
export const COUNTERS = [
  ['missions', 'Optional missions', 100, 'any 100', 14, 'PowerPyx'],
  ['vehicles', 'Vehicles scanned', 200, 'of 277', 14, 'PowerPyx'],
  ['animals', 'Animals studied', 100, 'of 255', 14, 'PowerPyx'],
  ['stunts', 'Stunts', 300, 'trophy at 250', 15, 'IGN Wiki', 250, 15],
  ['challenges', 'Challenges', 70, 'trophy at 50', 14, 'PowerPyx', 50, 32],
  ['ranges', 'Range golds', 42, 'all golds', 17, 'Push Square', 42, 17],
  ['vaults', 'Bank vaults', 8, 'trophy at 5', 40, 'PowerPyx', 5, 40],
  ['strangers', 'Stranger strands', 8, 'outside 100%', 25, 'Exophase', 8, 25],
];
const LONG_ROAD = 14;
const count = (key) => state.counters[key] ?? 0;

/** Share of a trophy already done through the counters: A Long Road averages its seven 100% bars. */
export function counterProgress(id) {
  if (id === LONG_ROAD) {
    const bars = COUNTERS.filter((c) => c[0] !== 'strangers');
    return bars.reduce((n, c) => n + Math.min(1, count(c[0]) / c[2]), 0) / bars.length;
  }
  const c = COUNTERS.find((x) => x[7] === id);
  return c ? Math.min(1, count(c[0]) / c[6]) : 0;
}

/** Our planning weight for a trophy, scaled so the 55 add up to the ~200 h baseline. */
function rawWeight(t) {
  if (t.grade === 'platinum') return 0;
  if (t.category === 'story') return 5;
  let w = { gold: 30, silver: 3, bronze: 0.6 }[t.grade];
  if (t.count >= 10) w += Math.min(4, Math.log10(t.count) * 1.2);
  if (t.group === 'strangers') w += 1.2;
  return w;
}

export function hoursLeft(doc) {
  const total = doc.trophies.reduce((n, t) => n + rawWeight(t), 0);
  const left = doc.trophies.reduce((n, t) => n + (state.earned.has(t.id) ? 0 : rawWeight(t) * (1 - counterProgress(t.id))), 0);
  return Math.round((left / total) * BASE_HOURS);
}

const chapterOf = (t) => Number(String(t.missableChapter).replace(/\D/g, ''));

/** Priority queue: missables whose chapter is still open (its "Complete Chapter N." trophy unearned), then the
 *  story in save-slot order (Ch.4's two unslotted missions sit between slots 7 and 8), then phase 2, phase 3,
 *  and the platinum last. */
export function nextSteps(doc) {
  const open = doc.trophies.filter((t) => !state.earned.has(t.id));
  const ended = (n) => doc.trophies.some((t) => t.description === `Complete Chapter ${n}.` && state.earned.has(t.id));
  const missables = open.filter((t) => t.missable && !ended(chapterOf(t))).sort((a, b) => chapterOf(a) - chapterOf(b));
  const story = open.filter((t) => t.category === 'story').sort((a, b) => (a.saveSlot ?? 7.5) - (b.saveSlot ?? 7.5));
  const rest = open.filter((t) => t.category !== 'story' && !missables.includes(t))
    .sort((a, b) => (a.grade === 'platinum') - (b.grade === 'platinum') || a.stage - b.stage || rawWeight(b) - rawWeight(a));
  return [...missables.map((t) => ({ t, kind: 'missable' })), ...story.map((t) => ({ t, kind: 'story' })), ...rest.map((t) => ({ t, kind: 'free' }))];
}

function donut(won, total) {
  const C = 2 * Math.PI * 38;
  let off = 0;
  let arcs = '';
  for (const g of GRADES) {
    const len = (C * won[g]) / total;
    if (len) arcs += `<circle class="arc ${g}" r="38" cx="48" cy="48" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`;
    off += len;
  }
  const n = GRADES.reduce((s, g) => s + won[g], 0);
  return `<svg class="donut" viewBox="0 0 96 96" role="img" aria-label="${n} of ${total} trophies earned"><circle class="track" r="38" cx="48" cy="48"/><g transform="rotate(-90 48 48)">${arcs}</g>`
    + `<text x="48" y="47" class="dn">${n}<tspan class="dt">/${total}</tspan></text><text x="48" y="64" class="dp">${Math.round((n / total) * 100)}% earned</text></svg>`;
}

function codexCard(doc) {
  const won = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const all = { ...won };
  let pts = 0, max = 0;
  for (const t of doc.trophies) {
    all[t.grade] += 1;
    max += POINTS[t.grade];
    if (state.earned.has(t.id)) { won[t.grade] += 1; pts += POINTS[t.grade]; }
  }
  const card = el('section', 'ccard dcard');
  card.innerHTML = donut(won, doc.trophies.length);
  const side = el('div', 'tiers');
  side.append(el('span', 'eyebrow', 'Platinum Codex · PS5'));
  const grid = el('div', 'tgrid');
  for (const g of GRADES) {
    const cell = el('span', `tier ${g}`);
    cell.innerHTML = `${medal(g, 15)}<b>${won[g]}<i>/${all[g]}</i></b>${GRADE_LABEL[g]}`;
    grid.append(cell);
  }
  const pct = Math.round((pts / max) * 100);
  const bar = el('div', 'pts');
  bar.innerHTML = `<span><b>${pts.toLocaleString('en-US')}</b> / ${max.toLocaleString('en-US')} PSN pts</span><b class="pp">${pct}%</b><div class="mbar"><i style="width:${pct}%"></i></div>`;
  side.append(grid, bar);
  card.append(side);
  return card;
}

function hoursCard(doc) {
  const left = hoursLeft(doc);
  const card = el('section', 'ccard hcard');
  card.innerHTML = `<span class="eyebrow">Remaining to Platinum</span><div class="hbig">~${left}<small> h left</small></div>`
    + `<div class="mbar sun"><i style="width:${Math.round(((BASE_HOURS - left) / BASE_HOURS) * 100)}%"></i></div>`
    + `<p class="hnote">of ~${BASE_HOURS} h (PowerPyx) · our weighting by grade, story &amp; counters</p>`;
  return card;
}

function nextCard(doc) {
  const queue = nextSteps(doc);
  const card = el('section', 'ccard ncard');
  const head = el('div', 'nhead');
  head.append(el('span', 'eyebrow', 'Next smart step'));
  const first = queue[0];
  if (!first) {
    card.classList.add('done');
    card.append(head, el('div', 'nname', 'Platinum unlocked · Vice Got a Price!'));
    return card;
  }
  const { t, kind } = first;
  const masked = isMasked(t, state);
  const tag = kind === 'missable' ? `Missable first · ${t.missableLabel}` : kind === 'story' ? `Story · ${t.saveSlot ? `save slot ${t.saveSlot}` : 'Chapter 4'}` : `Phase ${t.stage} · free roam`;
  head.append(el('span', `ntag ${kind}`, tag));
  if (kind === 'missable') for (const label of t.missableCites) head.append(citePill(label, t.sources));
  const name = el('button', 'nname');
  name.type = 'button';
  name.innerHTML = medal(t.grade, 18);
  name.append(masked ? maskName(t) : t.name, el('span', 'ngo', 'Open guide →'));
  name.onclick = () => openTrophy(t.id);
  const note = masked ? 'Spoiler shield on · open the guide to peek.' : kind === 'missable' ? t.missableNote
    : kind === 'story' && t.saveNote ? `${t.saveNote}. ${t.steps[0].text}` : t.steps[0].text;
  const then = queue.slice(1, 3).map(({ t: x }) => (isMasked(x, state) ? maskName(x) : x.name)).join(' → ');
  const foot = el('div', 'nfoot');
  // A missable still unearned after its chapter's end trophy: point at that chapter's start save instead.
  const passed = doc.trophies.find((x) => x.missable && !state.earned.has(x.id) && !queue.some((q) => q.kind === 'missable' && q.t === x)
    && state.earned.has(doc.trophies.find((y) => y.description === `Complete Chapter ${chapterOf(x)}.`)?.id));
  foot.append(el('span', 'warn', '⚠ Cheats block trophies & saving · no mission replay'), passed
    ? el('span', 'then late', `⚑ ${passed.missableChapter} window passed · reload S${chapterOf(passed) * 2 - 1} if missed`)
    : el('span', 'then', then ? `Then: ${then}` : ''));
  card.append(head, name, el('p', 'nnote', note), foot);
  return card;
}

function countersRow(doc) {
  const row = el('section', 'ccard lroad');
  const label = el('div', 'lrlabel');
  label.innerHTML = `<span class="eyebrow">A Long Road</span><b>${Math.round(counterProgress(LONG_ROAD) * 100)}%</b><small>of 7 100% bars</small><small>Shift-click ±10</small>`;
  label.onclick = () => openTrophy(LONG_ROAD);
  row.append(label);
  for (const [key, name, goal, note, id, cite, trophyGoal] of COUNTERS) {
    const n = count(key);
    const source = doc.trophies.find((t) => t.id === id).sources.find((x) => x.label === cite);
    const ready = trophyGoal && n >= trophyGoal;
    const cell = el('div', `ctr${n >= goal ? ' full' : ready ? ' ready' : ''}`);
    cell.dataset.counter = key;
    cell.title = `${name}: ${n}/${goal} (${note}) · ${cite}`;
    const top = el('div', 'ctop');
    top.append(el('span', null, name));
    const mid = el('div', 'cmid');
    const step = (d) => { const b = el('button', 'cstep', d > 0 ? '+' : '−'); b.type = 'button'; b.setAttribute('aria-label', `${d > 0 ? 'Add' : 'Remove'} ${name}`); b.onclick = (e) => bump(key, goal, d * (e.shiftKey ? 10 : 1)); return b; };
    const value = el('b', 'cval');
    value.innerHTML = `${n}<i>/${goal}</i>`;
    mid.append(step(-1), value, step(1));
    const bar = el('div', 'mbar');
    bar.innerHTML = `<i style="width:${Math.min(100, (n / goal) * 100)}%"></i>`;
    const foot = el('small', null, ready ? `✓ ${note.replace('trophy at', 'ready at')}` : note);
    const src = el('a', 'csrc', cite);
    Object.assign(src, { href: source.url, target: '_blank', rel: 'noopener noreferrer', title: `${cite}: ${source.page}` });
    foot.append(src);
    cell.append(top, mid, bar, foot);
    row.append(cell);
  }
  return row;
}

function bump(key, goal, delta) {
  const n = Math.max(0, Math.min(goal, count(key) + delta));
  if (n) state.counters[key] = n; else delete state.counters[key];
  commit();
}

export function renderCodexStrip(host, doc) {
  host.replaceChildren(codexCard(doc), hoursCard(doc), nextCard(doc), countersRow(doc));
}

const CODEX_CSS = '.codex{display:grid;grid-template-columns:372px 228px minmax(0,1fr);gap:10px;flex:none}'
  + '.ccard{position:relative;padding:10px 14px;border:1px solid var(--line);border-radius:13px;background:linear-gradient(160deg,#18213a,#111829)}'
  + '.ccard .eyebrow{font-size:9.5px}'
  + '.dcard{display:flex;gap:14px;align-items:center;padding:8px 14px 8px 10px;border-color:#9fe6f84d;background:radial-gradient(220px 120px at 0 0,#38e3cf1f,#0000),linear-gradient(160deg,#18213a,#111829)}'
  + '.donut{width:92px;height:92px;flex:none}.donut circle{fill:none;stroke-width:9}.donut .track{stroke:#ffffff14}'
  + '.arc.platinum{stroke:#bff1ff}.arc.gold{stroke:#ffc94d}.arc.silver{stroke:#dfe6f0}.arc.bronze{stroke:#ee9a63}'
  + '.donut text{text-anchor:middle;fill:#fff;font-family:var(--font)}.dn{font-size:22px;font-weight:850}.dt{font-size:12px;fill:#98a6bb}.dp{font-size:9px;font-weight:800;fill:#ffb0c6;letter-spacing:.04em}'
  + '.tiers{flex:1;min-width:0}.tgrid{display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;margin:4px 0 6px}'
  + '.tier{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--muted)}.tier b{font-size:14px;color:#fff;min-width:34px}.tier i{font-style:normal;font-size:11px;color:var(--dim)}'
  + '.pts{display:grid;grid-template-columns:1fr auto;gap:3px 6px;font-size:11px;color:var(--muted)}.pts b{color:#fff}.pts .pp{color:#9ff3e6}.pts .mbar{grid-column:1/-1}'
  + '.mbar{height:5px;border-radius:5px;background:#ffffff17;overflow:hidden}.mbar i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,var(--lagoon),#9ff3e6)}'
  + '.mbar.sun i{background:linear-gradient(90deg,var(--coral),var(--sun))}'
  + '.hcard{display:flex;flex-direction:column;justify-content:center;gap:4px;border-color:#ffc06152}'
  + '.hbig{font-size:33px;font-weight:880;letter-spacing:-.03em;line-height:1;color:#ffd58a}.hbig small{font-size:13px;font-weight:750;letter-spacing:0;color:var(--muted)}'
  + '.hnote{margin:0;font-size:10.5px;line-height:1.35;color:var(--dim)}'
  + '.ncard{display:flex;flex-direction:column;gap:3px;border-color:#ff5c8a8c;background:radial-gradient(360px 140px at 100% 0,#ff5c8a2e,#0000),linear-gradient(160deg,#1d1b35,#131628)}'
  + '.nhead{display:flex;align-items:center;gap:7px}.ntag{padding:1px 8px;border-radius:5px;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;background:#ffffff14;color:var(--body)}'
  + '.ntag.missable{background:#ff5c8a;color:#2a0612}.ntag.story{background:#ffc061;color:#2a1a02}.ntag.free{background:#38e3cf;color:#04241f}'
  + '.nhead .citep:first-of-type{margin-left:auto}'
  + '.nname{display:flex;align-items:center;gap:8px;padding:0;text-align:left;font-size:18px;font-weight:830;letter-spacing:-.01em;color:#fff}'
  + '.ngo{margin-left:auto;padding:3px 9px;border:1px solid #ff5c8a8c;border-radius:7px;font-size:11px;font-weight:800;color:#ffd0dc;white-space:nowrap}'
  + '.nnote{margin:0;font-size:11.8px;line-height:1.38;color:#f2dfe6}'
  + '.nfoot{display:flex;align-items:center;gap:10px;margin-top:2px}'
  + '.warn{padding:2px 9px;border:1px solid #ffc06180;border-radius:20px;background:#ffc0611a;font-size:10.5px;font-weight:800;color:#ffe2a8;white-space:nowrap}'
  + '.then.late{color:#ffb0c6;font-weight:750}.then{min-width:0;font-size:10.8px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.lroad{grid-column:1/-1;display:grid;grid-template-columns:118px repeat(8,minmax(0,1fr));gap:7px;padding:7px 9px}'
  + '.lrlabel{display:flex;flex-direction:column;justify-content:center;cursor:pointer}.lrlabel b{font-size:22px;font-weight:880;line-height:1.05;color:#ffd58a}.lrlabel small{font-size:9.5px;color:var(--dim)}'
  + '.ctr{padding:4px 7px 4px;border:1px solid var(--line2);border-radius:9px;background:#0d1424}'
  + '.ctr.ready{border-color:#38e3cf66}.ctr.full{border-color:#38e3cfb3;background:#38e3cf14}'
  + '.ctop{display:flex;align-items:center;justify-content:space-between;gap:4px;font-size:9.6px;font-weight:850;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);white-space:nowrap}'
  + '.csrc{float:right;margin-left:6px;font-weight:800;color:#8fe3d6;text-decoration:none}'
  + '.cmid{display:flex;align-items:center;justify-content:space-between;margin:1px 0 3px}'
  + '.cval{font-size:15px;font-weight:850;font-variant-numeric:tabular-nums}.cval i{font-style:normal;font-size:11px;color:var(--dim)}'
  + '.cstep{width:20px;height:18px;border-radius:5px;background:#ffffff14;font-size:13px;font-weight:800;line-height:1;color:#dff}.cstep:hover{background:#38e3cf40}'
  + '.ctr small{display:block;margin-top:2px;font-size:9.5px;color:var(--dim);white-space:nowrap}.ctr.ready small,.ctr.full small{color:#9ff3e6}';
document.head.append(Object.assign(document.createElement('style'), { textContent: CODEX_CSS }));
