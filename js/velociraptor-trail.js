import { chapterSceneDialogue, chapterSceneHeader } from './chapter-scene-ui.js';
import { fillBerryCopy as fillCopy } from './berry-grove-state.js';
import { sceneLifecycle } from './scene-lifecycle.js';
import { trailAnimations, trailChallenge, trailDialogue, trailScene } from './velociraptor-content.js';
import { createTrailModel, trailArt } from './velociraptor-model.js';
import { nextTrailPair, trailHelp, trailQuestion } from './velociraptor-state.js';

const trexArt = './assets/scene-01/';
const timings = Object.fromEntries(trailAnimations.sequences.map(({ event, durationMs }) => [event, durationMs]));
const beats = Object.fromEntries(trailScene.beats.map(beat => [beat.id, beat]));
const shellBounds = {
  landscape: [1672, 941, 1248, 657, 86, 51],
  portrait: [1086, 1448, 690, 1075, 115, 85],
};

export function createVelociraptorTrail(options) {
  const { question, readAttempt, update, changeBeat, checkAnswer, exit, restart, animateEntry,
    practice, stopCount, el, picture, stopSpeech, listen, dialog, answerField, movementBreak, drawing } = options;
  const { phase, line } = readAttempt().trail;
  const beat = beats[phase];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = el('section', { className: 'grove-stage trail-stage', 'data-beat': phase, 'data-line': line,
    'aria-labelledby': 'trail-scene-title' });
  for (const [orientation, { trexFoot, raptorFoot }] of Object.entries(trailScene.layout)) {
    for (const [name, [x, y]] of [['trex', trexFoot], ['raptor', raptorFoot]]) {
      stage.style.setProperty(`--${orientation}-${name}-x`, `${x * 100}%`);
      stage.style.setProperty(`--${orientation}-${name}-y`, `${y * 100}%`);
    }
  }

  const scene = sceneLifecycle(stage, stopSpeech, () => {
    for (const animation of stage.getAnimations({ subtree: true })) animation.cancel();
  });
  const { signal } = scene;
  function action(label, click, className = '') {
    const control = el('button', { type: 'button', className }, label);
    control.addEventListener('click', click, { signal });
    return control;
  }
  function animate(node, keyframes, settings) {
    if (!motion.matches && !signal.aborted) return node.animate(keyframes, settings);
    return undefined;
  }
  motion.addEventListener('change', () => {
    if (motion.matches) for (const animation of stage.getAnimations({ subtree: true })) animation.finish();
  }, { signal });

  function primary(label, onPress) {
    return action(label, onPress, 'welcome-primary grove-primary');
  }
  function saveTrail(changes, support) {
    const trail = readAttempt().trail;
    update({ ...(support ? { assisted: true } : {}),
      trail: { ...trail, ...changes, help: support ? trailHelp([...trail.help, support]) : trail.help } });
  }
  function showBeat(next, nextLine = 0) {
    stopSpeech();
    changeBeat(next, nextLine);
  }
  stage.append(chapterSceneHeader({ ...options, action, art: trexArt, title: trailScene.title, titleId: 'trail-scene-title',
    progress: `${practice ? 'Practice · ' : ''}Stop ${trailScene.challengeNumber} of ${stopCount}` }));

  if (phase === 'solve') drawLearning();
  else drawStory();
  return scene;

  function drawStory() {
    const clue = phase === 'clue';
    const firstArrival = phase === 'arrival' && line === 0;
    const success = phase === 'success';
    const suffix = clue ? '-clue.webp' : '.webp';
    const backdrop = picture(trailArt + 'trail-landscape' + suffix, 'grove-landscape trail-landscape',
      clue ? 'A blue-spotted piece of eggshell rests beside the trail.' : '');
    stage.prepend(el('picture', { className: 'grove-background' },
      el('source', { media: '(orientation: portrait)', srcset: trailArt + 'trail-portrait' + suffix }), backdrop));
    const { speaker, text } = trailDialogue[beat.dialogueIds[line]];
    stage.append(chapterSceneDialogue({ el, listen, speaker, text: fillCopy(text, question.values), focus: true }));
    const pose = phase === 'arrival' && !firstArrival ? 'raptor-neutral' : beat.pose;
    const trex = picture(trexArt + (success ? 'trex-celebrate.png' : 'trex-greeting.png'), 'trail-trex', 'T-Rex');
    const raptor = picture(trailArt + pose + '.png', 'trail-raptor', 'Velociraptor');
    raptor.dataset.pose = pose;
    const actors = el('div', { className: 'grove-actors' }, trex, raptor);
    stage.append(actors);

    if (firstArrival && !motion.matches) {
      animate(trex, [{ opacity: 0 }, { opacity: 0 }], { duration: timings.arrival });
      for (let frame = 0; frame < 4; frame++) {
        const sprite = picture(trexArt + 'trex-walk-' + (frame + 1) + '.png', 'trail-trex trail-walk');
        actors.prepend(sprite);
        const opacity = Array.from({ length: 12 }, (_, index) =>
          ({ offset: index / 12, opacity: Number(index % 4 === frame), easing: 'step-end' }));
        animate(sprite, opacity.concat({ offset: 1, opacity: 0 }), { duration: timings.arrival });
        animate(sprite, [{ translate: '-165% 0' }, { translate: '0 0' }], { duration: timings.arrival });
      }
    }
    if ((phase === 'arrival' && line === 1) || (phase === 'intro' && line === 0) || (clue && line === 2)) {
      const duration = phase === 'arrival' ? timings.greeting : clue ? timings.next : timings.intro;
      animate(raptor, [{ opacity: .6 }, { opacity: 1 }], { duration, easing: 'ease-out' });
    }
    if (success) drawSuccess(raptor);
    if (clue && line === 0 && animateEntry) drawClueHighlight(backdrop);

    const last = line === beat.dialogueIds.length - 1;
    const label = last ? beat.action : 'Continue';
    stage.append(el('div', { className: 'grove-narrative-action' }, primary(label, () => {
      if (!last) return showBeat(phase, line + 1);
      if (phase === 'arrival') return showBeat('intro');
      if (phase === 'intro') return showBeat('solve');
      if (success) return showBeat('clue');
      scene.dispose();
      exit(motion.matches ? 0 : timings.exit);
    })));
  }

  function drawClueHighlight(backdrop) {
    animate(backdrop, [{ opacity: .7 }, { opacity: 1 }], { duration: timings.clue });
    for (const [orientation, [width, height, x, y, rx, ry]] of Object.entries(shellBounds)) {
      const ns = 'http://www.w3.org/2000/svg';
      const frame = document.createElementNS(ns, 'svg');
      frame.setAttribute('class', 'trail-shell-highlight trail-shell-' + orientation);
      frame.setAttribute('viewBox', `0 0 ${width} ${height}`);
      frame.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      frame.setAttribute('aria-hidden', 'true');
      const ring = document.createElementNS(ns, 'ellipse');
      for (const [key, value] of Object.entries({ cx: x, cy: y, rx, ry })) ring.setAttribute(key, value);
      frame.append(ring);
      stage.append(frame);
      animate(ring, [{ opacity: 0 }, { opacity: 1, offset: .5 }, { opacity: 0 }], { duration: timings.clue });
    }
  }

  function drawSuccess(raptor) {
    const pairs = [...readAttempt().trail.pairs];
    for (let pair = nextTrailPair(pairs, question.values); pair; pair = nextTrailPair(pairs, question.values)) pairs.push(pair);
    const model = createTrailModel({ ...options, values: question.values, action, signal, animate, readOnly: true,
      read: () => ({ pairs, selected: null }) });
    stage.append(el('div', { className: 'trail-success-panel' },
      el('p', { className: 'grove-equation trail-equation' }, question.equations[0]), model));
    if (!animateEntry) return;
    for (const leftover of model.querySelectorAll('.trail-remaining')) {
      animate(leftover, [{ scale: '1' }, { scale: '1.13' }, { scale: '1' }],
        { duration: timings.correct, easing: 'ease-out' });
    }
    animate(raptor, [{ translate: '0 0' }, { translate: '0 -10%' }, { translate: '0 0' }],
      { duration: timings.celebrate, delay: timings.correct, easing: 'ease-out' });
  }

  function drawLearning() {
    const { first, second } = question.values;
    const task = el('div', { className: 'grove-task trail-task' });
    const work = el('div', { className: 'grove-work-board' });
    const workspace = el('div', { className: 'grove-learning trail-learning' }, task, work);
    const prompt = el('h2', { id: 'chapter-question', tabindex: '-1', 'data-focus-beat': '' }, question.prompts[0]);
    const story = el('p', { className: 'chapter-story-text grove-problem' },
      `The first trail has ${first} footprints. The second trail has ${second} footprints.`);
    const problemAudio = listen(question.story, { label: 'Listen' });
    task.append(el('p', { className: 'chapter-kicker' }, 'Compare the footprints'),
      el('div', { className: 'trail-problem-heading' },
        picture(trailArt + 'raptor-front.png', 'trail-portrait', 'Velociraptor'), el('div', {}, story, prompt, problemAudio)));
    const readTrail = () => readAttempt().trail;
    const model = createTrailModel({ ...options, values: question.values, action, signal, animate, duration: timings.match,
      read: readTrail, update: changes => saveTrail(changes, 'tools') });
    const sketch = drawing();
    const tools = action('Math tools', () => {
      const open = model.hidden;
      saveTrail({ tools: open });
      toolView(open ? 'model' : 'closed');
    }, 'chapter-secondary');
    const draw = action('Draw', () => toolView(sketch.hidden ? 'draw' : readTrail().tools ? 'model' : 'closed'), 'chapter-secondary');
    function toolView(view) {
      model.hidden = view !== 'model';
      sketch.hidden = view !== 'draw';
      stage.dataset.beat = view === 'model' ? 'compare' : phase;
      tools.setAttribute('aria-expanded', String(view === 'model'));
      draw.setAttribute('aria-pressed', String(view === 'draw'));
    }

    const hint = el('p', { className: 'chapter-hint', role: 'status' });
    const hintControl = action('Hint', () => {
      if (readAttempt().hints >= trailChallenge.hints.length) return guided(hintControl, showSupport);
      saveTrail({}, 'hints');
      update({ hints: readAttempt().hints + 1 });
      showHint();
    }, 'chapter-secondary');
    const help = action('Try with help', () => guided(help, showSupport), 'chapter-secondary');
    const move = action('Take a break', () => movementBreak(move), 'chapter-secondary');
    function showHint() {
      const level = readAttempt().hints;
      hint.hidden = level === 0;
      hint.textContent = trailChallenge.hints[level - 1] ?? '';
      hintControl.textContent = level === trailChallenge.hints.length ? 'See a worked example' : level ? 'Another hint' : 'Hint';
    }
    function showSupport() {
      saveTrail({ tools: true });
      toolView('model');
    }
    const feedback = el('p', { id: 'chapter-feedback', className: 'grove-feedback', role: 'status' }, readAttempt().error);
    const { field, label } = answerField('Your answer');
    field.value = readAttempt().draft;
    field.addEventListener('input', () => update({ draft: field.value }), { signal });
    const form = el('form', { className: 'chapter-answer-form grove-form' }, label,
      el('button', { className: 'welcome-primary grove-primary', type: 'submit' }, beat.action));
    const canGuide = () => readTrail().mistakes >= trailChallenge.offerGuidanceAfterIncorrectAttempts;
    help.hidden = !canGuide();
    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = field.value.trim();
      if (!/^\d{1,2}$/.test(value)) {
        feedback.textContent = 'Enter a whole number from 0 to 99.';
        return;
      }
      if (checkAnswer(question, value)) return;
      feedback.textContent = readAttempt().error;
      help.hidden = !canGuide();
    }, { signal });
    work.append(el('div', { className: 'chapter-actions grove-tools' }, tools, draw,
      action('Restart stop', restart, 'chapter-secondary')), model, sketch);
    workspace.append(el('div', { className: 'grove-response' }, form, feedback,
      el('div', { className: 'chapter-actions grove-guidance' }, hintControl, help, move), hint));
    stage.append(workspace);
    toolView(readTrail().tools ? 'model' : 'closed');
    showHint();
    if (animateEntry) animate(workspace, [{ opacity: .8 }, { opacity: 1 }], { duration: timings.learning });
  }

  function guided(trigger, returnToProblem) {
    const example = trailQuestion({ ...trailChallenge.guidedExample, question: trailChallenge.variants[0].question });
    const body = el('div', { className: 'trail-guided' }, el('p', {}, example.story));
    const modal = dialog('See a different example', body, trigger);
    const work = new AbortController();
    modal.addEventListener('close', () => work.abort(), { once: true });
    signal.addEventListener('abort', () => work.abort(), { once: true });
    const show = action('Show how', () => {
      saveTrail({}, 'guided');
      const model = createTrailModel({ ...options, values: example.values, action, signal: work.signal, animate,
        readOnly: true, read: () => ({ pairs: Array.from({ length: example.values.smaller }, (_, index) => [index, index]), selected: null }) });
      const back = action('Back to my problem', () => {
        returnToProblem();
        modal.close();
      }, 'chapter-secondary');
      show.replaceWith(model, el('p', { className: 'grove-equation' }, example.equations[0]), back);
      back.focus();
    }, 'chapter-secondary');
    body.append(show);
  }
}
