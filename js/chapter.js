import { seededRandom, validateAnswer } from './engine.js';
import { berryHelp, berryQuestion, berryVariants, chooseBerryVariant, newBerryBeat, readBerryBeat } from './berry-grove-state.js';
import { chooseTrailVariant, newTrailBeat, restoreTrailBeat, trailHelp, trailQuestion, trailVariants } from './velociraptor-state.js';

export const scenes = ['welcome', 'mission', 'map', 'supplies', 'footprints', 'share', 'wiggle', 'gems',
  'cave', 'mosasaurus', 'discovery', 'complete', 'replay'];
export const stops = ['supplies', 'footprints', 'share', 'gems', 'cave'];
export const stopNames = ['Gather supplies', 'Follow footprints', 'Share the food', 'Collect gems', 'Open the cave'];
// Presentation checkpoint in the existing run. The scene remains the saved destination.
const mapOrigins = { footprints: ['1'], share: ['2'], wiggle: ['3'], gems: ['3', 'break'],
  cave: ['4'], mosasaurus: ['5'] };
export const chapterKey = 'math-quest.lost-egg-1';
const outcomes = ['independent', 'assisted', 'worked-example'];

export function chapterQuestions(seed, berryVariant) {
  const random = seededRandom(seed);
  const a = random(3, 7), b = random(3, 7), c = random(2, 6);
  const small = random(5, 8), gap = random(2, Math.min(6, 20 - 2 * small)), large = small + gap;
  const food = random(3, 7), extra = random(2, Math.min(6, 20 - 2 * food));
  const blue = random(4, 8), difference = random(2, Math.min(6, 19 - 2 * blue)), green = blue + difference;
  const leftPart = random(4, 8), rightPart = random(3, 6), taken = random(2, 6);
  const have = a + b, need = have + c, total = leftPart + rightPart, start = total + taken;
  return [
    berryVariants[berryVariant] ? berryQuestion(berryVariants[berryVariant]) : {
      id: 'supplies', schema: 'combine-then-missing', params: { a, b, have, need },
      story: `You find ${a} red berries and ${b} blue berries. You need ${need} berries for the journey.`,
      prompts: ['How many berries do you have now?', 'How many more berries do you need?'],
      answers: [have, c], equations: [`${a} + ${b} = ${have}`, `${have} + ${c} = ${need}`],
      hints: [['Look at both berry groups.', 'Put both groups together. Count all the berries.'],
        ['Start at the number you have now.', 'Count up to the number you need. Count only the extra berries.']],
      mistakes: [a === b ? { [a]: 'Count both groups of berries.' } : { [a]: 'Count the blue berries too.', [b]: 'Count the red berries too.' },
        { [have]: 'That is how many you have. Count the extra berries you still need.', [need]: 'That is the goal. How many more will get you there?' }],
      objective: 'Combine two parts, then find what is missing.', ask: 'What do you have already? What is your goal?',
      activity: 'Make two piles of counters. Join them, then add counters one at a time until you reach the goal.',
      success: 'Supplies packed! T-Rex can follow the trail.',
    },
    {
      id: 'footprints', schema: 'compare-difference', params: { small, large },
      story: `The first trail has ${large} footprints. The second trail has ${small}.`,
      prompts: ['How many more footprints does the first trail have?'],
      answers: [gap], equations: [`${large} − ${small} = ${gap}`],
      hints: [['Match one print from each trail.', 'Count the prints on the first trail that have no match.']],
      mistakes: [{ [large + small]: 'That counts both trails together. Count only the prints without a match.', [large]: 'That counts the whole first trail. Look for its extra prints.' }],
      objective: 'Find the difference between two groups.', ask: 'What does “how many more” ask you to count?',
      activity: 'Line up two rows of toy cars. Pair a car from each row and count the extras.',
      success: 'You found the trail with more prints. Follow the first trail!',
    },
    {
      id: 'share', schema: 'compare-equalize', params: { small: food, large: food + extra },
      story: `T-Rex has ${food + extra} berries. A hungry friend has ${food}. There are extra berries to share.`,
      prompts: ['How many more berries does the friend need to have the same number as T-Rex?'],
      answers: [extra], equations: [`${food} + ${extra} = ${food + extra}`],
      hints: [['Look at the friend’s smaller group.', 'Add berries to the smaller group until both groups match. Count what you added.']],
      mistakes: [{ [food + extra]: 'That is the number each dinosaur will have. Count only the berries you add.' }],
      objective: 'Make a smaller group equal to a larger group.', ask: 'Which group needs more berries? When should we stop adding?',
      activity: 'Use two rows of blocks. Add to the smaller row, one block at a time, until the rows match.',
      success: 'Both dinosaurs have the same number of berries. Your friend points to the lagoon!',
    },
    {
      id: 'gems', schema: 'compare-exceed', params: { small: blue, large: green },
      story: `Green Dino has ${green} gems. Blue Dino has ${blue}. Blue Dino needs the most gems to light the cave path.`,
      prompts: ['What is the smallest number of extra gems Blue Dino needs to have more than Green Dino?'],
      answers: [difference + 1], equations: [`${blue} + ${difference} = ${green}; ${blue} + ${difference + 1} = ${green + 1}`],
      hints: [['Make the two gem groups match first.', 'A tie is the same number. Add one more after the tie, then count all the gems you added.']],
      mistakes: [{ [difference]: 'That makes a tie. Add one more gem to have more.' }],
      objective: 'Find the least addition needed to exceed another group.', ask: 'If both groups match, does Blue Dino have more yet?',
      activity: 'Match rows of stickers first. Add one sticker to the smaller row after the tie and count all the added stickers.',
      success: 'Blue Dino has just enough to take the lead. The gems light the cave path!',
    },
    {
      id: 'cave', schema: 'equality-missing', params: { left: start, rightParts: [leftPart, rightPart], total },
      story: `The cave lock shows ${start} − □ = ${leftPart} + ${rightPart}. Both sides must match.`,
      prompts: ['How many stones are on the right side altogether?', 'How many stones must you take away from the left to make both sides match?'],
      answers: [total, taken], equations: [`${leftPart} + ${rightPart} = ${total}`, `${start} − ${taken} = ${leftPart} + ${rightPart}`],
      hints: [['Count both groups on the right.', 'Put the two right-side groups together and count.'],
        ['Both sides need to have the same number.', 'Take stones off the left pan. When the pans match, count the stones in the tray.']],
      mistakes: [{ [leftPart]: 'Include the other group on the right.', [rightPart]: 'Include both groups on the right.' },
        { [total]: 'That is how many stay on each pan. Count the stones you took away.' }],
      objective: 'Find the missing subtraction amount that makes both sides equal.', ask: 'What does the blank count? Which side can you work out first?',
      activity: 'Use two plates and blocks. Build the right side, then remove from the left until both sides match.',
      success: 'The pans match and the cave lock opens!',
    },
  ];
}

