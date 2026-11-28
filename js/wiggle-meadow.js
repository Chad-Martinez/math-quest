import { chapterSceneDialogue } from './chapter-scene-ui.js';
import { sceneLifecycle } from './scene-lifecycle.js';
import { meadowAnimations, meadowScene } from './wiggle-meadow-content.js';
import { meadowBeats, readMeadowBeat } from './wiggle-meadow-state.js';

const art = './assets/scene-07/';
const poses = {
  'trex-greeting': [1, 1, .98],
  'trex-celebrate': [1, .97, .97],
  'brachio-looking-down': [4, 1.05, .98],
  'brachio-reaching': [4, .80, .98],
  'brachio-neutral': [4, .89, .98],
  'triceratops-idle': [6, 1, .89],
  'triceratops-stomp': [6, 1, .90],
  'raptor-neutral': [5, .88, .96],
  'raptor-side': [7, 1.24, .96],
  'stego-idle': [7, 1, .93],
  'stego-greeting': [7, 1.02, .94],
  'stego-pointing': [7, 1.02, .95],
};
const hosts = { stretch: 'brachio-neutral', stomp: 'triceratops-idle', march: 'raptor-neutral', wiggle: 'stego-idle' };
const activities = { stretch: 'Brachiosaurus Stretch', stomp: 'Triceratops Stomp', march: 'Velociraptor March',
  wiggle: 'Stegosaurus Wiggle', cooldown: 'T-Rex Cooldown' };

