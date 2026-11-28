import { trailChallenge, trailScene } from './velociraptor-content.js';

export const trailVariants = trailChallenge.variants;
const spoken = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

export function trailQuestion({ first, second, question, statement }) {
  const larger = Math.max(first, second);
  const smaller = Math.min(first, second);
  const difference = larger - smaller;
  const values = { first, second, larger, smaller, difference, question,
    statement: statement?.replace(/\d+/, spoken[difference] ?? String(difference)).replace(/ than the .*trail$/, '') ??
      `The first trail has ${spoken[difference] ?? difference} more footprints` };
  const { feedback } = trailChallenge;
  return {
    id: 'footprints', schema: 'compare-difference', values,
    story: trailChallenge.problemTemplate.replace(/\{(\w+)\}/g, (_, key) => values[key]),
    prompts: [question + '?'], answers: [difference], equations: [`${larger} − ${smaller} = ${difference}`],
    hints: [trailChallenge.hints],
    mistakes: [{ [first]: feedback.group, [second]: feedback.group, [first + second]: feedback.total }],
    defaultFeedback: [feedback.other],
  };
}

export function chooseTrailVariant(progress, seed) {
  const previous = progress.run?.trailVariant;
  if (previous === undefined) return trailChallenge.firstPlaythrough;
  const choice = seed % trailVariants.length;
  return choice === previous ? (choice + 1) % trailVariants.length : choice;
}

export function newTrailBeat(phase = 'arrival') {
  return { phase, line: 0, mistakes: 0, pairs: [], selected: null, tools: false, help: [] };
}

const supportTypes = ['tools', 'hints', 'guided', 'parent'];
export function trailHelp(value) {
  return supportTypes.filter(type => Array.isArray(value) && value.includes(type));
}

const validIndex = (id, limit) => Number.isInteger(id) && id >= 0 && id < limit;

export function legalPairs(raw, { first, second }) {
  const pairs = [];
  if (!Array.isArray(raw)) return pairs;
  for (const entry of raw) {
    if (!Array.isArray(entry)) continue;
    const [a, b] = entry;
    if (validIndex(a, first) && validIndex(b, second) && !pairs.some(pair => pair[0] === a || pair[1] === b)) pairs.push([a, b]);
  }
  return pairs;
}

export function nextTrailPair(pairs, { first, second }) {
  const available = (row, count) => Array.from({ length: count }, (_, i) => i)
    .find(i => !pairs.some(pair => pair[row] === i));
  const a = available(0, first);
  const b = available(1, second);
  return a === undefined || b === undefined ? null : [a, b];
}

export function restoreTrailBeat(attempt, saved, question) {
  const raw = saved?.trail;
  const fallback = attempt.solved ? 'success' : 'solve';
  const allowed = attempt.solved ? ['success', 'clue'] : ['arrival', 'intro', 'solve'];
  const beat = trailScene.beats.find(beat => beat.id === raw?.phase && allowed.includes(beat.id));
  const result = newTrailBeat(beat?.id ?? fallback);
  if (!beat) return result;
  if (Number.isInteger(raw.line)) result.line = Math.max(0, Math.min(raw.line, (beat.dialogueIds?.length ?? 1) - 1));
  result.mistakes = Number.isSafeInteger(raw.mistakes) && raw.mistakes >= 0 ? raw.mistakes : 0;
  result.tools = raw.tools === true;
  result.help = trailHelp(raw.help);
  result.pairs = legalPairs(raw.pairs, question.values);
  const pick = raw.selected;
  if (Array.isArray(pick) && (pick[0] === 0 || pick[0] === 1) &&
    validIndex(pick[1], pick[0] === 0 ? question.values.first : question.values.second) &&
    !result.pairs.some(pair => pair[pick[0]] === pick[1])) {
    result.selected = pick.slice(0, 2);
  }
  return result;
}