export function freshQuestion(seed, index) {
  const original = chapterQuestions(seed)[index];
  const previous = original.answers.at(-1);
  for (let offset = 1; offset <= 100; offset++) {
    const next = chapterQuestions((seed + Math.imul(offset, 2654435761)) >>> 0)[index];
    if (next.answers.at(-1) !== previous) return next;
  }
  return null;
}

export const emptyAttempt = () => ({ step: 0, draft: '', hints: 0, assisted: false, solved: false, error: '', teach: false });

export function readChapter(storage) {
  const fallback = { version: 1, autoBreak: true, badge: false, runs: 0, run: null };
  try {
    const saved = JSON.parse(storage.getItem(chapterKey));
    if (saved?.version !== 1) return fallback;
    const { run } = saved;
    let valid = null;
    if (run && Number.isInteger(run.seed) && run.seed >= 0 && run.seed <= 0xffffffff &&
        scenes.includes(run.scene) && run.scene !== 'welcome') {
      const index = stops.indexOf(run.scene);
      const outcomesByStop = Array.from({ length: 5 }, (_, i) => outcomes.includes(run.outcomes?.[i]) ? run.outcomes[i] : null);
      const attempt = emptyAttempt();
      if (index >= 0) {
        const q = index === 0 ? chapterBerryQuestion(run) : index === 1 ? chapterTrailQuestion(run) : chapterQuestions(run.seed)[index];
        attempt.step = run.attempt?.step === 1 && q.answers.length === 2 ? 1 : 0;
        attempt.draft = typeof run.attempt?.draft === 'string' && /^\d{0,2}$/.test(run.attempt.draft) ? run.attempt.draft : '';
        attempt.hints = Number.isInteger(run.attempt?.hints) ? Math.max(0, Math.min(run.attempt.hints, q.hints[attempt.step].length)) : 0;
        attempt.assisted = run.attempt?.assisted === true || attempt.hints > 0;
        attempt.solved = Boolean(outcomesByStop[index]);
        attempt.teach = run.attempt?.teach === true;
        if (index === 0) {
          attempt.berry = readBerryBeat(attempt, run.attempt, q);
        }
        if (index === 1) attempt.trail = restoreTrailBeat(attempt, run.attempt, q);
        const detail = attempt.berry ?? attempt.trail;
        if (detail) {
          attempt.assisted ||= detail.help.length > 0;
          const feedback = Object.values(q.mistakes[attempt.step]).concat(q.defaultFeedback[attempt.step]);
          if (!attempt.solved && feedback.includes(run.attempt?.error)) attempt.error = run.attempt.error;
        }
      }
      valid = { seed: run.seed, scene: run.scene, outcomes: outcomesByStop, attempt };
      if (Number.isInteger(run.berryVariant) && berryVariants[run.berryVariant]) valid.berryVariant = run.berryVariant;
      if (outcomesByStop[0] && Array.isArray(run.berryHelp)) valid.berryHelp = berryHelp(run.berryHelp);
      if (Number.isInteger(run.trailVariant) && trailVariants[run.trailVariant]) valid.trailVariant = run.trailVariant;
      if (outcomesByStop[1] && Array.isArray(run.trailHelp)) valid.trailHelp = trailHelp(run.trailHelp);
      if (mapOrigins[run.scene]?.includes(run.mapFrom)) valid.mapFrom = run.mapFrom;
    }
    return { version: 1, autoBreak: saved.autoBreak !== false, badge: saved.badge === true,
      runs: Number.isSafeInteger(saved.runs) && saved.runs >= 0 ? saved.runs : 0, run: valid };
  } catch { return fallback; }
}

