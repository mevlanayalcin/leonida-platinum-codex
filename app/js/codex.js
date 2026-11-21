// Platinum command strip (donut, PSN points, hours left, A Long Road counters) and the planning helpers the
// guide, rail and roadmap share: the Next Up queue, per-trophy source summaries, dispute lookup, audit metrics.
import { el, btn, medal, citePill, css, GRADE_LABEL } from './dom.js';
import { state, commit, openTrophy } from './state.js';
import { isMasked, maskName } from './filters.js';

const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
export const POINTS = { platinum: 300, gold: 90, silver: 30, bronze: 15 }; // PSN points per grade
export const BASE_HOURS = 200; // PowerPyx's ~200 h

// [key, label, 100% goal, note, trophy whose sources hold the figure, that source's key, trophy goal, trophy id]
export const COUNTERS = [
  ['missions', 'Missions', 100, 'any 100', 14, 'PPX'],
  ['vehicles', 'Vehicles', 200, 'of 277', 14, 'PPX'],
  ['animals', 'Animals', 100, 'of 255', 14, 'PPX'],
  ['stunts', 'Stunts', 300, 'trophy 250', 15, 'I100', 250, 15],
  ['challenges', 'Challenges', 70, 'trophy 50', 14, 'PPX', 50, 32],
  ['ranges', 'Range golds', 42, 'all golds', 17, 'PSQ', 42, 17],
  ['vaults', 'Bank vaults', 8, 'trophy 5', 40, 'PPX', 5, 40],
  ['strangers', 'Strangers', 8, 'outside 100%', 25, 'PPX', 8, 25],
];
const LONG_ROAD = 14;
const count = (key) => state.counters[key] ?? 0;

/** The counter a trophy's stepper moves: its shared 100% bar if one tracks it, else its own `t<id>` key. */
export function counterFor(t) {
  const c = COUNTERS.find((x) => x[7] === t.id);
  return c ? { key: c[0], goal: c[6] } : { key: `t${t.id}`, goal: t.count };
}

/** Share of a trophy done through counters; A Long Road averages its seven 100% bars. */
export function counterProgress(t) {
  if (t.id === LONG_ROAD) return COUNTERS.slice(0, 7).reduce((n, c) => n + Math.min(1, count(c[0]) / c[2]), 0) / 7;
  if (!t.count || t.category === 'story') return 0;
  const { key, goal } = counterFor(t);
  return Math.min(1, count(key) / goal);
}

/** Our planning weight for a trophy, scaled so the 55 add up to the ~200 h baseline. */
function weight(t) {
  if (t.grade === 'platinum') return 0;
  if (t.category === 'story') return 5;
  const w = { gold: 30, silver: 3, bronze: 0.6 }[t.grade];
  return w + (t.count >= 10 ? Math.min(4, Math.log10(t.count) * 1.2) : 0) + (t.group === 'strangers' ? 1.2 : 0);
}

export function hoursLeft(doc) {
  const sum = (f) => doc.trophies.reduce((n, t) => n + f(t), 0);
  return Math.round((sum((t) => (state.earned.has(t.id) ? 0 : weight(t) * (1 - counterProgress(t)))) / sum(weight)) * BASE_HOURS);
}

export const chapterOf = (t) => Number(String(t.missableChapter).replace(/\D/g, ''));
const chapterEnd = (trophies, n) => trophies.find((t) => t.description === `Complete Chapter ${n}.`);

/** Roadmap order: missables whose chapter is still open, the story by save slot (Ch.4's two unslotted missions
 *  between slots 7 and 8), then the rest by phase and planning weight, platinum last. */
export function computeNextUpTrophies(trophies, earned, limit = 4) {
  const open = trophies.filter((t) => !earned.has(t.id));
  const missables = open.filter((t) => t.missable && !earned.has(chapterEnd(trophies, chapterOf(t))?.id)).sort((a, b) => chapterOf(a) - chapterOf(b));
  const story = open.filter((t) => t.category === 'story').sort((a, b) => (a.saveSlot ?? 7.5) - (b.saveSlot ?? 7.5));
  const rest = open.filter((t) => t.category !== 'story' && !missables.includes(t))
    .sort((a, b) => (a.grade === 'platinum') - (b.grade === 'platinum') || a.stage - b.stage || weight(b) - weight(a));
  return [...missables.map((t) => ({ t, kind: 'missable' })), ...story.map((t) => ({ t, kind: 'story' })), ...rest.map((t) => ({ t, kind: 'free' }))].slice(0, limit);
}

