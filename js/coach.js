// Guide builders use question operands directly. Scripts before reveal describe actions.
const card = (objective, prerequisite, quickTip, steps, offlineActivity, unit = [], misconceptions = []) =>
  ({ objective, prerequisite, quickTip, steps, offlineActivity, unit, misconceptions });

function join([first, second]) {
  return card('Put two groups together and find the whole.', 'Count objects once each.',
    'Ask what the problem wants you to count altogether.',
    [`Make separate groups of ${first} and ${second}.`, 'Push the groups together. Count each object once.'],
    'Make two piles of coins, slide them together, and count the whole pile.', ['acorn', 'acorns'],
    ['If they report one group, point to the other group and ask whether it was counted.']);
}

function remove({ start, change }, unit, comparing = false) {
  return card(comparing ? 'Find the smaller group from a known difference.' : 'Find what is left after taking some away.',
    'Count a group and take objects out one at a time.',
    comparing ? 'Ask whose group should be smaller.' : 'Ask what happens to the starting group in the story.',
    [`Set out ${start} counters.`, `Move ${change} aside and count the counters still in the group.`],
    'Act out the change with small blocks. Keep the moved blocks apart.',
    unit, ['If they give the removed amount, ask them to point to the group the question asks about.']);
}

function compare({ rows }, unit, mode) {
  const [[first, a], [second, b]] = rows;
  const growing = mode === 'tie' || mode === 'lead';
  const lead = mode === 'lead';
  return card(lead ? 'Find the smallest addition that gives a clear lead.'
    : growing ? 'Make two groups equal.' : 'Measure the difference between two groups.',
  'Pair one object from each group.', growing ? 'Ask whether the goal is a tie or a lead.' : 'Ask which group has objects without partners.',
  [`Lay out ${a} for ${first} and ${b} for ${second} in aligned rows.`,
    growing ? `Add objects to ${first}’s row until every object has a partner.` : 'Pair one from each row. Count the objects without partners.',
    ...(lead ? ['Add one more after tying. Count only the objects you added.'] : growing ? ['Count only the objects you added.'] : [])],
  'Line up two rows of toy cars. Touch each pair together.',
  unit, [lead ? 'If the rows tie, ask whether either group is ahead yet.' : growing
    ? 'If they give the new total, ask how many objects they added.' : 'If they give a total, point to the matched pairs and ask what remains unmatched.']);
}

function twoStep([first, second], type) {
  if (type === 'share') {
    const [, [name, larger]] = second.rows;
    return card('Find both groups after a change, then make them equal.', 'Take away and match groups.',
      'Ask whose group changes first. Cover the other name for a moment.',
      [`Set out ${first.start} for Roo and move away ${first.change}.`, `Set out ${larger} for ${name} and pair them with Roo’s remaining counters.`,
        'Work out how many extras Kit should move away.'],
      'Use separate plates for both groups. Remove from Roo’s plate before comparing.', ['seed', 'seeds'],
      ['If they use Kit’s starting count as the answer, ask how many of those seeds have no partners.']);
  }
  const [a, b] = first.parts;
  const target = type === 'target';
  return card(target ? 'Find how much more is needed after joining two groups.' : 'Join two groups and then take some away.',
    'Find the total of two small groups.',
    'Ask what to find first. Keep the final question visible for later.',
    [`Make groups of ${a} and ${b}. Combine and record the current count.`,
      target ? `Count on from that count to the target of ${second.target}.` : `Remove ${second.change} from the combined group.`,
      target ? 'Report how many you added.' : 'Count what remains and report that amount.'],
    'Join two piles of blocks. Mark the first count on paper before doing the second action.',
    target ? ['gem', 'gems'] : ['berry', 'berries'],
    ['If they give the first total, ask which action is still needed.']);
}

const chartScripts = {
  count: ['Count votes for a named category.', 'Ask which row to read.', 'Count just that row and answer with a number.'],
  most: ['Identify the category with the most votes.', 'Ask whether the answer is a name or a number.', 'Check all three counts and name the row with the most votes.'],
  least: ['Identify the category with the fewest votes.', 'Ask whether the answer is a name or a number.', 'Check all three counts and name the row with the fewest votes.'],
  gap: ['Find the difference between two vote counts.', 'Ask what two rows are being compared.', 'Match votes in pairs across those two rows and count the extras.'],
  tie: ['Work out the extra votes needed for a tie.', 'Ask what tied groups look like.', 'Match the named rows. Add to the smaller row until every vote has a partner.'],
  exceed: ['Work out the fewest extra votes needed for the lead.', 'Ask how a lead differs from a tie.', 'Tie the highest row, then add exactly one more. Count only the added votes.'],
  total: ['Use every row to find the total number of votes.', 'Ask which rows belong in the total.', 'Count each row, then combine all the row counts.'],
  statements: ['Check multiple claims against one chart.', 'Ask what evidence would make each statement true.', 'Check each statement in turn against the rows. Select exactly two supported statements.'],
};

