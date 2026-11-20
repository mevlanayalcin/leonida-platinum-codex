// Platinum Roadmap: the chapter-by-chapter story and point-of-no-return timeline (SVG track, save slots,
// missable windows, free-roam unlocks), three phases mapping all 55 trophies as clickable pills, the missable
// guardrails and the source verification matrix, all computed from the data and this browser's progress.
import { el, link, medal, citePill, CHECKED } from './dom.js';
import { state, openTrophy } from './state.js';
import { isMasked, maskName } from './filters.js';
import { appendCited } from './detail.js';

const STAGES = [
  { n: 1, title: 'Story + Ch.1 / Ch.3 missables', tone: '#ff5c8a',
    line: 'Save at every chapter start and end (PowerPyx); clear both flagged windows on sight (Beebom, Game Checklists).' },
  { n: 2, title: '100% checklist, vaults, ranges & 250 stunts', tone: '#38e3cf',
    line: 'After the credits: 100 optional missions, 200 vehicles, 100 animals, 300 stunts, 70 challenges (PowerPyx, IGN Wiki).' },
  { n: 3, title: 'Strangers, collectibles & clean-up', tone: '#ffc061',
    line: 'Strangers & Freaks sit outside 100%: sweep them and the one-offs last (PowerPyx).',
    groups: [['strangers', 'Strangers'], ['world', 'Collectibles & World'], ['activities', 'Activities & Combat'], ['platinum', 'Platinum']] },
];
// One column a chapter: its story trophies in play order, its two PowerPyx save slots, the missable whose window
// it closes, and what it opens for free roam, each line tied to the trophy whose cited guide says so.
const CHAPTERS = [
  { n: 1, story: [2, 3], risk: 28, opens: [[20, "Feng Shui: Cal's fishing"], [23, "Island Dreams: Kenton's dives"]] },
  { n: 2, story: [8, 4], opens: [[33, 'Coffee Break: partner free roam'], [24, 'Billy & Bret strands'], [54, 'Daily Driver: garages']] },
  { n: 3, story: [9, 5], risk: 25, opens: [[5, 'Andy, Randy & Tyrone strands'], [39, 'Key Cloner & Snap Gun']] },
  { n: 4, story: [10, 11, 12, 6], opens: [[40, "Money Is…: vaults & trucks"]] },
  { n: 5, story: [13, 7], opens: [[7, 'Slot 10: the pre-finale save']] },
  { n: 0, story: [], opens: [[14, '100% checklist opens'], [25, 'Strangers & leftovers'], [1, 'Platinum']] },
];
const FACTS = [['55/55', 'mapped'], ['~200 h', 'PowerPyx'], ['1', 'playthrough'], ['0', 'online'], ['No', 'mission replay'], ['4/10', 'difficulty']];
// [source, date last read, scope]. PowerPyx was re-read on 20 Nov; the three day-2 sources were added then.
const MATRIX = [
  ['PowerPyx', '20 Nov', 'Roadmap + all 55 how-tos'], ['Exophase', '19 Nov', 'Official names, grades, counts'],
  ['Push Square', '19 Nov', 'Roadmap, menu paths, counts'], ['IGN Wiki', '19 Nov', '100% bars, maps, missions'],
  ['Game Checklists', '20 Nov', 'Missables: Yago timed race'], ['OutputLag', '20 Nov', 'Stranger strands, char locks'],
  ['TrueAchievements', '20 Nov', 'Bad Luck, I Guess method'], ['Beebom', '19 Nov', 'All 18 meditation spots'],
  ['TrueTrophies', '19 Nov', 'PS5 list · 28 secret'],
];

function sourceIndex(doc) {
  const map = new Map();
  for (const t of doc.trophies) for (const s of t.sources) if (!map.has(s.label)) map.set(s.label, s);
  return map;
}

