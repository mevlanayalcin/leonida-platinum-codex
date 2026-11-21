// The trophy guide pane (official text, missable callout, source disagreements, counter, cited steps with named outlet
// chips) and the right rail (Next Up plus every page this guide cites). Shielded trophies show only a Peek card.
import { state, toggleEarned, toggleStep, togglePeek, isStepDone } from './state.js';
import { isMasked, maskName, MASK_DESCRIPTION } from './filters.js';
import { el, btn, css, link, gradeBadge, citePill, sitePill, medal, hueOf, CHECKED } from './dom.js';
import { sites } from './verify.js';
import { buildGuideSourceSummary, disputesFor, nextUpCard, counterFor, stepper, chapterOf, longRoad } from './codex.js';
import { trophyLink, copyText } from './io.js';

const LETTERS = 'ABCDEF';

/** Append guide text, turning each (KEY, KEY) group that names this trophy's sources into outlet chips. */
export function appendCited(parent, text, sources) {
  const keys = new Set(sources.map((s) => s.key));
  let from = 0;
  for (const m of text.matchAll(/\(([^()]+)\)/g)) {
    const cites = m[1].split(', ');
    if (!cites.every((k) => keys.has(k))) continue;
    parent.append(text.slice(from, m.index).trimEnd(), ' ', el('span', 'cites', ...cites.map((k) => citePill(k, sources))));
    from = m.index + m[0].length;
  }
  parent.append(text.slice(from));
  return parent;
}

/** A source disagreement: side A, B, C... each with its outlets, then our call. */
export function conflictPanel(c, sources, open) {
  const d = el('details', 'conflict');
  d.open = Boolean(open);
  d.append(el('summary', null, el('span', 'ctag', `⚖ Sources differ · ${c.sides.map((_, i) => LETTERS[i]).join(' vs ')}`), el('b', null, c.title)),
    el('div', 'csides', ...c.sides.map(([keys, says], i) => el('div', 'cside', el('i', null, LETTERS[i]),
      el('span', 'ccites', ...keys.map((k) => citePill(k, sources))), el('p', null, says)))),
    el('p', 'ccall', el('b', null, 'Our call '), c.call));
  return d;
}

export function toast(text) {
  const t = document.querySelector('.toast') ?? document.body.appendChild(el('div', 'toast'));
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(t.timer);
  t.timer = setTimeout(() => t.classList.remove('on'), 1800);
}

function stepRow(t, s, i, byKey) {
  const done = isStepDone(t.id, i);
  const box = btn(`sbox${done ? ' on' : ''}`, done ? '✓' : String(i + 1), () => toggleStep(t.id, i));
  box.setAttribute('aria-pressed', done);
  box.setAttribute('aria-label', `Step ${i + 1} done`);
  const n = sites(s.cites, byKey);
  const li = el('li', `step${done ? ' done' : ''}`, box, el('p', null, `${s.text} `, ...s.cites.map((k) => citePill(k, t.sources))));
  li.title = `${n} site${n > 1 ? 's' : ''} state this step`;
  return li;
}

function head(t, doc, masked) {
  const earned = state.earned.has(t.id);
  const ds = disputesFor(doc, t.id);
  const icon = el('div', 'dmedal');
  icon.innerHTML = medal(t.grade, 46);
  const flags = el('div', 'dflags', gradeBadge(t.grade),
    t.missable && !masked ? el('span', 'flag missable', `Missable · ${t.missableChapter}`) : null,
    chapterOf(t) && !t.missable && !masked ? el('span', 'flag save', `${chapterOf(t)}${t.saveSlot ? ` · S${t.saveSlot}` : ''}`) : null,
    t.hidden ? el('span', 'flag', 'Hidden on PSN') : null, masked ? null : el('span', 'flag cited', `${t.multi}/${t.claims.length} on 2+ sites`),
    !masked && ds.length ? el('span', 'flag dcount', `⚖ ${ds.length} dispute${ds.length > 1 ? 's' : ''}`) : null);
  const mark = btn(`btn${earned ? ' won' : ' primary'}`, earned ? '✓ Earned' : 'Mark earned', () => toggleEarned(t.id));
  mark.setAttribute('aria-pressed', earned);
  const copy = btn('btn', 'Copy link', async () => toast((await copyText(trophyLink(t.id))) ? 'Link copied' : trophyLink(t.id)));
  return el('header', 'dhead', icon, el('div', 'dtitle', flags, el('h2', null, masked ? maskName(t) : t.name),
    el('p', 'ddesc', masked ? MASK_DESCRIPTION : t.description)),
  el('div', 'dact', mark, copy));
}