function chart(question, key) {
  const tally = question.visual.kind === 'tally';
  const [objective, quickTip, genericAction] = chartScripts[key];
  const [low, middle, high] = [...question.visual.rows].sort((a, b) => a.count - b.count);
  const actions = {
    count: `Point to ${middle.label}. Count that row and answer with a number.`,
    gap: `Pair votes from ${low.label} and ${high.label}. Count the votes without partners.`,
    tie: `Add votes to ${low.label} until its count matches ${high.label}. Count only what you added.`,
    exceed: `Match ${low.label} to ${high.label}, then add one more. Count only what you added.`,
  };
  const action = actions[key] ?? genericAction;
  return card(objective, tally ? 'Read single tally marks and groups of five.' : 'Count one object per picture.',
    quickTip, [tally ? 'Point to the chart. Count a crossed group as five and each extra stroke as one.'
      : 'Point to the chart. Count each picture as one vote.', action],
    tally ? 'Tally votes for pretend sports. Cross the first four strokes when you reach five.'
      : 'Sort toy animals into rows and count one vote per toy.',
    ['vote', 'votes'], key === 'statements'
      ? ['If a claim sounds right, ask which counts or rows prove it.']
      : ['most', 'least'].includes(key) ? ['If they give a number, ask which category has that count.']
        : ['If they name a category, reread what the question asks to count.']);
}

const equationGuides = {
  blank: ({ total, part }) => card('Find the missing part that makes both sides equal.', 'Understand that two expressions can have the same value.',
    'Ask what number the left side stands for.', [`Build the total of ${total} in one row.`, `Start the other row with ${part}. Add until the rows match.`],
    'Make equal rows with blocks and cover the extras in the second row.', [], ['If they copy the shown part, ask what quantity is still missing.']),
  missingStart: ({ removed, remainder }) => card('Find the starting amount in a subtraction equation.', 'Join two groups and undo a subtraction.',
    'Ask what the blank represents before any objects are taken away.',
    [`Put out the ${remainder} that remain.`, `Return the ${removed} that were taken away and count the starting group.`],
    'Hide some counters, then slide the hidden counters back to rebuild the original group.', [], ['If they give the remainder, ask what was in the group before removal.']),
  balance: ({ start, rightParts }) => card('Remove enough to make the left and right sides equal.', 'Add two groups and compare totals.',
    'Ask which side you can work out first.', [`Combine ${rightParts[0]} and ${rightParts[1]} on the right side.`,
      `Start with ${start} on the left and remove until the sides match. Count only what was removed.`],
    'Use two plates to represent the two sides and match their counts.', [], ['If they give the right-hand total, ask what the blank counts.']),
  truth: ({ leftParts, rightStart, rightRemoved }) => card('Decide whether both sides of an equation have the same value.', 'Count on and take away.',
    'Ask what the equal sign says about the two sides.', [`Join ${leftParts[0]} and ${leftParts[1]} on one side.`,
      `Start with ${rightStart} on the other side and remove ${rightRemoved}. Compare what each side represents.`],
    'Build the two expressions with counters on a pair of mats.', [], ['If they look at only one side, ask them to show the value on both sides.']),
  symbol: ({ first, second, target }) => card('Find the operation that makes the equation true.', 'Describe what adding and taking away do to a count.',
    'Ask how the starting count would change with each operation.', [`Start with ${first} counters. Try adding ${second}, then reset and try taking ${second} away.`,
      `Compare each result with the target of ${target}.`],
    'Use a plus card and a minus card. Test each action with blocks.', [], ['If they choose by the look of the sign, try both actions and compare the resulting counts.']),
};

const guides = {
  'story/join': q => join(q.models[0].parts),
  'story/separate': q => remove(q.models[0], ['apple', 'apples']),
  'compare/difference': q => compare(q.models[0], ['toy car', 'toy cars'], 'gap'),
  'compare/fewer': q => compare(q.models[0], ['flag', 'flags'], 'gap'),
  'compare/fewerGiven': q => remove(q.models[0], ['ribbon', 'ribbons'], true),
  'compare/match': q => compare(q.models[0], ['sticker', 'stickers'], 'tie'),
  'compare/exceed': q => compare(q.models[0], ['shell', 'shells'], 'lead'),
  'steps/reach': q => twoStep(q.models, 'target'),
  'steps/remaining': q => twoStep(q.models, 'remove'),
  'steps/shareThenMatch': q => twoStep(q.models, 'share'),
  ...Object.fromEntries(Object.keys(chartScripts).flatMap(key =>
    ['picture', 'tally'].map(kind => [`${kind}/${key}`, q => chart(q, key)]))),
  ...Object.fromEntries(Object.entries(equationGuides).map(([key, make]) =>
    [`equation/${key}`, q => make(q.parameters)])),
};

export const coachTemplateIds = Object.keys(guides);

export function buildCoachGuide(question) {
  const make = Object.hasOwn(guides, question.templateId) && guides[question.templateId];
  if (!make) return null;
  const content = make(question);
  const unit = question.answerType === 'number' ? content.unit[question.answer === 1 ? 0 : 1] ?? '' : '';
  return {
    ...content,
    accommodation: 'Show one step at a time and keep the quantities visible.',
    solution: { value: question.answer, unit, explanation: question.explanation },
  };
}
