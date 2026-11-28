import { advanceChapter, applyChapterAnswer, chapterBerryQuestion, chapterBridgeQuestion, chapterKey, chapterQuestions, chapterTrailQuestion, emptyAttempt, finishChallenge, freshQuestion,
  readChapter, startChapter, stopNames, stops } from './chapter.js';
import { chapterModel } from './chapter-models.js';
import { progressTotals, readProgress } from './storage.js';
import { createWelcome } from './welcome.js';
import { createMissingEgg } from './missing-egg.js';
import { createAdventureMap } from './adventure-map.js';
import { advanceToMap, mapState } from './adventure-map-state.js';
import { createBerryGrove } from './berry-grove.js';
import { berryGuide } from './berry-grove-content.js';
import { berryHelp, fillBerryCopy, newBerryBeat } from './berry-grove-state.js';
import { createVelociraptorTrail } from './velociraptor-trail.js';
import { trailGuide } from './velociraptor-content.js';
import { newTrailBeat, trailHelp } from './velociraptor-state.js';
import { createTriceratopsBridge } from './triceratops-bridge.js';
import { bridgeGuide } from './triceratops-content.js';
import { bridgeHelp, newBridgeBeat } from './triceratops-state.js';

let activeScene;
let suspendedAdventure;

const root = document.getElementById('chapter');
let storage;
try { storage = window.localStorage; } catch { /* Storage may be disabled. */ }
let progress = readChapter(storage);
let questions = progress.run ? chapterQuestions(progress.run.seed) : [];
let practiceRun;
let currentUtterance;
let intro = true;
let dialogCount = 0;

const assets = './assets/';
const character = name => assets + 'characters/' + name + '.png';
const reward = name => assets + 'rewards/' + name + '.png';
const environment = name => assets + 'environments/' + name + '.webp';
const activeRun = () => practiceRun ?? progress.run;
const qIndex = () => stops.indexOf(activeRun()?.scene);
const persistWarning = document.createElement('p');
persistWarning.className = 'chapter-storage-note';
persistWarning.setAttribute('role', 'status');

function el(tag, options = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === 'className' || key === 'textContent') element[key] = value;
    else element.setAttribute(key, value);
  }
  element.append(...children);
  return element;
}

function button(label, action, className = '') {
  const control = el('button', { type: 'button', className }, label);
  control.addEventListener('click', action);
  return control;
}

function picture(source, className, alt = '') {
  return el('img', { src: source, alt, className, draggable: 'false' });
}

function write(next) {
  progress = next;
  try {
    storage.setItem(chapterKey, JSON.stringify(progress));
    persistWarning.textContent = '';
  } catch {
    persistWarning.textContent = 'Progress can only stay while this tab is open.';
  }
}

function stopSpeech() {
  if (!currentUtterance) return;
  const active = currentUtterance;
  currentUtterance = null;
  active.finish();
  window.speechSynthesis?.cancel();
}

function listen(text, { label = '◖ Listen' } = {}) {
  const notice = el('span', { className: 'chapter-speech-status', role: 'status' });
  const control = button(label, () => {
    if (currentUtterance?.control === control) {
      stopSpeech();
      return;
    }
    stopSpeech();
    const speech = window.speechSynthesis;
    if (!speech || !window.SpeechSynthesisUtterance) {
      notice.textContent = 'Read aloud is unavailable in this browser.';
      return;
    }
    const copy = (typeof text === 'function' ? text() : text)
      .replaceAll('□', 'blank').replaceAll('−', ' minus ').replaceAll('+', ' plus ').replaceAll('=', ' equals ');
    const utterance = new SpeechSynthesisUtterance(copy);
    utterance.lang = 'en-US';
    utterance.rate = .84;
    const local = speech.getVoices?.().find(voice => voice.localService && voice.lang.startsWith('en'));
    if (local) { utterance.voice = local; utterance.lang = local.lang; }
    notice.textContent = '';
    const active = { control, finish: () => {
      clearTimeout(timer);
      control.textContent = label;
    } };
    function failed() {
      if (currentUtterance !== active) return;
      stopSpeech();
      notice.textContent = 'Could not play the audio. You can read the words on screen.';
    }
    const timer = setTimeout(failed, 6000);
    currentUtterance = active;
    control.textContent = 'Stop';
    utterance.onstart = () => clearTimeout(timer);
    utterance.onend = () => {
      if (currentUtterance !== active) return;
      currentUtterance = null;
      active.finish();
    };
    utterance.onerror = failed;
    try { speech.speak(utterance); } catch { failed(); }
  }, 'chapter-secondary');
  return el('span', { className: 'chapter-listen' }, control, notice);
}

