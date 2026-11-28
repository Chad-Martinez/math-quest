import { dragTo } from './drag.js';
import { bridgeCounts } from './triceratops-state.js';

export const bridgeArt = './assets/scene-06/';

const bridgeAppearance = {
  name: 'Bridge plank workspace', rows: 'Aligned bridge rows', first: 'First row', second: 'Second row',
  fixedAsset: bridgeArt + 'plank.png', movingAsset: bridgeArt + 'plank.png', supplyAsset: bridgeArt + 'spare-crate.png',
  item: 'plank', addLabel: 'Add a Plank', showSlots: true,
  status: { equal: 'The rows match. Count the planks you added.',
    greater: 'The second row has more planks. Move an extra one back.',
    shorter: 'The second row has fewer planks. Add from the spare supply.' },
};

export function createBridgeModel(options) {
  return createAlignedTransferModel(options, bridgeAppearance);
}

export function createAlignedTransferModel({ values, read, update, el, picture, action, signal, animate, timing,
  readOnly = false }, appearance) {
  const { target, initial, supply } = values;
  const first = el('p', { className: 'bridge-row-label' });
  const second = el('p', { className: 'bridge-row-label' });
  const spare = el('h3', { className: 'bridge-row-label' });
  const aligned = el('div', { className: 'bridge-columns', role: 'group', 'aria-label': appearance.rows });
  const holder = el('div', { className: 'bridge-supply-grid' });
  const status = el('p', { className: 'bridge-model-status', role: 'status' });
  const supplyArea = el('section', { className: 'bridge-supply', 'aria-label': 'Spare supply' },
    picture(appearance.supplyAsset, 'bridge-crate'), el('div', {}, spare, holder));
  const board = el('div', { className: 'bridge-model', role: 'group', 'aria-label': appearance.name },
    el('div', { className: 'bridge-row-labels' }, first, second), aligned, supplyArea, status);
  const pieceArt = asset => picture(asset, 'bridge-plank');
  const base = Array.from({ length: initial + supply }, (_, index) => {
    const slot = el('span', { className: 'bridge-slot', 'aria-hidden': 'true' });
    aligned.append(el('div', { className: 'bridge-column' },
      el('span', { className: 'bridge-slot bridge-fixed', 'aria-hidden': 'true' }, ...(index < target ? [pieceArt(appearance.fixedAsset)] : [])),
      slot));
    if (index < initial) slot.append(pieceArt(appearance.movingAsset));
    return slot;
  });
  const supplyCells = Array.from({ length: supply }, () => el('span', { className: 'bridge-slot' }));
  holder.append(...supplyCells);

  const units = supplyCells.map(() => {
    const piece = readOnly ? el('span', { className: 'bridge-piece', 'aria-hidden': 'true' })
      : action('', () => move(piece), 'bridge-piece');
    piece.append(pieceArt(appearance.movingAsset));
    if (!readOnly) dragTo(piece, () => base[initial + read().shared], () => place(piece), () => units.indexOf(piece) >= read().shared, { signal });
    return piece;
  });
  const add = !readOnly && action(appearance.addLabel, () => place(units[read().shared]), 'chapter-secondary');
  const undo = !readOnly && action('Undo', () => change(read().shared - 1), 'chapter-secondary');
  const reset = !readOnly && action('Reset', () => change(0), 'chapter-secondary');
  const slots = !readOnly && appearance.showSlots && action('Show empty slots', () => {
    update({ slots: !read().slots }, true);
    paint();
  }, 'chapter-secondary');
  if (!readOnly) board.append(el('div', { className: 'chapter-actions grove-tool-actions' }, add, undo, reset, ...(slots ? [slots] : [])));

  function slotAt(index, shared) {
    return index < shared ? base[initial + index] : supplyCells[supply - 1 - index];
  }

  function paint() {
    const { shared } = read();
    const counts = bridgeCounts(values, shared);
    first.textContent = `${appearance.first} · ${counts.first}`;
    second.textContent = `${appearance.second} · ${counts.second}`;
    spare.textContent = `Spare supply · ${counts.spare}`;
    for (const [index, slot] of base.entries()) {
      slot.classList.toggle('bridge-next', !readOnly && index === counts.second);
      slot.classList.toggle('bridge-staging', index >= target && counts.second >= target && !readOnly);
      slot.classList.toggle('bridge-empty', Boolean(appearance.showSlots && read().slots && index >= counts.second && index < target));
    }
    for (const [index, piece] of units.entries()) {
      const added = index < shared;
      const slot = slotAt(index, shared);
      if (piece.parentElement !== slot) slot.append(piece);
      slot.removeAttribute('aria-hidden');
      piece.classList.toggle('bridge-added', added);
      if (!readOnly) {
        piece.setAttribute('aria-label', added ? `Placed ${appearance.item} ${index + 1}${index === shared - 1 ? ', undo' : ''}`
          : `Spare ${appearance.item} ${index + 1}, add to ${appearance.second.toLowerCase()}`);
        piece.setAttribute('aria-disabled', String(added && index !== shared - 1));
      }
    }
    board.dataset.relation = counts.second === target ? 'equal' : counts.second > target ? 'greater' : 'shorter';
    const minimum = appearance.minimum && shared === values.missing;
    status.textContent = minimum ? appearance.minimum : appearance.status[board.dataset.relation];
    if (!readOnly) {
      add.disabled = shared >= supply;
      undo.disabled = reset.disabled = shared === 0;
      if (slots) {
        slots.textContent = read().slots ? 'Hide empty slots' : 'Show empty slots';
        slots.setAttribute('aria-pressed', String(read().slots));
      }
    }
  }

  function move(piece) {
    const index = units.indexOf(piece);
    const { shared } = read();
    if (index >= shared) place(piece);
    else if (index === shared - 1) change(shared - 1);
  }

  function place(piece) {
    const { shared } = read();
    const index = units.indexOf(piece);
    if (index < shared) return;
    // Keep the chosen plank as the moving element and compact the remaining supply.
    [units[shared], units[index]] = [units[index], units[shared]];
    change(shared + 1);
  }

  function fly(piece, from, duration, delay = 0) {
    const to = piece.getBoundingClientRect();
    if (!to.width || !from.width) return;
    animate(piece, [{ translate: `${from.left - to.left}px ${from.top - to.top}px` }, { translate: '0 0' }],
      { duration, delay, easing: 'ease-out', fill: 'backwards' });
  }

  function change(shared) {
    const before = read().shared;
    if (shared < 0 || shared > supply || shared === before) return;
    const moved = units.slice(Math.min(before, shared), Math.max(before, shared));
    const origins = moved.map(piece => {
      const bounds = piece.getBoundingClientRect();
      piece.getAnimations().forEach(animation => animation.cancel());
      return bounds;
    });
    const focus = document.activeElement;
    update({ shared }, true);
    paint();
    moved.forEach((piece, index) => fly(piece, origins[index], timing[shared > before ? 'place' : 'undo']));
    if (document.activeElement !== focus || focus?.disabled) {
      (moved.includes(focus) ? focus : !add.disabled ? add : undo).focus({ preventScroll: true });
    }
    const relation = board.dataset.relation;
    if (relation === 'equal' || (relation === 'greater' && timing.greater)) animate(aligned, [{ outlineColor: '#3c7850' }, { outlineColor: 'transparent' }],
      { duration: relation === 'equal' ? timing.equal : timing.greater, easing: 'ease-out' });
  }

  function reconcile(from) {
    const { shared } = read();
    const changed = units.slice(Math.min(shared, from), Math.max(shared, from));
    changed.forEach((piece, offset) => {
      const index = units.indexOf(piece);
      fly(piece, slotAt(index, from).getBoundingClientRect(), timing['success-reconcile'], offset * 85);
    });
    return changed.length ? (changed.length - 1) * 85 + timing['success-reconcile'] : 0;
  }

  paint();
  return { board, reconcile };
}
