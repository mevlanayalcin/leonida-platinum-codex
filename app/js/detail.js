import { state, toggleEarned, toggleStep, reveal, isStepDone, select } from './state.js';
import { isMasked, maskTitle, MASK_DESCRIPTION, CATEGORY_LABEL } from './filters.js';

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function gradeBadge(grade) {
  const badge = el('span', `gb ${grade}`, grade[0].toUpperCase());
  badge.title = grade;
  return badge;
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const STAGE_LABEL = { 1: 'Stage 1 · Story', 2: 'Stage 2 · 100%', 3: 'Stage 3 · Clean-up' };

function pill(text, tone) {
  return el('span', `pill${tone ? ` ${tone}` : ''}`, text);
}

function appendCited(parent, text, sources) {
  const labels = [...new Set(sources.map((s) => s.label))].sort((a, b) => b.length - a.length);
  if (!labels.length) { parent.append(text); return; }
  const pattern = new RegExp(`(${labels.map(escapeRegExp).join('|')})`, 'g');
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) parent.append(text.slice(cursor, match.index));
    parent.append(el('span', 'cite', match[1]));
    cursor = match.index + match[1].length;
  }
  if (cursor < text.length) parent.append(text.slice(cursor));
}

function earnedButton(trophy) {
  const earned = state.earned.has(trophy.id);
  const button = el('button', `earnedbtn${earned ? ' on' : ''}`, earned ? 'Earned — click to unmark' : 'Mark as earned');
  button.type = 'button';
  button.setAttribute('aria-pressed', String(earned));
  button.addEventListener('click', () => toggleEarned(trophy.id));
  return button;
}

export function renderDetail(host, trophy, total) {
  host.replaceChildren();
  if (!trophy) {
    const empty = el('div', 'empty');
    empty.append(el('h3', null, 'No trophy selected'), el('p', null, 'Pick a row from the checklist to read its cited walkthrough.'));
    host.append(empty);
    return;
  }

  const masked = isMasked(trophy, state);
  const head = el('div', 'dhead');
  const top = el('div', 'dtopline');
  top.append(el('span', 'deyebrow', `Trophy ${trophy.id} of ${total} · ${trophy.grade}`), gradeBadge(trophy.grade));
  head.append(top);
  head.append(el('h2', null, masked ? maskTitle(trophy) : trophy.name));
  head.append(el('p', 'ddesc', masked ? MASK_DESCRIPTION : trophy.description));
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
    const banner = el('div', `callout${trophy.missable ? '' : ' watch'}`);
    const tag = trophy.missable ? 'Missable · chapter-critical' : 'Save-checkpoint · watch';
    banner.append(el('div', 'mtag', tag), el('p', null, trophy.missableNote));
    host.append(banner);
  } else if (masked && trophy.missable) {
    const banner = el('div', 'callout');
    banner.append(el('div', 'mtag', 'Missable · chapter-critical'), el('p', null, 'This trophy can be lost for good. It is flagged here without revealing its name.'));
    host.append(banner);
  }

  if (masked) {
    const shield = el('div', 'shield');
    shield.append(el('div', 'icon', '◈'));
    shield.append(el('h3', null, 'Spoiler Mode is on'));
    shield.append(el('p', null, 'Reveal this entry only, or switch Spoiler Mode off in the header.'));
    const button = el('button', 'revealbtn', 'Reveal this trophy');
    button.type = 'button';
    button.addEventListener('click', () => reveal(trophy.id));
    shield.append(button);
    host.append(shield);
    host.append(earnedButton(trophy));
    return;
  }

  const guide = el('p', 'guide');
  appendCited(guide, trophy.guide, trophy.sources);
  host.append(guide);

  const sourceLabel = el('div', 'seclabel');
  sourceLabel.append(el('span', null, 'Cited sources'), el('span', null, 'opens in a new tab'));
  const sourceGrid = el('div', 'srcgrid');
  for (const source of trophy.sources) {
    const link = el('a', 'src');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = source.url;
    link.append(document.createTextNode(source.label), el('span', null, '↗'));
    sourceGrid.append(link);
  }
  host.append(sourceLabel, sourceGrid);

  const done = (state.steps[String(trophy.id)] ?? []).length;
  const stepHead = el('div', 'seclabel');
  stepHead.append(el('span', null, 'Walkthrough steps'), el('span', null, `${done} / ${trophy.steps.length} done`));
  const steps = el('div', 'steps');
  trophy.steps.forEach((text, index) => {
    const isDone = isStepDone(trophy.id, index);
    const step = el('button', `step${isDone ? ' done' : ''}`);
    step.type = 'button';
    step.setAttribute('aria-pressed', String(isDone));
    step.append(el('span', 'sbox', isDone ? '✓' : ''), el('span', null, text));
    step.addEventListener('click', () => toggleStep(trophy.id, index));
    steps.append(step);
  });
  host.append(stepHead, steps, earnedButton(trophy));
}

export function renderWatchlist(host, trophies) {
  host.replaceChildren();
  const head = el('div', 'watchhead');
  head.append(el('p', 'eyebrow', 'Missable & watchlist'));
  head.append(el('h2', null, `${trophies.filter((t) => t.missable || t.missableNote).length} flags before you leave a chapter`));
  head.append(el('p', null, 'One confirmed missable. The rest are chapter-save moments: GTA VI has no mission replay, so a passed objective is gone with the save.'));
  host.append(head);

  const flagged = trophies.filter((t) => t.missable || t.missableNote)
    .sort((a, b) => (Number(b.missable) - Number(a.missable)) || (a.stage - b.stage) || (a.id - b.id));
  for (const trophy of flagged) {
    const row = el('button', 'wrow');
    row.type = 'button';
    const main = el('div');
    const name = el('div', 'wname');
    name.append(document.createTextNode(isMasked(trophy, state) ? maskTitle(trophy) : trophy.name));
    name.append(el('span', `flag ${trophy.missable ? 'missable' : 'watch'}`, trophy.missable ? 'Missable' : 'Save'));
    main.append(name);
    if (!isMasked(trophy, state)) {
      const note = el('div', 'wnote', trophy.missableNote);
      note.title = trophy.missableNote;
      main.append(note);
    }
    const right = el('div');
    right.append(el('span', 'flag count', `S${trophy.stage}`));
    row.append(main, right);
    row.addEventListener('click', () => {
      state.view = 'tracker';
      select(trophy.id);
    });
    host.append(row);
  }
}
