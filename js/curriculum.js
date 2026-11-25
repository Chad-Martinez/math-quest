import { additionalComparisons, additionalStories } from './story-structures.js';

export const worlds = [
  { id: 'story', name: 'Story Forest', focus: 'Add and take away', icon: '🌲', color: 'forest', goal: 'Open the forest gate' },
  { id: 'compare', name: 'Racing Valley', focus: 'More, fewer, and equal', icon: '🏁', color: 'race', goal: 'Cross the finish line' },
  { id: 'steps', name: 'Dinosaur Island', focus: 'Two-step stories', icon: '🦕', color: 'dino', goal: 'Lower the bridge for the dinosaurs' },
  { id: 'picture', name: 'Animal Kingdom', focus: 'Read picture graphs', icon: '🐾', color: 'animal', goal: 'Fill the ranger’s field journal' },
  { id: 'tally', name: 'Sports Arena', focus: 'Count tally marks', icon: '🏀', color: 'sport', goal: 'Light up the arena' },
  { id: 'equation', name: 'Equation Space', focus: 'Balance both sides', icon: '🚀', color: 'space', goal: 'Launch the rocket' },
  { id: 'mixed', name: 'Treasure Island', focus: 'A mix of challenges', icon: '🧭', color: 'treasure', goal: 'Open the treasure chest' },
];

const number = (skill, prompt, answer, equation, hints, extras = {}) =>
  ({ skill, prompt, answer, equation, hints, answerType: 'number', ...extras });

const rows = (kind, first, second, icon) => ({ kind, rows: [first, second], icon });

const story = {
  ...additionalStories,
  join: (a, b) => number('join', `Mia finds ${a} acorns. She finds ${b} more. How many acorns does she have altogether?`,
    a + b, `${a} + ${b} = ${a + b}`, ['Find both groups of acorns.', 'Draw both groups and count them together.'], { vocabulary: ['altogether'], models: [{ kind: 'join', parts: [a, b], icon: '🌰' }], misconceptions: { [a]: 'That is the first group. Count the acorns from both groups.' } }),
  separate: (a, b) => number('separate', `Sam has ${a + b} apples. He gives away ${b}. How many apples are left?`,
    a, `${a + b} − ${b} = ${a}`, ['Find how many apples Sam starts with.', `Draw ${a + b} apples and cross out ${b}.`], {
      vocabulary: ['left'],
      models: [{ kind: 'remove', start: a + b, change: b, icon: '🍎' }],
      misconceptions: { ...(a !== b && { [b]: 'That is how many Sam gave away. Count the apples still there.' }) },
    }),
};

const compare = {
  ...additionalComparisons,
  difference: (a, b) => number('difference', `Ben has ${a + b} toy cars. Leo has ${a}. How many more cars does Ben have?`,
    b, `${a + b} − ${a} = ${b}`, ['Look for the difference between the two groups.', 'Open the math tools and pair the cars. Count the cars without a partner.'], { vocabulary: ['difference', 'more'], models: [rows('pair', ['Ben', a + b], ['Leo', a], '🚗')] }),
  fewer: (a, b) => number('fewer', `Ana has ${a} flags. Jo has ${a + b}. How many fewer flags does Ana have?`,
    b, `${a + b} − ${a} = ${b}`, ['Find the gap between the two groups.', 'Match flags in pairs. Count the extras in Jo’s group.'], { vocabulary: ['fewer'], models: [rows('pair', ['Ana', a], ['Jo', a + b], '⚑')] }),
  fewerGiven: (a, b) => number('find-smaller', `Luz has ${a + b} ribbons. Kai has ${b} fewer ribbons than Luz. How many ribbons does Kai have?`,
    a, `${a + b} − ${b} = ${a}`, ['Start with Luz’s ribbons. Kai has a smaller group.', `Take away ${b} from Luz’s count to show Kai’s group.`], {
      vocabulary: ['fewer'],
      models: [{ kind: 'remove', start: a + b, change: b, icon: '🎀' }],
      misconceptions: {
        ...(a !== b && { [b]: 'That is the difference. Find how many ribbons Kai has.' }),
        [a + b]: 'That is Luz’s count. Kai has fewer ribbons.',
      },
    }),
  match: (a, b) => number('match', `Mia has ${a} stickers. Ava has ${a + b}. How many more stickers does Mia need to have the same number as Ava?`,
    b, `${a} + ${b} = ${a + b}`, ['Both groups need the same number.', `Count up from ${a} until you reach ${a + b}.`], { vocabulary: ['same', 'equal'], models: [rows('grow', ['Mia', a], ['Ava', a + b], '★')] }),
  exceed: (a, b) => number('exceed', `Pip has ${a} shells. Sol has ${a + b}. What is the smallest number of shells Pip needs to add to have more than Sol?`,
    b + 1, `${a} + ${b + 1} = ${a + b + 1}`, ['Pip needs just one more shell than Sol.', `Count from ${a} to ${a + b} to tie. Then count one more.`],
    { vocabulary: ['more', 'equal'], models: [rows('grow', ['Pip', a], ['Sol', a + b], '🐚')], misconceptions: { [b]: `Adding ${b} makes the groups equal. Add one more to get ahead.` } }),
};

