import { dragTo } from './drag.js';
import { tallyGroups } from './engine.js';
import { balanceState, moveOne, partWholeState, toggleBead } from './workspace-state.js';

export function compareQuantities(first, second) {
  if (first === second) return 'the same number as';
  return first < second ? 'fewer than' : 'more than';
}

export function frameSlots(count) {
  return Array.from({ length: 10 * Math.max(1, Math.ceil(count / 10)) }, (_, index) => index < count);
}

function node(tag, text, style) {
  const result = document.createElement(tag);
  if (text) result.textContent = text;
  if (style) result.className = style;
  return result;
}

function button(label, action) {
  const control = node('button', label, 'quiet');
  control.addEventListener('click', () => {
    if (control.getAttribute('aria-disabled') !== 'true') action();
  });
  return control;
}

function counterRow(count, icon, indexStyle = () => '') {
  const row = node('div', '', 'counter-row');
  row.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < count; index++) {
    row.append(node('span', icon, `counter ${indexStyle(index)}`));
  }
  return row;
}

function comparison(container, config) {
  const [[first, initial], [second, other]] = config.rows;
  const matching = config.kind === 'pair';
  let paired = 0;
  let added = 0;
  const tracks = node('div', '', 'tracks');
  const limit = matching ? Math.max(initial, other) : Math.min(20, other + 2);
  tracks.style.setProperty('--track-columns', limit);
  const status = node('p', '', 'model-status');
  status.setAttribute('role', 'status');
  function advanceTrack() {
    if (matching) paired++;
    else added++;
    render();
  }
  const advance = button(matching ? 'Match a pair' : `Add one to ${first}`, advanceTrack);
  advance.dataset.dragIcon = config.icon;
  dragTo(advance, () => tracks.children[matching ? 1 : 0], advanceTrack,
    () => advance.getAttribute('aria-disabled') === 'false');
  const undo = button('Undo', () => {
    if (matching) paired = Math.max(0, paired - 1);
    else added = Math.max(0, added - 1);
    render();
  });
  function track(label, count, flag) {
    const lane = node('div', '', 'track drop-zone');
    lane.setAttribute('role', 'group');
    lane.setAttribute('aria-label', `${label}: ${count}`);
    const line = counterRow(count, config.icon, index => {
      if (matching && index < paired) return 'matched';
      if (!matching && flag && index >= initial) return 'added';
      return '';
    });
    lane.append(node('strong', label), line);
    return lane;
  }
  function render() {
    const firstCount = initial + added;
    tracks.replaceChildren(track(first, firstCount, true), track(second, other, false));
    const pairsDone = paired === Math.min(initial, other);
    status.textContent = matching
      ? (pairsDone ? 'Every possible pair is matched. Count the objects without a partner.' : `${paired} ${paired === 1 ? 'pair' : 'pairs'} matched. ${first} has ${initial} and ${second} has ${other}.`)
      : `${first} has ${compareQuantities(firstCount, other)} ${second}. Added: ${added}.`;
    advance.setAttribute('aria-disabled', String(matching ? pairsDone : firstCount === limit));
    undo.setAttribute('aria-disabled', String(paired + added === 0));
  }
  container.append(node('p', matching ? `Tap Match a pair or drag that button to ${second}’s row.` : `Tap Add one or drag that button to ${first}’s row.`), tracks, status, advance, undo);
  render();
}

function join(container, { parts, icon }) {
  const display = node('div', '', 'part-model');
  let combined = false;
  const toggle = button('Put the groups together', () => {
    combined = !combined;
    render();
  });
  function render() {
    display.replaceChildren();
    const [first, second] = parts;
    if (!combined) {
      for (const [label, size] of [['First group', first], ['Second group', second]]) {
        const group = node('div', '', 'part-box');
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', `${label}: ${size}`);
        group.append(node('strong', label), counterRow(size, icon));
        display.append(group);
      }
      toggle.textContent = 'Put the groups together';
      return;
    }
    const group = node('div', '', 'part-box');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', `Whole group: ${first + second}`);
    group.append(node('strong', 'Whole group'));
    const frames = node('div', '', 'frames');
    frames.setAttribute('aria-hidden', 'true');
    const slots = frameSlots(first + second);
    for (let offset = 0; offset < slots.length; offset += 10) {
      const frame = node('div', '', 'ten-frame');
      for (let index = offset; index < offset + 10; index++) {
        frame.append(node('span', slots[index] ? index >= first ? '○' : icon : '', index >= first && slots[index] ? 'second-part' : ''));
      }
      frames.append(frame);
    }
    group.append(frames);
    display.append(group);
    toggle.textContent = 'Show the two groups again';
  }
  container.append(display, toggle);
  render();
}

