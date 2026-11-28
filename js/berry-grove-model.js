import { dragTo } from './drag.js';

export const groveArt = './assets/scene-04/';
export const welcomeArt = './assets/scene-01/';

export function berryImage(picture, color) {
  return picture(groveArt + `berry-${color}.png`, 'grove-berry-art');
}

export function berryUnits({ el, picture }, count, color, className = '') {
  return Array.from({ length: count }, () => el('span', {
    className: `grove-unit ${className}`, 'data-color': color, 'aria-hidden': 'true',
  }, berryImage(picture, color)));
}

export function createBerryModel({ question, step, current, change, el, button, picture, animate, moveDuration, signal }) {
  const { red, blue, total, target, missing } = question.values;
  const combine = step === 0;
  const model = el('div', { className: 'grove-model' });
  function group(label, key) {
    const grid = el('div', { className: 'grove-grid' });
    const section = el('section', { className: 'grove-group', 'aria-label': label, 'data-group': key },
      el('h3', {}, label), grid);
    model.append(section);
    return { section, grid };
  }
  const sources = combine ? [group('Red berries', 'red'), group('Blue berries', 'blue')]
    : [group('Extra berries', 'extras')];
  const basket = group(combine ? 'Together in the basket' : 'Fill the basket', 'basket');
  const slots = [];
  if (!combine) {
    for (let index = 0; index <= target; index++) {
      const slot = el('span', { className: 'grove-slot', 'aria-hidden': 'true' });
      if (index === target) slot.dataset.overflow = '';
      slots.push(slot);
    }
    const known = berryUnits({ el, picture }, red, 'red').concat(berryUnits({ el, picture }, blue, 'blue'));
    known.forEach((piece, index) => slots[index].append(piece));
    basket.grid.append(...slots);
  }
  const status = el('p', { className: 'grove-model-status', role: 'status' });
  const undo = button('Undo', () => move(current().at(-1)), 'chapter-secondary');
  const reset = button('Reset model', () => {
    change([]);
    place();
    model.querySelector('.grove-piece')?.focus();
  }, 'chapter-secondary');
  model.append(status, el('div', { className: 'chapter-actions grove-tool-actions' }, undo, reset));

  const buttons = Array.from({ length: combine ? total : missing + 1 }, (_, index) => {
    const color = combine && index < red ? 'red' : 'blue';
    const control = button('', () => move(index), 'grove-piece');
    control.dataset.color = color;
    control.append(berryImage(picture, color));
    const source = sources[combine && index >= red ? 1 : 0];
    dragTo(control, () => current().includes(index) ? source.section : basket.section, () => move(index),
      () => !signal.aborted && model.isConnected, { signal });
    return control;
  });

  function place() {
    const moved = current();
    const fragments = sources.map(() => document.createDocumentFragment());
    const joined = document.createDocumentFragment();
    for (const [index, piece] of buttons.entries()) {
      const position = moved.indexOf(index);
      piece.setAttribute('aria-label', `${position >= 0 ? 'Put back' : 'Move'} ${combine ? piece.dataset.color + ' ' : 'extra '}berry ${combine && index >= red ? index - red + 1 : index + 1}`);
      if (position < 0) fragments[combine && index >= red ? 1 : 0].append(piece);
    }
    for (const index of moved) joined.append(buttons[index]);
    sources.forEach(({ grid }, index) => grid.replaceChildren(fragments[index]));
    if (combine) basket.grid.replaceChildren(joined);
    else {
      slots.slice(total).forEach((slot, index) => {
        const piece = buttons[moved[index]];
        slot.replaceChildren(...(piece ? [piece] : []));
        if (piece) slot.removeAttribute('aria-hidden');
        else slot.setAttribute('aria-hidden', 'true');
      });
    }
    undo.disabled = reset.disabled = moved.length === 0;
    status.textContent = combine ? (moved.length === 0 ? 'Tap or drag the berries into the basket.'
      : moved.length === total ? 'Count both groups together.' : 'Move berries from both groups.')
      : moved.length === 0 ? 'Add berries to the empty spaces.' : moved.length > missing ? 'One berry is outside the basket. Try taking it back.'
        : moved.length === missing ? 'The basket is full. Count only the berries you added.' : 'Keep adding berries to fill the basket.';
  }

  function move(index) {
    if (index === undefined || signal.aborted) return;
    const moved = current();
    const piece = buttons[index];
    const from = piece.getBoundingClientRect();
    const focused = document.activeElement === piece || document.activeElement === undo;
    change(moved.includes(index) ? moved.filter(id => id !== index) : [...moved, index]);
    place();
    if (focused) piece.focus({ preventScroll: true });
    const to = piece.getBoundingClientRect();
    animate(piece, [{ transform: `translate(${from.x - to.x}px,${from.y - to.y}px)` },
      { transform: 'translate(0,0)' }], { duration: moveDuration, easing: 'ease-out' });
  }

  place();
  return model;
}
