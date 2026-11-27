import { dragTo } from './drag.js';
import { buildModel } from './manipulatives.js';

const objects = './assets/objects/';
const berry = color => objects + color + '-berry.svg';
const gems = color => objects + color + '-gem-vector.svg';
export const stone = objects + 'stone.svg';

function element(tag, className, text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function group(label) {
  const node = element('section', 'chapter-group drop-zone');
  const heading = element('h3', '', label);
  const items = element('div', 'chapter-units');
  node.append(heading, items);
  node.setAttribute('aria-label', label);
  return { node, items };
}

function token(asset, label, action) {
  const node = element(action ? 'button' : 'span', 'chapter-token');
  const image = element('img', 'chapter-unit-img');
  image.src = asset;
  image.alt = '';
  image.draggable = false;
  node.append(image);
  if (action) {
    node.type = 'button';
    node.setAttribute('aria-label', label);
    node.addEventListener('click', action);
  } else {
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', label);
  }
  return node;
}

function units(area, count, asset, label) {
  for (let i = 0; i < count; i++) area.items.append(token(asset, label));
}

function movable(asset, label, from, to, update, moved = false) {
  function move() {
    const destination = piece.parentElement === from.items ? to : from;
    const before = piece.getBoundingClientRect();
    const focused = document.activeElement === piece;
    piece.getAnimations?.().forEach(animation => animation.cancel());
    destination.items.append(piece);
    piece.setAttribute('aria-label', label + (destination === to ? ', put back' : ', move'));
    if (focused) piece.focus({ preventScroll: true });
    update();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && piece.animate) {
      const after = piece.getBoundingClientRect();
      piece.animate([{ transform: `translate(${before.left - after.left}px,${before.top - after.top}px)` },
        { transform: 'translate(0,0)' }], { duration: 175, easing: 'ease-out' });
    }
  }
  const piece = token(asset, label + (moved ? ', put back' : ', move'), move);
  piece.dataset.dragIcon = '●';
  dragTo(piece, () => piece.parentElement === from.items ? to.node : from.node, move);
  (moved ? to : from).items.append(piece);
  return piece;
}

function statusLine(container) {
  const status = element('p', 'chapter-model-status');
  status.setAttribute('role', 'status');
  container.append(status);
  return status;
}

function combine(container, first, second, assets, labels, demonstrated) {
  const a = group(labels[0]), b = group(labels[1]), basket = group(labels[2]);
  const rows = element('div', 'chapter-model-groups');
  rows.append(a.node, b.node, basket.node);
  container.append(rows);
  const status = statusLine(container);
  const update = () => {
    const moved = basket.items.childElementCount;
    status.textContent = moved === first + second ? 'Count everything in the basket.' : 'Tap or drag the objects into the basket.';
  };
  for (const [count, source, asset, label] of [[first, a, assets[0], labels[0]], [second, b, assets[1], labels[1]]]) {
    for (let i = 0; i < count; i++) movable(asset, `${label} ${i + 1}`, source, basket, update, demonstrated);
  }
  update();
}

function supplyBasket({ a, b, need }, added) {
  const basket = group('Travel basket');
  basket.node.classList.add('chapter-supply-basket');
  basket.node.querySelector('h3').textContent = `Travel basket · Goal: ${need}`;
  units(basket, a, berry('red'), 'Red berry');
  units(basket, b, berry('blue'), 'Blue berry');
  for (let i = 0; i < added; i++) {
    const extra = token(spareBerry(i), 'Added berry');
    extra.classList.add('chapter-added-berry');
    basket.items.append(extra);
  }
  return basket;
}

const spareBerry = index => berry(index % 2 ? 'blue' : 'red');

function packSupplies(container, params, demonstrated) {
  const { have, need } = params;
  const basket = supplyBasket(params, 0);
  const spare = group('Spare berries');
  container.append(basket.node, spare.node);
  const status = statusLine(container);
  const update = () => {
    const count = basket.items.childElementCount;
    const next = count === need ? 'Count just the berries you added.'
      : count > need ? 'Put a berry back.' : 'Tap or drag spare berries into the basket.';
    status.textContent = `${count} of ${need} berries. ${next}`;
  };
  const available = Math.min(20 - have, need - have + 2);
  for (let i = 0; i < available; i++) {
    const extra = movable(spareBerry(i), `Spare berry ${i + 1}`, spare, basket, update, demonstrated && i < need - have);
    extra.classList.add('chapter-added-berry');
  }
  update();
}

