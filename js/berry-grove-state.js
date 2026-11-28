import { berryChallenge, berryScene } from './berry-grove-content.js';

export const berryVariants = [berryChallenge.firstPlay, ...berryChallenge.replayVariants];
const supportTypes = ['tools', 'hints', 'worked-example', 'guided', 'parent'];

export function fillBerryCopy(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
}

export function berryQuestion({ red, blue, target }) {
  const total = red + blue;
  const missing = target - total;
  const values = Object.freeze({ red, blue, target, total, missing });
  const copy = text => fillBerryCopy(text, values);
  const [combine, find] = berryChallenge.steps;
  const mistakes = [{ [red]: combine.feedback.group, [blue]: combine.feedback.group },
    { [total]: copy(find.feedback.total), [target]: find.feedback.target }];
  return {
    id: 'supplies', schema: 'combine-then-missing', values,
    params: { a: red, b: blue, have: total, need: target },
    story: copy(berryChallenge.problem),
    prompts: berryChallenge.steps.map(step => step.question),
    answers: [total, missing],
    equations: berryChallenge.finalEquations.map(copy),
    blanks: berryChallenge.steps.map(step => copy(step.equation)),
    hints: berryChallenge.steps.map(step => step.hints.map(copy)),
    mistakes, defaultFeedback: berryChallenge.steps.map(step => step.feedback.default),
  };
}

export function newBerryBeat(phase = 'arrival') {
  return { phase, line: 0, mistakes: 0, moved: [], tools: false, help: [] };
}

export function berryHelp(value) {
  return supportTypes.filter(type => Array.isArray(value) && value.includes(type));
}

export function readBerryBeat(attempt, saved, question) {
  const raw = saved?.berry;
  // Saves from before Scene 04 already entered the stop and keep their original quantities and step.
  const phase = attempt.solved ? 'success' : attempt.step ? 'missing' : 'combine';
  const allowed = attempt.solved ? ['missing', 'success', 'clue'] :
    attempt.step ? ['combine', 'missing'] : ['arrival', 'intro', 'combine'];
  const beat = berryScene.beats.find(beat => beat.id === raw?.phase && allowed.includes(beat.id));
  const result = newBerryBeat(beat?.id ?? phase);
  if (!beat) return result;

  if (result.phase === 'combine') result.line = Number(attempt.step === 1);
  else if (result.phase === 'missing') result.line = Number(attempt.solved);
  else if (Number.isInteger(raw.line)) {
    const count = result.phase === 'success' ? beat.dialogueIds.length - 1 : beat.dialogueIds.length;
    result.line = Math.max(0, Math.min(raw.line, count - 1));
  }
  result.mistakes = Number.isSafeInteger(raw.mistakes) && raw.mistakes >= 0 ? raw.mistakes : 0;
  const limit = result.phase === 'missing' ? question.values.missing + 1 : question.values.total;
  if (Array.isArray(raw.moved)) {
    result.moved = [...new Set(raw.moved.filter(id => Number.isInteger(id) && id >= 0 && id < limit))];
  }
  result.tools = raw.tools === true;
  if (result.phase === 'missing') {
    if (raw.numberLine === true) result.numberLine = true;
    if (Number.isInteger(raw.jumps)) result.jumps = Math.max(0, Math.min(raw.jumps, question.values.missing));
  }
  result.help = berryHelp(raw.help);
  return result;
}

export function chooseBerryVariant(progress, seed) {
  if (progress.run?.berryVariant === undefined) return 0;
  const previous = progress.run?.berryVariant;
  const choice = 1 + seed % (berryVariants.length - 1);
  return choice === previous ? 1 + choice % (berryVariants.length - 1) : choice;
}
