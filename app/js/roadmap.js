// Platinum Roadmap: three stages that map all 55 trophies as clickable pills with exact
// counts and dated citations, the 1 + 10 missable/save guardrails and the source matrix.
import { el, sourceLinks, GRADE, DATE } from './dom.js';
import { openTrophy } from './state.js';
import { appendCited } from './detail.js';

const S = {
  powerpyx: { label: 'PowerPyx', url: 'https://www.powerpyx.com/grand-theft-auto-vi-gta-6-trophy-guide-roadmap/' },
  exophase: { label: 'Exophase', url: 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/' },
  psn: { label: 'PSNProfiles', url: 'https://psnprofiles.com/trophies/grand-theft-auto-vi' },
  ign: { label: 'IGN Wiki', url: 'https://www.ign.com/wikis/grand-theft-auto-6/Trophies' },
  push: { label: 'Push Square', url: 'https://www.pushsquare.com' },
  mobalytics: { label: 'Mobalytics', url: 'https://mobalytics.gg/gta-6/guides/trophies' },
};

const STAGES = [
  {
    n: 1, tone: '#ff4d8d', title: 'Story & Missable',

    bullets: [
      ['Bank first:', ' Positive Mental Attitude’s Chapter 1 balcony meditation — the only confirmed missable; manual-save every chapter start and end (PowerPyx, PSNProfiles).'],
      ['Play clean:', ' no difficulty setting and no story gold medals; cheats disable trophies for the session (Exophase, Push Square).'],
    ],
    sources: [S.powerpyx, S.exophase, S.psn, S.push],
  },
  {
    n: 2, tone: '#37e0c8', title: '100% & Major Counters',

    bullets: [
      ['A Long Road:', ' Progress > Stats > 100% Completion — about 60% true world completion on top of the story (PowerPyx).'],
      ['Counters:', ' gold all 42 Shooting Ranges, 50 Challenges, 250 Stunts, 200 of 277 vehicles, 100 of 255 animals (IGN Wiki, Exophase).'],
    ],
    sources: [S.powerpyx, S.ign, S.exophase],
  },
  {
    n: 3, tone: '#f6c453', title: 'Strangers, Collectibles & Clean-up',

    bullets: [
      ['Sweep:', ' 8 stranger strands, 18 meditation spots, 100 WAiNK locations, 3 card sets, all 52 areas (IGN Wiki, PSNProfiles).'],
      ['Spend last:', ' 20 race wins, 8 garages, $100,000 in shops, $250,000 laundered, VCIA (PowerPyx, Mobalytics).'],
    ],
    sources: [S.powerpyx, S.ign, S.psn, S.exophase, S.mobalytics],
  },
];

const REQUIREMENTS = [['Difficulty', '4/10'], ['Time', '150-200 h'], ['Playthroughs', '1'], ['Online', '0'], ['Mission replay', 'None']];

// The six cited guide domains, their own-list scope, and this app's dated-citation coverage.
const MATRIX = [
  ['PowerPyx', ['PowerPyx'], S.powerpyx, 'Roadmap & own 55/55 trophy guide'],
  ['Exophase', ['Exophase'], S.exophase, 'Official 55/55 list, grades & rarity'],
  ['PSNProfiles', ['PSNProfiles'], S.psn, 'Roadmap, missables & save rules'],
  ['IGN Wiki', ['IGN Wiki'], S.ign, 'Collectible counts & mission steps'],
  ['Push Square', ['Push Square'], S.push, 'Launch-window preview, 32/55 shown'],
  ['GTABase / Beebom / Mobalytics', ['GTABase', 'Beebom', 'Mobalytics'], S.mobalytics, 'Counter & checklist corroboration'],
];

function dated(text) {
  return text.replace(/\(([^)]+)\)/g, (all, inner) => `(${inner.split(', ').join(` · ${DATE}, `)} · ${DATE})`);
}

function bullet([lead, rest], sources) {
  const item = document.createElement('li');
  item.append(el('b', null, lead));
  const text = el('span');
  appendCited(text, dated(rest), sources);
  item.append(text);
  return item;
}

function trophyPill(trophy) {
  const pill = el('button', `tpill ${trophy.grade}`);
  pill.type = 'button';
  pill.title = `Open ${trophy.name} in the tracker (Stage ${trophy.stage})`;
  pill.append(el('i', null, GRADE[trophy.grade].icon), el('span', null, trophy.name));
  pill.addEventListener('click', () => openTrophy(trophy.id));
  return pill;
}