/** A missable left unearned after its chapter ended, with the start-of-chapter save to reload. */
export function passedWindow(trophies, earned) {
  const t = trophies.find((x) => x.missable && !earned.has(x.id) && earned.has(chapterEnd(trophies, chapterOf(x))?.id));
  return t && { t, slot: chapterOf(t) * 2 - 1 };
}

/** Every page backing one trophy, numbered for the [n] badges (most claims first), with claim counts. */
export function buildGuideSourceSummary(trophy, sources, read) {
  const byKey = new Map(sources.map((s) => [s.key, s]));
  const disputed = new Set(trophy.conflicts.flatMap((c) => c.sides.flatMap(([keys]) => keys)));
  return trophy.sources.map((s, i) => {
    const claims = trophy.claims.filter((c) => c.cites.includes(s.key)).length;
    return { ...byKey.get(s.key), read, i, claims, role: claims ? '' : disputed.has(s.key) ? 'dispute side' : 'official text' };
  }).sort((a, b) => b.claims - a.claims || a.i - b.i).map((s, i) => ({ ...s, n: i + 1 }));
}

/** The disagreement panels that name a trophy, the one about it alone first. */
export const disputesFor = (doc, id) => doc.conflicts.filter((c) => c.trophies.includes(id)).sort((a, b) => a.trophies.length - b.trophies.length);

/** Headline audit numbers (from verify.js's annotate) for the strip and the Audit view. */
export function auditSummary(doc) {
  const a = doc.audit;
  return { official: `${a.n}/${a.n}`, cited: `${a.claims}/${a.total}`, multi: `${a.multi}/${a.claims}`, rate: Math.round((a.multi / a.claims) * 100),
    outlets: a.outlets, pages: a.pages, disputes: a.conflicts, read: a.read, uncited: a.uncited, grades: `${a.g.platinum}P ${a.g.gold}G ${a.g.silver}S ${a.g.bronze}B` };
}

/** The rail's NEXT UP card: four quick picks in roadmap order. */
export function nextUpCard(doc) {
  const queue = computeNextUpTrophies(doc.trophies, state.earned);
  const card = el('section', 'nextup', el('div', 'seclabel', el('span', null, 'Next up · roadmap order'), el('b', null, `~${hoursLeft(doc)} h left`)));
  if (!queue.length) card.append(el('p', null, 'Platinum unlocked · Vice Got a Price!'));
  queue.forEach(({ t, kind }, i) => {
    const b = btn(`nup ${kind}${t.id === state.selected ? ' sel' : ''}`, null, () => openTrophy(t.id));
    b.dataset.next = t.id;
    b.innerHTML = `<i>${i + 1}</i>${medal(t.grade, 16)}`;
    b.append(el('span', null, el('b', null, isMasked(t, state) ? maskName(t) : t.name),
      el('small', null, kind === 'missable' ? t.missableLabel : kind === 'story' ? `Story · ${t.saveSlot ? `save S${t.saveSlot}` : 'Ch.4'}` : `Phase ${t.stage}`)));
    card.append(b);
  });
  const late = passedWindow(doc.trophies, state.earned);
  const first = queue[0]?.kind === 'missable' && queue[0].t;
  card.append(el('div', 'nfoot', late ? `⚑ ${late.t.missableChapter} window passed · reload S${late.slot}` : first ? 'Missable first' : null,
    ...(first && !late ? first.missableCites.map((k) => citePill(k, first.sources)) : []), el('span', 'warn', '⚠ Cheats block trophies · no replay')));
  return card;
}

