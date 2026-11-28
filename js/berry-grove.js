import { berryAnimations, berryChallenge, berryDialogue, berryScene } from './berry-grove-content.js';
import { berryHelp, berryQuestion, fillBerryCopy, newBerryBeat } from './berry-grove-state.js';
import { berryImage, berryUnits, createBerryModel, groveArt, welcomeArt } from './berry-grove-model.js';
import { validateAnswer } from './engine.js';
import { buildModel } from './manipulatives.js';
import { sceneLifecycle } from './scene-lifecycle.js';
import { chapterSceneDialogue, chapterSceneHeader } from './chapter-scene-ui.js';

const timing = Object.fromEntries(berryAnimations.sequences.map(({ trigger, durationMs }) => [trigger, durationMs]));
const beatById = Object.fromEntries(berryScene.beats.map(beat => [beat.id, beat]));
const numbers = /^\d{1,2}$/;
const collectionStagger = 150;
const groupLabel = 'What we know';

export function createBerryGrove(options) {
  const { question, attempt, readAttempt, update, onChangeBeat, onAnswer, onExit, onRestart,
    playCollection, stopCount, practice, home, grownUps, openMap, leavePractice, movementBreak,
    drawing, answerField, dialog, listen, stopSpeech, el, button, picture } = options;
  const { values } = question;
  const { phase, line } = attempt.berry;
  const beat = beatById[phase];
  const learning = phase === 'combine' || phase === 'missing';
  const verified = learning && line === 1;
  const preview = phase === 'intro';
  const copy = (template, data = values) => fillBerryCopy(template, data);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = el('section', { className: 'grove-stage', 'data-beat': phase, 'data-line': line, 'aria-labelledby': 'grove-title' });
  for (const [orientation, layout] of Object.entries(berryScene.layout)) {
    for (const actor of ['trex', 'brachio']) {
      const { footAnchor: [x, y], widthFraction } = layout[actor];
      stage.style.setProperty(`--${orientation}-${actor}-x`, `${x * 100}%`);
      stage.style.setProperty(`--${orientation}-${actor}-y`, `${y * 100}%`);
      stage.style.setProperty(`--${orientation}-${actor}-width`, `${widthFraction * 100}%`);
    }
  }
  const lifecycle = sceneLifecycle(stage, stopSpeech, () => {
    for (const animation of stage.getAnimations({ subtree: true })) animation.cancel();
  });
  const { signal } = lifecycle;
  motion.addEventListener('change', () => {
    if (motion.matches) for (const animation of stage.getAnimations({ subtree: true })) animation.finish();
  }, { signal });
  function animate(node, keyframes, settings) {
    if (!motion.matches && !signal.aborted) return node.animate(keyframes, settings);
    return null;
  }
  function action(label, handler, style = '') {
    const control = el('button', { type: 'button', className: style }, label);
    control.addEventListener('click', handler, { signal });
    return control;
  }
  const primary = (label, handler) => action(label, handler, 'welcome-primary grove-primary');
  function markSupport(type) {
    if (readAttempt().solved) return;
    const current = readAttempt().berry;
    update({ assisted: true, berry: { ...current, help: berryHelp([...current.help, type]) } });
  }
  function changeBeat(next, nextLine = 0, collect = false) {
    if (signal.aborted) return;
    const current = readAttempt().berry;
    const nextBeat = next === phase ? current : { ...newBerryBeat(next), help: current.help };
    stopSpeech();
    onChangeBeat({ ...nextBeat, phase: next, line: nextLine }, collect);
  }

  stage.append(chapterSceneHeader({ el, picture, action, title: berryScene.title, titleId: 'grove-title', art: welcomeArt,
    progress: `${practice ? 'Practice · ' : ''}Stop 1 of ${stopCount}`, practice, home, grownUps, openMap, leavePractice }));

  const dialogueId = verified ? berryChallenge.steps[phase === 'combine' ? 0 : 1].correctDialogue
    : phase === 'success' ? beat.dialogueIds[line + 1] : beat.dialogueIds[line];
  const speech = berryDialogue.lines[dialogueId];
  const text = copy(speech.text);
  function bubble() {
    const isQuestion = phase === 'missing' && !verified;
    return chapterSceneDialogue({ el, listen, speaker: speech.speaker, text, isQuestion, focus: !learning || isQuestion });
  }

  if (learning) {
    renderLearning();
    return lifecycle;
  }

  const landscape = picture(groveArt + 'grove-landscape.webp', 'grove-landscape');
  stage.prepend(el('picture', { className: 'grove-background' },
    el('source', { media: '(orientation: portrait)', srcset: groveArt + 'grove-portrait.webp' }), landscape));
  const trex = picture(welcomeArt + `trex-${phase === 'success' ? 'celebrate' : 'greeting'}.png`, 'grove-trex', 'T-Rex');
  const reaching = phase === 'success' && line === 0 && playCollection;
  const greeting = phase === 'arrival' && line === 0;
  const brachioPose = reaching ? beat.brachioPose : phase === 'success' ? 'brachio-happy'
    : greeting && !motion.matches ? 'brachio-neutral' : beat.brachioPose;
  const brachio = picture(groveArt + brachioPose + '.png', 'grove-brachio', 'Brachiosaurus');
  brachio.dataset.pose = brachioPose;
  const actors = el('div', { className: 'grove-actors' }, trex, brachio);
  stage.append(actors, bubble());
  if (phase === 'clue') stage.append(picture(groveArt + 'trail-sign.png', 'grove-trail-sign', 'Footprints point down the trail'));

  if (preview) {
    stage.append(el('div', { className: 'grove-intro-data', 'aria-label': groupLabel },
      el('p', {}, `${values.red} red berries`), el('p', {}, `${values.blue} blue berries`),
      el('p', {}, `We need ${values.target} berries.`)));
  }
  if (phase === 'success') renderSuccess(trex, brachio, reaching);

  const last = phase === 'success' ? beat.dialogueIds.length - 2 : beat.dialogueIds.length - 1;
  const label = phase === 'arrival' && line === last ? beat.primaryAction
    : phase === 'clue' && line === last ? beat.primaryAction : 'Continue';
  let leaving = false;
  stage.append(el('div', { className: 'grove-narrative-action' }, primary(label, () => {
    if (leaving || signal.aborted) return;
    if (line < last) return changeBeat(phase, line + 1);
    if (phase === 'arrival') return changeBeat('intro');
    if (phase === 'intro') return changeBeat('combine');
    if (phase === 'success') return changeBeat('clue');
    leaving = true;
    stopSpeech();
    onExit(motion.matches ? 0 : timing['follow trail']);
  })));
  if (greeting) {
    const walk = Array.from({ length: 4 }, (_, index) =>
      picture(welcomeArt + `trex-walk-${index + 1}.png`, 'grove-trex grove-walk'));
    // Preload approved frames before the short one-shot entry. Opacity selects one frame at a time.
    actors.prepend(...walk);
    if (!motion.matches) {
      const duration = timing.arrival;
      animate(trex, [{ opacity: 0 }, { opacity: 0 }], { duration });
      walk.forEach((frame, index) => {
        const keys = Array.from({ length: 12 }, (_, step) =>
          ({ opacity: step % 4 === index ? 1 : 0, offset: step / 12, easing: 'step-end' }));
        animate(frame, [{ translate: '-170% 0' }, { translate: '0 0' }], { duration });
        animate(frame, keys.concat({ opacity: 0, offset: 1 }), { duration });
      });
      const greet = animate(brachio, [{ opacity: 1 }, { opacity: 1 }], { duration: timing['arrival greeting'] });
      greet?.addEventListener('finish', () => {
        brachio.src = groveArt + beat.brachioPose + '.png';
        brachio.dataset.pose = beat.brachioPose;
      }, { signal });
    }
  }
  if (phase === 'clue') animate(brachio, [{ translate: '-1% 0' }, { translate: '0 0' }], { duration: timing.clue, easing: 'ease-out' });
  return lifecycle;

  function renderLearning() {
    const step = phase === 'combine' ? 0 : 1;
    const work = el('div', { className: 'grove-work-board' });
    const task = el('div', { className: 'grove-task' });
    const section = el('div', { className: 'grove-learning' }, task, work);
    stage.append(section);
    const prompt = el('h2', { id: 'chapter-question', tabindex: '-1', ...(!verified ? { 'data-focus-beat': '' } : {}) }, question.prompts[step]);
    const story = el('p', { className: 'chapter-story-text grove-problem' }, question.story);
    const equation = el('p', { className: 'grove-equation', 'aria-label': verified ? 'Verified equation' : 'Equation with a blank' },
      verified ? question.equations[step] : question.blanks[step]);
    const tRex = picture(groveArt + 'trex-thinking.png', 'grove-thinking', 'T-Rex');
    const brachio = picture(groveArt + beat.brachioPose + '.png', 'grove-thinking-brachio', 'Brachiosaurus');
    task.append(el('p', { className: 'chapter-kicker' }, `Step ${step + 1} of 2`),
      el('div', { className: 'grove-learning-speaker' }, speech.speaker === 'T-Rex' ? tRex : brachio, bubble()), story);
    if (step === 1) task.append(el('p', { className: 'chapter-known' }, `In your basket: ${values.total} berries.`),
      el('p', { className: 'grove-previous-equation' }, question.equations[0]));
    if (step === 0 || verified) task.append(prompt);
    task.append(equation);

    if (verified) {
      task.querySelector('.grove-line').setAttribute('data-focus-beat', '');
      const duration = step ? timing['step2 correct'] : timing['step1 correct'];
      animate(equation, [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration });
      work.classList.add('grove-verified');
      work.append(picture(groveArt + (step ? 'brachio-reaching.png' : 'brachio-happy.png'), 'grove-verified-pose', 'Brachiosaurus'));
      task.append(primary('Continue', () => step ? changeBeat('success', 0, true) : changeBeat('missing')));
      return;
    }

    const panel = createBerryModel({ ...options, step, signal, animate, moveDuration: timing['combine tool'],
      current: () => readAttempt().berry.moved,
      change(moved) {
        markSupport('tools');
        update({ berry: { ...readAttempt().berry, moved } });
      },
    });
    const sketch = drawing();
    const hint = el('p', { id: 'grove-hint', className: 'chapter-hint', role: 'status' });
    const feedback = el('p', { id: 'chapter-feedback', className: 'grove-feedback', role: 'status' }, attempt.error);
    let selected = attempt.berry.numberLine && step ? 'line' : attempt.berry.tools ? 'model' : 'closed';
    const numberLine = step ? buildModel({ kind: 'line', start: values.total, target: values.target, showJumps: true,
      initialPosition: values.total + (attempt.berry.jumps ?? 0) }, {
      onChange(position) {
        markSupport('tools');
        update({ berry: { ...readAttempt().berry, jumps: position - values.total } });
      },
    }) : null;
    const chooseLine = step ? action('Number line', () => select(numberLine.hidden ? 'line' : 'closed'), 'chapter-secondary') : null;
    function select(view) {
      selected = view;
      update({ berry: { ...readAttempt().berry, tools: view === 'model', numberLine: view === 'line' } });
      toolView(view);
    }
    function toolView(view) {
      panel.hidden = view !== 'model';
      sketch.hidden = view !== 'draw';
      if (numberLine) numberLine.hidden = view !== 'line';
      toggle.setAttribute('aria-expanded', String(view === 'model'));
      chooseLine?.setAttribute('aria-expanded', String(view === 'line'));
      draw.setAttribute('aria-pressed', String(view === 'draw'));
    }
    const toggle = action('Math tools', () => select(panel.hidden ? 'model' : 'closed'), 'chapter-secondary');
    const draw = action('Draw', () => toolView(sketch.hidden ? 'draw' : selected), 'chapter-secondary');
    const hints = question.hints[step];
    const hintAction = action('Hint', () => {
      const level = readAttempt().hints;
      if (level >= hints.length) return guided(hintAction);
      markSupport('hints');
      update({ hints: level + 1 });
      showHint();
    }, 'chapter-secondary');
    const breakButton = action('Take a break', () => movementBreak(breakButton), 'chapter-secondary');
    const help = action('Try with help', () => guided(help), 'chapter-secondary');
    function showHint() {
      const level = readAttempt().hints;
      hint.hidden = !level;
      if (level) hint.textContent = hints[level - 1];
      hintAction.textContent = level === hints.length ? 'See a worked example' : level ? 'Another hint' : 'Hint';
    }
    help.hidden = attempt.berry.mistakes < 2;
    work.append(el('div', { className: 'chapter-actions grove-tools' }, toggle, ...(chooseLine ? [chooseLine] : []), draw,
      action('Restart stop', onRestart, 'chapter-secondary')), panel, ...(numberLine ? [numberLine] : []), sketch);
    const { field, label } = answerField('Your answer');
    field.value = attempt.draft;
    field.addEventListener('input', () => update({ draft: field.value }), { signal });
    const form = el('form', { className: 'chapter-answer-form grove-form' }, label,
      el('button', { className: 'welcome-primary grove-primary', type: 'submit' }, beat.primaryAction));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = field.value.trim();
      if (!numbers.test(value) || Number(value) > 20) {
        feedback.textContent = 'Enter a whole number from 0 to 20.';
        return;
      }
      if (onAnswer(question, value)) return;
      feedback.textContent = readAttempt().error;
      help.hidden = readAttempt().berry.mistakes < 2;
    }, { signal });
    const response = el('div', { className: 'grove-response' }, form, feedback,
      el('div', { className: 'chapter-actions grove-guidance' }, hintAction, help, breakButton), hint);
    section.append(response);
    toolView(selected);
    showHint();
    if (step === 0) animate(section, [{ opacity: .78 }, { opacity: 1 }], { duration: timing['intro complete'] });
  }

  function guided(trigger) {
    stopSpeech();
    const pane = el('div', { className: 'grove-guided' });
    const example = berryQuestion(berryChallenge.workedExample);
    const transfer = berryQuestion(berryChallenge.transfer);
    const modal = dialog('See a different example', pane, trigger);
    let step = 0;
    function exampleScreen(shown = false) {
      const final = step === 1;
      pane.replaceChildren(el('p', { className: 'chapter-kicker' }, 'Worked example'),
        el('p', {}, example.story), el('h3', {}, example.prompts[step]));
      if (!shown) {
        pane.append(action('Show how', () => {
          markSupport('worked-example');
          exampleScreen(true);
        }, 'chapter-secondary'));
      } else {
        const { red, blue, missing } = example.values;
        const units = berryUnits({ el, picture }, red, 'red').concat(berryUnits({ el, picture }, blue, 'blue'));
        if (final) units.push(...berryUnits({ el, picture }, missing, 'blue', 'grove-added'));
        pane.append(el('div', { className: 'grove-grid grove-example-pieces', role: 'img',
          'aria-label': final ? `${example.values.total} berries, then ${missing} added` : `${red} red and ${blue} blue berries together` }, ...units),
        el('p', { className: 'grove-equation' }, example.equations[step]),
        action(final ? 'Try a similar problem' : 'See the next step', () => {
          if (final) {
            markSupport('guided');
            step = 0;
            transferScreen();
          } else {
            step++;
            exampleScreen();
          }
        }, 'chapter-secondary'));
      }
      pane.querySelector('button').focus({ preventScroll: true });
    }
    function transferScreen() {
      const prompt = el('h3', { tabindex: '-1' }, transfer.prompts[step]);
      pane.replaceChildren(el('p', { className: 'chapter-kicker' }, `Try with help · Step ${step + 1} of 2`),
        el('p', {}, transfer.story));
      if (step === 1) pane.append(el('p', { className: 'chapter-known' }, transfer.equations[0]));
      const { field, label } = answerField('Transfer answer');
      const result = el('p', { role: 'status' });
      let moved = [];
      let hintIndex = 0;
      const hint = el('p', { className: 'chapter-hint', role: 'status' });
      const hintControl = action('Hint', () => {
        hint.textContent = transfer.hints[step][hintIndex++];
        hintControl.disabled = hintIndex === transfer.hints[step].length;
      }, 'chapter-secondary');
      const form = el('form', { className: 'chapter-answer-form' }, label, el('button', { type: 'submit' }, 'Check'));
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (!validateAnswer({ answerType: 'number', answer: transfer.answers[step] }, field.value)) {
          result.textContent = transfer.mistakes[step][Number(field.value)] ?? transfer.defaultFeedback[step];
          return;
        }
        form.hidden = true;
        hintControl.disabled = true;
        result.textContent = transfer.equations[step];
        const advance = action(step ? 'Back to my problem' : 'Continue', () => {
          if (step) modal.close();
          else { step++; transferScreen(); }
        }, 'chapter-secondary');
        pane.append(advance);
        advance.focus({ preventScroll: true });
      }, { signal });
      const model = createBerryModel({ ...options, question: transfer, step, signal, animate,
        moveDuration: timing['combine tool'], current: () => moved, change: next => { moved = next; } });
      const tool = action('Math tools', () => {
        model.hidden = !model.hidden;
        tool.setAttribute('aria-expanded', String(!model.hidden));
      }, 'chapter-secondary');
      model.hidden = true;
      tool.setAttribute('aria-expanded', 'false');
      pane.append(prompt, el('p', { className: 'grove-equation' }, transfer.blanks[step]),
        el('div', { className: 'chapter-actions' }, hintControl, tool), hint, model, form, result);
      prompt.focus({ preventScroll: true });
    }
    exampleScreen();
  }

  function renderSuccess(trex, brachio, animateCollection) {
    const { red, blue, total, missing, target } = values;
    const berries = berryUnits({ el, picture }, red, 'red').concat(berryUnits({ el, picture }, blue, 'blue'));
    const additions = berryUnits({ el, picture }, missing, 'blue', 'grove-added');
    const label = el('p', { className: 'grove-count-label', role: 'status' },
      `${animateCollection && !motion.matches ? total : target} berries in the basket`);
    const basket = el('div', { className: 'grove-packed' }, picture(groveArt + 'basket-empty.png', 'grove-basket-art'),
      label, el('div', { className: 'grove-grid grove-collection-grid' }, ...berries, ...additions));
    const sign = el('figure', { className: 'grove-sign' }, picture(groveArt + 'equation-sign.png', 'grove-sign-art'),
      el('figcaption', {}, ...question.equations.map(equation => el('p', {}, equation))));
    stage.append(el('div', { className: 'grove-success-model' }, basket, sign));
    if (!animateCollection || motion.matches) return;

    trex.src = welcomeArt + 'trex-greeting.png';
    additions.forEach(berry => { berry.style.opacity = '0'; });
    let collected = 0;
    const frame = requestAnimationFrame(() => {
      if (!stage.isConnected || signal.aborted) return;
      if (motion.matches) {
        additions.forEach(berry => { berry.style.opacity = ''; });
        label.textContent = `${target} berries in the basket`;
        brachio.src = groveArt + 'brachio-happy.png';
        brachio.dataset.pose = 'brachio-happy';
        trex.src = welcomeArt + 'trex-celebrate.png';
        return;
      }
      animate(brachio, [{ translate: '0 0' }, { translate: '0 -2%' }, { translate: '0 0' }],
        { duration: timing['step2 correct'], easing: 'ease-out' });
      const mouth = brachio.getBoundingClientRect();
      for (const [index, berry] of additions.entries()) {
        berry.dataset.collecting = '';
        const slot = berry.getBoundingClientRect();
        const x = mouth.left + mouth.width * .21 - (slot.left + slot.width / 2);
        const y = mouth.top + mouth.height * .14 - (slot.top + slot.height / 2);
        const move = animate(berry, [{ opacity: 1, transform: `translate(${x}px,${y}px) scale(.72)` },
          { opacity: 1, transform: 'translate(0,0) scale(1)' }],
        { duration: timing.collection, delay: timing['step2 correct'] + index * collectionStagger, easing: 'ease-in-out' });
        move?.addEventListener('finish', () => {
          berry.style.opacity = '';
          delete berry.dataset.collecting;
          collected++;
          label.textContent = `${total + collected} berries in the basket`;
          if (collected !== missing) return;
          brachio.src = groveArt + 'brachio-happy.png';
          brachio.dataset.pose = 'brachio-happy';
          trex.src = welcomeArt + 'trex-celebrate.png';
          animate(trex, [{ translate: '0 0' }, { translate: '0 -9%' }, { translate: '0 0' }],
            { duration: timing['collection complete'], easing: 'ease-out' });
        }, { signal });
      }
    });
    signal.addEventListener('abort', () => cancelAnimationFrame(frame), { once: true });
  }
}