export function createWiggleMeadow({ state, save, exit, onDemand = false, home, grownUps, listen, stopSpeech, el, picture }) {
  let current = readMeadowBeat(state);
  let beatScope;
  let replay;
  let demoRequest = 0;
  const animations = new Set();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = el('section', { className: 'grove-stage meadow-stage', 'aria-labelledby': 'meadow-title' });
  const view = el('div', { className: 'meadow-view' });
  const backdrop = el('picture', { className: 'grove-background' },
    el('source', { media: '(orientation: portrait)', srcset: art + meadowScene.backgrounds.portrait.split('/').at(-1) }),
    picture(art + meadowScene.backgrounds.landscape.split('/').at(-1), 'grove-landscape meadow-landscape'));
  const title = el('h1', { id: 'meadow-title', tabindex: '-1' }, meadowScene.title);

  for (const [orientation, { characterCenterX, characterGroundY }] of Object.entries(meadowScene.layout)) {
    stage.style.setProperty(`--${orientation}-center`, `${characterCenterX * 100}%`);
    stage.style.setProperty(`--${orientation}-ground`, `${characterGroundY * 100}%`);
  }
  const scene = sceneLifecycle(stage, stopSpeech, () => {
    beatScope?.abort();
    cancelDemo();
  });
  function control(label, run, className, signal = scene.signal) {
    const button = el('button', { type: 'button', className }, label);
    button.addEventListener('click', run, { signal });
    return button;
  }
  const parent = control('Grown-ups', event => {
    cancelDemo();
    stopSpeech();
    grownUps(event.currentTarget);
  }, 'welcome-secondary grove-secondary');
  const logo = picture('./assets/scene-01/logo.png', '', 'Math Quest');
  const brand = onDemand ? el('div', { className: 'grove-brand' }, logo)
    : control('', home, 'grove-brand');
  if (!onDemand) {
    brand.append(logo);
    brand.setAttribute('aria-label', 'Math Quest home');
  }
  stage.append(backdrop, el('header', { className: 'grove-bar' }, brand, title,
    el('div', { className: 'grove-nav' }, el('p', { className: 'grove-progress' }, 'Optional movement break'), parent)), view);
  motion.addEventListener('change', () => {
    cancelDemo();
    if (replay) replay.hidden = motion.matches;
  }, { signal: scene.signal });

  function cancelDemo() {
    demoRequest++;
    for (const animation of animations) animation.cancel();
    animations.clear();
  }
  function animate(node, keys, settings) {
    const animation = node.animate(keys, settings);
    animations.add(animation);
    const forget = () => animations.delete(animation);
    void animation.finished.then(forget, forget);
  }
  function finish() {
    scene.dispose();
    exit();
  }
  function advance(beat) {
    const last = !Array.isArray(beat.dialogue) || current.line === beat.dialogue.length - 1;
    if (last && (beat.id === 'departure' || (onDemand && beat.id === 'cooldown'))) return finish();
    stopSpeech();
    cancelDemo();
    const next = meadowBeats[meadowBeats.indexOf(beat) + 1];
    current = last ? { beat: next.id, line: 0 } : { ...current, line: current.line + 1 };
    save?.(current);
    render(true);
  }

  function sprite(id, name = '') {
    const [source, width, feet] = poses[id];
    const image = picture(`./assets/scene-0${source}/${id}.png`, 'meadow-sprite', name);
    image.style.setProperty('--pose-width', `${width * 100}%`);
    image.style.setProperty('--pose-feet', `${feet * -100}%`);
    return image;
  }
  function actor(id, name, className = '') {
    return el('div', { className: 'meadow-actor ' + className }, sprite(id, name));
  }
  function demonstration(id, figure, flower, frames) {
    const { repetitions: iterations, cycleMs: duration } = meadowAnimations[id];
    if (id === 'wiggle') {
      animate(figure.firstElementChild, [
        { rotate: '0deg', translate: '0 0' }, { rotate: '-3deg', translate: '-2% 0' },
        { rotate: '3deg', translate: '2% 0' }, { rotate: '0deg', translate: '0 0' },
      ], { duration, iterations, easing: 'ease-in-out' });
    } else if (id === 'cooldown') {
      animate(flower, meadowAnimations.cooldown.scale.map(scale => ({ scale })), { duration, iterations, easing: 'ease-in-out' });
    } else {
      animate(figure.firstElementChild, [{ opacity: 0 }, { opacity: 0 }], { duration, iterations });
      frames.forEach((frame, index) => {
        const keys = Array.from({ length: frames.length + 1 }, (_, step) =>
          ({ offset: step / frames.length, opacity: Number(step === index), easing: 'step-end' }));
        animate(frame, keys, { duration, iterations });
      });
      if (id === 'march') {
        animate(figure, [{ translate: '0 0' }, { translate: '0 -7px' }, { translate: '0 0' }],
          { duration, iterations, easing: 'ease-in-out' });
      }
    }
  }

  function render(focus = false) {
    beatScope?.abort();
    beatScope = new AbortController();
    const { signal } = beatScope;
    const { beat: id, line } = current;
    const beat = meadowBeats.find(beat => beat.id === id);
    const sequence = meadowAnimations[id];
    const [speaker, text] = Array.isArray(beat.dialogue) ? beat.dialogue[line] : [beat.speaker, beat.dialogue];
    const cast = el('div', { className: 'meadow-cast' });
    let figure;
    let flower;
    if (hosts[id]) {
      figure = actor(hosts[id], speaker, 'meadow-' + id);
      cast.append(figure);
    } else if (id === 'cooldown') {
      figure = actor('trex-greeting', 'T-Rex', 'meadow-calm');
      flower = picture(art + 'breathing-flower.svg', 'meadow-flower', 'Breathing flower');
      cast.append(figure, flower);
    } else {
      const trex = actor(id === 'departure' ? 'trex-celebrate' : 'trex-greeting', 'T-Rex', 'meadow-trex');
      const stego = actor(id === 'departure' ? 'stego-pointing' : line === 0 ? 'stego-idle' : 'stego-greeting',
        'Stegosaurus', 'meadow-stego');
      cast.append(trex, stego);
    }
    const panel = el('div', { className: 'meadow-panel' });
    if (activities[id]) panel.append(el('h2', { className: 'meadow-activity' }, activities[id]));
    const narration = beat.instruction ? (dialogue, options) => listen(`${dialogue} ${beat.instruction}`, options) : listen;
    const spoken = chapterSceneDialogue({ el, listen: narration, speaker, text, focus: true });
    panel.append(spoken);
    if (beat.instruction) {
      panel.append(el('p', { className: 'meadow-instruction' }, beat.instruction),
        el('details', { className: 'meadow-seated' }, el('summary', {}, 'Seated option'), el('p', {}, beat.seated)));
    } else if (id === 'cooldown' && line === 0) {
      panel.append(el('details', { className: 'meadow-seated' }, el('summary', {}, 'Seated option'),
        el('p', {}, 'Sit comfortably and breathe at your own pace.')));
    }
    const label = Array.isArray(beat.dialogue) && line < beat.dialogue.length - 1 ? 'Continue' : beat.primary;
    const main = control(label, () => advance(beat), 'welcome-primary grove-primary', signal);
    const actions = el('div', { className: 'meadow-actions' }, main);
    const secondary = (label, run) => control(label, run, 'chapter-secondary', signal);
    const frames = (['stretch', 'stomp', 'march'].includes(id) ? sequence.frames : []).map(pose => {
      const image = sprite(pose);
      image.classList.add('meadow-motion-frame');
      figure.append(image);
      return image;
    });
    async function play() {
      cancelDemo();
      stopSpeech();
      const request = demoRequest;
      if (motion.matches) return;
      await Promise.allSettled(frames.map(image => image.decode()));
      if (request === demoRequest && !signal.aborted && !motion.matches) demonstration(id, figure, flower, frames);
    }
    replay = sequence ? secondary('Show again', play) : null;
    if (replay) {
      replay.hidden = motion.matches;
      actions.append(replay);
    }
    if (activities[id]) actions.append(secondary('Skip this activity', () => {
      if (id === 'cooldown') current = { beat: id, line: beat.dialogue.length - 1 };
      advance(beat);
    }));
    actions.append(secondary(id === 'welcome' ? 'Skip for Now' : 'End break', finish));
    panel.append(actions);
    stage.dataset.beat = id;
    stage.dataset.line = line;
    view.replaceChildren(cast, panel);
    if (focus) spoken.querySelector('.grove-line').focus({ preventScroll: true });
    if (sequence && line === 0 && !motion.matches) void play();
  }

  render();
  return scene;
}
