import { buildCoachGuide } from './coach.js';
import { connectCoach } from './coach-panel.js';
import { buildChart, buildModel } from './manipulatives.js';
import { lessonTopics, worlds } from './curriculum.js';
import { generateLesson, generateSession, Session } from './engine.js';
import { addProgress, clearReview, progressTotals, readProgress, recordEvidence, resetProgress, saveProgress, saveReview } from './storage.js';

const byId = id => document.getElementById(id);
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

let storage;
try { storage = window.localStorage; } catch { /* Browser storage can be disabled. */ }
let progress = readProgress(storage);
let unsavedProgress = false;
const speech = window.speechSynthesis;
const pad = byId('pad');
const ink = pad.getContext('2d');
let world;
let session;
let lesson;
let activeReview;
let step;
let utterance;
let pointer;

function updateProgressDisplay() {
  const totals = progressTotals(progress);
  byId('stars').textContent = `★ ${totals.stars}`;
  byId('stars').setAttribute('aria-label', `${totals.stars} stars`);
  byId('length').value = progress.length;
  byId('history').textContent = `Adventures completed: ${totals.adventures}`;
  const legacy = byId('legacy-progress');
  legacy.hidden = !progress.legacy.stars && !progress.legacy.adventures;
  legacy.textContent = 'Earlier stars and completions were saved together. A whole-game reset clears them.';
}

function latestProgress() {
  return unsavedProgress ? progress : readProgress(storage);
}