/** The guide for one trophy. */
export function renderTrophyDetail(host, t, doc) {
  if (!t) { host.replaceChildren(el('p', 'ddesc', 'Pick a trophy from the list.')); return; }
  const masked = isMasked(t, state);
  if (masked) {
    host.replaceChildren(head(t, doc, true), el('div', 'shield', el('b', null, '🛡 Spoiler shield on'),
      el('p', null, `This ${t.category === 'story' ? 'story' : 'hidden'} trophy, its guide and its sources stay masked until you earn it.`),
      btn('btn primary', 'Peek at this trophy', () => togglePeek(t.id))));
    return;
  }
  const byKey = doc.audit.byKey;
  const ds = disputesFor(doc, t.id).sort((a, b) => a.trophies.length - b.trophies.length || b.sides.length - a.sides.length);
  const c = counterFor(t);
  const guideClaims = t.claims.length - t.steps.length;
  const outlets = [...new Map(t.sources.map((s) => [s.label, s])).values()];
  const guide = el('details', 'gnotes', el('summary', null, `Cited guide notes · ${guideClaims} claim${guideClaims === 1 ? '' : 's'}`));
  guide.append(appendCited(el('p'), t.guide, t.sources));
  host.replaceChildren(...[head(t, doc, false),
    t.missable ? el('div', 'miss', el('b', 'mtag', `⚠ Missable · ${t.missableLabel}`), el('p', null, `${t.missableNote} `, ...t.missableCites.map((k) => citePill(k, t.sources)))) : null,
    ...ds.map((d, i) => conflictPanel(d, doc.sources, i === 0)),
    c ? stepper(c.key, c.goal, c.label, c.unit) : null,
    t.id === 14 ? el('div', 'alr', ...longRoad(t).map((r) => stepper(r.key, r.goal, r.label, r.unit))) : null,
    el('h3', 'dsec', `How to earn it · ${t.steps.length} cited step${t.steps.length === 1 ? '' : 's'}`),
    el('ol', 'steps', ...t.steps.map((s, i) => stepRow(t, s, i, byKey))),
    guideClaims ? guide : null,
    el('div', 'named', el('span', 'dsec', 'Named sources'), sitePill(outlets.length), ...outlets.map((s) => citePill(s.key, t.sources)))].filter(Boolean));
}

/** Next Up, then every page this guide cites with its outlet, claim count and read date. */
export function renderRail(host, t, doc) {
  const card = nextUpCard(doc);
  if (!t) { host.replaceChildren(card); return; }
  const masked = isMasked(t, state);
  const rows = buildGuideSourceSummary(t, doc.sources, CHECKED);
  const list = el('section', 'srcs', el('h3', 'railh', `Sources for this guide · ${rows.length} pages`),
    el('p', 'srcread', `Each page read ${CHECKED} · opens only when clicked`));
  if (masked) list.append(el('p', 'srcread', '🛡 Page titles stay shielded with the trophy. Peek to list them.'));
  else {
    for (const s of rows) {
      const a = link('src', s.url, el('b', null, s.label), el('span', null, s.page), el('em', null, `${s.claims} claim${s.claims === 1 ? '' : 's'}`));
      a.style.setProperty('--h', hueOf(s.label));
      a.title = `${s.url} · read ${s.read}`;
      list.append(a);
    }
  }
  host.replaceChildren(card, list);
}