function remove(container, { start, change, icon }) {
  const status = node('p', '', 'model-status');
  status.setAttribute('role', 'status');
  const items = node('div', '', 'remove-items');
  const tray = node('div', 'Taken-away tray', 'remove-tray drop-zone');
  const removed = new Set();
  function update() {
    status.textContent = `${removed.size} taken away. Take away ${change}, then count what is left.`;
    tray.textContent = `Taken-away tray · ${removed.size}`;
    for (const [index, control] of [...items.children].entries()) {
      control.setAttribute('aria-pressed', String(removed.has(index)));
    }
  }
  for (let index = 0; index < start; index++) {
    const control = button(icon, () => {
      if (removed.has(index)) removed.delete(index);
      else removed.add(index);
      update();
    });
    control.setAttribute('aria-label', `Object ${index + 1}, taken away`);
    dragTo(control, () => tray, () => {
      removed.add(index);
      update();
    }, () => !removed.has(index));
    items.append(control);
  }
  container.append(node('p', 'Tap an object or drag it to the tray. Tap a crossed-out object to put it back.'), status, items, tray);
  update();
}

function numberLine(container, { start, target }) {
  let position = start;
  const track = node('div', '', 'number-line');
  const ticks = Array.from({ length: target - start + 1 }, (_, index) => node('span', String(index + start)));
  track.append(...ticks);
  const status = node('p', '', 'model-status');
  status.setAttribute('role', 'status');
  const jump = button('Jump one forward', () => {
    position = Math.min(position + 1, target);
    update();
  });
  const reset = button('Start over', () => {
    position = start;
    update();
  });
  function update() {
    for (const [index, tick] of ticks.entries()) tick.classList.toggle('current', index + start === position);
    status.textContent = position === target ? `You reached ${target}. How many jumps did you make?` : `At ${position}. Count the jumps to ${target}.`;
    jump.setAttribute('aria-disabled', String(position === target));
  }
  container.append(track, status, jump, reset);
  update();
}

export function buildChart({ kind, rows }) {
  const figure = node('div', '', 'chart');
  figure.append(node('p', kind === 'picture' ? 'Each picture is one vote.' : 'Each mark is one vote.'));
  for (const row of rows) {
    const line = node('div', '', 'chart-row');
    line.dataset.label = row.label;
    const marks = node('div', '', 'marks');
    marks.setAttribute('role', 'img');
    marks.setAttribute('aria-label', `${row.count} votes`);
    if (kind === 'picture') {
      for (let index = 0; index < row.count; index++) marks.append(node('span', row.icon));
    } else {
      for (const count of tallyGroups(row.count)) {
        const group = node('span', '', count === 5 ? 'tally crossed' : 'tally');
        for (let index = 0; index < Math.min(count, 4); index++) group.append(node('i'));
        marks.append(group);
      }
    }
    line.append(node('strong', row.label), marks);
    figure.append(line);
  }
  return figure;
}

function growChart(container, { visual, label, target }) {
  const [source, goal] = [label, target].map(name => visual.rows.find(row => row.label === name));
  const maximum = goal.count + 1;
  let count = source.count;
  const plot = node('div');
  const status = node('p', '', 'model-status');
  status.setAttribute('role', 'status');
  function addVote() {
    count++;
    update();
  }
  const add = button(`Add a vote for ${label}`, addVote);
  add.dataset.dragIcon = source.icon || '|';
  dragTo(add, () => [...plot.querySelectorAll('.chart-row')].find(row => row.dataset.label === label),
    addVote, () => count < maximum);
  const undo = button('Undo', () => {
    count--;
    update();
  });
  function update() {
    const rows = visual.rows.map(row => row === source ? { ...row, count } : row);
    plot.replaceChildren(buildChart({ ...visual, rows }));
    const relationship = count === goal.count
      ? `${label} and ${target} are tied.`
      : `${label} has ${count > goal.count ? 'more' : 'fewer'} votes than ${target}.`;
    status.textContent = `${relationship} Added: ${count - source.count}.`;
    add.setAttribute('aria-disabled', String(count === maximum));
    undo.setAttribute('aria-disabled', String(count === source.count));
  }
  container.append(node('p', `Tap Add a vote or drag that button to the ${label} row.`), plot, status, add, undo);
  update();
}