function dialog(title, content, trigger) {
  stopSpeech();
  const heading = el('h2', { id: `chapter-dialog-title-${++dialogCount}` }, title);
  const modal = el('dialog', { 'aria-labelledby': heading.id, className: 'chapter-dialog' });
  const close = button('Close', () => modal.close(), 'chapter-secondary');
  close.autofocus = true;
  modal.append(el('div', { className: 'dialog-heading' }, heading, close), content);
  modal.addEventListener('close', () => {
    modal.remove();
    if (!root.querySelector('dialog[open]')) {
      stopSpeech();
      if (document.activeElement === document.body) trigger?.focus({ preventScroll: true });
    }
  });
  root.append(modal);
  modal.showModal();
  return modal;
}

function growUps() {
  const toggle = el('input', { type: 'checkbox' });
  toggle.checked = progress.autoBreak;
  toggle.addEventListener('change', () => write({ ...progress, autoBreak: toggle.checked }));
  const totals = progressTotals(readProgress(storage));
  const body = el('div', {}, el('label', { className: 'chapter-setting' }, toggle, 'Offer a wiggle break after challenge three'),
    el('h3', {}, 'Learning progress'), el('p', {}, `Chapter completions: ${progress.runs}`),
    el('p', {}, `Stars already earned in Math Quest: ${totals.stars}`));
  if (!intro && (practiceRun || !progress.run?.mapFrom) && qIndex() >= 0) body.append(button('Teaching tips for this problem', () => {
    modal.close();
    coach();
  }));
  if (!intro && activeRun()?.scene === 'mission') body.append(button('Back to welcome', home, 'chapter-secondary'));
  const modal = dialog('Grown-ups', body, document.getElementById('chapter-grownups'));
  modal.addEventListener('close', () => {
    if (!intro && !practiceRun && !progress.autoBreak && progress.run?.scene === 'wiggle' && progress.run.mapFrom) {
      skipMapBreak();
    }
  });
}

function writeRun(run) {
  if (practiceRun) practiceRun = run;
  else write({ ...progress, run });
}

function returnToAdventure() {
  stopSpeech();
  practiceRun = undefined;
  if (suspendedAdventure) {
    const { nodes, trigger, scroll, scene } = suspendedAdventure;
    suspendedAdventure = undefined;
    activeScene?.dispose();
    activeScene = scene;
    root.replaceChildren(...nodes);
    root.querySelector('main').append(persistWarning);
    window.scrollTo(scroll.x, scroll.y);
    trigger.focus({ preventScroll: true });
  } else render();
}

function openStop(index) {
  stopSpeech();
  const attempt = emptyAttempt();
  if (index === 0) attempt.berry = newBerryBeat('combine');
  if (index === 1) attempt.trail = newTrailBeat('solve');
  if (index === 2) attempt.bridge = newBridgeBeat('construction');
  practiceRun = { seed: progress.run.seed, scene: stops[index], outcomes: Array(stops.length).fill(null), attempt,
    berryVariant: progress.run.berryVariant, trailVariant: progress.run.trailVariant, bridgeVariant: progress.run.bridgeVariant };
  render();
}

function restartStop() {
  const run = activeRun();
  if (run.attempt.solved) {
    openStop(qIndex());
    return;
  }
  stopSpeech();
  const { assisted, teach, berry, trail, bridge } = run.attempt;
  const attempt = { ...emptyAttempt(), assisted, teach };
  if (berry) attempt.berry = { ...newBerryBeat('combine'), help: berry.help };
  if (trail) attempt.trail = { ...newTrailBeat('solve'), help: trail.help };
  if (bridge) attempt.bridge = { ...newBridgeBeat('construction'), help: bridge.help };
  writeRun({ ...run, attempt });
  render();
}

function next({ leavingMission, mapFade } = {}) {
  stopSpeech();
  const finished = stops.indexOf(progress.run?.scene);
  write(advanceToMap(progress));
  render(undefined, leavingMission, finished < 0 ? undefined : String(finished + 1), { mapFade });
}

function arriveFromMap() {
  if (progress.run.scene === 'map') write(advanceChapter(progress));
  else {
    const { mapFrom, ...run } = progress.run;
    if (run.scene === 'footprints' && run.trailVariant === undefined) {
      run.trailVariant = 0;
      run.attempt = { ...emptyAttempt(), trail: newTrailBeat() };
    }
    if (run.scene === 'share' && run.bridgeVariant === undefined && !run.attempt.solved) {
      run.bridgeVariant = 0;
      run.attempt = { ...run.attempt, bridge: newBridgeBeat() };
    }
    writeRun(run);
  }
  render();
}

function skipMapBreak() {
  write(advanceToMap(progress, { skipBreak: true }));
  render();
}

