// The right-hand guide: official identity in full, cited walkthrough, checklist counters,
// clickable source chips and tickable steps. Loaded through import() after the list paints.
import { state, toggleEarned, toggleStep, reveal, isStepDone } from './state.js';
import { isMasked, maskName, MASK_DESCRIPTION } from './filters.js';
import { el, gradeBadge, sourceLinks } from './dom.js';

const STAGE_LABEL = { 1: 'Stage 1 · Story', 2: 'Stage 2 · 100% checklist', 3: 'Stage 3 · Clean-up' };
const CATEGORY_LABEL = { platinum: 'Platinum', story: 'Story', collectibles: 'Collectibles', activities: 'Activities' };

// The 100% checklist categories A Long Road gates, with the source each count comes from.
// Values match the official trophy data (42 ranges, 50 challenges, 250 stunts, 100 WAiNK,
// 18 meditation spots, 3 card sets, 52 areas, 200 vehicles, 100 animals, 100%).
const CHECKLIST = [
  ['100%', 'Completion', 'PowerPyx', 'https://www.powerpyx.com/grand-theft-auto-vi-gta-6-trophy-guide-roadmap/'],
  ['42', 'Shooting', 'PowerPyx', 'https://www.powerpyx.com/grand-theft-auto-vi-gta-6-trophy-guide-roadmap/'],
  ['50', 'Challenges', 'IGN Wiki', 'https://www.ign.com/wikis/grand-theft-auto-6/Trophies'],
  ['250', 'Stunts', 'PowerPyx', 'https://www.powerpyx.com/grand-theft-auto-vi-gta-6-trophy-guide-roadmap/'],
  ['100', 'WAiNK', 'Exophase', 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/'],
  ['18', 'Meditation', 'Exophase', 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/'],
  ['52', 'Areas', 'PSNProfiles', 'https://psnprofiles.com/trophies/grand-theft-auto-vi'],
  ['3', 'Card sets', 'IGN Wiki', 'https://www.ign.com/wikis/grand-theft-auto-6/Trophies'],
  ['200', 'Vehicles', 'PowerPyx', 'https://www.powerpyx.com/grand-theft-auto-vi-gta-6-trophy-guide-roadmap/'],
  ['100', 'Animals', 'PowerPyx', 'https://www.powerpyx.com/grand-theft-auto-vi-gta-6-trophy-guide-roadmap/'],
];

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Link every named source mentioned in a sentence to its URL, without any runtime fetch. */
export function appendCited(parent, text, sources) {
  const labels = [...new Set(sources.map((source) => source.label))].sort((a, b) => b.length - a.length);
  if (!labels.length) { parent.append(document.createTextNode(text)); return parent; }
  const byLabel = new Map(sources.map((source) => [source.label, source.url]));
  const pattern = new RegExp(`(${labels.map(escapeRegExp).join('|')})`, 'g');
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) parent.append(document.createTextNode(text.slice(cursor, match.index)));
    const cite = el('a', 'cite', match[1]);
    cite.href = byLabel.get(match[1]);
    cite.target = '_blank';
    cite.rel = 'noopener noreferrer';
    cite.title = `Source: ${match[1]} — ${cite.href}`;
    parent.append(cite);
    cursor = match.index + match[1].length;
  }
  if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
  return parent;
}

function pill(text, tone) {
  return el('span', `pill${tone ? ` ${tone}` : ''}`, text);
}

function earnedButton(trophy) {
  const earned = state.earned.has(trophy.id);
  const button = el('button', `earnedbtn${earned ? ' on' : ''}`, earned ? 'Earned — click to unmark' : 'Mark as earned');
  button.type = 'button';
  button.setAttribute('aria-pressed', String(earned));
  button.addEventListener('click', () => toggleEarned(trophy.id));
  return button;
}

function checklistBlock() {
  const label = el('div', 'seclabel');
  label.append(el('span', null, '100% checklist counters'), el('span', null, 'source on every count'));
  const grid = el('div', 'counters');
  for (const [value, name, source, url] of CHECKLIST) {
    const card = el('a', 'counter');
    card.href = url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.title = `${name}: ${value} — source: ${source}`;
    card.append(el('b', null, value), el('span', null, name));
    grid.append(card);
  }
  return [label, grid];
}

