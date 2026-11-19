// The right-hand guide: official identity in full, cited walkthrough, checklist counters,
// clickable source chips and tickable steps. Loaded through import() after the list paints.
import { state, toggleEarned, toggleStep, reveal, isStepDone } from './state.js';
import { isMasked, maskName, MASK_DESCRIPTION } from './filters.js';
import { el, gradeBadge, sourceLinks, DATE } from './dom.js';

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

/** Link every named source in a sentence to its URL, folding its "· Nov 2026" date into
 *  the same clickable cite, without any runtime fetch. */
export function appendCited(parent, text, sources) {
  const labels = [...new Set(sources.map((source) => source.label))].sort((a, b) => b.length - a.length);
  if (!labels.length) { parent.append(document.createTextNode(text)); return parent; }
  const byLabel = new Map(sources.map((source) => [source.label, source.url]));
  const pattern = new RegExp(`(${labels.map(escapeRegExp).join('|')})( · ${DATE})?`, 'g');
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) parent.append(document.createTextNode(text.slice(cursor, match.index)));
    const cite = el('a', 'cite', match[0]);
    cite.href = byLabel.get(match[1]);
    cite.target = '_blank';
    cite.rel = 'noopener noreferrer';
    cite.title = `Source: ${match[1]} · verified ${DATE} — ${cite.href}`;
    parent.append(cite);
    cursor = match.index + match[0].length;
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
  label.append(el('span', null, '100% checklist counters'), el('span', null, `every count cited · ${DATE}`));
  const grid = el('div', 'counters');
  for (const [value, name, source, url] of CHECKLIST) {
    const card = el('a', 'counter');
    card.href = url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.title = `${name}: ${value} — source: ${source} · ${DATE}`;
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
  sourceLabel.append(el('span', null, 'Cited sources'), el('span', null, `verified ${DATE} · opens in a new tab`));
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

// The guide pane's own styles travel with it. The walkthrough steps sit in a stretch-aligned
// column, so every checkbox lines up flush left with one shared rhythm (v3 staircase fix).
const DETAIL_CSS = '.dhead{padding-bottom:7px;border-bottom:1px solid var(--line)}.dtop{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px}'
  + '.dhead h2{margin:0 0 3px;font-size:20px;font-weight:800;letter-spacing:-.026em;line-height:1.16}'
  + '.callout{margin:6px 0 7px;padding:7px 10px 8px 11px;border:1px solid #ff4d8d61;border-radius:9px;background:#ff4d8d1c}'
  + '.callout .mtag{display:block;margin-bottom:3px;font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#ffd0de}'
  + '.callout p{margin:0;font-size:11px;line-height:1.45;color:#ffe4ec}'
  + '.steps{display:flex;flex-direction:column;align-items:stretch;gap:1px;margin-bottom:4px}'
  + '.step{width:100%;display:grid;grid-template-columns:17px minmax(0,1fr);gap:8px;align-items:start;padding:2.5px 0;text-align:left;color:#d5e0ee;font-size:11.1px;line-height:1.38}'
  + '.step .sbox{width:15px;height:15px;margin-top:1px;border:1.4px solid #ffffff3d;border-radius:4px;display:grid;place-items:center;font-size:9px;font-weight:900;color:transparent}'
  + '.step.done .sbox{background:var(--teal);border-color:var(--teal);color:#04231f}'
  + '.earnedbtn{width:100%;height:32px;border:1px solid #37e0c873;border-radius:9px;background:#37e0c824;color:#c4fbf4;font-size:12px;font-weight:800}'
  + '.counters{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin-bottom:3px}'
  + '.counter{border:1px solid var(--line);background:#182235;padding:2.5px 5px;border-radius:6px;text-decoration:none;line-height:1.15}'
  + '.counter b{display:block;color:#fff;font-size:11px;font-weight:850}'
  + '.counter span{display:block;font-size:8.8px;color:var(--muted)}';
document.head.append(Object.assign(document.createElement('style'), { textContent: DETAIL_CSS }));