function home() {
  stopSpeech();
  practiceRun = undefined;
  suspendedAdventure?.scene?.dispose();
  suspendedAdventure = undefined;
  intro = true;
  render();
}

function begin(newRun = false, leavingWelcome) {
  if (newRun || !progress.run || progress.run.scene === 'replay') {
    const candidate = crypto.getRandomValues(new Uint32Array(1))[0];
    const seed = candidate === progress.run?.seed ? (candidate + 1) >>> 0 : candidate;
    write(startChapter(progress, seed));
    questions = chapterQuestions(seed);
  }
  intro = false;
  if (!progress.autoBreak && progress.run.scene === 'wiggle' && progress.run.mapFrom) {
    write(advanceToMap(progress, { skipBreak: true }));
  }
  render(leavingWelcome);
}

const stories = {
  mosasaurus: { title: 'Meet Mosasaurus!', copy: '“I spotted your egg in a little nook inside the cave. Come look!”', background: 'lagoon', art: ['mosa-leap', 'trex-neutral'] },
  discovery: { title: 'You found the egg!', copy: 'The egg is tucked safely in the cave. T-Rex is so glad you came along.', background: 'cave', art: ['trex-celebrate'], bonus: 'egg' },
  complete: { title: 'Chapter 1 complete!', copy: 'You followed the trail and found the missing egg. You earned the Golden Egg badge!', background: 'nest', art: ['trex-celebrate'], bonus: 'reward-egg' },
  replay: { title: 'Adventure complete', copy: 'Your Golden Egg badge is saved. Play again for new math clues, or head home.', background: 'jungle', art: ['trex-neutral'], bonus: 'reward-egg' },
};
const storyButtons = { mosasaurus: 'Look in the cave', discovery: 'Celebrate!', complete: 'Finish chapter' };

function scenery(data) {
  const frame = el('div', { className: 'chapter-scene-art' });
  frame.append(picture(environment(data.background), 'chapter-scenery'));
  for (const pose of data.art) frame.append(picture(character(pose), 'chapter-character ' + pose, pose.startsWith('mosa') ? 'Mosasaurus' : 'T-Rex'));
  if (data.bonus) frame.append(picture(reward(data.bonus), 'chapter-prize', data.bonus === 'egg' ? 'The dinosaur egg' : 'Golden Egg badge'));
  return frame;
}

function storyScene(scene) {
  const data = stories[scene];
  const heading = el('div', { className: 'chapter-scene-copy' });
  heading.append(el('h1', { tabindex: '-1' }, data.title), el('p', { className: 'chapter-intro-line' }, data.copy));
  if (scene === 'complete') heading.append(picture(reward('star'), 'chapter-star', ''));
  if (scene === 'replay') {
    heading.append(el('div', { className: 'chapter-actions' }, button('Replay adventure', () => begin()), button('Return home', home, 'chapter-secondary')));
  } else {
    heading.append(el('div', { className: 'chapter-actions' }, button(storyButtons[scene], next), listen(data.copy)));
  }
  return el('section', { className: 'chapter-hero chapter-' + scene }, heading, scenery(data));
}

function adventureMap(options) {
  return createAdventureMap({ ...options, state: mapState(progress.run, options.revisit),
    grownUps: growUps, home, listen, stopSpeech, el, button, picture });
}

function revisitMap(trigger) {
  stopSpeech();
  const modal = el('dialog', { className: 'adventure-map-dialog', 'aria-labelledby': 'adventure-map-title' });
  const { stage, dispose } = adventureMap({
    revisit: true,
    onAdvance: () => modal.close(),
    onReview: index => {
      suspendedAdventure = { nodes: [...root.children].filter(child => child !== modal), trigger, scene: activeScene,
        scroll: { x: window.scrollX, y: window.scrollY } };
      dispose();
      modal.close();
      activeScene = undefined;
      openStop(index);
    },
  });
  modal.addEventListener('cancel', dispose);
  modal.addEventListener('close', () => {
    dispose();
    modal.remove();
    if (trigger.isConnected) trigger.focus({ preventScroll: true });
  });
  modal.append(stage);
  root.append(modal);
  modal.showModal();
  stage.querySelector('h1').focus({ preventScroll: true });
}

const moves = [
  ['march', 'Take five T-Rex steps in place.', 'Or tap your feet while seated.'],
  ['shake', 'Gently shake your little T-Rex arms.', 'Keep your movements small and easy.'],
  ['ready', 'Relax your shoulders and take three slow breaths.', 'Sit or stand where you are comfortable.'],
];

