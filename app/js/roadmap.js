// Platinum Roadmap: the chapter-by-chapter story and point-of-no-return timeline (SVG track, save slots,
// missable windows, free-roam unlocks), three phases mapping all 55 trophies as clickable pills, the source
// verification matrix (claims, 2+ sites share and disputes per source, from verify.js) and
// the source disagreement panels, all computed from the data and this browser's progress.
import { el, link, medal, citePill, CHECKED } from './dom.js';
import { state, openTrophy } from './state.js';
import { isMasked, maskName } from './filters.js';
import { appendCited } from './detail.js';

const STAGES = [
  { n: 1, title: 'Story + Ch.1 / Ch.3 missables', tone: '#ff5c8a',
    line: 'Save at every chapter start and end (PPX); clear both flagged windows on sight (BEE, GC).' },
  { n: 2, title: '100% checklist, vaults, ranges & 250 stunts', tone: '#38e3cf',
    line: 'After the credits: 100 optional missions, 200 vehicles, 100 animals, 300 stunts, 70 challenges (PPX, I100).' },
  { n: 3, title: 'Strangers, collectibles & clean-up', tone: '#ffc061',
    line: 'Strangers & Freaks sit outside 100%: sweep them and the one-offs last (PPX).',
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
const FACTS = [['55/55', 'mapped'], ['~200 h', 'PowerPyx'], ['300+ h', 'Push Square'], ['1', 'playthrough'], ['0', 'online'], ['No', 'mission replay']];
// [source, date last read, scope]. All nine were re-read on 20 Nov for v6 (TrueAchievements answers scripts with 403,
// so its row keeps the method players report there); the counts beside them come from verify.js.
const MATRIX = [
  ['PowerPyx', '20 Nov', 'Roadmap + all 55 how-tos'], ['Push Square', '20 Nov', 'Roadmap, menu paths, counts'],
  ['IGN Wiki', '20 Nov', '100% bars, maps, missions'], ['Game Checklists', '20 Nov', 'Missables: Yago timed race'],
  ['OutputLag', '20 Nov', 'Trophy list, 100%, strands'], ['Exophase', '20 Nov', 'Official descriptions'],
  ['TrueTrophies', '20 Nov', 'PS5 list · 28 hidden'], ['Beebom', '20 Nov', 'All 18 meditation spots'],
  ['TrueAchievements', '20 Nov', 'Bad Luck, I Guess method'],
];


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
  const all = doc.sources;
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
    if (!c.n) col.append(appendCited(el('p', 'tlnote'), 'S1-S10 chapter saves, no mission replay (PPX) · ⚑ window closes (BEE, GC)', all));
    cols.append(col);
  }
  card.append(cols);
  host.replaceChildren(card);
}

/** Top: the story timeline. Left: the three phases. Right: the source matrix and the disagreement panels. */
export function renderRoadmap(host, side, doc) {
  const all = doc.sources;
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
  renderSourcePane(side, doc);
}

/** Right pane, top: the missable windows, the ten chapter saves and the no-replay / cheat rule, each with its cites. */
function guardrails(doc) {
  const card = el('div', 'guard');
  const head = el('div', 'stitle');
  head.append(el('h3', null, 'Missable & Save Guardrails'), el('span', 'scount', '2 windows · 10 saves'));
  card.append(head);
  const row = (tag, main, cites, risk) => {
    const r = el('div', 'grow');
    const who = el('span', 'gcites');
    for (const k of cites) who.append(citePill(k, doc.sources));
    r.append(el('span', `gtag${risk ? ' risk' : ''}`, tag), main, who);
    card.append(r);
  };
  for (const t of doc.trophies.filter((x) => x.missable).sort((x, y) => x.id - y.id).reverse()) {
    const b = el('button', 'gmain');
    b.type = 'button';
    b.append(el('b', null, isMasked(t, state) ? maskName(t) : t.name), ` ${t.missableShort.replace(/^Ch\.\d+( only)? · /, '')}`);
    b.onclick = () => openTrophy(t.id);
    row(t.missableChapter, b, t.missableCites, true);
  }
  const slots = el('span', 'gmain');
  for (const t of doc.trophies.filter((x) => x.saveSlot).sort((x, y) => x.saveSlot - y.saveSlot)) {
    const b = el('button', `gslot${state.earned.has(t.id) ? ' won' : ''}`, `S${t.saveSlot}`);
    b.type = 'button';
    b.title = `Slot ${t.saveSlot}: ${t.saveNote}`;
    b.onclick = () => openTrophy(t.id);
    slots.append(b);
  }
  row('Saves', slots, ['PPX', 'OLT']);
  row('Rules', el('span', 'gmain', 'No mission replay · cheats lock trophies'), ['PPX', 'PSQ', 'OLT']);
  return card;
}