function trophyPill(t) {
  const masked = isMasked(t, state);
  const pill = el('button', `tpill${state.earned.has(t.id) ? ' won' : ''}`);
  pill.type = 'button';
  pill.innerHTML = medal(t.grade, 13);
  pill.append(masked ? maskName(t) : t.name);
  pill.onclick = () => openTrophy(t.id);
  return pill;
}

function pillRow(trophies) {
  const row = el('div', 'pills');
  for (const t of trophies) row.append(trophyPill(t));
  return row;
}

const chapterDone = (doc, n) => doc.trophies.some((t) => t.description === `Complete Chapter ${n}.` && state.earned.has(t.id))
  || (n === 5 && state.earned.has(7));

/** The SVG track: six nodes (Ch.1-5, post-game), a lagoon fill up to the last finished chapter, gold save-slot
 *  ticks either side of each chapter node and coral point-of-no-return flags where a missable window closes. */
function trackSVG(doc, byId) {
  const x = (i) => 100 + i * 200;
  const done = CHAPTERS.slice(0, 5).filter((c) => chapterDone(doc, c.n)).length;
  let g = `<line x1="${x(0)}" y1="24" x2="${x(5)}" y2="24" class="tk"/><line x1="${x(0)}" y1="24" x2="${x(Math.min(done, 5))}" y2="24" class="tf"/>`;
  CHAPTERS.forEach((c, i) => {
    const cx = x(i);
    if (c.n) {
      const [s1, s2] = c.story.map((id) => byId.get(id)).filter((t) => t.saveSlot).map((t) => t.saveSlot).sort((a, b) => a - b);
      for (const [dx, slot] of [[-62, s1], [62, s2]]) g += `<rect x="${cx + dx - 13}" y="15" width="26" height="18" rx="5" class="sv"/><text x="${cx + dx}" y="28" class="svt">S${slot}</text>`;
      if (c.risk) g += `<path d="M${cx + 34} 4v32" class="pr"/><path d="M${cx + 34} 4h16l-5 6 5 6h-16z" class="pf"/>`;
    }
    const state_ = !c.n ? (done === 5 ? 'now' : 'next') : chapterDone(doc, c.n) ? 'done' : i === done ? 'now' : 'next';
    g += c.n ? `<circle cx="${cx}" cy="24" r="15" class="nd ${state_}"/><text x="${cx}" y="29.5" class="ndt">${c.n}</text>`
      : `<path d="M${cx} 8 ${cx + 16} 24 ${cx} 40 ${cx - 16} 24Z" class="nd ${state_}"/><text x="${cx}" y="29" class="ndt">P</text>`;
  });
  return `<svg class="tltrack" viewBox="0 2 1200 40" preserveAspectRatio="none" role="img" aria-label="Story timeline: ${done} of 5 chapters finished">${g}</svg>`;
}