function movementBody(done) {
  const body = el('div', { className: 'chapter-movement' });
  let index = 0;
  function step() {
    const [pose, instruction, alternative] = moves[index];
    const controls = el('div', { className: 'chapter-actions' });
    if (index < moves.length - 1) controls.append(button('Next move', () => { stopSpeech(); index++; step(); }, 'chapter-secondary'));
    controls.append(button('I’m ready!', done), button('Skip for now', done, 'chapter-secondary'), listen(instruction + ' ' + alternative));
    body.replaceChildren(picture(assets + 'movement/' + pose + '.png', 'chapter-movement-dino'),
      el('div', {}, el('p', { className: 'chapter-kicker' }, `Optional movement · ${index + 1} of ${moves.length}`),
        el('h3', { tabindex: '-1' }, instruction), el('p', {}, alternative), controls));
    if (index > 0) body.querySelector('h3').focus({ preventScroll: true });
  }
  step();
  return body;
}

function movementBreak(trigger) {
  const panel = movementBody(() => modal.close());
  const modal = dialog('Dino Wiggle Break', panel, trigger);
}

const contexts = [
  ({ a, b, need }) => `You have ${a} pencils and ${b} pens. You need ${need} writing tools. How many more tools do you need?`,
  ({ large, small }) => `One shelf has ${large} books. Another has ${small}. How many more books are on the first shelf?`,
  ({ large, small }) => `One tower has ${large} blocks. Another has ${small}. How many blocks make the shorter tower just as tall?`,
  ({ large, small }) => `Mia has ${large} stickers. Lee has ${small}. What is the smallest number Lee needs to add to have more than Mia?`,
  ({ left, rightParts }) => `One plate has ${left} blocks. The other has groups of ${rightParts[0]} and ${rightParts[1]}. How many must you take from the first plate to make them match?`,
];

function answerField(label) {
  const id = label === 'Your answer' ? 'chapter-answer' : 'chapter-transfer-answer';
  const field = el('input', { id, type: 'text', inputmode: 'numeric', maxlength: '2', autocomplete: 'off' });
  return { field, label: el('label', { for: id }, label, field) };
}

function coach() {
  const index = qIndex();
  if (index < 0) return;
  const isGrove = index === 0;
  const isTrail = index === 1;
  const isBridge = index === 2;
  const question = isGrove ? chapterBerryQuestion(activeRun()) : isTrail ? chapterTrailQuestion(activeRun())
    : isBridge ? chapterBridgeQuestion(activeRun()) : questions[index];
  const guide = isGrove ? berryGuide : isTrail ? trailGuide : isBridge ? bridgeGuide : undefined;
  const copy = text => fillBerryCopy(text, question.values);
  const questionsToAsk = guide?.questions ? el('ul', { className: 'chapter-coach-tip' },
    ...guide.questions.map(line => el('li', {}, line))) : el('p', { className: 'chapter-coach-tip' }, guide?.comprehension ?? question.ask);
  const body = el('div', {}, questionsToAsk,
    el('h3', {}, 'What this teaches'), el('p', {}, guide?.objective ?? question.objective),
    el('h3', {}, 'Try it with objects'), isGrove
      ? el('ol', {}, ...guide.physicalDemo.map(step => el('li', {}, copy(step))))
      : el('p', {}, guide ? copy(guide.physicalDemo) : question.activity),
    el('h3', {}, 'Hints to try'), el('ul', {}, ...question.hints.flat().map(hint => el('li', {}, hint))),
    el('h3', {}, 'If they get stuck'), isGrove
      ? el('ul', {}, ...Object.values(guide.misunderstandings).map(note => el('li', {}, note)))
      : isBridge ? el('ul', {}, ...guide.misconceptions.map(note => el('li', {}, note)))
        : el('p', {}, isTrail ? guide.misconceptions : Object.values(question.mistakes[activeRun().attempt.step]).join(' ')));
  if (isGrove) body.append(el('p', {}, copy(guide.alternative)), el('p', {}, guide.note));
  if (isBridge) body.append(el('p', {}, guide.boundary));
  function markParent(changes) {
    const { berry, trail, bridge } = activeRun().attempt;
    if (isGrove && berry) updateAttempt({ ...changes, berry: { ...berry, help: berryHelp([...berry.help, 'parent']) } });
    else if (isTrail && trail) updateAttempt({ ...changes, trail: { ...trail, help: trailHelp([...trail.help, 'parent']) } });
    else if (isBridge && bridge) updateAttempt({ ...changes, bridge: { ...bridge, help: bridgeHelp([...bridge.help, 'parent']) } });
    else updateAttempt(changes);
  }
  if (!activeRun().attempt.solved) {
    const helped = button('I helped with this problem', () => {
      markParent({ assisted: true, teach: true });
      helped.setAttribute('aria-pressed', 'true');
    }, 'chapter-secondary');
    helped.setAttribute('aria-pressed', String(activeRun().attempt.teach));
    body.append(helped);
  }
  const solution = el('div', { role: 'status' });
  body.append(button('Reveal worked solution', () => {
    if (!activeRun().attempt.solved) markParent({ assisted: true });
    const equations = guide ? guide.equations.map(copy) : question.equations;
    solution.replaceChildren(...equations.map(equation => el('p', {}, equation)));
    if (isTrail) solution.append(el('p', {}, copy(guide.reverse)));
  }, 'chapter-secondary'), solution);
  const transfer = guide?.transfer ?? freshQuestion(activeRun().seed, index);
  if (transfer) {
    const transferDetails = el('details', {}, el('summary', {}, 'Try an independent transfer problem'));
    const { field, label } = answerField('Transfer answer');
    const result = el('p', { role: 'status' });
    const form = el('form', { className: 'chapter-answer-form' }, label,
      el('button', { type: 'submit' }, 'Check'));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const answer = guide ? transfer.answer : transfer.answers.at(-1);
      const explanation = isTrail ? `The answer is ${answer}.` : guide ? transfer.explanation : transfer.equations.at(-1);
      result.textContent = /^\d{1,2}$/.test(field.value.trim()) && Number(field.value) === answer
        ? 'That works! ' + explanation : 'Try again. Use the same idea with these new numbers.';
    });
    transferDetails.append(el('p', {}, guide ? transfer.question : contexts[index](transfer.params)), form, result);
    if (isTrail || isBridge) transferDetails.append(button('Reveal transfer answer', () => {
      result.textContent = `The answer is ${transfer.answer}.`;
    }, 'chapter-secondary'));
    body.append(transferDetails);
  }
  dialog('Teaching tips', body, document.getElementById('chapter-grownups'));
}