/** Right pane: guardrails, then per-source claims, 2+ sites share and disputes, and one chip per disagreement panel. */
function renderSourcePane(host, doc) {
  host.replaceChildren(guardrails(doc));
  const a = doc.audit;
  const card = el('div', 'matrix');
  const mhead = el('div', 'stitle');
  mhead.append(el('h3', null, 'Source Verification & Disagreements'), el('span', 'scount', `${a.multi}/${a.claims} on 2+ sites · ${a.pages} pages`));
  card.append(mhead);
  const headRow = el('div', 'mrow mhead');
  for (const column of ['Source', 'Claims', 'On 2+ sites', 'Disputes', 'Read']) headRow.append(el('span', null, column));
  card.append(headRow);
  for (const [label, date, scope] of MATRIX) {
    const r = a.perLabel.get(label);
    const row = el('div', 'mrow');
    const first = doc.sources.find((s) => s.label === label);
    const name = link(null, first.url, label);
    name.title = `${scope} · ${r.pages.size} page${r.pages.size > 1 ? 's' : ''} cited`;
    const rate = Math.round((r.multi / r.claims) * 100);
    const bar = el('span', 'mrate');
    bar.innerHTML = `<b>${r.multi}</b> <i>${rate}%</i><em style="width:${rate}%"></em>`;
    row.append(name, el('b', null, String(r.claims)), bar, el('span', r.conflicts ? 'mdis' : null, r.conflicts ? `⚖ ${r.conflicts}` : '-'), el('span', null, date));
    card.append(row);
  }
  const chips = el('div', 'dchips');
  chips.append(el('span', 'dlabel', `⚖ ${a.conflicts} disagreement panels`));
  for (const c of doc.conflicts) {
    const chip = el('button', 'dchip', c.title);
    chip.type = 'button';
    chip.title = c.sides.map(([keys, says]) => `${keys.join(' + ')}: ${says}`).join('\n');
    chip.onclick = () => openTrophy(c.trophies[0]);
    chip.prepend(el('i', null, `${new Set(c.sides.flatMap(([keys]) => keys.map((k) => a.byKey.get(k).label))).size}`));
    chips.append(chip);
  }
  card.append(chips);
  host.append(card);
}

const ROADMAP_CSS = '.guard{margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid var(--line)}'
  + '.grow{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:7px;align-items:center;min-height:17px;font-size:11px;color:var(--body)}'
  + '.gtag{padding:1px 0;border-radius:5px;background:#ffc06129;color:#ffdc9c;font-size:9.5px;font-weight:900;text-align:center;text-transform:uppercase}.gtag.risk{background:#ff5c8a33;color:#ffc2d3}'
  + '.gmain{display:flex;gap:3px;min-width:0;padding:0;text-align:left;white-space:nowrap;overflow:hidden}.gmain b{color:#fff}'
  + '.gslot{padding:0 4px;border-radius:4px;background:#ffc06126;color:#ffe2a8;font-size:10px;font-weight:850}.gslot.won{background:#38e3cf33;color:#bffaf1}'
  + '.gcites{display:flex;gap:2px}.gcites .citep{font-size:9.5px}'
  + '.tline{padding:9px 14px 7px;border:1px solid #ff5c8a4d;border-radius:13px;background:radial-gradient(500px 120px at 50% 0,#ff5c8a1a,#0000),linear-gradient(160deg,#18213a,#111829)}'
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
  + '.matrix h3,.guard h3{font-size:13.5px}'
  + '.mrate{position:relative;display:flex;gap:5px;align-items:baseline;padding-bottom:2px}.mrate i{font-style:normal;color:#9fd8cc;font-size:10px}'
  + '.mrate em{position:absolute;left:0;bottom:0;height:2px;border-radius:1px;background:#3ddc84}'
  + '.mdis{color:#ffc061;font-weight:800}'
  + '.dchips{display:flex;flex-wrap:wrap;gap:2px;margin-top:5px}.dlabel{height:17px;padding:0 4px;font-size:9.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#ffb24d}'
  + '.dchip{display:inline-flex;align-items:center;gap:3px;height:17px;padding:0 5px 0 2px;border:1px solid #ffb24d59;border-radius:6px;background:#ffb24d17;color:#ffe6c2;font-size:9.6px;font-weight:700;white-space:nowrap}'
  + '.dchip i{font-style:normal;min-width:13px;height:13px;border-radius:4px;background:#ffb24d;color:#2a1600;font-size:9px;font-weight:900;line-height:13px;text-align:center}'
  + '.mrow{height:16px;display:grid;grid-template-columns:112px 44px 92px 54px minmax(0,1fr);column-gap:11px;align-items:center;padding:0;border-top:1px solid var(--line2);font-size:11px;font-variant-numeric:tabular-nums;color:#d2e8e3;white-space:nowrap}'
  + '.mhead{margin-top:4px;border-top:0;font-size:9.5px;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:var(--dim)}'
  + '.mrow a{font-weight:750;color:#bff8ef;text-decoration:none}.mrow b{color:#fff}'
  + '#roadmap-view .split{grid-template-columns:minmax(0,1fr) 520px}#save-guardrails{padding-top:8px}';
document.head.append(Object.assign(document.createElement('style'), { textContent: ROADMAP_CSS }));
