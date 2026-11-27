import { advanceChapter, applyChapterAnswer, chapterKey, chapterQuestions, emptyAttempt, finishChallenge, freshQuestion,
  readChapter, startChapter, stopNames, stops } from './chapter.js';
import { chapterModel, packedSupplies, suppliesNumberLine } from './chapter-models.js';
import { progressTotals, readProgress } from './storage.js';
import { release } from './release.js';

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

function listen(text) {
  const notice = el('span', { className: 'chapter-speech-status', role: 'status' });
  const control = button('◖ Listen', () => {
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
      control.textContent = '◖ Listen';
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
  if (!intro && qIndex() >= 0) body.append(button('Teaching tips for this problem', () => {
    modal.close();
    coach();
  }));
  const modal = dialog('Grown-ups', body, document.getElementById('chapter-grownups'));
}

function writeRun(run) {
  if (practiceRun) practiceRun = run;
  else write({ ...progress, run });
}

function returnToAdventure() {
  stopSpeech();
  practiceRun = undefined;
  render();
}

function openStop(index) {
  stopSpeech();
  practiceRun = { seed: progress.run.seed, scene: stops[index], outcomes: Array(stops.length).fill(null), attempt: emptyAttempt() };
  render();
}

function restartStop() {
  const run = activeRun();
  if (run.attempt.solved) {
    openStop(qIndex());
    return;
  }
  stopSpeech();
  const { assisted, teach } = run.attempt;
  writeRun({ ...run, attempt: { ...emptyAttempt(), assisted, teach } });
  render();
}

function next() {
  stopSpeech();
  write(advanceChapter(progress));
  render();
}

function home() {
  stopSpeech();
  practiceRun = undefined;
  intro = true;
  render();
}

function begin() {
  if (!progress.run || progress.run.scene === 'replay') {
    const candidate = crypto.getRandomValues(new Uint32Array(1))[0];
    const seed = candidate === progress.run?.seed ? (candidate + 1) >>> 0 : candidate;
    write(startChapter(progress, seed));
    questions = chapterQuestions(seed);
  }
  intro = false;
  render();
}

const stories = {
  welcome: { title: 'The Lost Egg', subtitle: 'Dinosaur Island · Chapter 1', copy: 'Help T-Rex follow clues and find the missing egg.', background: 'jungle', art: ['trex-neutral'], bonus: 'egg' },
  mission: { title: 'An egg is missing!', copy: 'T-Rex needs your help. Follow the island trail and look for clues.', background: 'jungle', art: ['trex-front'] },
  mosasaurus: { title: 'Meet Mosasaurus!', copy: '“I spotted your egg in a little nook inside the cave. Come look!”', background: 'lagoon', art: ['mosa-leap', 'trex-neutral'] },
  discovery: { title: 'You found the egg!', copy: 'The egg is tucked safely in the cave. T-Rex is so glad you came along.', background: 'cave', art: ['trex-celebrate'], bonus: 'egg' },
  complete: { title: 'Chapter 1 complete!', copy: 'You followed the trail and found the missing egg. You earned the Golden Egg badge!', background: 'nest', art: ['trex-celebrate'], bonus: 'reward-egg' },
  replay: { title: 'Adventure complete', copy: 'Your Golden Egg badge is saved. Play again for new math clues, or head home.', background: 'jungle', art: ['trex-neutral'], bonus: 'reward-egg' },
};
const storyButtons = { mission: 'See the trail', mosasaurus: 'Look in the cave', discovery: 'Celebrate!', complete: 'Finish chapter' };

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
  if (scene === 'welcome') heading.append(picture(assets + 'ui/logo.png', 'chapter-logo'));
  if (data.subtitle) heading.append(el('p', { className: 'chapter-kicker' }, data.subtitle));
  heading.append(el('h1', { tabindex: '-1' }, data.title), el('p', { className: 'chapter-intro-line' }, data.copy));
  if (scene === 'complete') heading.append(picture(reward('star'), 'chapter-star', ''));
  if (scene === 'welcome') {
    heading.append(button(progress.run && progress.run.scene !== 'replay' ? 'Continue adventure' : progress.badge ? 'Replay adventure' : 'Start adventure', begin));
  } else if (scene === 'replay') {
    heading.append(el('div', { className: 'chapter-actions' }, button('Replay adventure', begin), button('Return home', home, 'chapter-secondary')));
  } else {
    heading.append(el('div', { className: 'chapter-actions' }, button(storyButtons[scene], next), listen(data.copy)));
  }
  return el('section', { className: 'chapter-hero chapter-' + scene }, heading, scenery(data));
}

function trailMap(close) {
  const trail = el('div', { className: 'chapter-trail' });
  trail.append(picture(assets + 'maps/trail-background.webp', 'chapter-map-background'));
  const positions = [[11, 69], [28, 51], [47, 65], [66, 42], [85, 33]];
  const points = positions.map(([x,y]) => `${x},${y}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS(svg.namespaceURI, 'polyline');
  line.setAttribute('points', points);
  svg.append(line);
  trail.append(svg);
  const current = progress.run.scene === 'map' ? 0 : stops.indexOf(progress.run.scene);
  for (const [i, [x,y]] of positions.entries()) {
    const complete = Boolean(progress.run.outcomes[i]);
    const mark = button(String(i + 1), () => {
      if (i === current && !complete) {
        if (close) close();
        else next();
      } else {
        close?.();
        openStop(i);
      }
    }, 'chapter-map-node');
    mark.style.left = `${x}%`;
    mark.style.top = `${y}%`;
    mark.setAttribute('aria-label', `${i + 1}. ${stopNames[i]}${complete ? ', done' : ''}`);
    if (complete) mark.dataset.complete = '';
    if (i === current) mark.setAttribute('aria-current', 'step');
    trail.append(mark);
  }
  if (close) return el('div', {}, trail, el('p', {}, 'Tap a number to open that stop.'));
  return el('section', { className: 'chapter-map-card' }, el('h1', { tabindex: '-1' }, 'Follow the island trail'),
    trail, el('p', {}, 'Tap a number to visit a stop.'), button('Go to the first stop', next));
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
  const question = questions[index];
  const body = el('div', {}, el('p', { className: 'chapter-coach-tip' }, question.ask),
    el('h3', {}, 'What this teaches'), el('p', {}, question.objective),
    el('h3', {}, 'Try it with objects'), el('p', {}, question.activity),
    el('h3', {}, 'Hints to try'), el('ul', {}, ...question.hints.flat().map(hint => el('li', {}, hint))),
    el('h3', {}, 'If they get stuck'), el('p', {}, Object.values(question.mistakes[activeRun().attempt.step]).join(' ')));
  if (!activeRun().attempt.solved) {
    const helped = button('I helped with this problem', () => {
      updateAttempt({ assisted: true, teach: true });
      helped.setAttribute('aria-pressed', 'true');
    }, 'chapter-secondary');
    helped.setAttribute('aria-pressed', String(activeRun().attempt.teach));
    body.append(helped);
  }
  const solution = el('div', { role: 'status' });
  body.append(button('Reveal worked solution', () => {
    if (!activeRun().attempt.solved) updateAttempt({ assisted: true });
    solution.replaceChildren(...question.equations.map(equation => el('p', {}, equation)));
  }, 'chapter-secondary'), solution);
  const transfer = freshQuestion(activeRun().seed, index);
  if (transfer) {
    const transferDetails = el('details', {}, el('summary', {}, 'Try an independent transfer problem'));
    const { field, label } = answerField('Transfer answer');
    const result = el('p', { role: 'status' });
    const form = el('form', { className: 'chapter-answer-form' }, label,
      el('button', { type: 'submit' }, 'Check'));
    form.addEventListener('submit', event => {
      event.preventDefault();
      result.textContent = /^\d{1,2}$/.test(field.value.trim()) && Number(field.value) === transfer.answers.at(-1)
        ? 'That works! ' + transfer.equations.at(-1) : 'Try again. Use the same idea with these new numbers.';
    });
    transferDetails.append(el('p', {}, contexts[index](transfer.params)), form, result);
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

function packedSuppliesView(question, outcome) {
  const { have, need } = question.params;
  const added = need - have;
  const summary = outcome === 'worked-example' ? `Adding ${added} berries makes ${need} for the trip.` :
    `You added ${added} berries. Now we have ${need} for the trip!`;
  const equations = outcome === 'worked-example' ? question.equations : question.equations.slice(-1);
  return el('section', { className: 'chapter-packed-supplies', 'aria-labelledby': 'chapter-packed-title' },
    el('div', { className: 'chapter-packed-art' }, picture(character('trex-celebrate'), 'chapter-packed-trex', 'T-Rex celebrates')),
    el('div', { className: 'chapter-packed-content' },
      el('h2', { id: 'chapter-packed-title', tabindex: '-1' }, 'Supplies packed!'),
      el('p', {}, summary),
      packedSupplies(question.params),
      ...equations.map(equation => el('p', { className: 'chapter-worked-equation' }, equation))));
}

function mathScene(index) {
  const question = questions[index];
  const attempt = activeRun().attempt;
  const currentPanel = el('div', { className: 'chapter-work-panel' });
  const sketch = release.chapterDrawing ? drawing() : null;
  const work = chapterModel(question, attempt.step);
  const line = question.id === 'supplies' && attempt.step === 1 ? suppliesNumberLine(question.params) : null;
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
    const label = question.id === 'supplies' ? `You started with ${question.answers[0]} berries.` :
      `Right-side total: ${question.answers[0]} stones.`;
    current.before(el('p', { className: 'chapter-known' }, label));
  }
  const showWork = button(line ? 'Basket' : 'Math tools', () => select('math'), 'chapter-secondary');
  const showLine = line ? button('Number line', () => select('line'), 'chapter-secondary') : null;
  const showDraw = sketch ? button('Draw', () => select('draw'), 'chapter-secondary') : null;
  function select(view) {
    work.hidden = view !== 'math';
    showWork.setAttribute('aria-pressed', String(view === 'math'));
    if (sketch) {
      sketch.hidden = view !== 'draw';
      showDraw.setAttribute('aria-pressed', String(view === 'draw'));
    }
    if (line) {
      line.hidden = view !== 'line';
      showLine.setAttribute('aria-pressed', String(view === 'line'));
    }
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
  const restart = button('Restart stop', restartStop, 'chapter-secondary');
  const workTools = el('div', { className: 'chapter-actions chapter-work-toggle' },
    ...[showWork, showLine, showDraw, restart].filter(Boolean));
  currentPanel.append(workTools, ...[work, line, sketch].filter(Boolean));
  const form = el('form', { className: 'chapter-answer-form' }, label, el('button', { type: 'submit' }, 'Check answer'));
  function completed(outcome) {
    form.hidden = true;
    hint.hidden = true;
    coachHint.disabled = true;
    result.textContent = outcome === 'worked-example' ? 'You followed the worked example.' : question.success;
    result.classList.add('chapter-success');
    if (question.id === 'supplies') {
      context.hidden = true;
      tools.hidden = true;
      workTools.replaceChildren(restart);
      currentPanel.replaceChildren(workTools, packedSuppliesView(question, outcome));
    } else {
      const equations = outcome === 'worked-example' ? question.equations : question.equations.slice(-1);
      result.after(...equations.map(equation => el('p', { className: 'chapter-worked-equation' }, equation)));
    }
    const continueButton = practiceRun ? button('Back to adventure', returnToAdventure) :
      button(index === 4 ? 'Follow the clue' : 'Continue the search', next);
    actions.replaceChildren(continueButton);
    const packedTitle = currentPanel.querySelector('#chapter-packed-title');
    if (packedTitle) {
      packedTitle.focus({ preventScroll: true });
      packedTitle.scrollIntoView({ block: 'nearest' });
    } else continueButton.focus({ preventScroll: true });
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

function render() {
  const scene = intro ? 'welcome' : activeRun()?.scene ?? 'welcome';
  const header = el('header', { className: 'chapter-header' },
    button('Math Quest', home, 'chapter-brand'), el('div', { className: 'chapter-actions' },
      ...(progress.badge ? [picture(reward('reward-egg'), 'chapter-header-badge', 'Golden Egg badge')] : []),
      el('button', { id: 'chapter-grownups', type: 'button', className: 'chapter-secondary' }, 'Grown-ups')));
  header.querySelector('#chapter-grownups').addEventListener('click', growUps);
  const headerActions = header.querySelector('.chapter-actions');
  if (practiceRun) {
    headerActions.prepend(button('Leave practice', returnToAdventure, 'chapter-secondary'));
  } else if (progress.run && !intro && !['mission', 'map'].includes(scene)) {
    const map = button('Trail map', () => {
      const modal = dialog('Island trail', trailMap(() => modal.close()), map);
    }, 'chapter-secondary');
    headerActions.prepend(map);
  }
  const index = qIndex();
  const previous = scene === 'wiggle' ? stops.indexOf('share') : index - 1;
  if (!intro && previous >= 0) {
    headerActions.prepend(button('Previous stop', () => openStop(previous), 'chapter-secondary'));
  }
  let content;
  if (scene === 'map') content = trailMap();
  else if (scene === 'wiggle') content = el('section', { className: 'chapter-break' }, el('h1', { tabindex: '-1' }, 'Dino Wiggle Break'),
    el('p', {}, 'Take a little movement break if you want.'), movementBody(next));
  else content = stories[scene] ? storyScene(scene) : mathScene(index);
  root.replaceChildren(header, el('main', { className: 'chapter-main' }, content, persistWarning));
  window.scrollTo(0, 0);
  root.querySelector('h1')?.focus({ preventScroll: true });
}

render();