function updateAttempt(changes) {
  const run = activeRun();
  writeRun({ ...run, attempt: { ...run.attempt, ...changes } });
}

function drawing() {
  const canvas = el('canvas', { width: '800', height: '350', 'aria-label': 'Scratch drawing' });
  const ink = canvas.getContext('2d');
  const sketch = el('div', { className: 'chapter-sketch' }, canvas, button('Clear drawing', () => ink.clearRect(0, 0, 800, 350), 'chapter-secondary'));
  ink.strokeStyle = '#17483c';
  ink.lineWidth = 5;
  ink.lineCap = 'round';
  let pointer;
  const point = event => {
    const bounds = canvas.getBoundingClientRect();
    return [(event.clientX - bounds.left) * 800 / bounds.width, (event.clientY - bounds.top) * 350 / bounds.height];
  };
  canvas.addEventListener('pointerdown', event => {
    if (pointer !== undefined || event.button !== 0) return;
    pointer = event.pointerId;
    canvas.setPointerCapture(pointer);
    ink.beginPath();
    ink.moveTo(...point(event));
    const [x,y] = point(event);
    ink.lineTo(x + .2, y);
    ink.stroke();
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    ink.lineTo(...point(event));
    ink.stroke();
  });
  canvas.addEventListener('lostpointercapture', () => { pointer = undefined; });
  return sketch;
}

function exampleDialog(index, trigger, onWorked) {
  const alternate = freshQuestion(activeRun().seed, index);
  if (!alternate) return;
  updateAttempt({ assisted: true });
  const section = el('div', {});
  let part = 0;
  function show(demonstrated = false) {
    const final = part === alternate.prompts.length - 1;
    section.replaceChildren(el('p', {}, alternate.story), el('h3', {}, alternate.prompts[part]),
      chapterModel(alternate, part, demonstrated));
    if (demonstrated) {
      section.append(el('p', { className: 'chapter-worked-equation', role: 'status' }, alternate.equations[part]),
        final ? button('Back to my problem', () => modal.close())
          : button('See the next step', () => { part++; show(); focusNext(); }));
    } else {
      section.append(button('Show how', () => { show(true); focusNext(); }));
    }
    if (final && demonstrated) section.append(el('details', {}, el('summary', {}, 'I need the answer to my problem'),
      el('p', {}, 'See it worked out with your numbers, then continue along the trail.'),
      button('Show my answer', () => { modal.close(); onWorked(); }, 'chapter-secondary')));
  }
  function focusNext() {
    section.querySelector(':scope > button').focus({ preventScroll: true });
  }
  show();
  const modal = dialog('See a different example', section, trigger);
}