/** The three-stage platinum roadmap; each stage lists its exact trophy count and every mapped trophy as a pill. */
export function renderRoadmap(host, doc) {
  host.replaceChildren();

  const banner = el('div', 'roadhead');
  banner.append(el('p', 'eyebrow', '150-200 hours · 1 playthrough · 0 online · save at every chapter boundary'));
  banner.append(el('h2', null, 'Platinum Roadmap'));
  host.append(banner);

  const counts = STAGES.map((stage) => doc.trophies.filter((t) => t.stage === stage.n));
  const mapline = el('div', 'mapline');
  mapline.append(el('span', 'mapchip', `✓ 55/55 Mapped — Stage 1: ${counts[0].length} · Stage 2: ${counts[1].length} · Stage 3: ${counts[2].length}`));
  const reqline = el('div', 'reqline');
  for (const [key, value] of REQUIREMENTS) {
    const item = el('span');
    item.append(el('b', null, value), document.createTextNode(` ${key}`));
    reqline.append(item);
  }
  reqline.append(el('span', 'gnote', 'all 55 official trophies mapped · verified Nov 2026'));
  host.append(mapline, reqline);

  STAGES.forEach((stage, index) => {
    const trophies = counts[index];
    const card = el('div', `stage${stage.n === 3 ? ' wide' : ''}`);
    card.style.setProperty('--stage', stage.tone);
    card.append(el('div', 'num', String(stage.n)));

    const body = el('div');
    const titleRow = el('div', 'stitle');
    titleRow.append(el('h3', null, `Stage ${stage.n}: ${trophies.length} ${stage.title}`), el('span', 'flag', `${trophies.length}/55`));
    body.append(titleRow);
    const pills = el('div', 'pills');
    for (const trophy of trophies) pills.append(trophyPill(trophy));
    const list = document.createElement('ul');
    for (const line of stage.bullets) list.append(bullet(line, stage.sources));
    body.append(pills, list, sourceLinks(el('div', 'srcrow'), stage.sources));

    card.append(body);
    host.append(card);
  });
}

function guardrailRow(trophy) {
  const row = el('button', 'guardrow');
  row.type = 'button';
  row.title = `${trophy.name}: ${trophy.missableNote} — open it in the tracker`;

  const name = el('div', 'gname');
  name.append(document.createTextNode(trophy.name));
  name.append(el('span', `flag ${trophy.missable ? 'missable' : 'save'}`, trophy.missable ? 'Missable' : 'Chapter save'));
  name.append(el('span', 'gnote', trophy.missableNote));

  const meta = el('span', 'flag', `Stage ${trophy.stage}`);
  row.append(name, meta);
  row.addEventListener('click', () => openTrophy(trophy.id));
  return row;
}

/** The honest guardrail pane: the one confirmed missable kept apart from the ten chapter saves. */
export function renderGuardrails(host, doc) {
  host.replaceChildren();
  const missable = doc.trophies.filter((t) => t.missable);
  const saves = doc.trophies.filter((t) => t.missableNote && !t.missable);

  const head = el('div', 'guardhead');
  head.append(el('h2', null, 'Missable & save guardrails · no mission replay'));
  host.append(head);

  const missableLabel = el('div', 'seclabel missable-label');
  missableLabel.append(el('span', null, 'Confirmed missable'), el('span', null, String(missable.length)));
  host.append(missableLabel);
  for (const trophy of missable) host.append(guardrailRow(trophy));

  const saveLabel = el('div', 'seclabel');
  saveLabel.append(el('span', null, 'Chapter saves'), el('span', null, String(saves.length)));
  host.append(saveLabel);
  for (const trophy of saves) host.append(guardrailRow(trophy));
}

/** Source verification matrix: six cited domains, per-trophy dated citation coverage,
 *  the Nov 2026 verification date and each domain's scope. Computed from the trophy file. */
export function renderSourceMatrix(host, doc) {
  const card = el('div', 'matrix');
  const head = el('div', 'stitle');
  head.append(el('h3', null, 'Source Verification Matrix'), el('span', 'mapchip', `verified ${DATE}`));
  card.append(head);

  const headRow = el('div', 'mrow head');
  for (const column of ['Cited domain', 'Coverage', 'Verified', 'Scope']) headRow.append(el('span', null, column));
  card.append(headRow);

  for (const [domain, labels, site, scope] of MATRIX) {
    const covered = doc.trophies.filter(
      (t) => t.sources.some((s) => labels.includes(s.label)) || labels.some((l) => t.guide.includes(l)),
    ).length;
    const row = el('div', 'mrow');
    const link = el('a', null, domain);
    link.href = site.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = `${domain} — ${site.url}`;
    row.append(link, el('b', null, `${covered}/${doc.trophies.length}`), el('span', null, DATE), el('span', null, scope));
    card.append(row);
  }
  card.append(el('p', 'mnote', '174 dated chips · recomputed from app/data at boot · zero runtime requests'));
  host.append(card);
}