function donut(won, total) {
  const C = 2 * Math.PI * 38;
  let off = 0, arcs = '';
  for (const g of GRADES) {
    const len = (C * won[g]) / total;
    if (len) arcs += `<circle class="arc ${g}" r="38" cx="48" cy="48" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`;
    off += len;
  }
  const n = GRADES.reduce((s, g) => s + won[g], 0);
  return `<svg class="donut" viewBox="0 0 96 96" role="img" aria-label="${n} of ${total} trophies earned"><circle class="track" r="38" cx="48" cy="48"/><g transform="rotate(-90 48 48)">${arcs}</g>`
    + `<text x="48" y="47" class="dn">${n}<tspan class="dt">/${total}</tspan></text><text x="48" y="64" class="dp">${Math.round((n / total) * 100)}% earned</text></svg>`;
}

const bar = (n, goal) => `<div class="mbar"><i style="width:${Math.min(100, (n / goal) * 100)}%"></i></div>`;

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
  card.innerHTML = `${donut(won, doc.trophies.length)}<div class="tiers"><span class="eyebrow">Platinum Codex · PS5</span><div class="tgrid">`
    + GRADES.map((g) => `<span class="tier">${medal(g, 15)}<b>${won[g]}<i>/${all[g]}</i></b>${GRADE_LABEL[g]}</span>`).join('')
    + `</div><div class="pts"><span><b>${pts.toLocaleString('en-US')}</b> / ${max.toLocaleString('en-US')} PSN pts</span><b>${Math.round((pts / max) * 100)}%</b>${bar(pts, max)}`
    + `<span class="hl"><b>~${hoursLeft(doc)} h left</b> of ~${BASE_HOURS} h (PowerPyx, our weighting)</span></div></div>`;
  return card;
}

/** A - / + stepper (Shift-click moves ten steps), clamped to 0..goal. */
export function stepper(key, goal, label, unit = 1) {
  const step = (d) => {
    const b = btn('cstep', d > 0 ? '+' : '−', (e) => {
      const n = Math.max(0, Math.min(goal, count(key) + d * unit * (e.shiftKey ? 10 : 1)));
      if (n) state.counters[key] = n; else delete state.counters[key];
      commit();
    });
    b.setAttribute('aria-label', `${d > 0 ? 'Add' : 'Remove'} ${label}`);
    return b;
  };
  const value = el('b', 'cval');
  value.innerHTML = `${count(key).toLocaleString('en-US')}<i>/${goal.toLocaleString('en-US')}</i>`;
  return el('div', 'cmid', step(-1), value, step(1));
}

function countersRow(doc) {
  const label = el('div', 'lrlabel');
  label.innerHTML = `<span class="eyebrow">A Long Road</span><b>${Math.round(counterProgress({ id: LONG_ROAD }) * 100)}%</b><small>of 7 100% bars · Shift ±10</small>`;
  label.onclick = () => openTrophy(LONG_ROAD);
  const grid = el('div', 'cgrid');
  for (const [key, name, goal, note, id, cite, trophyGoal] of COUNTERS) {
    const n = count(key);
    const s = doc.trophies.find((t) => t.id === id).sources.find((x) => x.key === cite);
    const ready = trophyGoal && n >= trophyGoal;
    const mid = stepper(key, goal, name);
    mid.prepend(el('span', 'cname', name));
    const cell = el('div', `ctr${n >= goal ? ' full' : ready ? ' ready' : ''}`, mid);
    cell.title = `${name}: ${n}/${goal} (${note}) · ${s.label}: ${s.page}`;
    cell.insertAdjacentHTML('beforeend', `<small>${ready ? `✓ ${note.replace('trophy', 'ready')}` : note} · ${s.label}</small>${bar(n, goal)}`);
    grid.append(cell);
  }
  return el('section', 'ccard lroad', label, grid);
}

export function renderCodexStrip(host, doc) {
  host.replaceChildren(codexCard(doc), countersRow(doc));
}

