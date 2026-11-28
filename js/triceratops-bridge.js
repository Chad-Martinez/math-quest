import { chapterSceneDialogue, chapterSceneHeader } from './chapter-scene-ui.js';
import { buildModel } from './manipulatives.js';
import { sceneLifecycle } from './scene-lifecycle.js';
import { bridgeAnimations, bridgeChallenge, bridgeDialogue, bridgeScene } from './triceratops-content.js';
import { bridgeArt, createBridgeModel } from './triceratops-model.js';
import { bridgeBeats, bridgeCopy, bridgeHelp, bridgeQuestion } from './triceratops-state.js';

const trexArt = './assets/scene-01/';
const timing = Object.fromEntries(bridgeAnimations.events.map(({ event, durationMs }) => [event, durationMs]));
const frameRatios = { broken: [459 / 398, 185 / 329], repaired: [457 / 398, 191 / 329] };
// Match the banks and top of the deck in each supplied crop.
const tracks = {
  landscape: { arrival: [[.105, .475], [.245, .422]], start: [[.14, .454], [.13, .422]], end: [[.91, .468], [.87, .42]] },
  portrait: { arrival: [[.125, .57], [.25, .526]], start: [[.14, .558], [.10, .528]], end: [[.895, .56], [.86, .523]] },
};