css('.split.tri{grid-template-columns:minmax(0,1fr) 580px 236px}'
  + '#trophy-detail{display:flex;flex-direction:column;gap:8px;padding:12px 16px}'
  + '.dhead{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:4px 12px}.dmedal{padding-top:4px}.dtitle h2{margin:3px 0 1px;font-size:22px;font-weight:880;letter-spacing:-.01em}'
  + '.dflags{display:flex;flex-wrap:wrap;gap:4px}.dflags .flag{padding:0 6px}.ddesc{margin:0;font-size:14px;color:var(--muted)}'
  + '.dact{display:flex;flex-direction:column;gap:5px}.dact .btn{height:27px;padding:0 10px;font-size:12.5px}.btn.won{border-color:var(--lagoon);background:#38e3cf2e;color:#a6fff2}'
  + '.flag.dcount{background:#ffb24d24;color:#ffd99a;text-transform:none}'
  + '.miss{padding:6px 11px;border-radius:11px;border:1px solid #ff3b5c;background:linear-gradient(90deg,#ff3b5c33,#ff3b5c12)}'
  + '.mtag{display:block;font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#ffb3c2}.miss p{margin:2px 0 0;font-size:13.5px;line-height:1.45}'
  + '.conflict{border:1px solid #ffb24d73;border-radius:11px;background:#ffb24d0f}.conflict summary{display:flex;align-items:center;gap:8px;padding:4px 11px;cursor:pointer;font-size:13.5px}'
  + '.ctag{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#ffc061;white-space:nowrap}'
  + '.csides{display:grid;gap:4px;padding:0 11px}.cside{display:grid;grid-template-columns:20px auto minmax(0,1fr);gap:8px;align-items:center}'
  + '.cside i{font-style:normal;display:grid;place-items:center;height:20px;border-radius:6px;background:#ffc061;color:#2a1600;font-size:11px;font-weight:900}'
  + '.ccites{display:flex;gap:3px}.cside p{margin:0;font-size:13px;line-height:1.35}.ccall{margin:4px 0 0;padding:4px 11px 5px;border-top:1px solid #ffb24d33;font-size:13px;color:#ffe9c7}.ccall b{color:#ffc061}'
  + '.alr{display:grid;grid-template-columns:1fr 1fr;gap:5px}'
  + '.dsec{margin:2px 0 0;font-size:11.5px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--lagoon)}'
  + '.steps{display:grid;gap:5px;margin:0;padding:0;list-style:none}.step{display:grid;grid-template-columns:24px minmax(0,1fr);gap:9px;align-items:start}'
  + '.step p{margin:0;font-size:14px;line-height:1.5}.step .cite{margin-right:3px}.step.done p{color:var(--dim)}'
  + '.sbox{width:24px;height:24px;border-radius:7px;border:1.5px solid #ffffff47;background:#0a101d;font-size:12px;font-weight:900;color:var(--muted)}.sbox.on{border-color:var(--lagoon);background:var(--lagoon);color:#03211d}'
  + '.gnotes summary{cursor:pointer;font-size:12.5px;font-weight:800;color:var(--muted)}.gnotes p{margin:5px 0 0;font-size:13.5px;line-height:1.7}.cites{display:inline-flex;gap:3px}'
  + '.named{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding-top:6px;border-top:1px solid var(--line2)}.named .dsec{margin:0 4px 0 0}'
  + '.shield{display:grid;gap:8px;justify-items:start;padding:16px;border:1px dashed #ff5c8a8c;border-radius:12px;background:#ff5c8a12}.shield b{font-size:16px}.shield p{margin:0;color:var(--muted)}'
  + '.srcs{margin-top:10px;padding-top:9px;border-top:1px solid var(--line2)}.srcread{margin:-3px 0 6px;font-size:11px;color:var(--dim)}'
  + '.src{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 6px;padding:5px 7px;margin-bottom:3px;border-radius:8px;border-left:3px solid var(--h);background:#ffffff08;text-decoration:none}'
  + '.src:hover{background:#ffffff12}.src b{font-size:12.5px}.src span{grid-column:1;font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
  + '.src em{grid-row:1/3;grid-column:2;align-self:center;font-style:normal;font-size:11px;font-weight:850;color:#a6fff2}'
  + '.toast{position:fixed;left:50%;bottom:22px;z-index:9;transform:translate(-50%,20px);padding:9px 16px;border-radius:10px;background:#38e3cf;color:#03211d;font-weight:850;opacity:0;transition:.2s;pointer-events:none}.toast.on{opacity:1;transform:translate(-50%,0)}');