const steps = {
  reach: (a, b, c) => number('reach-target', `The bridge needs ${a + b + c} gems. You have ${a} green gems and ${b} blue gems. How many more gems do you need?`,
    c, `${a} + ${b} = ${a + b}. ${a + b + c} − ${a + b} = ${c}.`, ['First find how many gems you have altogether.', 'Count up from your total to the number the bridge needs.'],
    {
      intermediate: [{ prompt: 'How many gems do you have now?', answer: a + b }],
      stageHints: [
        ['Find the green gems and the blue gems.', 'Put both groups together and count them.'],
        ['Compare your total with the bridge target.', 'Count the jumps from your total to the target.'],
      ],
      models: [{ kind: 'join', parts: [a, b], icon: '◆' }, { kind: 'line', start: a + b, target: a + b + c }],
      misconceptions: { ...(a + b !== c && { [a + b]: 'That is your starting total. Count how many more gems will reach the target.' }) },
      vocabulary: ['altogether'],
    }),
  remaining: (a, b, c) => number('combine-remove', `A dinosaur finds ${a} red berries and ${b} blue berries. It eats ${c} berries. How many are left?`,
    a + b - c, `${a} + ${b} = ${a + b}. ${a + b} − ${c} = ${a + b - c}.`, ['Combine the red berries and the blue berries first.', `Cross out ${c} berries from the combined group.`],
    {
      intermediate: [{ prompt: 'How many berries did the dinosaur find?', answer: a + b }],
      stageHints: [
        ['Find the two groups of berries.', 'Put both groups together and count them.'],
        ['Start with all the berries the dinosaur found.', 'Remove the berries it ate and count what remains.'],
      ],
      models: [{ kind: 'join', parts: [a, b], icon: '●' }, { kind: 'remove', start: a + b, change: c, icon: '●' }],
      misconceptions: { [a + b]: 'That was the total before the dinosaur ate. Count the berries that are left.' },
      vocabulary: ['left'],
    }),
  shareThenMatch: (a, b, c) => number('remove-then-match', `Roo has ${a + b} seeds and shares ${b}. Kit has ${a + c} seeds. How many seeds should Kit share to have the same number as Roo?`,
    c, `${a + b} − ${b} = ${a}. ${a + c} − ${a} = ${c}.`, ['Find how many seeds Roo has left.', 'Compare Kit’s seeds with Roo’s remaining seeds.'], {
      intermediate: [{
        prompt: 'How many seeds does Roo have left?',
        answer: a,
        retry: 'Start with Roo’s seeds and take away only the seeds Roo shared.',
        suffix: ' seeds left for Roo',
      }],
      stageHints: [
        ['Use only Roo’s numbers for this step.', `Take ${b} away from ${a + b}.`],
        ['Kit needs the same number that Roo has now.', 'Pair the seeds. The extras in Kit’s row are the seeds to share.'],
      ],
      models: [
        { kind: 'remove', start: a + b, change: b, icon: '🌰' },
        rows('pair', ['Roo', a], ['Kit', a + c], '🌰'),
      ],
      misconceptions: { [a + c]: 'That is Kit’s starting count. Find only the extra seeds Kit should share.' },
      vocabulary: ['left', 'same'],
    }),
};

