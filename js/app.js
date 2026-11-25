import { buildModel } from './manipulatives.js';
import { worlds } from './curriculum.js';
import { generateSession, Session, tallyGroups } from './engine.js';
import { readProgress, saveProgress } from './storage.js';

const byId = id => document.getElementById(id);
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

let storage;
try { storage = window.localStorage; } catch { /* Browser storage can be disabled. */ }
const progress = readProgress(storage);
const speech = window.speechSynthesis;
const pad = byId('pad');
const ink = pad.getContext('2d');
let world;
let session;
let step;
let utterance;
let pointer;

function persist() {
  byId('stars').textContent = `★ ${progress.stars}`;
  byId('stars').setAttribute('aria-label', `${progress.stars} stars`);
  saveProgress(storage, progress);
}

function stopReading() {
  utterance = null;
  speech?.cancel();
  byId('read').textContent = 'Read aloud';
}

function show(screen) {
  stopReading();
  for (const id of ['home', 'play', 'finish']) byId(id).hidden = id !== screen;
  window.scrollTo(0, 0);
  if (screen !== 'play') byId(screen).querySelector('h1').focus({ preventScroll: true });
}

function start(selected) {
  world = selected;
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  session = new Session(generateSession(world.id, seed, progress.length));
  byId('world-name').textContent = world.name;
  show('play');
  renderQuestion();
}

function chart({ kind, rows }) {
  const figure = element('div', '', 'chart');
  figure.append(element('p', kind === 'picture' ? 'Each picture is one vote.' : 'Each mark is one vote.'));
  for (const row of rows) {
    const line = element('div', '', 'chart-row');
    const marks = element('div', '', 'marks');
    marks.setAttribute('role', 'img');
    marks.setAttribute('aria-label', `${row.count} votes`);
    if (kind === 'picture') {
      for (let index = 0; index < row.count; index++) marks.append(element('span', row.icon));
    } else {
      for (const count of tallyGroups(row.count)) {
        const group = element('span', '', count === 5 ? 'tally crossed' : 'tally');
        for (let index = 0; index < Math.min(count, 4); index++) group.append(element('i'));
        marks.append(group);
      }
    }
    line.append(element('strong', row.label), marks);
    figure.append(line);
  }
  return figure;
}

function renderResponse() {
  const question = session.current;
  const container = byId('response');
  const checkpoint = question.intermediate[step];
  container.replaceChildren();
  if (checkpoint || question.answerType === 'number') {
    const label = element('label', checkpoint?.prompt ?? 'Your number');
    const input = element('input');
    input.name = 'answer';
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.maxLength = 2;
    label.append(input);
    container.append(label);
    return;
  }
  const options = element('fieldset');
  options.append(element('legend', question.answerType === 'multiple' ? 'Choose two statements' : 'Choose your answer'));
  for (const choice of question.choices) {
    const label = element('label', '', 'choice');
    const input = element('input');
    input.type = question.answerType === 'multiple' ? 'checkbox' : 'radio';
    input.name = 'answer';
    input.value = choice;
    label.append(input, document.createTextNode(choice));
    options.append(label);
  }
  container.append(options);
}

function clearDrawing() {
  ink.clearRect(0, 0, pad.width, pad.height);
}

function renderMathTools(open = false) {
  const config = session.current.models?.[step];
  const control = byId('math-tools');
  const panel = byId('math-model');
  control.hidden = !config;
  panel.hidden = !config || !open;
  panel.replaceChildren(...(config && open ? [buildModel(config)] : []));
  control.setAttribute('aria-expanded', String(!panel.hidden));
}

function renderPosition() {
  const prefix = session.current.practice ? 'Extra practice · ' : '';
  byId('position').textContent = `${prefix}${session.index + 1} of ${session.questions.length}`;
  byId('trail-progress').max = session.questions.length;
}

byId('math-tools').addEventListener('click', () => {
  const panel = byId('math-model');
  if (!panel.hasChildNodes()) panel.append(buildModel(session.current.models[step]));
  panel.hidden = !panel.hidden;
  byId('math-tools').setAttribute('aria-expanded', String(!panel.hidden));
  session.assisted = true;
});

function renderQuestion() {
  step = 0;
  stopReading();
  const question = session.current;
  renderPosition();
  renderMathTools();
  byId('trail-progress').value = session.index;
  byId('prompt').textContent = question.prompt;
  byId('visual').replaceChildren(...(question.visual ? [chart(question.visual)] : []));
  byId('visual').hidden = !question.visual;
  for (const id of ['hint-copy', 'drawing', 'next']) byId(id).hidden = true;
  byId('draw').setAttribute('aria-expanded', 'false');
  byId('hint').disabled = false;
  byId('feedback').textContent = '';
  byId('answer-form').hidden = false;
  clearDrawing();
  renderResponse();
  byId('prompt').focus({ preventScroll: true });
}

function readyToAdvance() {
  byId('answer-form').hidden = true;
  byId('hint').disabled = true;
  byId('trail-progress').value = session.index + 1;
  byId('next').hidden = false;
  byId('next').textContent = session.index + 1 === session.questions.length ? 'Finish adventure →' : 'Next challenge →';
  byId('next').focus();
}

