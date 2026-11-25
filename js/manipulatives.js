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
  const advance = button(matching ? 'Match a pair' : `Add one to ${first}`, () => {
    if (matching) paired++;
    else added++;
    render();
  });
  const undo = button('Undo', () => {
    if (matching) paired = Math.max(0, paired - 1);
    else added = Math.max(0, added - 1);
    render();
  });
  function track(label, count, flag) {
    const lane = node('div', '', 'track');
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
      ? (pairsDone ? 'Every possible pair is matched. Count the objects without a partner.' : `${paired} pairs matched. ${first} has ${initial} and ${second} has ${other}.`)
      : `${first} has ${compareQuantities(firstCount, other)} ${second}. Added: ${added}.`;
    advance.setAttribute('aria-disabled', String(matching ? pairsDone : firstCount === limit));
    undo.setAttribute('aria-disabled', String(paired + added === 0));
  }
  container.append(node('p', matching ? 'Match the objects one pair at a time.' : 'Add one object at a time. Watch how the groups compare.'), tracks, status, advance, undo);
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
  const removed = new Set();
  function update() {
    status.textContent = `${removed.size} taken away. Take away ${change}, then count what is left.`;
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
    items.append(control);
  }
  container.append(status, items);
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

const renderers = { pair: comparison, grow: comparison, join, remove, line: numberLine };

export function buildModel(config) {
  const container = node('section', '', 'math-model');
  container.setAttribute('aria-label', 'Math tools');
  renderers[config.kind](container, config);
  return container;
}
