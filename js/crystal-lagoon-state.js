import { lagoonChallenge, lagoonDialogue, lagoonGuide, lagoonScene } from './crystal-lagoon-content.js';

export const lagoonVariants = lagoonChallenge.variants;
export const lagoonBeats = Object.fromEntries(lagoonScene.beats.map(beat => [beat.id, beat]));
const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
export const lagoonCopy = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key]);

export function lagoonQuestion({ green, blue }) {
  const difference = green - blue;
  const answer = difference + 1;
  const finalBlue = green + 1;
  const values = { green, blue, difference, answer, finalBlue, supply: answer + 2,
    greenWords: words[green], answerWords: words[answer], finalWords: words[finalBlue] };
  const copy = text => lagoonCopy(text, values);
  const story = copy(lagoonChallenge.problem);
  const split = story.indexOf(' What');
  const [, equal, original, total, greater, otherwise] = lagoonChallenge.feedback;
  const mistakes = {};
  const feedbackSpeakers = {};
  for (let number = 0; number <= 99; number++) {
    if (number === answer) continue;
    const match = number === difference ? equal : number === green ? original : number === finalBlue ? total
      : number > answer ? greater : undefined;
    if (match) {
      mistakes[number] = copy(match.text);
      feedbackSpeakers[number] = match.speaker;
    }
  }
  return { id: 'gems', values, story, context: story.slice(0, split), prompts: [story.slice(split + 1)],
    answers: [answer], equations: lagoonGuide.equations.map(copy), mistakes: [mistakes], feedbackSpeakers,
    hints: [lagoonChallenge.hints.map(([, text]) => copy(text))], defaultFeedback: [otherwise.text] };
}

export function chooseLagoonVariant(progress, seed) {
  const previous = progress.run?.lagoonVariant;
  if (previous === undefined) return lagoonChallenge.firstPlaythrough;
  const next = seed % lagoonVariants.length;
  return next === previous ? (next + 1) % lagoonVariants.length : next;
}

export const lagoonHelp = raw => ['tools', 'hints', 'guided', 'parent'].filter(kind => Array.isArray(raw) && raw.includes(kind));
export function newLagoonBeat(phase = 'arrival') {
  return { phase, line: 0, added: 0, mistakes: 0, tool: 'closed', position: null, help: [] };
}

export function restoreLagoonBeat(attempt, saved, { values }) {
  const raw = saved?.lagoon;
  const phases = attempt.solved ? ['activate', 'explore', 'reveal'] : ['arrival', 'marker', 'compare'];
  const fallback = attempt.solved ? 'activate' : 'compare';
  const result = newLagoonBeat(phases.includes(raw?.phase) ? raw.phase : fallback);
  const lastLine = (lagoonDialogue[lagoonBeats[result.phase].dialogueKey]?.length ?? 1) - 1;
  const minLine = result.phase === 'reveal' ? -1 : 0;
  if (Number.isInteger(raw?.line)) result.line = Math.max(minLine, Math.min(lastLine, raw.line));
  if (Number.isSafeInteger(raw?.mistakes) && raw.mistakes >= 0) result.mistakes = raw.mistakes;
  if (['model', 'line'].includes(raw?.tool)) result.tool = raw.tool;
  if (Number.isInteger(raw?.position) && raw.position >= values.blue && raw.position <= values.finalBlue) result.position = raw.position;
  result.added = attempt.solved ? values.answer
    : Number.isInteger(raw?.added) && raw.added >= 0 && raw.added <= values.supply ? raw.added : 0;
  result.help = lagoonHelp(raw?.help);
  return result;
}
