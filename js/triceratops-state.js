import { bridgeChallenge, bridgeDialogue, bridgeGuide, bridgeScene } from './triceratops-content.js';

export const bridgeVariants = bridgeChallenge.variants;
export const bridgeBeats = Object.fromEntries(bridgeScene.beats.map(beat => [beat.id, beat]));
export const bridgeCopy = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key]);

export function bridgeQuestion({ target, initial }) {
  const missing = target - initial;
  const values = { target, initial, missing, supply: missing + 2 };
  const copy = text => bridgeCopy(text, values);
  const story = copy(bridgeChallenge.problem);
  const askAt = story.lastIndexOf(' How');
  const mistakes = {};
  const feedbackSpeakers = {};
  const incorrect = [initial, target, missing + 1, target + initial];
  bridgeChallenge.feedback.slice(0, -1).forEach(({ text, speaker }, index) => {
    const answer = incorrect[index];
    if (answer !== missing && !Object.hasOwn(mistakes, answer)) {
      mistakes[answer] = copy(text);
      feedbackSpeakers[answer] = speaker;
    }
  });
  return {
    id: 'share', schema: 'compare-equalize', params: { small: initial, large: target }, values, story,
    context: story.slice(0, askAt), prompts: [story.slice(askAt + 1)], answers: [missing],
    hints: [bridgeChallenge.hints.map(([, text]) => copy(text))], mistakes: [mistakes], feedbackSpeakers,
    defaultFeedback: [bridgeChallenge.feedback.at(-1).text], equations: bridgeGuide.equations.map(copy),
    ask: bridgeGuide.questions[0], objective: bridgeGuide.objective, activity: copy(bridgeGuide.physicalDemo),
  };
}

export function chooseBridgeVariant(progress, seed) {
  const previous = progress.run?.bridgeVariant;
  if (previous === undefined) return bridgeChallenge.firstPlaythrough;
  const next = seed % bridgeVariants.length;
  return next === previous ? (next + 1) % bridgeVariants.length : next;
}

export function newBridgeBeat(phase = 'arrival') {
  return { phase, line: 0, shared: 0, mistakes: 0, tool: 'closed', slots: false, position: null, help: [] };
}

export const bridgeHelp = raw => ['tools', 'hints', 'guided', 'parent'].filter(kind => Array.isArray(raw) && raw.includes(kind));

export function bridgeCounts({ target, initial, supply }, shared) {
  return { first: target, second: initial + shared, spare: supply - shared };
}

const storedInteger = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

export function restoreBridgeBeat(attempt, saved, { values }) {
  const raw = saved?.bridge;
  const allowed = attempt.solved ? ['equality', 'crossing', 'clue'] : ['arrival', 'introduction', 'construction'];
  const fallback = attempt.solved ? 'equality' : 'construction';
  const result = newBridgeBeat(allowed.includes(raw?.phase) ? raw.phase : fallback);
  const lastLine = (bridgeDialogue[bridgeBeats[result.phase].dialogueKey]?.length ?? 1) - 1;
  if (storedInteger(raw?.line, 0, lastLine)) result.line = raw.line;
  result.shared = attempt.solved ? values.missing : storedInteger(raw?.shared, 0, values.supply) ? raw.shared : 0;
  if (storedInteger(raw?.mistakes, 0, Number.MAX_SAFE_INTEGER)) result.mistakes = raw.mistakes;
  if (['model', 'line'].includes(raw?.tool)) result.tool = raw.tool;
  if (storedInteger(raw?.position, values.initial, values.target)) result.position = raw.position;
  result.slots = raw?.slots === true;
  result.help = bridgeHelp(raw?.help);
  return result;
}
