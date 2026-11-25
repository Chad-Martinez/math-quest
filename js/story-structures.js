const line = (start, target) => ({ kind: 'line', start, target });
const group = (first, second) => ({ kind: 'join', parts: [first, second], icon: '●' });

function story({ skill, schema, unknownRole, prompt, answer, equation, hints, model, quantities, unit, misconception }) {
  return {
    skill, schema, unknownRole, prompt, answer, equation, hints,
    answerType: 'number', models: [model], parameters: quantities, unit,
    misconceptions: misconception ? { [misconception[0]]: misconception[1] } : {},
  };
}

export const additionalStories = {
  combineTotal: (a, b) => story({
    skill: 'combine.total', schema: 'combine', unknownRole: 'total',
    prompt: `Nia has ${a} red beads and ${b} blue beads. How many beads does she have altogether?`,
    answer: a + b, equation: `${a} + ${b} = ${a + b}`,
    hints: ['Find both groups of beads.', 'Put both groups together and count each bead once.'],
    model: group(a, b), quantities: { first: a, second: b }, unit: ['bead', 'beads'],
    misconception: [a, 'That counts the red beads. Include the blue beads too.'],
  }),
  combinePart: (a, b) => story({
    skill: 'combine.part', schema: 'combine', unknownRole: 'part',
    prompt: `Nia has ${a + b} beads altogether. ${a} are red. The rest are blue. How many are blue?`,
    answer: b, equation: `${a} + ${b} = ${a + b}`,
    hints: ['The whole group has red and blue beads.', 'Mark the red beads. Count how many of the whole group are left to be blue.'],
    model: { kind: 'part-whole', known: a, total: a + b, alternative: line(a, a + b) },
    quantities: { known: a, total: a + b }, unit: ['bead', 'beads'],
    misconception: [a + b, 'That is the whole group. Find only the blue beads.'],
  }),
  joinChange: (a, b) => story({
    skill: 'change.join.change', schema: 'change', unknownRole: 'change',
    prompt: `Tess had ${a} stickers. A friend gave her some more. Now she has ${a + b}. How many stickers did her friend give her?`,
    answer: b, equation: `${a} + ${b} = ${a + b}`,
    hints: ['Find the starting count and the count after the friend helped.', 'Count up from the starting count. Count only the stickers added.'],
    model: line(a, a + b), quantities: { known: a, total: a + b }, unit: ['sticker', 'stickers'],
    misconception: [a + b, 'That is how many Tess has now. Find only what was added.'],
  }),
  joinStart: (a, b) => story({
    skill: 'change.join.start', schema: 'change', unknownRole: 'start',
    prompt: `Omar had some blocks. He got ${b} more blocks and now has ${a + b}. How many blocks did he have at the start?`,
    answer: a, equation: `${a} + ${b} = ${a + b}`,
    hints: ['Find the number added and the total at the end.', 'Take the new blocks out of the final group to see the starting group.'],
    model: line(b, a + b), quantities: { known: b, total: a + b }, unit: ['block', 'blocks'],
    misconception: [a + b, 'That is the final count. Take away the blocks Omar got later.'],
  }),
  separateChange: (a, b) => story({
    skill: 'change.separate.change', schema: 'change', unknownRole: 'change',
    prompt: `Ari had ${a + b} plums. Ari gave some away and has ${a} left. How many plums did Ari give away?`,
    answer: b, equation: `${a + b} − ${b} = ${a}`,
    hints: ['Find the number Ari started with and the number left.', 'Compare those two counts. The gap is the amount given away.'],
    model: line(a, a + b), quantities: { known: a, total: a + b }, unit: ['plum', 'plums'],
    misconception: [a + b, 'That is how many Ari started with. Find only what was given away.'],
  }),
  separateStart: (a, b) => story({
    skill: 'change.separate.start', schema: 'change', unknownRole: 'start',
    prompt: `Lina gave away ${b} cards and still has ${a}. How many cards did Lina have before giving any away?`,
    answer: a + b, equation: `${a + b} − ${b} = ${a}`,
    hints: ['Find the cards Lina kept and the cards Lina gave away.', 'Put both groups back together to find the starting count.'],
    model: group(a, b), quantities: { first: a, second: b }, unit: ['card', 'cards'],
    misconception: [a, 'That is what Lina has left. Include the cards Lina gave away too.'],
  }),
};

export const additionalComparisons = {
  largerGiven: (a, b) => story({
    skill: 'compare.larger', schema: 'compare', unknownRole: 'larger',
    prompt: `Rae collected ${a} stones. Sol collected ${b} more stones than Rae. How many stones did Sol collect?`,
    answer: a + b, equation: `${a} + ${b} = ${a + b}`,
    hints: ['Make one row for Rae and one for Sol.', 'Give Sol a matching row, then add the extra stones to Sol’s row. Count all of Sol’s stones.'],
    model: group(a, b), quantities: { first: a, second: b }, unit: ['stone', 'stones'],
    misconception: [b, 'That is the gap between the groups. Count all of Sol’s stones.'],
  }),
};