function persist(next) {
  progress = next;
  unsavedProgress = !saveProgress(storage, progress);
  updateProgressDisplay();
  return !unsavedProgress;
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

function randomSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

function openSession(selected, questions) {
  world = selected;
  session = new Session(questions);
  byId('world-name').textContent = lesson ? lessonTopics[lesson.templateId] : world.name;
  show('play');
  renderQuestion();
}

function start(selected) {
  lesson = null;
  const latest = latestProgress();
  activeReview = latest.reviews[selected.id]?.[0];
  const review = activeReview ? generateLesson(activeReview.templateId, activeReview.seed).review : null;
  openSession(selected, generateSession(selected.id, randomSeed(), latest.length, review));
}

function startLesson(templateId) {
  const selected = worlds.find(adventure => templateId.startsWith(`${adventure.id}/`));
  const seed = randomSeed();
  lesson = { templateId, seed };
  activeReview = null;
  openSession(selected, generateLesson(templateId, seed).items);
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
  const title = {
    example: 'See an example', guided: 'Try with help', independent: 'Try on your own', review: 'Review',
  }[session.current.lessonStage];
  const prefix = title ? `${title} · ` : session.current.practice ? 'Extra practice · ' : '';
  byId('position').textContent = `${prefix}${session.index + 1} of ${session.questions.length}`;
  byId('trail-progress').max = session.questions.length;
}

byId('math-tools').addEventListener('click', () => {
  const panel = byId('math-model');
  const config = session.current.models[step];
  if (!panel.hasChildNodes()) panel.append(buildModel(config));
  panel.hidden = !panel.hidden;
  if (config.kind === 'chart-grow') byId('visual').hidden = !panel.hidden;
  byId('math-tools').setAttribute('aria-expanded', String(!panel.hidden));
  if (!panel.hidden) session.markSupport('mathTools');
});

function renderQuestion() {
  step = 0;
  stopReading();
  const question = session.current;
  renderPosition();
  renderMathTools(question.lessonStage === 'example');
  byId('trail-progress').value = session.index;
  byId('prompt').textContent = question.prompt;
  byId('visual').replaceChildren(...(question.visual ? [buildChart(question.visual)] : []));
  byId('visual').hidden = !question.visual;
  for (const id of ['hint-copy', 'drawing', 'next']) byId(id).hidden = true;
  byId('draw').setAttribute('aria-expanded', 'false');
  byId('hint').disabled = false;
  byId('feedback').textContent = '';
  byId('answer-form').hidden = false;
  clearDrawing();
  renderResponse();
  renderLessonSupport(question);
  byId('prompt').focus({ preventScroll: true });
}

function renderLessonSupport(question) {
  const support = byId('lesson-support');
  support.replaceChildren();
  const example = question.lessonStage === 'example';
  const guided = question.lessonStage === 'guided';
  support.hidden = !example && !guided;
  if (example) {
    const guide = buildCoachGuide(question);
    const steps = element('ol');
    steps.append(...guide.steps.map(instruction => element('li', instruction)));
    support.append(element('strong', guide.objective), steps, element('p', question.explanation));
    byId('answer-form').hidden = true;
    byId('hint').disabled = true;
    byId('next').hidden = false;
    updateNextLabel();
  } else if (guided) {
    support.append(element('strong', 'Start here'), element('p', question.hints[0]));
  }
}

function updateNextLabel() {
  const last = session.index + 1 === session.questions.length;
  if (session.current.lessonStage === 'example') {
    byId('next').textContent = 'Try with help →';
  } else if (session.current.lessonStage === 'guided') {
    byId('next').textContent = 'Try on your own →';
  } else if (last) {
    byId('next').textContent = lesson ? 'Finish lesson →' : 'Finish adventure →';
  } else {
    byId('next').textContent = 'Next challenge →';
  }
}

connectCoach({
  current: () => session,
  currentStep: () => step,
  markSupport(kind) {
    session.markSupport(kind);
    const evidence = session.evidence();
    if (!evidence) return;
    const latest = latestProgress();
    if (latest.evidence.some(item => item.id === evidence.id)) persist(recordEvidence(latest, evidence));
  },
  requestPractice() {
    const result = session.addPractice();
    if (result === 'queued') {
      renderPosition();
      updateNextLabel();
    }
    return result;
  },
});

function readyToAdvance() {
  byId('answer-form').hidden = true;
  byId('hint').disabled = true;
  byId('trail-progress').value = session.index + 1;
  byId('next').hidden = false;
  updateNextLabel();
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

function saveOutcome(earnStar = false) {
  const item = session.current;
  let latest = latestProgress();
  if (earnStar) latest = addProgress(latest, world.id, 'stars');
  if (item.lessonStage === 'review' && activeReview) latest = clearReview(latest, world.id, activeReview);
  persist(recordEvidence(latest, session.evidence()));
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
      feedback.textContent = checkpoint.retry ?? 'Try putting the two groups together first.';
      return;
    }
    const keepToolsOpen = !byId('math-model').hidden;
    step++;
    session.hints = 0;
    byId('hint-copy').hidden = true;
    renderMathTools(keepToolsOpen);
    renderResponse();
    feedback.textContent = `You found ${checkpoint.answer}${checkpoint.suffix ?? ' altogether'}. Now solve the last question.`;
    byId('response').querySelector('input').focus();
    return;
  }
  const result = session.answer(question.answerType === 'multiple' ? answers : value);
  if (!result?.correct) {
    feedback.textContent = question.misconceptions[Number(value)] ?? 'Good try. Look at what the question asks, or tap Hint.';
    return;
  }
  saveOutcome(true);
  feedback.textContent = `You earned a star! ${question.explanation}`;
  readyToAdvance();
});

byId('hint').addEventListener('click', () => {
  byId('hint-copy').hidden = false;
  byId('hint-copy').textContent = session.hint(step);
  if (session.status === 'guided') {
    saveOutcome();
    renderPosition();
    if (session.questions[session.index + 1]?.practice) {
      byId('hint-copy').textContent += ' Try a similar challenge next.';
    }
    readyToAdvance();
  }
});

