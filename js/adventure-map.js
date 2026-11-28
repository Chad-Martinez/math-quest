import { mapSpec } from './adventure-map-data.js';

const sceneArt = './assets/scene-03/';
const welcomeArt = './assets/scene-01/';
const walks = Array.from({ length: 4 }, (_, index) => welcomeArt + `trex-walk-${index + 1}.png`);
const [, , width, height] = mapSpec.viewBox;
const labels = Object.fromEntries(mapSpec.stops.map(stop => [stop.id, stop.label]));
const icons = {
  check: 'M4 12l5 5L20 6',
  lock: 'M6 10V7a6 6 0 0 1 12 0v3M5 10h14v11H5zM12 14v3',
  move: 'M12 4h.01M7 8l5 2 4-3M12 10l-2 5 5 1 3 5M10 15l-5 5',
  nest: 'M3 13c0 10 18 10 18 0M3 13c0-4 18-4 18 0s-18 4-18 0z',
};
const artOffsets = {
  '1': [-64, -12], '2': [4, -18], '3': [-97, -35], break: [103, -45],
  '4': [-54, -30], '5': [97, -6],
};

function svgElement(tag, attributes) {
  const elem = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) elem.setAttribute(key, value);
  return elem;
}

function icon(name) {
  const graphic = svgElement('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'map-icon' });
  graphic.append(svgElement('path', { d: icons[name] }));
  return graphic;
}

function at(element, x, y) {
  element.style.left = `${x / width * 100}%`;
  element.style.top = `${y / height * 100}%`;
}

// Round only the immediate vicinity of a corner to stay on the narrow trails.
function routePath(points) {
  if (!points.length) return '';
  function near([x, y], [targetX, targetY]) {
    const ratio = Math.min(.22, 10 / Math.hypot(targetX - x, targetY - y));
    return [x + (targetX - x) * ratio, y + (targetY - y) * ratio].join(' ');
  }
  return [
    `M${points[0].join(' ')}`,
    ...points.slice(1, -1).map((point, index) =>
      `L${near(point, points[index])}Q${point.join(' ')} ${near(point, points[index + 2])}`),
    `L${points.at(-1).join(' ')}`,
  ].join(' ');
}

function travelPoints(from, destination) {
  const start = mapSpec.segments.findIndex(segment => segment.from === from);
  const end = mapSpec.segments.findIndex(segment => segment.to === destination);
  return mapSpec.segments.slice(start, end + 1).flatMap(({ points }, index) => index ? points.slice(1) : points);
}

export function createAdventureMap({ state, freshCompletion, revisit, onAdvance, onSkipBreak, onReview,
  grownUps, home, listen, stopSpeech, el, button, picture }) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const view = el('section', { className: 'adventure-map', 'aria-labelledby': 'adventure-map-title' });
  const board = el('div', { className: 'map-board', role: 'group', 'aria-label': 'Dinosaur Island trail' },
    picture(sceneArt + 'island-map.webp', 'map-island'));
  const route = svgElement('svg', { viewBox: mapSpec.viewBox.join(' '), class: 'map-route', 'aria-hidden': 'true' });
  for (const { points } of mapSpec.connectorSegments) {
    route.append(svgElement('path', { class: 'map-connector-edge', d: routePath(points) }),
      svgElement('path', { class: 'map-connector', d: routePath(points) }));
  }
  const path = svgElement('path', { class: 'map-travel-path', d: routePath(
    state.current && !revisit ? travelPoints(state.from, state.current) : []) });
  route.append(path);
  const caveGlow = svgElement('ellipse', { class: 'map-cave-glow', cx: 1357, cy: 214, rx: 76, ry: 53 });
  route.append(caveGlow);
  board.append(route);

  let traveling = false;
  let disposed = false;
  let intro = state.introduction;
  let frameRequest;
  let timer;
  let facing = 1;
  const markers = new Map();
  const origin = mapSpec.stops.find(stop => stop.id === state.from);
  const traveler = el('div', { className: 'map-traveler', 'aria-hidden': 'true' });
  const sprite = picture(welcomeArt + 'trex-greeting.png', 'map-traveler-sprite');
  traveler.append(sprite);
  at(traveler, origin.x, origin.y);
  const preload = walks.map(src => picture(src, 'map-walk-frame'));
  traveler.append(...preload);
  if (state.introduction) board.classList.add('map-first-entry');

  for (const { id, label, x, y, characterAsset } of mapSpec.stops) {
    if (characterAsset) {
      const file = id === '4' ? './assets/characters/mosa-leap.png' : sceneArt + characterAsset;
      const art = picture(file, 'map-friend');
      at(art, x + artOffsets[id][0], y + artOffsets[id][1]);
      board.append(art);
    }
    const numbered = /^\d$/.test(id);
    const done = numbered && state.completed[Number(id) - 1];
    const active = state.current === id;
    const marker = done || active
      ? button('', () => {
        if (traveling || disposed) return;
        if (active && !intro) beginTravel();
        else if (done) onReview(Number(id) - 1);
      }, 'map-marker')
      : el('span', { className: 'map-marker' });
    const status = done ? 'completed' : active ? 'current' : numbered ? 'locked' : '';
    marker.dataset.status = status;
    marker.dataset.waypoint = id;
    marker.classList.toggle('map-numbered', numbered);
    if (active) marker.setAttribute('aria-current', 'step');
    if (done && freshCompletion === id) marker.classList.add('map-new-check');
    if (marker.tagName !== 'BUTTON') {
      marker.setAttribute('role', 'img');
      if (numbered) marker.setAttribute('aria-disabled', 'true');
    }
    marker.setAttribute('aria-label', [numbered ? `Stop ${id}: ${label}` : label, status,
      done ? 'practice' : '', id === 'break' ? 'optional movement break' : ''].filter(Boolean).join(', '));
    marker.append(el('span', { className: 'map-pin', 'aria-hidden': 'true' },
      numbered ? id : icon(id === 'start' ? 'nest' : 'move'),
      done || status === 'locked' ? el('span', { className: 'map-pin-badge' }, icon(done ? 'check' : 'lock')) : ''));
    const plaque = el('span', { 'aria-hidden': 'true', className: 'map-nameplate' }, label);
    at(marker, x, y);
    board.append(marker, plaque);
    at(plaque, x, y);
    plaque.dataset.waypoint = id;
    markers.set(id, marker);
  }
  if (intro) markers.get(state.current).disabled = true;
  board.append(traveler);

  const title = el('h1', { id: 'adventure-map-title', tabindex: '-1' }, 'Dinosaur Island Adventure');
  const count = state.completed.filter(Boolean).length;
  const logo = picture(welcomeArt + 'logo.png', 'map-logo', 'Math Quest');
  const brand = revisit ? logo : button('', home, 'map-brand');
  if (!revisit) {
    brand.setAttribute('aria-label', 'Math Quest home');
    brand.append(logo);
  }
  const parentControl = revisit ? null : button('Grown-ups', grownUps, 'welcome-secondary map-grownups');
  if (parentControl) parentControl.id = 'chapter-grownups';
  const header = el('header', { className: 'map-header' }, brand,
    el('div', { className: 'map-title' }, title, el('p', {}, 'Find the Lost Egg!')),
    el('div', { className: 'map-header-end' },
      ...(parentControl ? [parentControl] : []),
      el('p', { className: 'map-progress' }, `${count} of ${state.completed.length} stops complete`)));

  const speech = el('p', { className: 'map-line', 'aria-live': 'polite' });
  const audio = el('div', { className: 'map-audio' });
  const nextPlace = el('p', { className: 'map-next-place' });
  const actions = el('div', { className: 'map-actions' });
  view.append(header, el('div', { className: 'map-slot' }, board), el('div', { className: 'map-hud' },
    picture(welcomeArt + 'trex-greeting.png', 'map-guide'), el('div', { className: 'map-dialogue' }, speech, audio),
    el('div', { className: 'map-action-area' }, nextPlace, actions)));

  function showDialogue() {
    const dialogue = mapSpec.dialogue[intro ? 'intro' : state.dialogue];
    speech.textContent = dialogue;
    audio.replaceChildren(listen(dialogue, { label: 'Listen' }));
    nextPlace.textContent = !intro && state.current ? labels[state.current] : '';
    const main = button(intro ? "Let's Go!" : state.action, event => {
      if (disposed || traveling || !event.currentTarget.isConnected || event.detail > 1) return;
      if (!intro) {
        beginTravel();
        return;
      }
      stopSpeech();
      intro = false;
      markers.get(state.current).disabled = false;
      showDialogue();
      actions.querySelector('button').focus({ preventScroll: true });
    }, 'welcome-primary map-primary');
    actions.replaceChildren(main);
    if (state.offerBreak) actions.append(button('Skip for now', () => {
      if (disposed || traveling) return;
      stopSpeech();
      onSkipBreak();
    }, 'map-secondary welcome-secondary'));
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(frameRequest);
    clearTimeout(timer);
    motion.removeEventListener('change', finishOnReducedMotion);
  }

  function finish() {
    if (disposed || !traveling) return;
    dispose();
    onAdvance();
  }

  function finishOnReducedMotion() {
    if (motion.matches) finish();
  }

  function beginTravel() {
    if (traveling || disposed) return;
    traveling = true;
    stopSpeech();
    if (revisit || motion.matches) return finish();

    const skip = button('Skip travel', finish, 'map-secondary welcome-secondary');
    actions.classList.add('map-travel-actions');
    for (const control of actions.children) control.disabled = true;
    actions.append(skip);
    parentControl.disabled = true;
    audio.querySelector('button').disabled = true;
    skip.focus({ preventScroll: true });
    for (const marker of markers.values()) {
      if (marker.tagName === 'BUTTON') marker.disabled = true;
    }
    motion.addEventListener('change', finishOnReducedMotion);
    if (state.reveal) {
      board.classList.add('map-cave-reveal');
      timer = setTimeout(finish, 600);
      return;
    }
    const destination = markers.get(state.current);
    const distance = path.getTotalLength();
    const duration = Math.min(1600, Math.max(1200, 1000 + distance * .74));
    let start;
    let currentFrame;
    sprite.hidden = true;
    const step = time => {
      start ??= time;
      const elapsed = time - start;
      const traveled = Math.min(distance, distance * elapsed / duration);
      const point = path.getPointAtLength(traveled);
      const ahead = path.getPointAtLength(Math.min(distance, traveled + 6));
      if (Math.abs(ahead.x - point.x) > .1) facing = Math.sign(ahead.x - point.x);
      traveler.style.setProperty('--map-facing', facing);
      at(traveler, point.x, point.y);

      const index = Math.floor(elapsed / 110) % preload.length;
      if (preload[index] !== currentFrame) {
        currentFrame?.classList.remove('map-walk-visible');
        currentFrame = preload[index];
        currentFrame.classList.add('map-walk-visible');
      }
      if (elapsed >= duration - 350) destination.classList.add('map-arriving');
      if (elapsed >= duration) finish();
      else frameRequest = requestAnimationFrame(step);
    };
    frameRequest = requestAnimationFrame(step);
  }

  showDialogue();
  return { view, dispose };
}