export function chapterBerryQuestion(run) {
  const variant = Number.isInteger(run.berryVariant) ? berryVariants[run.berryVariant] : undefined;
  if (variant) return berryQuestion(variant);
  const { params: { a, b, need } } = chapterQuestions(run.seed)[0];
  return berryQuestion({ red: a, blue: b, target: need });
}

export function chapterTrailQuestion(run) {
  const variant = Number.isInteger(run.trailVariant) ? trailVariants[run.trailVariant] : undefined;
  if (variant) return trailQuestion(variant);
  const { params: { large, small } } = chapterQuestions(run.seed)[1];
  return trailQuestion({ first: large, second: small, question: trailVariants[0].question });
}

export function startChapter(progress, seed) {
  return { ...progress, run: { seed, scene: 'mission', outcomes: Array(5).fill(null), attempt: emptyAttempt(),
    berryVariant: chooseBerryVariant(progress, seed), trailVariant: chooseTrailVariant(progress, seed) } };
}

export function advanceChapter(progress) {
  const { run } = progress;
  if (!run || run.scene === 'replay' || (stops.includes(run.scene) && !run.attempt.solved)) return progress;
  let scene = scenes[scenes.indexOf(run.scene) + 1];
  if (scene === 'wiggle' && !progress.autoBreak) scene = 'gems';
  const finishing = scene === 'complete';
  const attempt = emptyAttempt();
  const variant = {};
  if (scene === 'supplies') {
    attempt.berry = newBerryBeat();
    variant.berryVariant = run.berryVariant ?? 0;
  }
  if (scene === 'footprints') {
    attempt.trail = newTrailBeat();
    variant.trailVariant = run.trailVariant ?? 0;
  }
  return { ...progress, badge: progress.badge || finishing, runs: progress.runs + Number(finishing),
    run: { ...run, ...variant, scene, attempt } };
}

export function applyChapterAnswer(run, question, value) {
  const current = run.attempt;
  if (current.solved || question.id !== run.scene || !/^\d{1,2}$/.test(value) || (question.id !== 'footprints' && Number(value) > 20)) return run;
  const step = current.step;
  if (!validateAnswer({ answerType: 'number', answer: question.answers[step] }, value)) {
    return { ...run, attempt: { ...current, draft: value,
      error: question.mistakes[step][Number(value)] ?? question.defaultFeedback?.[step] ?? 'Try again. Look at the groups or ask for a hint.' } };
  }
  if (step + 1 < question.answers.length) {
    return { ...run, attempt: { ...emptyAttempt(), step: step + 1, assisted: current.assisted, teach: current.teach } };
  }
  return finishChallenge(run, current.assisted ? 'assisted' : 'independent');
}

export function finishChallenge(run, outcome) {
  const index = stops.indexOf(run.scene);
  if (index < 0 || run.attempt.solved || !outcomes.includes(outcome)) return run;
  const next = [...run.outcomes];
  next[index] = outcome;
  return { ...run, outcomes: next, attempt: { ...run.attempt, solved: true, error: '' } };
}