byId('next').addEventListener('click', () => {
  if (session.current?.lessonStage === 'example') saveOutcome();
  if (!session.next()) return;
  if (session.status !== 'complete') {
    renderQuestion();
    byId('play').scrollIntoView({ block: 'start' });
    return;
  }
  byId('finish-title').textContent = lesson ? 'Lesson complete!' : 'Adventure complete!';
  byId('again').textContent = lesson ? 'Practice this skill again' : 'Play again';
  if (lesson) {
    const saved = persist(saveReview(latestProgress(), world.id, lesson));
    byId('outcome').textContent = saved ? `A fresh review was added to ${world.name}.`
      : `A fresh review is ready in ${world.name} while this tab stays open.`;
  } else {
    persist(addProgress(latestProgress(), world.id, 'adventures'));
    byId('outcome').textContent = `Quest complete. You helped ${world.goal.charAt(0).toLowerCase() + world.goal.slice(1)}!`;
  }
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
  session.markSupport('narration');
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
  if (!drawing.hidden) session.markSupport('drawing');
  byId('draw').setAttribute('aria-expanded', String(!drawing.hidden));
});
for (const id of ['back', 'map']) byId(id).addEventListener('click', () => show('home'));
byId('again').addEventListener('click', () => {
  if (lesson) startLesson(lesson.templateId);
  else start(world);
});
const learnDialog = byId('learn-dialog');
const topicSelect = byId('learn-topic');
for (const { id, name } of worlds) {
  const topics = Object.entries(lessonTopics).filter(([templateId]) => templateId.startsWith(`${id}/`));
  if (!topics.length) continue;
  const group = element('optgroup');
  group.label = name;
  for (const [value, label] of topics) {
    const option = element('option', label);
    option.value = value;
    group.append(option);
  }
  topicSelect.append(group);
}
byId('learn').addEventListener('click', () => learnDialog.showModal());
byId('learn-start').addEventListener('click', () => {
  learnDialog.close();
  startLesson(topicSelect.value);
});
const preferences = byId('preferences');
const scope = byId('reset-scope');
for (const adventure of worlds) {
  const option = element('option', adventure.name);
  option.value = adventure.id;
  scope.append(option);
}

function reviewReset(reviewing) {
  byId('settings-panel').hidden = reviewing;
  byId('settings-close').hidden = reviewing;
  byId('reset-confirmation').hidden = !reviewing;
  (reviewing ? byId('cancel-reset') : byId('request-reset')).focus();
}

byId('settings').addEventListener('click', () => {
  progress = latestProgress();
  updateProgressDisplay();
  scope.value = 'all';
  byId('reset-status').hidden = true;
  byId('reset-confirmation').hidden = true;
  byId('settings-panel').hidden = false;
  byId('settings-close').hidden = false;
  preferences.showModal();
});
byId('length').addEventListener('change', event => {
  persist({ ...latestProgress(), length: Number(event.target.value) });
});

byId('request-reset').addEventListener('click', () => {
  const adventure = worlds.find(item => item.id === scope.value);
  byId('reset-title').textContent = adventure ? `Reset ${adventure.name}?` : 'Reset the whole game?';
  byId('reset-impact').textContent = adventure
    ? `This clears the tracked stars, completions, teaching assistance history, and queued review in ${adventure.name}.`
    : 'This clears all progress and teaching assistance history in this browser and restores the default practice settings.';
  reviewReset(true);
});
byId('cancel-reset').addEventListener('click', () => reviewReset(false));
preferences.addEventListener('cancel', event => {
  if (byId('reset-confirmation').hidden) return;
  event.preventDefault();
  reviewReset(false);
});
byId('confirm-reset').addEventListener('click', () => {
  const selected = scope.value;
  const adventure = worlds.find(item => item.id === selected);
  if (!adventure && selected !== 'all') return;
  const saved = persist(resetProgress(latestProgress(), selected));
  if (selected === 'all' || world?.id === selected) {
    world = undefined;
    session = undefined;
    show('home');
  }
  const status = byId('reset-status');
  status.hidden = false;
  status.textContent = saved
    ? (adventure ? `${adventure.name} progress reset.` : 'Game reset.')
    : 'Progress was reset for this tab. This browser could not save the reset.';
  reviewReset(false);
});
window.addEventListener('storage', () => {
  if (unsavedProgress) return;
  progress = readProgress(storage);
  updateProgressDisplay();
});

updateProgressDisplay();