export function createTriceratopsBridge(options) {
  const { question, readAttempt, update, changeBeat, checkAnswer, exit, practice, stopCount, animateEntry,
    repairFrom, el, picture, stopSpeech, listen, answerField, dialog, drawing, movementBreak, openMap, grownUps } = options;
  const { phase, line } = readAttempt().bridge;
  const beat = bridgeBeats[phase];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = el('section', { className: 'grove-stage bridge-stage', 'data-beat': phase, 'data-line': line,
    'aria-labelledby': 'bridge-title' });
  let pendingRepair;
  const animations = new Set();
  function cancelMotion() {
    if (pendingRepair !== undefined) cancelAnimationFrame(pendingRepair);
    pendingRepair = undefined;
    for (const animation of animations) animation.cancel();
    animations.clear();
  }
  const scene = sceneLifecycle(stage, stopSpeech, cancelMotion);
  const { signal } = scene;

  function action(label, click, className = '') {
    const control = el('button', { type: 'button', className }, label);
    control.addEventListener('click', click, { signal });
    return control;
  }

  function animate(node, keyframes, settings) {
    if (motion.matches || signal.aborted) return undefined;
    const animation = node.animate(keyframes, settings);
    animations.add(animation);
    const forget = () => animations.delete(animation);
    void animation.finished.then(forget, forget);
    return animation;
  }

  motion.addEventListener('change', () => { if (motion.matches) cancelMotion(); }, { signal });

  const primary = (label, handler) => action(label, handler, 'welcome-primary grove-primary');
  const read = () => readAttempt().bridge;
  const copy = text => bridgeCopy(text, question.values);

  function save(changes, support) {
    const bridge = read();
    update({ ...(support ? { assisted: true } : {}),
      bridge: { ...bridge, ...changes, help: support ? bridgeHelp([...bridge.help, support]) : bridge.help } });
  }

  function go(next, nextLine = 0) {
    stopSpeech();
    changeBeat(next, nextLine);
  }

  stage.append(chapterSceneHeader({ ...options, action, art: trexArt, title: bridgeScene.title, titleId: 'bridge-title',
    progress: `${practice ? 'Practice · ' : ''}Stop ${bridgeScene.stop} of ${stopCount}`,
    openMap(trigger) { cancelMotion(); openMap(trigger); },
    grownUps() { cancelMotion(); stopSpeech(); grownUps(); },
  }));

  if (phase === 'construction') showConstruction();
  else if (phase === 'equality') showEquality();
  else showStory();
  return scene;

  function dialogue() {
    const [speaker, text] = bridgeDialogue[beat.dialogueKey][line];
    return chapterSceneDialogue({ el, listen, speaker, text: copy(text), focus: true });
  }

  function frame(kind) {
    const image = picture(bridgeArt + kind + '-landscape.webp', 'bridge-landscape',
      kind === 'broken' ? 'A broken wooden bridge over a river.' : 'A repaired wooden bridge across the river.');
    const sceneArt = el('div', { className: 'bridge-frame' },
      el('picture', {}, el('source', { media: '(orientation: portrait)', srcset: bridgeArt + kind + '-portrait.webp' }), image));
    const [landscape, portrait] = frameRatios[kind];
    sceneArt.style.setProperty('--landscape-ratio', landscape);
    sceneArt.style.setProperty('--portrait-ratio', portrait);
    return sceneArt;
  }

  function actor(art, pose, name, className) {
    return el('div', { className: 'bridge-actor ' + className, 'data-pose': pose }, picture(art + pose + '.png', '', name));
  }

  function walkFrames(container, frames, duration, delay = 0) {
    const settled = container.firstElementChild;
    animate(settled, [{ opacity: 0 }, { opacity: 0 }], { duration: duration + delay });
    const steps = Math.ceil(duration / 115);
    frames.forEach((path, index) => {
      const image = picture(path, 'bridge-walk-frame');
      container.append(image);
      const keys = Array.from({ length: steps }, (_, step) =>
        ({ offset: step / steps, opacity: Number(step % frames.length === index), easing: 'step-end' }));
      animate(image, [...keys, { opacity: 0 }], { duration, delay, fill: 'backwards' });
    });
  }

  function showStory() {
    const crossing = phase === 'crossing';
    const repaired = crossing || phase === 'clue';
    const sceneArt = frame(beat.background.split('-')[0]);
    const trex = actor(trexArt, 'trex-greeting', 'T-Rex', 'bridge-trex');
    const trike = actor(bridgeArt, beat.triceratops, 'Triceratops', 'bridge-trike');
    const story = el('div', { className: 'bridge-story' }, dialogue(), sceneArt);
    const nextLine = line + 1;
    const hasMore = nextLine < bridgeDialogue[beat.dialogueKey].length;
    const next = primary(hasMore ? 'Continue' : beat.primaryAction, () => {
      if (hasMore) return go(phase, nextLine);
      if (phase === 'arrival') return go('introduction');
      if (phase === 'introduction') return go('construction');
      if (crossing) return go('clue');
      scene.dispose();
      exit(motion.matches ? 0 : timing.continue);
    });
    const controls = el('div', { className: 'bridge-story-actions' }, next);
    story.append(controls);
    stage.append(story);
    sceneArt.append(trex, trike);

    const place = (sprite, points, useEnd) => {
      const [x, y] = useEnd ? points.end : points.arrival;
      sprite.style.left = x * 100 + '%';
      sprite.style.top = y * 100 + '%';
    };
    const layout = matchMedia('(orientation: portrait)');
    const actors = [trex, trike];
    function ground() {
      const anchors = tracks[layout.matches ? 'portrait' : 'landscape'];
      actors.forEach((sprite, index) => place(sprite,
        { end: anchors.end[index], arrival: anchors.arrival[index] }, repaired));
    }
    layout.addEventListener('change', () => { cancelMotion(); ground(); }, { signal });
    ground();

    const walking = [1, 2, 3, 4].map(index => trexArt + 'trex-walk-' + index + '.png');
    if (phase === 'arrival' && line === 0 && !motion.matches) {
      const x = parseFloat(trex.style.left);
      walkFrames(trex, walking, timing.arrival);
      animate(trex, [{ left: Math.max(2, x - 10) + '%' }, { left: trex.style.left }],
        { duration: timing.arrival, easing: 'ease-out' });
    }
    if (phase === 'arrival' && line === 1) {
      animate(trike, [{ opacity: .64 }, { opacity: 1 }], { duration: timing.greeting });
    }
    if (phase === 'clue' && animateEntry) {
      animate(trike, [{ opacity: .72 }, { opacity: 1 }], { duration: timing.clue });
    }

    if (!crossing || !animateEntry || motion.matches) return;
    const skip = action('Skip crossing', cancelMotion, 'chapter-secondary');
    controls.prepend(skip);
    const path = tracks[layout.matches ? 'portrait' : 'landscape'];
    animate(sceneArt.firstElementChild, [{ opacity: .65 }, { opacity: 1 }], { duration: timing['repair-transition'] });
    const movement = actors.map((sprite, index) => {
      const delay = index * 250;
      const [startX, startY] = path.start[index];
      const [endX, endY] = path.end[index];
      const frames = index === 0 ? walking : ['idle', 'greeting'].map(pose => bridgeArt + 'triceratops-' + pose + '.png');
      walkFrames(sprite, frames, timing.crossing, delay);
      return animate(sprite, [{ left: startX * 100 + '%', top: startY * 100 + '%' },
        { left: endX * 100 + '%', top: endY * 100 + '%' }],
      { duration: timing.crossing, delay, fill: 'backwards' });
    });
    void Promise.allSettled(movement.map(animation => animation.finished)).then(() => {
      if (signal.aborted) return;
      if (document.activeElement === skip) next.focus();
      skip.remove();
    });
  }

  function showEquality() {
    const { board, reconcile } = createBridgeModel({ ...options, action, animate, timing, signal,
      values: question.values, read, readOnly: true });
    const trex = picture(trexArt + 'trex-celebrate.png', '', 'T-Rex');
    const friend = picture(bridgeArt + beat.triceratops + '.png', '', 'Triceratops');
    const figures = el('div', { className: 'bridge-celebration' }, trex, friend);
    const success = el('div', { className: 'bridge-equality' }, el('div', { className: 'bridge-success-copy' }, dialogue(), figures),
      el('div', { className: 'bridge-results' }, el('p', { className: 'grove-equation' }, question.equations[0]), board),
      el('div', { className: 'bridge-story-actions' }, primary(beat.primaryAction, () => go('crossing'))));
    stage.append(success);
    if (repairFrom === undefined || motion.matches) return;
    pendingRepair = requestAnimationFrame(() => {
      pendingRepair = undefined;
      const delay = reconcile(repairFrom);
      animate(friend, [{ translate: '0 0' }, { translate: '0 -6%' }, { translate: '0 0' }, { translate: '0 -4%' }, { translate: '0 0' }],
        { duration: timing.celebrate, delay, easing: 'ease-in-out' });
    });
  }

  function showConstruction() {
    const task = el('div', { className: 'grove-task' });
    const work = el('div', { className: 'grove-work-board' });
    const workspace = el('div', { className: 'grove-learning bridge-learning' }, task, work);
    task.append(el('p', { className: 'chapter-kicker' }, 'Make the rows match'),
      el('div', { className: 'grove-learning-speaker' },
        picture(bridgeArt + beat.triceratops + '.png', 'grove-thinking-brachio', 'Triceratops'),
        el('div', {}, el('p', { className: 'grove-problem' }, question.context),
          el('h2', { id: 'chapter-question', tabindex: '-1', 'data-focus-beat': '' }, question.prompts[0]), listen(question.story, { label: 'Listen' }))));

    const { board } = createBridgeModel({ ...options, action, animate, timing, signal,
      values: question.values, read, update: (changes, support) => save(changes, support ? 'tools' : undefined) });
    const numberLine = buildModel({ kind: 'line', start: question.values.initial, target: question.values.target,
      showJumps: true, initialPosition: read().position ?? question.values.initial },
    { onChange: position => save({ position }, 'tools') });
    const sketch = drawing();
    const tools = action('Math tools', () => toggle('model'), 'chapter-secondary');
    const lineTool = action('Number line', () => toggle('line'), 'chapter-secondary');
    const draw = action('Draw', () => select(sketch.hidden ? 'draw' : read().tool), 'chapter-secondary');
    function select(view) {
      board.hidden = view !== 'model';
      numberLine.hidden = view !== 'line';
      sketch.hidden = view !== 'draw';
      tools.setAttribute('aria-expanded', String(view === 'model'));
      lineTool.setAttribute('aria-expanded', String(view === 'line'));
      draw.setAttribute('aria-pressed', String(view === 'draw'));
    }
    function toggle(tool) {
      const selected = (tool === 'model' ? board : numberLine).hidden ? tool : 'closed';
      save({ tool: selected }, selected === 'line' ? 'tools' : undefined);
      select(selected);
    }
    work.append(el('div', { className: 'chapter-actions grove-tools' }, tools, lineTool, draw,
      action('Restart stop', options.restart, 'chapter-secondary')), board, numberLine, sketch);

    const feedback = el('p', { id: 'chapter-feedback', className: 'grove-feedback', role: 'status' });
    const hint = el('p', { className: 'chapter-hint', role: 'status' });
    const hintControl = action('Hint', () => {
      if (readAttempt().hints >= bridgeChallenge.hints.length) return guided(hintControl);
      save({}, 'hints');
      update({ hints: readAttempt().hints + 1 });
      showHint();
    }, 'chapter-secondary');
    function showHint() {
      const level = readAttempt().hints;
      hint.hidden = level === 0;
      hint.textContent = level ? bridgeChallenge.hints[level - 1][0] + ' · ' + question.hints[0][level - 1] : '';
      hintControl.textContent = level >= bridgeChallenge.hints.length ? 'See a worked example' : level ? 'Another hint' : 'Hint';
    }
    function showFeedback() {
      const { error, draft } = readAttempt();
      const speaker = question.feedbackSpeakers[Number(draft)] ?? bridgeChallenge.feedback.at(-1).speaker;
      feedback.textContent = error ? speaker + ' · ' + error : '';
    }
    const help = action('Try with help', () => guided(help), 'chapter-secondary');
    const move = action('Take a break', () => { cancelMotion(); stopSpeech(); movementBreak(move); }, 'chapter-secondary');
    const { field, label } = answerField('Your answer');
    field.value = readAttempt().draft;
    field.addEventListener('input', () => {
      update({ draft: field.value, error: '' });
      feedback.textContent = '';
    }, { signal });
    const form = el('form', { className: 'chapter-answer-form grove-form' }, label,
      el('button', { className: 'welcome-primary grove-primary', type: 'submit' }, beat.primaryAction));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = field.value.trim();
      if (!/^\d{1,2}$/.test(value)) {
        feedback.textContent = 'Enter a whole number from 0 to 99.';
        return;
      }
      if (checkAnswer(question, value)) return;
      showFeedback();
      help.hidden = read().mistakes < 2;
    }, { signal });
    help.hidden = read().mistakes < 2;
    workspace.append(el('div', { className: 'grove-response' }, form, feedback,
      el('div', { className: 'chapter-actions grove-guidance' }, hintControl, help, move), hint));
    stage.append(workspace);
    select(read().tool);
    showHint();
    showFeedback();

    function guided(trigger) {
      const example = bridgeQuestion(bridgeChallenge.guidedExample);
      const body = el('div', {}, el('p', {}, example.story));
      stopSpeech();
      const modal = dialog('See a different example', body, trigger);
      const show = action('Show how', () => {
        save({}, 'guided');
        const { board: demonstration } = createBridgeModel({ ...options, action, animate, timing, signal,
          values: example.values, read: () => ({ shared: example.values.missing }), readOnly: true });
        const back = action('Back to my problem', () => {
          save({ tool: 'model' });
          select('model');
          modal.close();
        }, 'chapter-secondary');
        show.replaceWith(demonstration, el('p', { className: 'grove-equation' }, example.equations[0]), back);
        back.focus();
      }, 'chapter-secondary');
      body.append(show);
    }
    if (animateEntry) animate(workspace, [{ opacity: .8 }, { opacity: 1 }], { duration: timing.learning });
  }
}
