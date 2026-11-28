import { chapterSceneDialogue, chapterSceneHeader } from './chapter-scene-ui.js';
import { buildModel } from './manipulatives.js';
import { sceneLifecycle } from './scene-lifecycle.js';
import { lagoonAnimations, lagoonChallenge, lagoonDialogue, lagoonScene } from './crystal-lagoon-content.js';
import { createLagoonModel, lagoonArt } from './crystal-lagoon-model.js';
import { lagoonBeats, lagoonCopy, lagoonHelp, lagoonQuestion } from './crystal-lagoon-state.js';

const trexArt = './assets/scene-01/';
const mosaArt = './assets/characters/';
const timing = Object.fromEntries(lagoonAnimations.sequences.map(({ event, durationMs }) => [event, durationMs]));

export function createCrystalLagoon(options) {
  const { question, readAttempt, update, changeBeat, checkAnswer, exit, practice, stopCount, animateEntry, repairFrom,
    el, picture, stopSpeech, listen, dialog, answerField, drawing, movementBreak, openMap, grownUps } = options;
  const read = () => readAttempt().lagoon;
  const { phase, line } = read();
  const beat = lagoonBeats[phase];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = el('section', { className: 'grove-stage lagoon-stage', 'data-beat': phase, 'data-line': line,
    'aria-labelledby': 'lagoon-title' });
  for (const [orientation, { trexFeet, mosaWaterline }] of Object.entries(lagoonScene.layoutTargets)) {
    for (const [name, [x, y]] of [['trex', trexFeet], ['mosa', mosaWaterline]]) {
      stage.style.setProperty(`--${orientation}-${name}-x`, x * 100 + '%');
      stage.style.setProperty(`--${orientation}-${name}-y`, y * 100 + '%');
    }
  }

  const animations = new Set();
  let frame;
  let motionRequest = 0;
  function cancelMotion() {
    motionRequest++;
    cancelAnimationFrame(frame);
    for (const animation of animations) animation.cancel();
    animations.clear();
  }
  const scene = sceneLifecycle(stage, stopSpeech, cancelMotion);
  const { signal } = scene;
  motion.addEventListener('change', () => { if (motion.matches) cancelMotion(); }, { signal });

  function action(label, use, className = '') {
    const button = el('button', { type: 'button', className }, label);
    button.addEventListener('click', use, { signal });
    return button;
  }
  function animate(node, keys, config) {
    if (motion.matches || signal.aborted) return;
    const animation = node.animate(keys, config);
    animations.add(animation);
    const forget = () => animations.delete(animation);
    void animation.finished.then(forget, forget);
  }
  async function readyToAnimate(play) {
    if (motion.matches) return;
    const request = motionRequest;
    await Promise.allSettled([...stage.querySelectorAll('img')].map(img => img.decode()));
    if (!signal.aborted && !motion.matches && request === motionRequest) play();
  }
  const primary = (label, handler) => action(label, handler, 'welcome-primary grove-primary');
  const secondary = (label, handler) => action(label, handler, 'chapter-secondary');
  const copy = text => lagoonCopy(text, question.values);

  function save(changes, support) {
    const current = read();
    update({ ...(support ? { assisted: true } : {}),
      lagoon: { ...current, ...changes, help: support ? lagoonHelp([...current.help, support]) : current.help } });
  }
  function go(next, nextLine = 0) {
    stopSpeech();
    changeBeat(next, nextLine);
  }

  stage.append(chapterSceneHeader({ ...options, action, art: trexArt, title: lagoonScene.title, titleId: 'lagoon-title',
    progress: `${practice ? 'Practice · ' : ''}Stop ${lagoonScene.stop} of ${stopCount}`,
    openMap(trigger) { cancelMotion(); openMap(trigger); },
    grownUps() { cancelMotion(); grownUps(); },
  }));

  const submerged = phase === 'explore' || (phase === 'reveal' && line === -1);
  const background = phase === 'reveal' && !submerged ? lagoonBeats.arrival.backgrounds : beat.backgrounds;
  const backdrop = addBackdrop(background, 'lagoon-backdrop');
  stage.prepend(backdrop);

  if (phase === 'compare') drawLearning();
  else if (submerged) drawUnderwater();
  else drawShore();
  return scene;

  function addBackdrop({ landscape, portrait }, className, alt = '') {
    const filename = path => lagoonArt + path.split('/').at(-1);
    return el('picture', { className },
      el('source', { media: '(orientation: portrait)', srcset: filename(portrait) }),
      picture(filename(landscape), 'lagoon-landscape', alt));
  }

  function shoreCast({ includeTrex = true, pose = 'mosa-neutral', marker = false } = {}) {
    const cast = el('div', { className: 'lagoon-cast' });
    let trex;
    if (includeTrex) {
      const appearance = phase === 'activate' ? 'trex-celebrate.png' : phase === 'marker' ? 'trex-thinking.png' : 'trex-greeting.png';
      trex = el('div', { className: 'lagoon-trex' }, picture((phase === 'marker' ? './assets/scene-04/' : trexArt) + appearance, '', 'T-Rex'));
      cast.append(trex);
    }
    const character = picture(mosaArt + pose + '.png', '', 'Mosasaurus');
    const mosa = el('div', { className: 'lagoon-waterline', 'data-pose': pose }, character);
    const ripple = picture(lagoonArt + 'ripple.svg', 'lagoon-ripple');
    cast.append(mosa, ripple);
    let glow;
    let prop;
    if (marker) {
      prop = el('div', { className: 'lagoon-marker' }, picture(lagoonArt + 'marker.svg', '', 'Crystal marker'));
      if (readAttempt().solved) {
        glow = picture(lagoonArt + 'marker-glow.svg', 'lagoon-glow', 'Marker glowing');
        prop.append(glow);
      }
      cast.append(prop);
    }
    return { cast, trex, mosa, character, ripple, prop, glow };
  }

  function drawShore() {
    const pose = phase === 'arrival' && line === 0 ? 'mosa-leap' : 'mosa-neutral';
    const { cast, trex, mosa, character, ripple, prop, glow } = shoreCast({ pose, marker: phase !== 'arrival' });
    stage.append(cast);
    const [speaker, text] = lagoonDialogue[beat.dialogueKey][line];
    const dialogue = chapterSceneDialogue({ el, listen, speaker, text: copy(text), focus: true });
    const panel = el('div', { className: 'lagoon-card lagoon-dialogue' }, dialogue);
    const controls = el('div', { className: 'lagoon-actions' });
    const last = line === lagoonDialogue[beat.dialogueKey].length - 1;
    controls.append(primary(last ? beat.primaryAction : 'Continue', () => {
      if (!last) return go(phase, line + 1);
      if (phase === 'arrival') return go('marker');
      if (phase === 'marker') return go('compare');
      if (phase === 'activate') return go('explore');
      scene.dispose();
      exit(motion.matches ? 0 : timing.departure);
    }));
    if (phase === 'reveal' && line === 0) {
      panel.append(addBackdrop(lagoonBeats.reveal.backgrounds, 'lagoon-discovery', 'Mosasaurus found an underwater passage.'));
    }
    if (phase === 'activate' && last) controls.append(secondary('Skip cinematic', () => go('reveal')));
    panel.append(controls);

    if (phase === 'activate' && line === 0) {
      const { board, reconcile } = makeModel(true);
      const result = el('div', { className: 'lagoon-card lagoon-result' },
        el('div', { className: 'lagoon-result-heading' },
          el('p', { className: 'grove-equation' },
            `${question.equations.at(-1)} · ${question.values.finalBlue} > ${question.values.green}`), prop), board);
      stage.append(el('div', { className: 'lagoon-success' }, panel, result));
      if (repairFrom !== undefined && !motion.matches) frame = requestAnimationFrame(() => {
        const delay = reconcile(repairFrom);
        animate(glow, [{ opacity: 0 }, { opacity: .6 }, { opacity: 1 }],
          { duration: timing.activate, delay, easing: 'ease-out', fill: 'backwards' });
      });
    } else stage.append(el('div', { className: 'lagoon-story' }, panel));

    if (phase === 'arrival' && line === 0 && !motion.matches) {
      const frames = [1, 2, 3, 4].map(i => picture(trexArt + 'trex-walk-' + i + '.png', 'lagoon-walk-frame'));
      trex.append(...frames);
      void readyToAnimate(() => {
        animate(trex, [{ translate: '-125% 0' }, { translate: '0 0' }], { duration: timing.arrival });
        animate(trex.firstElementChild, [{ opacity: 0 }, { opacity: 0 }], { duration: timing.arrival });
        frames.forEach((image, frameIndex) => {
          const keys = Array.from({ length: 13 }, (_, index) =>
            ({ offset: index / 12, opacity: Number(index < 12 && index % 4 === frameIndex), easing: 'step-end' }));
          animate(image, keys, { duration: timing.arrival });
        });
        animate(character, [{ translate: '0 84%' }, { translate: '0 0' }], { duration: timing.surface, easing: 'ease-out' });
        animate(ripple, [{ opacity: 0, scale: .65 }, { opacity: 1, scale: 1.1 }, { opacity: .6, scale: 1 }],
          { duration: timing.surface, easing: 'ease-out' });
      });
    }
    if (phase === 'marker' && line === 0 && animateEntry) {
      void readyToAnimate(() => animate(mosa, [
        { translate: '15% 0' }, { translate: '0 0' },
      ], { duration: timing.marker, easing: 'ease-out' }));
    }
    if (phase === 'reveal' && line === 0 && animateEntry) {
      void readyToAnimate(() => animate(character, [
        { translate: '0 75%' }, { translate: '0 0' },
      ], { duration: timing.return, easing: 'ease-out' }));
    }
  }

  function drawUnderwater() {
    const reveal = phase === 'reveal';
    stage.classList.add('lagoon-submerged');
    const swimmer = picture(mosaArt + 'mosa-swim.png', 'lagoon-swimmer', 'Mosasaurus');
    const bubbles = picture(lagoonArt + 'bubble.svg', 'lagoon-bubbles');
    stage.append(el('div', { className: 'lagoon-cast' }, swimmer, bubbles));
    const title = el('h2', { 'data-focus-beat': '', tabindex: '-1' }, reveal ? 'Hidden passage' : 'Underwater exploration');
    stage.append(el('div', { className: 'lagoon-cinema-controls lagoon-card' }, title,
      el('div', { className: 'lagoon-actions' },
        primary('Continue', () => go('reveal', reveal ? 0 : -1)),
        secondary('Skip cinematic', () => go('reveal')))));
    if (!animateEntry || motion.matches) return;
    if (reveal) {
      stage.prepend(addBackdrop(lagoonBeats.explore.backgrounds, 'lagoon-reveal-from'));
      void readyToAnimate(() => animate(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: timing.reveal }));
      return;
    }
    const waterline = shoreCast({ includeTrex: false, pose: 'mosa-swim' });
    const diving = el('div', { className: 'lagoon-dive' }, addBackdrop(lagoonBeats.arrival.backgrounds, 'lagoon-dive-shore'), waterline.cast);
    stage.append(diving);
    void readyToAnimate(() => {
      animate(diving, [{ visibility: 'visible', opacity: 1 }, { visibility: 'visible', opacity: .95, offset: .55 },
        { visibility: 'hidden', opacity: 0 }], { duration: timing.dive });
      animate(waterline.character, [{ translate: '0 0', rotate: '0deg' }, { translate: '12% 100%', rotate: '15deg' }],
        { duration: timing.dive, easing: 'ease-in' });
      animate(swimmer, [{ translate: '-77% -42%', rotate: '9deg' }, { translate: '-24% 10%', rotate: '-6deg', offset: .55 },
        { translate: '0 0', rotate: '0deg' }], { delay: timing.dive, duration: timing.exploration, fill: 'backwards', easing: 'ease-in-out' });
      animate(bubbles, [{ opacity: 0, translate: '0 20%' }, { opacity: 1, offset: .35 }, { opacity: .3, translate: '20% -30%' }],
        { delay: timing.dive, duration: timing.exploration, fill: 'backwards', easing: 'ease-out' });
    });
  }

  function makeModel(readOnly, values = question.values, get = read) {
    return createLagoonModel({ ...options, values, action, signal, animate, readOnly, read: get,
      timing: { ...timing, place: timing.add, undo: timing.add, 'success-reconcile': timing.add },
      update: (changes, support) => save(changes, support ? 'tools' : undefined) });
  }

  function drawLearning() {
    const cast = shoreCast({ marker: true }).cast;
    cast.classList.add('lagoon-learning-scenery');
    stage.append(cast);
    const task = el('div', { className: 'grove-task' }, el('p', { className: 'chapter-kicker' }, 'Find the fewest crystals'),
      el('p', { className: 'grove-problem' }, question.context),
      el('h2', { id: 'chapter-question', tabindex: '-1', 'data-focus-beat': '' }, question.prompts[0]), listen(question.story, { label: 'Listen' }));
    const work = el('div', { className: 'grove-work-board' });
    const workspace = el('div', { className: 'grove-learning lagoon-learning' }, task, work);
    const { board } = makeModel(false);
    const numberLine = buildModel({ kind: 'line', start: question.values.blue, target: question.values.finalBlue,
      showJumps: true, initialPosition: read().position ?? question.values.blue },
    { onChange: position => save({ position }, 'tools') });
    const sketch = drawing();
    const tools = secondary('Math tools', () => toggle('model', board));
    const lineTool = secondary('Number line', () => toggle('line', numberLine));
    const draw = secondary('Draw', () => select(sketch.hidden ? 'draw' : read().tool));
    function select(tool) {
      board.hidden = tool !== 'model';
      numberLine.hidden = tool !== 'line';
      sketch.hidden = tool !== 'draw';
      tools.setAttribute('aria-expanded', String(!board.hidden));
      lineTool.setAttribute('aria-expanded', String(!numberLine.hidden));
      draw.setAttribute('aria-pressed', String(!sketch.hidden));
    }
    function toggle(tool, node) {
      const next = node.hidden ? tool : 'closed';
      save({ tool: next }, next === 'line' ? 'tools' : undefined);
      select(next);
    }
    work.append(el('div', { className: 'chapter-actions grove-tools' }, tools, lineTool, draw,
      secondary('Restart stop', options.restart)), board, numberLine, sketch);

    const feedback = el('p', { id: 'chapter-feedback', className: 'grove-feedback', role: 'status' });
    const hint = el('p', { className: 'chapter-hint', role: 'status' });
    const hintControl = secondary('Hint', () => {
      if (readAttempt().hints >= lagoonChallenge.hints.length) return guided(hintControl);
      save({}, 'hints');
      update({ hints: readAttempt().hints + 1 });
      showHint();
    });
    const help = secondary('Try with help', () => guided(help));
    const move = secondary('Take a break', () => { cancelMotion(); stopSpeech(); movementBreak(move); });
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
    }, { signal });
    workspace.append(el('div', { className: 'grove-response' }, form, feedback,
      el('div', { className: 'chapter-actions grove-guidance' }, hintControl, help, move), hint));
    stage.append(workspace);
    select(read().tool);
    showHint();
    showFeedback();
    if (animateEntry) animate(workspace, [{ opacity: .8 }, { opacity: 1 }], { duration: timing.learning });

    function showHint() {
      const level = readAttempt().hints;
      hint.hidden = level === 0;
      hint.textContent = level ? lagoonChallenge.hints[level - 1][0] + ' · ' + question.hints[0][level - 1] : '';
      hintControl.textContent = level >= lagoonChallenge.hints.length ? 'See a worked example' : level ? 'Another hint' : 'Hint';
    }
    function showFeedback() {
      const { error, draft } = readAttempt();
      const speaker = question.feedbackSpeakers[Number(draft)] ?? lagoonChallenge.feedback.at(-1).speaker;
      feedback.textContent = error ? speaker + ' · ' + error : '';
      help.hidden = read().mistakes < 2;
    }
    function guided(trigger) {
      const example = lagoonQuestion(lagoonChallenge.guidedExample);
      const body = el('div', {}, el('p', {}, example.story));
      const modal = dialog('See a different example', body, trigger);
      modal.addEventListener('close', cancelMotion, { once: true });
      const steps = lagoonChallenge.guidedExample.steps;
      let exampleAdded = 0;
      function showStep(step) {
        cancelMotion();
        save({}, 'guided');
        const before = exampleAdded;
        exampleAdded = step === 0 ? example.values.difference : example.values.answer;
        const { board, reconcile } = makeModel(true, example.values, () => ({ added: exampleAdded }));
        const more = secondary('See the next step', () => {
          if (more.isConnected) showStep(1);
        });
        const back = secondary('Back to my problem', () => {
          save({ tool: 'model' });
          select('model');
          modal.close();
        });
        body.replaceChildren(el('p', {}, example.story), el('p', {}, steps[step]), board,
          el('p', { className: 'grove-equation' }, step === 0
            ? `${example.values.blue} + ${example.values.difference} = ${example.values.green}`
            : example.equations.at(-1)));
        if (step === 1) body.append(el('p', {}, steps[2]));
        body.append(step === 0 ? more : back);
        (step === 0 ? more : back).focus();
        reconcile(before);
      }
      body.append(secondary('Show how', () => showStep(0)));
    }
  }
}
