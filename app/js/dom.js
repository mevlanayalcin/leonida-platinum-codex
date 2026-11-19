// Shared DOM helpers: element builder, grade badge and dated clickable source chips.
export const DATE = 'Nov 2026';

export const GRADE = {
  platinum: { icon: '◆', label: 'Platinum' }, gold: { icon: '★', label: 'Gold' },
  silver: { icon: '✦', label: 'Silver' }, bronze: { icon: '●', label: 'Bronze' },
};

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function gradeBadge(grade) {
  const meta = GRADE[grade];
  const badge = el('span', `grade ${grade}`);
  badge.append(el('i', null, meta.icon), document.createTextNode(meta.label));
  badge.title = `${meta.label} trophy`;
  return badge;
}

export function sourceLinks(parent, sources) {
  for (const source of sources) {
    const link = el('a', 'src');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = `${source.label} · verified ${DATE} — ${source.url}`;
    link.append(document.createTextNode(`${source.label} · ${DATE}`), document.createTextNode(' ↗'));
    parent.append(link);
  }
  return parent;
}