for (const adventure of worlds) {
  const button = element('button', '', `world ${adventure.color}`);
  const icon = element('span', adventure.icon, 'icon');
  icon.setAttribute('aria-hidden', 'true');
  const label = element('span');
  label.append(element('strong', adventure.name), element('small', adventure.focus));
  button.append(icon, label);
  button.addEventListener('click', () => start(adventure));
  byId('worlds').append(button);
}

byId('answer-form').addEventListener('submit', event => {
  event.preventDefault();
  const question = session.current;
  const checkpoint = question.intermediate[step];
  const answers = new FormData(event.currentTarget).getAll('answer');
  const value = answers[0]?.trim() ?? '';
  const feedback = byId('feedback');
  if (question.answerType === 'multiple' && answers.length !== 2) {
    feedback.textContent = 'Choose two statements before you check.';
    return;
  }
  if (!value || ((checkpoint || question.answerType === 'number') && (!/^\d{1,2}$/.test(value) || Number(value) > 20))) {
    feedback.textContent = checkpoint || question.answerType === 'number' ? 'Enter a number from 0 to 20.' : 'Choose an answer first.';
    return;
  }
  if (checkpoint) {
    if (Number(value) !== checkpoint.answer) {
      feedback.textContent = 'Try putting the two groups together first.';
      return;
    }
    const keepToolsOpen = !byId('math-model').hidden;
    step++;
    session.hints = 0;
    byId('hint-copy').hidden = true;
    renderMathTools(keepToolsOpen);
    renderResponse();
    feedback.textContent = `You found ${checkpoint.answer} altogether. Now solve the last question.`;
    byId('response').querySelector('input').focus();
    return;
  }
  const result = session.answer(question.answerType === 'multiple' ? answers : value);
  if (!result?.correct) {
    feedback.textContent = question.misconceptions[Number(value)] ?? 'Good try. Look at what the question asks, or tap Hint.';
    return;
  }
  progress.stars++;
  persist();
  feedback.textContent = `You earned a star! ${question.explanation}`;
  readyToAdvance();
});

byId('hint').addEventListener('click', () => {
  byId('hint-copy').hidden = false;
  byId('hint-copy').textContent = session.hint(step);
  if (session.status === 'guided') {
    renderPosition();
    if (session.questions[session.index + 1]?.practice) {
      byId('hint-copy').textContent += ' Try a similar challenge next.';
    }
    readyToAdvance();
  }
});

byId('next').addEventListener('click', () => {
  if (!session.next()) return;
  if (session.status !== 'complete') {
    renderQuestion();
    byId('play').scrollIntoView({ block: 'start' });
    return;
  }
  progress.adventures++;
  persist();
  byId('outcome').textContent = `Quest complete. You helped ${world.goal.charAt(0).toLowerCase() + world.goal.slice(1)}!`;
  byId('earned').textContent = `You earned ${session.stars} ${session.stars === 1 ? 'star' : 'stars'} on this adventure.`;
  show('finish');
});

byId('read').addEventListener('click', () => {
  if (utterance) {
    stopReading();
    return;
  }
  if (!speech || !window.SpeechSynthesisUtterance) {
    byId('feedback').textContent = 'This browser does not support read aloud.';
    return;
  }
  const question = session.current;
  const checkpoint = question.intermediate[step];
  const spoken = [question.prompt, checkpoint?.prompt, ...(question.choices ?? [])].filter(Boolean).join(' ');
  const active = new SpeechSynthesisUtterance(spoken.replaceAll('□', 'blank').replaceAll('−', ' minus ').replaceAll('+', ' plus ').replaceAll('=', ' equals '));
  active.lang = 'en';
  active.rate = .85;
  active.onend = active.onerror = () => {
    if (utterance !== active) return;
    utterance = null;
    byId('read').textContent = 'Read aloud';
  };
  utterance = active;
  speech.cancel();
  speech.speak(active);
  byId('read').textContent = 'Stop reading';
});

ink.lineWidth = 5;
ink.lineCap = 'round';
ink.strokeStyle = '#215b47';
function point(event) {
  const box = pad.getBoundingClientRect();
  return [(event.clientX - box.left) * pad.width / box.width, (event.clientY - box.top) * pad.height / box.height];
}
pad.addEventListener('pointerdown', event => {
  if (pointer !== undefined || event.button !== 0) return;
  pointer = event.pointerId;
  pad.setPointerCapture(pointer);
  const [x, y] = point(event);
  ink.beginPath();
  ink.moveTo(x, y);
  ink.lineTo(x + .1, y);
  ink.stroke();
});
pad.addEventListener('pointermove', event => {
  if (event.pointerId !== pointer) return;
  ink.lineTo(...point(event));
  ink.stroke();
});
pad.addEventListener('lostpointercapture', event => {
  if (event.pointerId === pointer) pointer = undefined;
});
byId('clear').addEventListener('click', clearDrawing);
byId('draw').addEventListener('click', () => {
  const drawing = byId('drawing');
  drawing.hidden = !drawing.hidden;
  byId('draw').setAttribute('aria-expanded', String(!drawing.hidden));
});
for (const id of ['back', 'map']) byId(id).addEventListener('click', () => show('home'));
byId('again').addEventListener('click', () => start(world));
byId('settings').addEventListener('click', () => {
  byId('length').value = progress.length;
  byId('history').textContent = `Adventures completed: ${progress.adventures}`;
  byId('preferences').showModal();
});
byId('length').addEventListener('change', event => {
  progress.length = Number(event.target.value);
  persist();
});

persist();