function renderTimeline(host, doc) {
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));
  const all = [...sourceIndex(doc).values()];
  const card = el('section', 'tline');
  const head = el('div', 'tlhead');
  const title = el('div');
  title.append(el('span', 'eyebrow', `Story & point-of-no-return timeline · checked ${CHECKED}`), el('h2', null, 'Platinum Roadmap'));
  const facts = el('div', 'facts');
  for (const [big, small] of FACTS) {
    const fact = el('span', big === '55/55' ? 'fact key' : 'fact');
    fact.append(el('b', null, big), ` ${small}`);
    facts.append(fact);
  }
  head.append(title, facts);
  card.append(head);
  card.insertAdjacentHTML('beforeend', trackSVG(doc, byId));
  const cols = el('div', 'tlcols');
  for (const c of CHAPTERS) {
    const col = el('div', `tlcol${c.n && chapterDone(doc, c.n) ? ' done' : ''}`);
    col.append(el('div', 'tlname', c.n ? `Chapter ${c.n}` : 'Post-game free roam'));
    const list = c.n ? c.story.map((id) => byId.get(id)) : [];
    for (const t of list) {
      const b = trophyPill(t);
      b.className += ' tlp';
      if (t.saveSlot) b.title = `Save slot ${t.saveSlot}: ${t.saveNote}`;
      col.append(b);
    }
    if (c.risk) {
      const t = byId.get(c.risk);
      const box = el('button', `tlrisk${state.earned.has(t.id) ? ' won' : ''}`);
      box.type = 'button';
      box.onclick = () => openTrophy(t.id);
      box.append(el('b', null, `⚑ ${t.name}`), el('i', null, t.missableShort));
      col.append(box);
    }
    for (const [id, text] of c.opens) {
      const t = byId.get(id);
      const line = el('button', 'tlopen');
      line.type = 'button';
      line.title = `${isMasked(t, state) ? maskName(t) : t.name} (PowerPyx)`;
      line.onclick = () => openTrophy(id);
      line.append(el('span', null, c.n ? '↳ ' : '◆ '), text);
      col.append(line);
    }
    if (!c.n) col.append(appendCited(el('p', 'tlnote'), 'S1-S10 chapter saves, no mission replay (PowerPyx) · ⚑ window closes (Beebom, Game Checklists)', all));
    cols.append(col);
  }
  card.append(cols);
  host.replaceChildren(card);
}

/** Top: the story timeline. Left: the three phases. Right: guardrails and the source matrix. */
export function renderRoadmap(host, side, doc) {
  const sources = sourceIndex(doc);
  const all = [...sources.values()];
  renderTimeline(document.querySelector('#story-timeline'), doc);
  host.replaceChildren();

  for (const stage of STAGES) {
    const trophies = doc.trophies.filter((t) => t.stage === stage.n);
    const card = el('section', 'stage');
    card.style.setProperty('--tone', stage.tone);
    const title = el('div', 'stitle');
    title.append(el('span', 'num', String(stage.n)), el('h3', null, `Phase ${stage.n} · ${stage.title}`), el('span', 'scount', `${trophies.length} trophies`));
    card.append(title, appendCited(el('p', 'sline'), stage.line, all));
    if (stage.n === 1) {
      const note = el('div', 'pills');
      note.append(el('span', 'glabel', 'Pinned chapter by chapter on the timeline ↑'), ...trophies.filter((t) => t.category !== 'story').map(trophyPill));
      card.append(note);
    } else if (stage.groups) {
      const flow = el('div', 'pills');
      for (const [id, label] of stage.groups) {
        const members = trophies.filter((t) => t.group === id);
        flow.append(el('span', 'glabel', `${label} ${members.length}`), ...members.map(trophyPill));
      }
      card.append(flow);
    } else card.append(pillRow(trophies));
    host.append(card);
  }
  renderGuardrails(side, doc, sources);
}

function guardRow(t, slot, note) {
  const row = el('button', 'guardrow');
  row.type = 'button';
  row.append(el('span', `slot${t.missable ? ' risk' : ''}`, slot), el('b', null, isMasked(t, state) ? maskName(t) : t.name), el('span', 'gnote', note));
  row.onclick = () => openTrophy(t.id);
  return row;
}

