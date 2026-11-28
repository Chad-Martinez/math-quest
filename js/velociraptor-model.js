import { nextTrailPair } from './velociraptor-state.js';

export const trailArt = './assets/scene-05/';
const rowNames = ['First trail', 'Second trail'];
const svgNS = 'http://www.w3.org/2000/svg';

export function createTrailModel({ values, el, picture, action, read, update, signal, animate, duration, readOnly = false }) {
  const counts = [values.first, values.second];
  const status = el('p', { role: 'status', className: 'trail-model-status' });
  const connector = document.createElementNS(svgNS, 'svg');
  connector.setAttribute('class', 'trail-links');
  connector.setAttribute('aria-hidden', 'true');
  const columns = el('div', { className: 'trail-columns' });
  const board = el('div', { className: 'trail-model', role: 'group', 'aria-label': 'Footprint comparison workspace' },
    el('div', { className: 'trail-labels' }, ...rowNames.map((row, index) =>
      el('p', { 'data-row': index }, `${row} · ${counts[index]}`))),
    el('div', { className: 'trail-field' }, columns, connector), status);

  const spots = counts.map((count, row) => Array.from({ length: count }, (_, index) => {
    const piece = readOnly ? el('span', { className: 'trail-spot', 'aria-hidden': 'true' })
      : action('', () => select(row, index), 'trail-spot');
    piece.dataset.row = row;
    piece.dataset.index = index;
    piece.append(picture(trailArt + 'footprint.png', 'trail-print'));
    return piece;
  }));
  for (let i = 0; i < Math.max(...counts); i++) {
    columns.append(el('div', { className: 'trail-column' },
      ...spots.map((row, r) => row[i] ?? el('span', { className: 'trail-empty', 'aria-hidden': 'true', 'data-row': r }))));
  }

  function match(pair) {
    if (pair) {
      update({ pairs: [...read().pairs, pair], selected: null });
      paint(pair);
    }
  }
  function select(row, index) {
    const { pairs, selected } = read();
    if (pairs.some(pair => pair[row] === index) || pairs.length === Math.min(...counts)) return;
    if (!selected || selected[0] === row) {
      update({ selected: selected?.[1] === index ? null : [row, index] });
      paint();
      return;
    }
    match(row === 0 ? [index, selected[1]] : [selected[1], index]);
  }

  const auto = readOnly ? null : action('Match a Pair', () => match(nextTrailPair(read().pairs, values)), 'chapter-secondary');
  const undo = readOnly ? null : action('Undo Match', () => {
    update({ pairs: read().pairs.slice(0, -1), selected: null });
    paint();
  }, 'chapter-secondary');
  if (!readOnly) board.append(el('div', { className: 'chapter-actions trail-match-actions' }, undo, auto));

  function draw(justMatched) {
    const bounds = connector.getBoundingClientRect();
    if (!bounds.width || signal.aborted) return;
    connector.replaceChildren(...read().pairs.map(pair => {
      const [a, b] = pair.map((index, row) => spots[row][index].getBoundingClientRect());
      const left = a.left + a.width / 2 - bounds.left;
      const right = b.left + b.width / 2 - bounds.left;
      const top = a.bottom - bounds.top;
      const bottom = b.top - bounds.top;
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', `M${left},${top} L${right},${bottom}`);
      if (pair === justMatched) {
        path.setAttribute('pathLength', '1');
      }
      return path;
    }));
    if (justMatched && connector.lastElementChild) {
      animate(connector.lastElementChild, [{ strokeDasharray: '1 1', strokeDashoffset: 1 },
        { strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration });
    }
  }

  function paint(justMatched) {
    const { pairs, selected } = read();
    const complete = pairs.length >= Math.min(...counts);
    for (const [row, pieces] of spots.entries()) {
      for (const [index, piece] of pieces.entries()) {
        const matched = pairs.some(pair => pair[row] === index);
        const chosen = selected?.[0] === row && selected[1] === index;
        piece.classList.toggle('trail-matched', matched);
        piece.classList.toggle('trail-remaining', complete && !matched);
        if (readOnly) continue;
        piece.setAttribute('aria-label', `${rowNames[row]} footprint ${index + 1}${matched ? ', matched' : ''}`);
        piece.setAttribute('aria-pressed', String(matched || chosen));
        piece.setAttribute('aria-disabled', String(matched || complete));
      }
    }
    if (auto) auto.disabled = complete;
    if (undo) undo.disabled = !pairs.length;
    status.textContent = readOnly || complete ? 'Count the footprints that don’t have a partner.' :
      selected ? `Choose a footprint from the ${selected[0] === 0 ? 'second' : 'first'} trail.` : 'Choose one footprint from each trail.';
    draw(justMatched);
  }
  paint();
  const resize = new ResizeObserver(() => draw());
  resize.observe(columns);
  signal.addEventListener('abort', () => resize.disconnect(), { once: true });
  return board;
}