export function packedSupplies(params) {
  const basket = supplyBasket(params, params.need - params.have);
  basket.node.querySelector('h3').textContent = `Travel basket · ${params.need} berries`;
  return basket.node;
}

export function suppliesNumberLine({ have, need }) {
  return buildModel({ kind: 'line', start: have, target: need, showJumps: true });
}

function footprints(container, { small, large }, demonstrated) {
  const first = group('First trail'), second = group('Second trail');
  const scroll = element('div', 'chapter-trails');
  scroll.style.setProperty('--trail-width', `${large * 48 + 18}px`);
  scroll.append(first.node, second.node);
  container.append(scroll);
  const status = statusLine(container);
  const asset = objects + 'footprint-vector.svg';
  const pair = (index, selected) => {
    const other = (selected === first ? second : first).items.children[index];
    if (!other) {
      status.textContent = 'This print has no partner.';
      return;
    }
    const current = selected.items.children[index];
    const paired = current.getAttribute('aria-pressed') !== 'true';
    for (const piece of [current, other]) piece.setAttribute('aria-pressed', String(paired));
    const count = first.items.querySelectorAll('[aria-pressed=true]').length;
    status.textContent = count === small ? 'Count the prints without a partner.' : `${count} ${count === 1 ? 'pair' : 'pairs'} matched.`;
  };
  for (const [row, other, count] of [[first, second, large], [second, first, small]]) {
    for (let i = 0; i < count; i++) {
      const piece = token(asset, `${row.node.getAttribute('aria-label')}, footprint ${i + 1}`, () => pair(i, row));
      piece.setAttribute('aria-pressed', 'false');
      dragTo(piece, () => other.node, () => pair(i, row));
      row.items.append(piece);
    }
  }
  status.textContent = 'Tap a print to match it with the one across from it.';
  if (demonstrated) for (let i = 0; i < small; i++) pair(i, first);
}

function grow(container, question, demonstrated) {
  const gemsQuestion = question.id === 'gems';
  const labels = gemsQuestion ? ['Green Dino', 'Blue Dino'] : ['T-Rex', 'Friend'];
  const more = group(labels[0]), fewer = group(labels[1]);
  const spare = group(gemsQuestion ? 'Spare gems' : 'Berries to share');
  if (!gemsQuestion) fewer.node.classList.add('chapter-share-recipient');
  const { large, small } = question.params;
  const fixedAsset = gemsQuestion ? gems('green') : berry('red');
  const addedAsset = gemsQuestion ? gems('blue') : berry('blue');
  const noun = gemsQuestion ? 'gem' : 'berry';
  units(more, large, fixedAsset, noun);
  units(fewer, small, addedAsset, noun);
  const rows = element('div', 'chapter-model-groups');
  rows.append(more.node, fewer.node, spare.node);
  container.append(rows);
  const status = statusLine(container);
  const update = () => {
    const count = fewer.items.childElementCount;
    if (count === large) {
      status.textContent = gemsQuestion ? 'They tie. Add just one more.' : 'They match! Count the berries with rings.';
    } else if (count > large) {
      status.textContent = gemsQuestion && count === large + 1 ? 'Blue Dino is just ahead. Count what you moved.' : 'Move an extra one back.';
    } else {
      status.textContent = `Move a spare ${noun} to ${labels[1]}’s group.`;
    }
  };
  const available = Math.min(large - small + 2, 20 - small);
  for (let i = 0; i < available; i++) {
    const piece = movable(addedAsset, `Spare ${noun} ${i + 1}`, spare, fewer, update, demonstrated && i < question.answers[0]);
    if (!gemsQuestion) piece.classList.add('chapter-added-berry');
  }
  update();
}

export function chapterModel(question, step, demonstrated = false) {
  const container = element('div', 'chapter-model');
  const p = question.params;
  if (question.id === 'supplies') {
    if (step === 0) combine(container, p.a, p.b, [berry('red'), berry('blue')], ['Red berries', 'Blue berries', 'Travel basket'], demonstrated);
    else packSupplies(container, p, demonstrated);
  } else if (question.id === 'footprints') {
    footprints(container, p, demonstrated);
  } else if (question.id === 'share' || question.id === 'gems') {
    grow(container, question, demonstrated);
  } else if (step === 0) {
    combine(container, ...p.rightParts, [stone, stone], ['First group', 'Second group', 'Right pan'], demonstrated);
  } else {
    container.append(buildModel({ kind: 'balance', left: p.left, rightParts: p.rightParts, action: 'remove-left', object: stone }, { initialMoveCount: demonstrated ? question.answers[step] : 0 }));
  }
  return container;
}