function mathScene(index) {
  const question = questions[index];
  const attempt = activeRun().attempt;
  const currentPanel = el('div', { className: 'chapter-work-panel' });
  const sketch = drawing();
  const work = chapterModel(question, attempt.step);
  const result = el('p', { id: 'chapter-feedback', role: 'status' }, attempt.error);
  const hint = el('p', { className: 'chapter-hint', role: 'status', id: 'chapter-hint' });
  const { field, label } = answerField('Your answer');
  field.value = attempt.draft;
  field.addEventListener('input', () => {
    field.value = field.value.replace(/\D/g, '').slice(0, 2);
    updateAttempt({ draft: field.value });
  });
  const actions = el('div', { className: 'chapter-answer-actions' });
  const artwork = ['jungle', 'jungle', 'jungle', 'lagoon', 'cave'][index];
  const backdrop = picture(environment(artwork), 'chapter-question-art');
  const heading = el('h1', { tabindex: '-1' }, stopNames[index]);
  const current = el('h2', { id: 'chapter-question', tabindex: '-1' }, question.prompts[attempt.step]);
  const context = el('div', {}, el('p', { className: 'chapter-story-text' }, question.story), current);
  if (attempt.step) {
    const label = question.id === 'supplies' ? `In your basket: ${question.answers[0]} berries.` :
      `Right-side total: ${question.answers[0]} stones.`;
    current.before(el('p', { className: 'chapter-known' }, label));
  }
  const showWork = button('Math tools', () => select('math'), 'chapter-secondary');
  const showDraw = button('Draw', () => select('draw'), 'chapter-secondary');
  function select(view) {
    work.hidden = view !== 'math';
    sketch.hidden = view !== 'draw';
    showWork.setAttribute('aria-pressed', String(view === 'math'));
    showDraw.setAttribute('aria-pressed', String(view === 'draw'));
  }
  function presentHints() {
    const current = activeRun().attempt;
    hint.hidden = current.hints === 0 || current.solved;
    if (!hint.hidden) hint.textContent = question.hints[current.step][current.hints - 1];
    coachHint.textContent = current.hints === 0 ? 'Hint' : current.hints === question.hints[current.step].length ? 'See an example' : 'Another hint';
  }
  const coachHint = button('Hint', () => {
    const active = activeRun().attempt;
    if (active.hints < question.hints[active.step].length) {
      updateAttempt({ hints: active.hints + 1, assisted: true });
      presentHints();
      select('math');
    } else exampleDialog(index, coachHint, worked);
  }, 'chapter-secondary');
  const breakButton = button('Take a break', () => movementBreak(breakButton), 'chapter-secondary');
  const audio = listen(() => [question.story, attempt.step ? context.querySelector('.chapter-known').textContent : '', question.prompts[attempt.step]].join(' '));
  const tools = el('div', { className: 'chapter-actions chapter-math-tools' }, audio, coachHint, breakButton);
  currentPanel.append(el('div', { className: 'chapter-actions chapter-work-toggle' }, showWork, showDraw,
    button('Restart stop', restartStop, 'chapter-secondary')), work, sketch);
  const form = el('form', { className: 'chapter-answer-form' }, label, el('button', { type: 'submit' }, 'Check answer'));
  function completed(outcome) {
    form.hidden = true;
    hint.hidden = true;
    coachHint.disabled = true;
    result.textContent = outcome === 'worked-example' ? 'You followed the worked example.' : question.success;
    result.classList.add('chapter-success');
    const equations = outcome === 'worked-example' ? question.equations : question.equations.slice(-1);
    result.after(...equations.map(equation => el('p', { className: 'chapter-worked-equation' }, equation)));
    const continueButton = practiceRun ? button('Back to adventure', returnToAdventure) :
      button(index === 4 ? 'Follow the clue' : 'Continue the search', next);
    actions.replaceChildren(continueButton);
    actions.querySelector('button').focus({ preventScroll: true });
  }
  function worked() {
    writeRun(finishChallenge(activeRun(), 'worked-example'));
    completed('worked-example');
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const value = field.value.trim();
    if (!/^\d{1,2}$/.test(value) || Number(value) > 20) {
      result.textContent = 'Enter a number from zero to twenty.';
      return;
    }
    const before = activeRun();
    const after = applyChapterAnswer(before, question, value);
    writeRun(after);
    if (after.attempt.solved) completed(after.outcomes[index]);
    else if (before.attempt.step !== after.attempt.step) {
      stopSpeech();
      render();
      root.querySelector('#chapter-question').focus?.({ preventScroll: true });
    } else result.textContent = after.attempt.error;
  });

  const left = el('section', { className: 'chapter-story-panel' }, backdrop,
    el('p', { className: 'chapter-kicker' }, `${practiceRun ? 'Practice · ' : ''}Stop ${index + 1} of 5${question.prompts.length > 1 ? ` · Step ${attempt.step + 1} of 2` : ''}`),
    heading, context, tools, hint);
  const answer = el('section', { className: 'chapter-response-panel', 'aria-label': 'Answer and continue' }, form, result, actions);
  const layout = el('div', { className: 'chapter-learning' }, left, currentPanel, answer);
  select('math');
  presentHints();
  if (attempt.solved) queueMicrotask(() => completed(activeRun().outcomes[index]));
  return layout;
}