const equation = {
  blank: (a, b) => number('missing-addend', `${a + b} = □ + ${b}`, a,
    `${a + b} = ${a} + ${b}`, ['Both sides must have the same value.', `Count up from ${b} to ${a + b}.`], { parameters: { total: a + b, part: b }, vocabulary: ['equal', 'addend'], models: [{ kind: 'line', start: b, target: a + b }] }),
  missingStart: (a, b) => number('missing-start', `□ − ${b} = ${a}`, a + b,
    `${a + b} − ${b} = ${a}`, ['The blank is the number you started with.', `Put the ${b} that were taken away back with the ${a} that are left.`], {
      parameters: { removed: b, remainder: a },
      vocabulary: ['left', 'equal'],
      models: [{ kind: 'join', parts: [a, b], icon: '●' }],
      misconceptions: { [a]: 'That is what is left. Put back what was taken away to find the starting number.' },
    }),
  balance: (a, b, c) => number('balance', `${a + b + c} − □ = ${a} + ${b}`, c,
    `${a + b + c} − ${c} = ${a + b}`, ['Find the value of the right side first.', `How much must you take away from ${a + b + c} to get ${a + b}?`],
    { parameters: { start: a + b + c, rightParts: [a, b] } }),
  truth: (a, b, c, random) => {
    const truth = random(0, 1);
    const right = c + (truth ? 0 : 1);
    return number('check-equality', `Is ${a} + ${b} = ${a + b + c} − ${right} true or false?`, truth ? 'True' : 'False',
      `The left side is ${a + b}. The right side is ${a + b + c - right}.`, ['Work out the value on each side.', 'The equation is true when the two values are the same.'],
      { parameters: { leftParts: [a, b], rightStart: a + b + c, rightRemoved: right }, answerType: 'choice', choices: ['True', 'False'] });
  },
  symbol: (a, b, c, random) => {
    const plus = random(0, 1);
    const result = plus ? a + b : a - b;
    return number('operation-symbol', `${a} □ ${b} = ${result}`, plus ? '+' : '−',
      `${a} ${plus ? '+' : '−'} ${b} = ${result}`, ['Ask whether the number gets bigger or smaller.', 'Try both operations and compare the result.'],
      { parameters: { first: a, second: b, target: result }, answerType: 'choice', choices: ['+', '−'] });
  },
};