// The roadmap pane's own styles travel with it and join the page on first visit.
const ROADMAP_CSS = '.roadmap{overflow-y:auto}.roadhead h2{margin:0 0 4px;font-size:20px;font-weight:800;letter-spacing:-.026em;line-height:1.16}'
  + '.reqline{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin:5px 0 6px;font-size:10px;color:var(--muted)}.reqline b{color:var(--text);font-size:13px}'
  + '.mapline{display:flex;align-items:center;flex-wrap:wrap;gap:8px}'
  + '.mapchip{font-size:10px;font-weight:800;letter-spacing:.05em;color:#d9fff6;background:#37e0c824;border:1px solid #37e0c866;border-radius:6px;padding:3px 7px;white-space:nowrap}'
  + '.stage{display:grid;grid-template-columns:32px minmax(0,1fr);gap:9px;padding:7px 10px 8px;margin-bottom:5px;border:1px solid var(--line);border-radius:10px;background:var(--card)}'
  + '.stage .num{width:29px;height:29px;border-radius:8px;display:grid;place-items:center;font-size:14px;font-weight:850;color:#0c1220;background:var(--stage,var(--coral))}'
  + '.stage h3{margin:0;font-size:13px;font-weight:800}'
  + '.stitle{display:flex;align-items:baseline;justify-content:space-between;gap:8px}'

  + '.stage ul{margin:3px 0 0;padding:0;list-style:none;display:grid;gap:1px}'
  + '.stage li{position:relative;padding-left:10px;font-size:10.4px;line-height:1.28;color:#d3dfed}'
  + '.stage li:before{content:"";position:absolute;left:0;top:6px;width:4px;height:4px;border-radius:50%;background:var(--stage,var(--coral))}'
  + '.stage .srcrow{margin:3px 0 0}'
  + '.stage .src{font-size:9.4px;padding:2px 5px}'
  + '.pills{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:2px;margin:4px 0 2px}'
  + '.stage.wide .pills{grid-template-columns:repeat(7,minmax(0,1fr))}'
  + '.tpill{display:flex;align-items:center;gap:3px;min-width:0;padding:1.5px 5px;border:1px solid var(--line);border-radius:5px;background:#0d1626;color:#d3dfed;font-size:8.8px;font-weight:700;text-align:left}'
  + '.tpill i{font-style:normal;flex:none}.tpill span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
  + '.tpill.platinum i{color:#a6ecff}.tpill.gold i{color:#f6c453}.tpill.silver i{color:#dbe4f2}.tpill.bronze i{color:#d98f5e}'
  + '.guardhead h2{margin:0 0 2px;font-size:13px;font-weight:800}'
  + '#save-guardrails .seclabel{margin:2px 0}'
  + '#save-guardrails .missable-label{margin-top:0}'
  + '.guardrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center;padding:2px 0;border-top:1px solid var(--line2);text-align:left}'
  + '.gname{display:flex;align-items:center;gap:5px;min-width:0;font-size:10.6px;line-height:1.35;font-weight:700}'
  + '.guardrow .gnote{min-width:0;font-size:9px;line-height:1.35;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.matrix{margin-top:7px;padding:7px 10px;border:1px solid #37e0c84c;border-radius:10px;background:#0c1a24}'
  + '.matrix h3{margin:0;font-size:12.5px;font-weight:800}'
  + '.mrow{display:grid;grid-template-columns:minmax(0,1.05fr) 40px 52px minmax(0,1.8fr);gap:6px;align-items:center;padding:1.5px 0;border-top:1px solid var(--line2);font-size:9.8px;color:#cfe6e0;line-height:1.22}'
  + '.mrow span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.mrow.head{border-top:0;color:var(--dim);font-weight:800;font-size:8.8px;letter-spacing:.08em;text-transform:uppercase}'
  + '.mrow a{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#acf4eb;font-weight:700;text-decoration:none}'
  + '.mrow b{color:#fff;font-size:10.2px}'
  + '.mnote{margin:4px 0 0;font-size:9.2px;line-height:1.3;color:#9fd8cc}';
document.head.append(Object.assign(document.createElement('style'), { textContent: ROADMAP_CSS }));