export function renderTrophyDetail(host, trophy, doc) {
  const keep = host.dataset.trophyId === String(trophy?.id) ? host.scrollTop : 0;
  host.dataset.trophyId = trophy ? String(trophy.id) : '';
  host.replaceChildren();
  if (!trophy) {
    const empty = el('div', 'empty');
    empty.append(el('h3', null, 'No trophy selected'), el('p', null, 'Pick a row from the checklist to read its cited walkthrough.'));
    host.append(empty);
    return;
  }

  const masked = isMasked(trophy, state);
  const name = masked ? maskName(trophy) : trophy.name;
  const head = el('div', 'dhead');
  const top = el('div', 'dtop');
  top.append(el('span', 'eyebrow', `Trophy ${trophy.id} of ${doc.trophies.length} · ${STAGE_LABEL[trophy.stage] ?? ''}`), gradeBadge(trophy.grade));
  head.append(top, el('h2', null, name), el('p', 'guide', masked ? MASK_DESCRIPTION : trophy.description));
  host.append(head);

  const meta = el('div', 'dmeta');
  if (masked) {
    meta.append(pill('Hidden', 'coral'), pill('Spoiler shield on', 'coral'));
  } else {
    meta.append(pill(CATEGORY_LABEL[trophy.category] ?? trophy.category, 'teal'));
    meta.append(pill(STAGE_LABEL[trophy.stage]));
    if (trophy.count) meta.append(pill(`Tracked ${trophy.count}`, 'gold'));
    if (trophy.hidden) meta.append(pill('Hidden trophy'));
  }
  host.append(meta);

  if (!masked && trophy.missableNote) {
    const banner = el('div', `callout${trophy.missable ? '' : ' save'}`);
    const tag = trophy.missable ? 'Missable · chapter-critical' : 'Chapter save · checkpoint';
    banner.append(el('div', 'mtag', tag), el('p', null, trophy.missableNote));
    host.append(banner);
  } else if (masked && trophy.missable) {
    const banner = el('div', 'callout');
    banner.append(el('div', 'mtag', 'Missable · chapter-critical'), el('p', null, 'This trophy can be lost for good. It is flagged without revealing its name.'));
    host.append(banner);
  }

  if (masked) {
    const shield = el('div', 'callout');
    shield.append(el('div', 'mtag', 'Spoiler Mode is on'));
    shield.append(el('p', null, 'Reveal this entry only, or switch Spoiler Mode off in the header.'));
    const button = el('button', 'btn', 'Reveal this trophy');
    button.type = 'button';
    button.addEventListener('click', () => reveal(trophy.id));
    shield.append(button);
    host.append(shield, earnedButton(trophy));
    return;
  }

  const guide = el('p', 'guide');
  appendCited(guide, trophy.guide, trophy.sources);
  host.append(guide);

  if (trophy.id === 14) host.append(...checklistBlock());

  const sourceLabel = el('div', 'seclabel');
  sourceLabel.append(el('span', null, 'Cited sources'), el('span', null, 'opens in a new tab'));
  host.append(sourceLabel, sourceLinks(el('div', 'srcrow'), trophy.sources));

  const done = (state.steps[String(trophy.id)] ?? []).length;
  const stepHead = el('div', 'seclabel');
  stepHead.append(el('span', null, 'Walkthrough steps'), el('span', null, `${done} / ${trophy.steps.length} done`));
  const steps = el('div', 'steps');
  trophy.steps.forEach((text, index) => {
    const complete = isStepDone(trophy.id, index);
    const step = el('button', `step${complete ? ' done' : ''}`);
    step.type = 'button';
    step.setAttribute('aria-pressed', String(complete));
    step.append(el('span', 'sbox', complete ? '✓' : ''), el('span', null, text));
    step.addEventListener('click', () => toggleStep(trophy.id, index));
    steps.append(step);
  });
  host.append(stepHead, steps, earnedButton(trophy));
  host.scrollTop = keep;
}