function charts(kind, random) {
  const marks = kind === 'picture' ? ['🐱', '🐶', '🐦'] : [];
  const labels = kind === 'picture' ? ['Cats', 'Dogs', 'Birds'] : ['Soccer', 'Tennis', 'Swimming'];
  const votes = [random(2, 4), random(5, 6), random(7, 9)];
  const rows = labels.map((label, i) => ({ label, icon: marks[i], count: votes.splice(random(0, votes.length - 1), 1)[0] }));
  const [low, middle, high] = [...rows].sort((left, right) => left.count - right.count);
  const visual = { kind, rows };
  const hints = ['Each mark stands for one vote.', kind === 'tally' ? 'A crossed group is five. Count any single marks after it.' : 'Count the pictures in the rows that the question names.'];
  const difference = high.count - low.count;
  const grow = { kind: 'chart-grow', visual, label: low.label, target: high.label };
  return {
    count: number('count-votes', `How many votes did ${middle.label} get?`, middle.count, `${middle.label} has ${middle.count} votes.`, hints, { visual }),
    most: number('most-votes', 'Which group got the most votes?', high.label, `${high.label} has ${high.count} votes, the largest count.`, hints,
      { visual, answerType: 'choice', choices: labels }),
    least: number('fewest-votes', 'Which group got the fewest votes?', low.label, `${low.label} has ${low.count} votes, the smallest count.`, hints,
      { visual, answerType: 'choice', choices: labels }),
    tie: number('tie-votes', `How many more votes does ${low.label} need to have the same number as ${high.label}?`, difference,
      `${low.count} + ${difference} = ${high.count}`, [...hints, 'Add votes until the two groups are tied.'], {
        visual, models: [grow],
        misconceptions: { [difference + 1]: 'That puts the group ahead. Stop when the two groups are tied.' },
      }),
    gap: number('compare-votes', `How many fewer votes did ${low.label} get than ${high.label}?`, difference, `${high.count} − ${low.count} = ${difference}`, hints, { visual }),
    exceed: number('exceed-votes', `What is the smallest number of votes ${low.label} needs to add to have the most votes?`, difference + 1,
      `${low.count} + ${difference + 1} = ${high.count + 1}`, [...hints, `${low.label} needs one more vote than ${high.label}.`],
      { visual, models: [grow], misconceptions: { [difference]: 'That makes a tie. Add one more vote to take the lead.' } }),
    total: number('total-votes', 'How many votes were cast altogether?', rows.reduce((sum, row) => sum + row.count, 0),
      rows.map(row => row.count).join(' + ') + ` = ${low.count + middle.count + high.count}`, [...hints, 'Add the counts from all three rows.'], { visual }),
    statements: number('graph-statements', 'Choose two true statements about the votes.',
      [`${high.label} got the most votes.`, `${low.label} got the fewest votes.`],
      `${high.label} got ${high.count} votes. ${low.label} got ${low.count} votes.`, hints,
      { visual, answerType: 'multiple', choices: [`${high.label} got the most votes.`, `${middle.label} got the most votes.`, `${low.label} got the fewest votes.`, `${low.label} got more votes than ${high.label}.`] }),
  };
}

const roles = {
  join: 'result', separate: 'result', difference: 'difference', fewer: 'difference',
  fewerGiven: 'smaller', match: 'change', exceed: 'change', reach: 'change', remaining: 'result',
  shareThenMatch: 'change', blank: 'part', missingStart: 'start', balance: 'change',
  truth: 'truth', symbol: 'operation',
};

export const templates = { story, compare, steps, equation };

export function questionsFor(category, random) {
  if (category === 'tally' || category === 'picture') {
    return Object.fromEntries(Object.entries(charts(category, random)).map(([id, item]) => [id, {
      ...item, schema: 'graph',
      unknownRole: item.answerType === 'choice' ? 'category' : item.answerType === 'multiple' ? 'statements' : 'quantity',
    }]));
  }
  const a = random(5, 9);
  const b = random(1, 5);
  const c = random(1, 5);
  return Object.fromEntries(Object.entries(templates[category]).map(([id, make]) => [id, {
    schema: { story: 'change', steps: 'multi' }[category] ?? category,
    unknownRole: roles[id], ...make(a, b, c, random),
  }]));
}

export const activeTemplateSkills = Object.freeze(Object.fromEntries(worlds
  .filter(world => world.id !== 'mixed')
  .flatMap(({ id }) => Object.entries(questionsFor(id, min => min))
    .map(([key, question]) => [`${id}/${key}`, question.skill]))));

export const lessonTopics = {
  'story/combinePart': 'Find a missing part',
  'story/combineTotal': 'Find the whole',
  'story/join': 'Find the result after adding',
  'story/separate': 'Find the result after taking away',
  'story/joinChange': 'Find how many were added',
  'story/joinStart': 'Find the start before adding',
  'story/separateChange': 'Find how many were taken away',
  'story/separateStart': 'Find the start before taking away',
  'compare/difference': 'Find the difference',
  'compare/fewerGiven': 'Find the smaller group',
  'compare/largerGiven': 'Find the larger group',
  'compare/match': 'Make two groups equal',
  'compare/exceed': 'Find the smallest number to get ahead',
};