function confirmWelcomeRestart(start, trigger) {
  const restart = button('Start over', () => {
    modal.close();
    start();
  });
  const modal = dialog('Start a new adventure?', el('div', {},
    el('p', {}, 'Starting over replaces this adventure’s checkpoint. Your earned rewards are saved.'), restart), trigger);
}

function sceneCrossfade(outgoing, incoming, outClass, inClass, duration) {
  if (!outgoing) return;
  outgoing.inert = true;
  outgoing.setAttribute('aria-hidden', 'true');
  outgoing.querySelector('#chapter-grownups').removeAttribute('id');
  outgoing.classList.add(outClass);
  root.append(outgoing);
  incoming.classList.add(inClass);
  setTimeout(() => outgoing.remove(), duration);
}

function mountScene(stage, className, outgoing, outClass, inClass, duration) {
  const main = el('main', { className }, stage, persistWarning);
  root.replaceChildren(main);
  sceneCrossfade(outgoing, main, outClass, inClass, duration);
  window.scrollTo(0, 0);
  stage.querySelector('h1').focus({ preventScroll: true });
}

function render(leavingWelcome, leavingMission, freshCompletion, { collect, mapFade, focusBerry, focusTrail, animateTrail, focusBridge, animateBridge, repairFrom } = {}) {
  activeScene?.dispose();
  activeScene = undefined;
  const scene = intro ? 'welcome' : activeRun()?.scene ?? 'welcome';
  if (scene === 'welcome') {
    activeScene = createWelcome({
      resumable: Boolean(progress.run && progress.run.scene !== 'replay'),
      start: previous => begin(true, previous),
      resume: () => begin(),
      grownUps: growUps,
      confirmStart: confirmWelcomeRestart,
      listen,
      stopSpeech,
    });
    mountScene(activeScene.stage, 'welcome-main');
    return;
  }
  if (scene === 'mission') {
    activeScene = createMissingEgg({
      listen, stopSpeech, grownUps: growUps,
      openMap: stage => next({ leavingMission: stage }),
    });
    mountScene(activeScene.stage, 'mission-main', leavingWelcome, 'welcome-leaving', 'welcome-mission-in', 200);
    return;
  }
  if (!practiceRun && (scene === 'map' || progress.run?.mapFrom)) {
    activeScene = adventureMap({
      freshCompletion, onAdvance: arriveFromMap, onSkipBreak: skipMapBreak, onReview: openStop,
    });
    mountScene(activeScene.stage, 'map-main', leavingMission, 'mission-leaving', 'mission-map-in', 300);
    if (mapFade) {
      const animation = activeScene.stage.animate([{ opacity: .5 }, { opacity: 1 }], { duration: mapFade });
      activeScene.signal.addEventListener('abort', () => animation.cancel(), { once: true });
    }
    return;
  }
  if (scene === 'supplies') {
    const readAttempt = () => activeRun().attempt;
    if (!readAttempt().berry) updateAttempt({ berry: newBerryBeat(
      readAttempt().solved ? 'success' : readAttempt().step ? 'missing' : 'combine') });
    activeScene = createBerryGrove({
      question: chapterBerryQuestion(activeRun()), attempt: readAttempt(), readAttempt,
      update: updateAttempt,
      onChangeBeat(berry, playCollection) {
        updateAttempt({ berry });
        render(undefined, undefined, undefined, { collect: playCollection, focusBerry: true });
      },
      onAnswer(question, value) {
        const before = activeRun();
        const after = applyChapterAnswer(before, question, value);
        const berry = before.attempt.berry;
        const correct = after.attempt.solved || after.attempt.step !== before.attempt.step;
        after.attempt.berry = { ...berry, line: Number(correct), mistakes: correct ? 0 : berry.mistakes + 1 };
        if (after.attempt.solved) after.berryHelp = berry.help.slice();
        writeRun(after);
        if (correct) render(undefined, undefined, undefined, { focusBerry: true });
        return correct;
      },
      onExit: mapFade => practiceRun ? returnToAdventure() : next({ mapFade }),
      onRestart: restartStop,
      playCollection: collect, practice: Boolean(practiceRun), stopCount: stops.length,
      home, grownUps: growUps, openMap: revisitMap, leavePractice: returnToAdventure, movementBreak,
      drawing, answerField, dialog, listen, stopSpeech, el, button, picture,
    });
    mountScene(activeScene.stage, 'grove-main');
    if (focusBerry) activeScene.stage.querySelector('[data-focus-beat]')?.focus({ preventScroll: true });
    return;
  }
  if (scene === 'footprints') {
    const readAttempt = () => activeRun().attempt;
    if (!readAttempt().trail) updateAttempt({ trail: newTrailBeat(readAttempt().solved ? 'success' : 'solve') });
    activeScene = createVelociraptorTrail({
      question: chapterTrailQuestion(activeRun()), readAttempt, update: updateAttempt,
      changeBeat(phase, line) {
        const trail = readAttempt().trail;
        updateAttempt({ trail: { ...trail, phase, line } });
        render(undefined, undefined, undefined, { focusTrail: true, animateTrail: trail.phase !== phase });
      },
      checkAnswer(question, value) {
        const before = activeRun();
        const after = applyChapterAnswer(before, question, value);
        const trail = before.attempt.trail;
        after.attempt.trail = after.attempt.solved ? { ...trail, phase: 'success', line: 0 } :
          { ...trail, mistakes: trail.mistakes + 1 };
        if (after.attempt.solved) after.trailHelp = trail.help.slice();
        writeRun(after);
        if (after.attempt.solved) render(undefined, undefined, undefined, { focusTrail: true, animateTrail: true });
        return after.attempt.solved;
      },
      exit: mapFade => practiceRun ? returnToAdventure() : next({ mapFade }),
      restart: restartStop, practice: Boolean(practiceRun), stopCount: stops.length, animateEntry: animateTrail,
      home, grownUps: growUps, openMap: revisitMap, leavePractice: returnToAdventure, movementBreak,
      drawing, answerField, dialog, listen, stopSpeech, el, picture,
    });
    mountScene(activeScene.stage, 'grove-main');
    if (focusTrail) activeScene.stage.querySelector('[data-focus-beat]')?.focus({ preventScroll: true });
    return;
  }
  if (scene === 'share') {
    const readAttempt = () => activeRun().attempt;
    activeScene = createTriceratopsBridge({
      question: chapterBridgeQuestion(activeRun()), readAttempt, update: updateAttempt,
      changeBeat(phase, line) {
        const bridge = readAttempt().bridge;
        updateAttempt({ bridge: { ...bridge, phase, line } });
        render(undefined, undefined, undefined, { focusBridge: true, animateBridge: bridge.phase !== phase });
      },
      checkAnswer(question, value) {
        const before = activeRun();
        const after = applyChapterAnswer(before, question, value);
        if (after === before) return before.attempt.solved;
        if (!after.attempt.solved) after.attempt.bridge = { ...before.attempt.bridge, mistakes: before.attempt.bridge.mistakes + 1 };
        writeRun(after);
        if (after.attempt.solved) render(undefined, undefined, undefined, { focusBridge: true, repairFrom: before.attempt.bridge.shared });
        return after.attempt.solved;
      },
      exit: mapFade => practiceRun ? returnToAdventure() : next({ mapFade }),
      restart: restartStop, practice: Boolean(practiceRun), stopCount: stops.length, animateEntry: animateBridge, repairFrom,
      home, grownUps: growUps, openMap: revisitMap, leavePractice: returnToAdventure, movementBreak,
      drawing, answerField, dialog, listen, stopSpeech, el, picture,
    });
    mountScene(activeScene.stage, 'grove-main');
    if (focusBridge) activeScene.stage.querySelector('[data-focus-beat]')?.focus({ preventScroll: true });
    return;
  }
  const header = el('header', { className: 'chapter-header' },
    button('Math Quest', home, 'chapter-brand'), el('div', { className: 'chapter-actions' },
      ...(progress.badge ? [picture(reward('reward-egg'), 'chapter-header-badge', 'Golden Egg badge')] : []),
      el('button', { id: 'chapter-grownups', type: 'button', className: 'chapter-secondary' }, 'Grown-ups')));
  header.querySelector('#chapter-grownups').addEventListener('click', growUps);
  const headerActions = header.querySelector('.chapter-actions');
  if (practiceRun) {
    headerActions.prepend(button('Leave practice', returnToAdventure, 'chapter-secondary'));
  } else if (progress.run) {
    const map = button('Trail map', () => revisitMap(map), 'chapter-secondary');
    headerActions.prepend(map);
  }
  const index = qIndex();
  let content;
  if (scene === 'wiggle') content = el('section', { className: 'chapter-break' }, el('h1', { tabindex: '-1' }, 'Dino Wiggle Break'),
    el('p', {}, 'Take a little movement break if you want.'), movementBody(next));
  else content = stories[scene] ? storyScene(scene) : mathScene(index);
  const main = el('main', { className: 'chapter-main' }, content, persistWarning);
  root.replaceChildren(header, main);
  window.scrollTo(0, 0);
  root.querySelector('h1')?.focus({ preventScroll: true });
}

render();