function workspaceGroup(label) {
  const area = node('div', '', 'workspace-group drop-zone');
  const heading = node('strong', label);
  const contents = node('div', '', 'workspace-counters');
  area.setAttribute('role', 'group');
  area.append(heading, contents);
  return { area, heading, contents };
}

function showCounters(group, label, counts, icons) {
  group.heading.textContent = label;
  const quantity = counts.reduce((total, count) => total + count, 0);
  group.area.setAttribute('aria-label', `${label}: ${quantity}`);
  group.contents.replaceChildren(...counts.flatMap((count, index) =>
    Array.from({ length: count }, () => {
      const marker = node('span', icons[index], 'workspace-counter');
      marker.setAttribute('aria-hidden', 'true');
      return marker;
    })));
}

function counterControls({ limit, moveLabel, returnLabel, destination, origin, icon, render }) {
  let moved = 0;
  function change(action) {
    moved = moveOne(moved, action, limit);
    update();
  }
  const advance = button(moveLabel, () => change('move'));
  const reverse = button(returnLabel, () => change('return'));
  const reset = button('Reset model', () => change('reset'));
  for (const [control, target, action] of [[advance, destination, 'move'], [reverse, origin, 'return']]) {
    control.dataset.dragIcon = icon;
    dragTo(control, () => target, () => change(action), () => control.getAttribute('aria-disabled') === 'false');
  }

  function update() {
    advance.setAttribute('aria-disabled', String(moved === limit));
    reverse.setAttribute('aria-disabled', String(moved === 0));
    reset.setAttribute('aria-disabled', String(moved === 0));
    render(moved);
  }
  const controls = node('div', '', 'tools workspace-controls');
  controls.append(advance, reverse, reset);
  update();
  return controls;
}