function renderGuardrails(host, doc, sources) {
  host.replaceChildren();
  const missable = doc.trophies.filter((t) => t.missable);
  const saves = doc.trophies.filter((t) => t.saveSlot).sort((a, b) => a.saveSlot - b.saveSlot);
  const head = el('div', 'stitle');
  head.append(el('h3', null, 'Missable & save guardrails'), citePill('PowerPyx', [...sources.values()]));
  host.append(head);

  const label = (text, count) => { const l = el('div', 'seclabel'); l.append(el('span', null, text), el('b', null, String(count))); return l; };
  host.append(label('Missable risk', missable.length));
  for (const t of missable) host.append(guardRow(t, t.missableChapter, t.missableShort));
  const slots = el('div', 'slotrow');
  for (const t of saves) {
    const b = el('button', 'slot', `S${t.saveSlot}`);
    b.type = 'button';
    b.title = `Slot ${t.saveSlot}: ${t.saveNote}`;
    b.onclick = () => openTrophy(t.id);
    slots.append(b);
  }
  host.append(label('Chapter saves · pinned on the timeline', saves.length), slots);

  const card = el('div', 'matrix');
  const mhead = el('div', 'stitle');
  mhead.append(el('h3', null, 'Source Verification Matrix'), el('span', 'scount', `checked ${CHECKED}`));
  card.append(mhead);
  const headRow = el('div', 'mrow mhead');
  for (const column of ['Source', 'Cites', 'Read', 'Scope']) headRow.append(el('span', null, column));
  card.append(headRow);
  for (const [label, date, scope] of MATRIX) {
    const covered = doc.trophies.filter((t) => t.sources.some((s) => s.label === label)).length;
    const row = el('div', 'mrow');
    row.append(link(null, sources.get(label).url, label), el('b', null, `${covered}/${doc.trophies.length}`), el('span', null, date), el('span', null, scope));
    card.append(row);
  }
  const steps = doc.trophies.reduce((n, t) => n + t.steps.length, 0);
  const cited = doc.trophies.reduce((n, t) => n + t.steps.filter((s) => t.sources.some((x) => x.label === s.cite)).length, 0);
  card.append(el('p', 'mnote', `${cited}/${steps} steps cited · recomputed from app/data at boot · 0 network requests`));
  host.append(card);
}

