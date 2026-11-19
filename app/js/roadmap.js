// The Platinum Roadmap view: three deliberate stages, requirements and save guardrails.
import { el } from './detail.js';

const STAGES = [
  {
    n: 1,
    tone: '#ff4d8d',
    title: 'Main Story — Chapters 1-5',
    kicker: 'Missable guardrails & manual save checkpoints',
    lines: [
      '<b>One playthrough.</b> No difficulty settings, no story gold medals: the 12 story trophies land by playing.',
      '<b>Chapter 1:</b> after Down to Earth / Meet Brian, meditate on the balcony before the next mission.',
      '<b>Manual save</b> at every chapter start and end; 15 slots + 1 autosave and no mission replay.',
      '<b>No cheats:</b> they disable trophies and block saving for the session.'
    ],
    saves: ['Ch.1 start', 'Ch.1 end', 'Ch.2', 'Ch.3', 'Ch.4', 'Pre-finale']
  },
  {
    n: 2,
    tone: '#2dd4bf',
    title: '100% Checklist & Major Challenges',
    kicker: 'Stats page first, then the big counters',
    lines: [
      '<b>A Long Road is the gate:</b> Progress > Stats > 100% Completion, roughly 60% true world completion.',
      '<b>Gold all 42 Shooting Ranges,</b> then clear 50 Challenges for One Last Thing.',
      '<b>Big grinds:</b> 250 stunts, 5 bank vaults, 9 gang operations, one Combat Focus five-kill.',
      '<b>Thresholds:</b> 200/277 vehicles scanned, 100/255 animals studied, all underwater discoveries.'
    ],
    saves: ['Post-story save', '0 online steps']
  },
  {
    n: 3,
    tone: '#f6c453',
    title: 'Strangers, Collectibles & Clean-up',
    kicker: 'Free roam: every strand, spot and counter',
    lines: [
      '<b>Eight stranger strands</b> for Strangers & Freaks; the six named strangers carry their own trophies.',
      '<b>Sweep:</b> 18 meditation spots, 100 WAiNK posts, 3 card sets, 100 vehicles, all 52 areas.',
      '<b>Activities:</b> 20 race wins, 14 drone races, arcade, bowling, jewelry, armored trucks, VCIA.',
      '<b>Spend last:</b> 8 garages, $100,000 in shops, $250,000 laundered.'
    ],
    saves: ['Free roam', 'Money last']
  }
];

const REQUIREMENTS = [
  { k: 'Difficulty', v: '4/10', note: 'PowerPyx', tone: '' },
  { k: 'Time to platinum', v: '150-200', note: 'hours', tone: '' },
  { k: 'Playthroughs', v: '1', note: 'story', tone: '' },
  { k: 'Online trophies', v: '0', note: 'at launch', tone: 'good' },
  { k: 'Mission replay', v: 'None', note: 'save manually', tone: 'bad' },
];

const SOURCES = [
  ['PowerPyx Roadmap', 'https://www.powerpyx.com/grand-theft-auto-vi-gta-6-trophy-guide-roadmap/'],
  ['Exophase PS5 List', 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/'],
  ['PSNProfiles', 'https://psnprofiles.com/trophies/grand-theft-auto-vi'],
  ['IGN Wiki', 'https://www.ign.com/wikis/grand-theft-auto-6/Trophies'],
  ['Mobalytics', 'https://mobalytics.gg/gta-6/guides/trophies'],
];

export function renderRoadmap(host, doc) {
  host.replaceChildren();

  const banner = el('div', 'roadhead');
  banner.append(el('p', 'eyebrow', '150-200 hours · one playthrough'));
  banner.append(el('h2', null, 'Platinum Roadmap'));
  banner.append(el('p', null, 'Story first with the Chapter 1 missable banked, then the 100% checklist, then strangers, collectibles and clean-up. No online step, no difficulty setting, no mission replay.'));
  host.append(banner);

  const reqgrid = el('div', 'reqgrid');
  for (const req of REQUIREMENTS) {
    const card = el('div', `req${req.tone ? ` ${req.tone}` : ''}`);
    card.append(el('div', 'k', req.k));
    const value = el('div', 'v', req.v);
    value.append(document.createTextNode(' '), el('small', null, req.note));
    card.append(value);
    reqgrid.append(card);
  }
  host.append(reqgrid);

  for (const stage of STAGES) {
    const count = doc.trophies.filter((t) => t.stage === stage.n).length;
    const card = el('div', 'stage');
    card.style.setProperty('--stage', stage.tone);
    card.append(el('div', 'num', String(stage.n)));

    const body = el('div', 'sbody');
    const titleRow = el('div', 'stitle');
    titleRow.append(el('h3', null, stage.title), el('span', 'count', `${count} trophies`));
    body.append(titleRow, el('p', 'kicker', stage.kicker));

    const list = el('ul', 'stagelist');
    for (const line of stage.lines) {
      const item = document.createElement('li');
      item.innerHTML = line;
      list.append(item);
    }
    body.append(list);

    const chips = el('div', 'saveline');
    for (const save of stage.saves) chips.append(el('span', 'savechip', save));
    body.append(chips);

    card.append(body);
    host.append(card);
  }

  const sourceRow = el('div', 'srcgrid');
  for (const [label, url] of SOURCES) {
    const link = el('a', 'src');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = url;
    link.append(document.createTextNode(label), el('span', null, '↗'));
    sourceRow.append(link);
  }
  host.append(sourceRow);
}