css('.codex{display:grid;grid-template-columns:330px minmax(0,1fr);gap:10px;flex:none}'
  + '.ccard{padding:6px 12px;border:1px solid var(--line);border-radius:13px;background:linear-gradient(160deg,#18213a,#111829)}.ccard .eyebrow{font-size:9.5px}'
  + '.dcard{display:flex;gap:10px;align-items:center;padding-left:6px;border-color:#9fe6f84d}'
  + '.donut{width:76px;height:76px;flex:none}.donut circle{fill:none;stroke-width:9}.donut .track{stroke:#ffffff14}'
  + '.arc.platinum{stroke:#bff1ff}.arc.gold{stroke:#ffc94d}.arc.silver{stroke:#dfe6f0}.arc.bronze{stroke:#ee9a63}'
  + '.donut text{text-anchor:middle;fill:#fff}.dn{font-size:22px;font-weight:850}.dt{font-size:12px;fill:#98a6bb}.donut .dp{font-size:9px;font-weight:800;fill:#ffb0c6}'
  + '.tiers{flex:1}.tgrid{display:grid;grid-template-columns:1fr 1fr;gap:0 10px;margin:2px 0 4px}'
  + '.tier{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)}.tier b{font-size:13.5px;color:#fff;min-width:32px}.tier i,.cval i{font-style:normal;font-size:10.5px;color:var(--dim)}'
  + '.pts{display:grid;grid-template-columns:1fr auto;gap:3px;font-size:11px;color:var(--muted)}.pts b{color:#fff}.pts .mbar{grid-column:1/-1}'
  + '.mbar{height:5px;border-radius:5px;background:#ffffff17;overflow:hidden}.mbar i{display:block;height:100%;background:linear-gradient(90deg,var(--lagoon),#9ff3e6)}'
  + '.hl{grid-column:1/-1;font-size:10px;color:var(--dim)}.hl b{color:#ffd58a}'
  + '.lroad{display:grid;grid-template-columns:88px minmax(0,1fr);gap:8px;padding:5px 8px}.cgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px 6px}'
  + '.lrlabel{display:flex;flex-direction:column;justify-content:center;cursor:pointer}.lrlabel b{font-size:22px;line-height:1.05;color:#ffd58a}.lrlabel small{font-size:9.5px;color:var(--dim)}'
  + '.ctr{padding:2px 7px 3px;border:1px solid var(--line2);border-radius:8px;background:#0d1424}.ctr.ready{border-color:#38e3cf66}.ctr.full{border-color:#38e3cfb3}'
  + '.cname{flex:1;font-size:9.4px;font-weight:850;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.cmid{display:flex;align-items:center;gap:5px}.ctr small{display:block;font-size:9.3px;line-height:1.3;color:var(--dim);white-space:nowrap;overflow:hidden}.ctr.ready small{color:#9ff3e6}'
  + '.cval{font-size:13.5px;font-weight:850;font-variant-numeric:tabular-nums}'
  + '.cstep{width:19px;height:16px;border-radius:5px;background:#ffffff14;font-weight:800;line-height:1}.cstep:hover{background:#38e3cf40}'
  + '.nextup .seclabel{margin-top:0;color:#ffb0c6}'
  + '.nup{display:grid;grid-template-columns:12px 16px minmax(0,1fr);gap:7px;align-items:center;width:100%;margin-bottom:2px;padding:2px 7px;border:1px solid var(--line);border-left:3px solid var(--lagoon);border-radius:8px;background:#172036;text-align:left}'
  + '.nup.missable{border-left-color:var(--coral)}.nup.story{border-left-color:var(--sun)}.nup.sel{background:#ff5c8a24}.nup:hover{background:#1f2a46}'
  + '.nup>i{font-style:normal;font-size:11px;font-weight:900;color:var(--dim)}.nup span{min-width:0}'
  + '.nup b{display:block;font-size:12.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nup small{display:block;font-size:10px;font-weight:750;text-transform:uppercase;color:var(--dim)}'
  + '.nup.missable small{color:#ffb0c6}.nfoot{display:flex;flex-wrap:wrap;align-items:center;gap:3px 4px;font-size:10px;font-weight:800;color:#ffc2d3}'
  + '.warn{padding:1px 7px;border:1px solid #ffc06180;border-radius:20px;font-size:9.8px;color:#ffe2a8;white-space:nowrap}');