const ROADMAP_CSS = '.tline{padding:9px 14px 7px;border:1px solid #ff5c8a4d;border-radius:13px;background:radial-gradient(500px 120px at 50% 0,#ff5c8a1a,#0000),linear-gradient(160deg,#18213a,#111829)}'
  + '.tlhead{display:flex;justify-content:space-between;align-items:center;gap:12px}.tlhead h2{margin:0;font-size:21px;font-weight:840;letter-spacing:-.02em;line-height:1.15}.tlhead .facts{margin:0}'
  + '.tltrack{display:block;width:100%;height:40px;margin-top:4px}.tltrack .tk{stroke:#ffffff1f;stroke-width:4}.tltrack .tf{stroke:var(--lagoon);stroke-width:4}'
  + '.nd{fill:#0f1628;stroke:#ffffff40;stroke-width:2}.nd.done{fill:var(--lagoon);stroke:#bffaf1}.nd.now{fill:var(--coral);stroke:#ffd0dc;stroke-width:3}'
  + '.ndt{text-anchor:middle;font:900 14px var(--font);fill:#fff}.sv{fill:#ffc06126;stroke:#ffc061a6}.svt{text-anchor:middle;font:850 10.5px var(--font);fill:#ffe2a8}'
  + '.pr{stroke:var(--coral);stroke-width:2}.pf{fill:var(--coral)}'
  + '.tlcols{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:2px}'
  + '.tlcol{display:flex;flex-wrap:wrap;align-content:flex-start;gap:2px 3px;min-width:0;padding:5px 6px;border-radius:9px;background:#0d142480}.tlcol.done{background:#38e3cf0f}'
  + '.tlname{width:100%;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#ffb0c6}.tlcol.done .tlname{color:#9ff3e6}'
  + '.tlp{max-width:100%;font-size:10.1px;padding-right:5px}'
  + '.tlrisk{width:100%;margin-top:1px;padding:2px 7px 3px;border:1px solid #ff5c8ab3;border-radius:7px;background:#ff5c8a2b;text-align:left;line-height:1.25}'
  + '.tlrisk span{display:block;font-size:9px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#ffc2d3}.tlrisk b{display:block;font-size:11.5px}.tlrisk i{display:block;font-style:normal;font-size:10.3px;color:#ffe1ea}'
  + '.tlrisk.won{border-color:#38e3cf8c;background:#38e3cf1f}'
  + '.tlopen{width:100%;padding:0;text-align:left;font-size:10.6px;line-height:1.35;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tlopen span{color:var(--sun)}'
  + '.tlnote{margin:4px 0 0;padding-top:4px;border-top:1px solid var(--line2);font-size:10.3px;line-height:1.4;color:var(--dim)}'
  + '.slotrow{display:flex;gap:4px;margin-bottom:2px}.slotrow .slot{flex:1;padding:2px 0}'
  + '.roadmap{min-height:0;overflow-y:auto;padding-right:2px}'
  + '.facts{display:flex;gap:5px;margin:5px 0 8px}'
  + '.fact{padding:2px 8px;border:1px solid var(--line);border-radius:8px;background:#1a2339;font-size:10.5px;white-space:nowrap;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}'
  + '.fact b{font-size:13.5px;color:#fff;text-transform:none}.fact.key{border-color:#38e3cf99;background:#38e3cf24;color:#c9fdf6}'
  + '.stage{margin-bottom:6px;padding:6px 12px 7px;border:1px solid var(--line);border-left:3px solid var(--tone);border-radius:11px;background:var(--panel)}'
  + '.stitle{display:flex;align-items:center;gap:9px}.stitle h3{margin:0;font-size:14.5px;font-weight:820}'
  + '.num{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;font-size:13px;font-weight:900;color:#0b1020;background:var(--tone)}'
  + '.scount{margin-left:auto;padding:2px 8px;border-radius:6px;background:#ffffff14;font-size:11px;font-weight:800;color:var(--body);white-space:nowrap}'
  + '.sline{margin:2px 0 4px;font-size:11.6px;line-height:1.4;color:var(--muted)}'
  + '.pills{display:flex;flex-wrap:wrap;align-items:center;gap:3px 4px}'
  + '.tpill{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px 0 4px;border:1px solid var(--line);border-radius:6px;background:#0f1628;color:#e3e9f3;font-size:10.8px;font-weight:650;white-space:nowrap}'
  + '.tpill.won{border-color:#38e3cf73;background:#38e3cf1a}'
  + '.glabel{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:6px;background:#ffc06129;font-size:10.5px;font-weight:850;letter-spacing:.04em;text-transform:uppercase;color:#ffdc9c;white-space:nowrap}'
  + '.glabel:not(:first-child){margin-left:6px}'
  + '#save-guardrails .stitle h3{font-size:15px}'
  + '.guardrow{width:100%;display:grid;grid-template-columns:50px auto minmax(0,1fr);gap:9px;align-items:center;padding:2px 0;border-top:1px solid var(--line2);text-align:left;font-size:11.5px;line-height:1.3}'
  + '.guardrow b{font-weight:750;white-space:nowrap}.gnote{text-align:right;color:var(--muted);font-size:11px;white-space:nowrap}'
  + '.slot{padding:1px 0;border-radius:5px;background:#ffc06124;color:#ffe2a8;font-size:10px;font-weight:850;text-align:center}.slot.risk{background:#ff5c8a4d;color:#ffe1ea}'
  + '.matrix{margin-top:7px;padding:7px 11px 6px;border:1px solid #38e3cf4d;border-radius:11px;background:#0d1b26}'
  + '.matrix h3{font-size:13.5px}'
  + '.mrow{display:grid;grid-template-columns:108px 42px 44px minmax(0,1fr);column-gap:11px;align-items:center;padding:1px 0;border-top:1px solid var(--line2);font-size:11px;font-variant-numeric:tabular-nums;color:#d2e8e3;white-space:nowrap}'
  + '.mhead{margin-top:4px;border-top:0;font-size:9.5px;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:var(--dim)}'
  + '.mrow a{font-weight:750;color:#bff8ef;text-decoration:none}.mrow b{color:#fff}'
  + '.mnote{margin:5px 0 0;font-size:10.5px;color:#9fd8cc}';
document.head.append(Object.assign(document.createElement('style'), { textContent: ROADMAP_CSS }));