function partWhole(container, config, { example = false, onChange } = {}) {
  container.classList.add('bead-model');
  const unsorted = workspaceGroup('Beads to sort');
  const red = workspaceGroup('Red bowl');
  red.area.classList.add('red-bowl');
  unsorted.area.classList.add('bead-bowl');
  const groups = node('div', '', 'workspace-groups bead-groups');
  const status = node('p', '', 'model-status bead-instruction');
  status.setAttribute('role', 'status');
  groups.append(unsorted.area, red.area);

  let sorted = new Set();
  const beads = Array.from({ length: config.total }, (_, index) => {
    const bead = button('', () => move(index));
    bead.classList.add('bead-piece');
    bead.dataset.bead = String(index);
    bead.dataset.dragIcon = '◉';
    bead.append(node('span', '', 'bead-face'));
    dragTo(bead, () => sorted.has(index) ? unsorted.area : red.area, () => move(index));
    unsorted.contents.append(bead);
    return bead;
  });
  const showOne = button('Show me one', () => move(0));
  const reset = button('Start over', () => {
    const focused = beads.includes(document.activeElement) ? document.activeElement : null;
    sorted = new Set();
    unsorted.contents.append(...beads);
    focused?.focus({ preventScroll: true });
    update();
  });

  function move(index) {
    const bead = beads[index];
    const before = bead.getBoundingClientRect();
    bead.getAnimations?.().forEach(animation => animation.cancel());
    const focused = document.activeElement === bead;
    sorted = toggleBead(sorted, index, config.total);
    const to = sorted.has(index) ? red : unsorted;
    to.contents.append(bead);
    if (focused) bead.focus({ preventScroll: true });
    update();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && bead.animate) {
      const after = bead.getBoundingClientRect();
      bead.animate([
        { transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)` },
        { transform: 'translate(0, 0)' },
      ], { duration: 190, easing: 'ease-out' });
    }
  }

  function update() {
    const { red: count, remaining, relation } = partWholeState(config, sorted.size);
    const blue = relation === 0;
    const label = blue ? 'Blue bowl' : 'Beads to sort';
    unsorted.heading.textContent = label;
    unsorted.area.setAttribute('aria-label', `${label}, ${remaining} ${remaining === 1 ? 'bead' : 'beads'}`);
    unsorted.area.classList.toggle('blue-bowl', blue);
    red.area.setAttribute('aria-label', `Red bowl, ${count} of ${config.known} beads`);
    for (const [index, bead] of beads.entries()) {
      const inRed = sorted.has(index);
      bead.dataset.group = inRed ? 'red' : blue ? 'blue' : 'unsorted';
      bead.setAttribute('aria-label', inRed
        ? `Red bead ${index + 1}. Move back.`
        : `${blue ? 'Blue bead' : 'Bead'} ${index + 1}. Move to the red bowl.`);
    }
    const needed = Math.abs(config.known - count);
    const amount = `${needed} ${needed === 1 ? 'bead' : 'beads'}`;
    status.textContent = blue ? 'Count the blue beads.' : relation < 0
      ? `Move ${amount} into the red bowl.` : `Move ${amount} back.`;
    if (example && count > 0 && document.activeElement === showOne) beads[0].focus({ preventScroll: true });
    showOne.hidden = !example || count !== 0;
    reset.setAttribute('aria-disabled', String(count === 0));
    onChange?.(relation);
  }

  const total = node('p', `Whole group · ${config.total} beads`, 'bead-total');
  container.append(total, status, showOne, groups, reset);
  update();
}

function balance(container, config) {
  const adding = config.action === 'add-right';
  const left = workspaceGroup('Left side');
  const right = workspaceGroup('Right side');
  const tray = workspaceGroup(adding ? 'Block supply' : 'Blocks taken away');
  const beam = node('div', '', 'balance-beam');
  beam.setAttribute('aria-hidden', 'true');
  const pans = node('div', '', 'workspace-groups');
  const status = node('p', '', 'model-status');
  status.setAttribute('role', 'status');
  pans.append(left.area, right.area);
  const rightInitial = balanceState(config, 0).rightCount;
  const limit = adding ? 20 - rightInitial : config.left;
  const controls = counterControls({
    limit, moveLabel: adding ? 'Add one to right' : 'Take one from left',
    returnLabel: adding ? 'Return one to supply' : 'Put one back on left',
    destination: adding ? right.area : tray.area, origin: adding ? tray.area : left.area, icon: '■',
    render(moved) {
      const { leftCount, rightCount, relation } = balanceState(config, moved);
      showCounters(left, 'Left side', [leftCount], ['■']);
      showCounters(right, 'Right side', adding ? [...config.rightParts, moved] : config.rightParts, ['■', '□']);
      showCounters(tray, adding ? 'Block supply' : 'Blocks taken away', [adding ? limit - moved : moved], ['□']);
      beam.dataset.tilt = relation > 0 ? 'left' : relation < 0 ? 'right' : 'level';
      const relationship = relation > 0 ? 'Left has more.' : relation < 0 ? 'Right has more.' : 'Both sides are equal.';
      const instruction = relation === 0 ? (adding ? 'Count the blocks you added.' : 'Count the blocks you took away.') : '';
      status.textContent = [`Left: ${leftCount}. Right: ${rightCount}.`, relationship, instruction].filter(Boolean).join(' ');
    },
  });
  container.append(node('p', adding
    ? 'Tap Add one to right or drag that button to the right. Make the sides equal.'
    : 'Tap Take one from left or drag that button to the tray. Make the sides equal.'),
  beam, pans, tray.area, status, controls);
}

const renderers = {
  pair: comparison, grow: comparison, join, remove, line: numberLine,
  'chart-grow': growChart, 'part-whole': partWhole, balance,
};

export function buildModel(config, options) {
  const container = node('section', '', 'math-model');
  container.setAttribute('aria-label', config.kind === 'line' ? 'Number line' : 'Math tools');
  renderers[config.kind](container, config, options);
  return container;
}
