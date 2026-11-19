// Platinum Roadmap: three deliberate stages with official counts, inline source citations,
// and a guardrail pane that separates the one confirmed missable from the ten chapter saves.
import { el, sourceLinks } from './dom.js';
import { openTrophy } from './state.js';
import { appendCited } from './detail.js';

const S = {
  powerpyx: { label: 'PowerPyx Roadmap', url: 'https://www.powerpyx.com/grand-theft-auto-vi-gta-6-trophy-guide-roadmap/' },
  exophase: { label: 'Exophase PS5 List', url: 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/' },
  psn: { label: 'PSNProfiles', url: 'https://psnprofiles.com/trophies/grand-theft-auto-vi' },
  ign: { label: 'IGN Wiki', url: 'https://www.ign.com/wikis/grand-theft-auto-6/Trophies' },
  push: { label: 'Push Square', url: 'https://www.pushsquare.com' },
  mobalytics: { label: 'Mobalytics', url: 'https://mobalytics.gg/gta-6/guides/trophies' },
};

const STAGES = [
  {
    n: 1,
    tone: '#ff4d8d',
    title: 'Main Story — Chapters 1-5',
    kicker: 'Bank the one missable, then play the story clean',
    bullets: [
      ['Chapter 1:', ' bank Positive Mental Attitude’s balcony meditation after Down to Earth / Meet Brian (PowerPyx Roadmap, Push Square).'],
      ['12 story trophies', ' land by playing: no difficulty setting and no story gold medals (PowerPyx Roadmap, Exophase PS5 List).'],
      ['Manual save', ' at every chapter start and end: 15 slots and one autosave, because GTA VI has no mission replay (PSNProfiles).'],
      ['No cheats:', ' they disable trophies and block saving for the session (PowerPyx Roadmap).'],
    ],
    sources: [S.powerpyx, S.push, S.exophase, S.psn],
  },
  {
    n: 2,
    tone: '#37e0c8',
    title: '100% Checklist & Major Challenges',
    kicker: 'Stats page first, then the big counters',
    bullets: [
      ['A Long Road:', ' Progress > Stats > 100% Completion, about 60% true world completion on top of the story (PowerPyx Roadmap).'],
      ['42 Shooting Ranges', ' to gold, then 50 Challenges for One Last Thing (PowerPyx Roadmap, IGN Wiki).'],
      ['250 Stunts', ', 5 bank vaults, 9 gang operations and one five-kill Combat Focus (PowerPyx Roadmap, PSNProfiles).'],
      ['Thresholds:', ' 200 of 277 vehicles scanned and 100 of 255 animals studied (Exophase PS5 List, IGN Wiki).'],
    ],
    sources: [S.powerpyx, S.ign, S.psn, S.exophase],
  },
  {
    n: 3,
    tone: '#f6c453',
    title: 'Strangers, Collectibles & Clean-up',
    kicker: 'Free roam: every strand, spot and counter',
    bullets: [
      ['8 stranger strands', ' for Strangers & Freaks; six named strangers carry their own trophies (PowerPyx Roadmap, IGN Wiki).'],
      ['18 meditation spots', ', 100 WAiNK locations, 3 card sets, 100 vehicles and all 52 areas (Exophase PS5 List, PSNProfiles).'],
      ['Activities:', ' 20 race wins, 14 drone races, arcade, bowling, jewelry, armored trucks and VCIA (PowerPyx Roadmap, Mobalytics).'],
      ['Spend last:', ' 8 garages, $100,000 in shops and $250,000 laundered through contacts (PowerPyx Roadmap, PSNProfiles).'],
    ],
    sources: [S.powerpyx, S.ign, S.psn, S.exophase, S.mobalytics],
  },
];

const REQUIREMENTS = [['Difficulty', '4/10'], ['Time', '150-200 h'], ['Playthroughs', '1'], ['Online', '0'], ['Mission replay', 'None']];

function bullet([lead, rest], sources) {
  const item = document.createElement('li');
  item.append(el('b', null, lead));
  const text = el('span');
  appendCited(text, rest, sources);
  item.append(text);
  return item;
}

export function renderRoadmap(host, doc) {
  host.replaceChildren();

  const banner = el('div', 'roadhead');
  banner.append(el('p', 'eyebrow', '150-200 hours · 1 playthrough · 0 online'));
  banner.append(el('h2', null, 'Platinum Roadmap'));
  banner.append(el('p', 'subnote', 'Story first with the Chapter 1 missable banked, then the 100% checklist, then strangers, collectibles and clean-up. No mission replay: save at every chapter boundary.'));
  host.append(banner);
  const reqline = el('div', 'reqline');
  for (const [key, value] of REQUIREMENTS) {
    const item = el('span');
    item.append(el('b', null, value), document.createTextNode(` ${key}`));
    reqline.append(item);
  }
  host.append(reqline);

  for (const stage of STAGES) {
    const count = doc.trophies.filter((t) => t.stage === stage.n).length;
    const card = el('div', 'stage');
    card.style.setProperty('--stage', stage.tone);
    card.append(el('div', 'num', String(stage.n)));

    const body = el('div');
    const titleRow = el('div', 'stitle');
    titleRow.append(el('h3', null, stage.title), el('span', 'flag', `${count} trophies`));
    body.append(titleRow, el('p', 'kicker', stage.kicker));
    const list = document.createElement('ul');
    for (const line of stage.bullets) list.append(bullet(line, stage.sources));
    body.append(list, sourceLinks(el('div', 'srcrow'), stage.sources));

    card.append(body);
    host.append(card);
  }
}

function guardrailRow(trophy) {
  const row = el('button', 'guardrow');
  row.type = 'button';
  row.title = `Open ${trophy.name} in the tracker`;

  const main = el('div');
  const name = el('div', 'gname');
  name.append(document.createTextNode(trophy.name));
  name.append(el('span', `flag ${trophy.missable ? 'missable' : 'save'}`, trophy.missable ? 'Missable' : 'Chapter save'));
  main.append(name, el('div', 'gnote', trophy.missableNote));

  const meta = el('div', 'gmeta');
  meta.append(el('span', 'flag', `Stage ${trophy.stage}`));
  row.append(main, meta);
  row.addEventListener('click', () => openTrophy(trophy.id));
  return row;
}

export function renderGuardrails(host, doc) {
  host.replaceChildren();
  const missable = doc.trophies.filter((t) => t.missable);
  const saves = doc.trophies.filter((t) => t.missableNote && !t.missable);

  const head = el('div', 'guardhead');
  head.append(el('p', 'eyebrow', 'No mission replay'));
  head.append(el('h2', null, 'Missable & save guardrails'));
  head.append(el('p', 'subnote', `${missable.length} confirmed missable · ${saves.length} chapter saves. A passed objective is gone with the save, so checkpoint before every chapter boundary.`));
  host.append(head);

  const missableLabel = el('div', 'seclabel');
  missableLabel.append(el('span', null, 'Confirmed missable'), el('span', null, String(missable.length)));
  host.append(missableLabel);
  for (const trophy of missable) host.append(guardrailRow(trophy));

  const saveLabel = el('div', 'seclabel');
  saveLabel.append(el('span', null, 'Chapter saves'), el('span', null, String(saves.length)));
  host.append(saveLabel);
  for (const trophy of saves) host.append(guardrailRow(trophy));

}
