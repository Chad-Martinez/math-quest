import { test } from 'node:test';
import assert from 'node:assert/strict';
import { worlds } from '../js/curriculum.js';
import { generateSession, Session, tallyGroups, validateAnswer } from '../js/engine.js';
import { readProgress, saveProgress } from '../js/storage.js';

const valueOf = expression => expression.match(/^[+-]?\d+|[+-]\d+/g).reduce((sum, item) => sum + Number(item), 0);
const compact = expression => expression.replaceAll(' ', '').replaceAll('−', '-');

test('seeded sessions exercise every template and stay within first-grade bounds', () => {
  assert.deepEqual(generateSession('mixed', 415), generateSession('mixed', 415));
  assert.notDeepEqual(generateSession('mixed', 415), generateSession('mixed', 416));
  const templates = new Set();
  for (let seed = 0; seed < 500; seed++) {
    for (const world of worlds) {
      const questions = generateSession(world.id, seed, 7);
      assert.equal(questions.length, 7);
      assert.equal(new Set(questions.map(q => JSON.stringify([q.prompt, q.visual]))).size, 7);
      for (const q of questions) {
        templates.add(q.templateId);
        const operands = (q.prompt + ' ' + q.equation).match(/\d+/g) ?? [];
        assert.ok(operands.every(item => Number(item) <= 20));
        assert.ok(validateAnswer(q, q.answerType === 'number' ? String(q.answer) : q.answer));
        if (q.choices) assert.equal(q.choices.length, new Set(q.choices).size);
        for (const match of q.equation.matchAll(/([\d +−]+) = (\d+(?: [−+] \d+)*)/g)) {
          assert.equal(valueOf(compact(match[1])), valueOf(compact(match[2])));
        }
        if (q.intermediate.length) {
          const [a, b] = q.equation.match(/\d+/g).map(Number);
          assert.equal(q.intermediate[0].answer, a + b);
        }
        if (q.skill === 'exceed') {
          const [small, big] = q.prompt.match(/\d+/g).map(Number);
          assert.equal(small + q.answer - 1, big);
          assert.ok(q.misconceptions[q.answer - 1]);
        }
        if (q.skill === 'check-equality') {
          const [a, b, c, d] = q.prompt.match(/\d+/g).map(Number);
          assert.equal(q.answer, a + b === c - d ? 'True' : 'False');
        }
        if (q.visual) {
          const values = q.visual.rows.map(row => row.count).sort((a, b) => a - b);
          assert.equal(new Set(values).size, 3);
          assert.ok(values.every(n => tallyGroups(n).reduce((sum, group) => sum + group, 0) === n));
          if (q.skill === 'count-votes') assert.equal(q.answer, values[1]);
          if (q.skill === 'compare-votes') assert.equal(q.answer, values[2] - values[0]);
          if (q.skill === 'exceed-votes') assert.equal(q.answer + values[0], values[2] + 1);
          if (q.skill === 'total-votes') assert.equal(q.answer, values.reduce((sum, n) => sum + n, 0));
          if (q.skill === 'most-votes') assert.equal(q.visual.rows.find(row => row.label === q.answer).count, values[2]);
          if (q.skill === 'graph-statements') {
            const high = q.visual.rows.find(row => row.count === values[2]);
            const low = q.visual.rows.find(row => row.count === values[0]);
            assert.deepEqual(q.answer, [`${high.label} got the most votes.`, `${low.label} got the fewest votes.`]);
          }
        }
      }
    }
  }
  assert.equal(templates.size, 24);
});

test('tally groups cross the fifth mark and leave remaining singles', () => {
  assert.deepEqual(tallyGroups(0), []);
  assert.deepEqual(tallyGroups(4), [4]);
  assert.deepEqual(tallyGroups(5), [5]);
  assert.deepEqual(tallyGroups(13), [5, 5, 3]);
});

test('validates numeric format and exactly the required statements', () => {
  const numeric = { answerType: 'number', answer: 5 };
  for (const input of ['5e0', '5.0', 'cats', '', null]) assert.equal(validateAnswer(numeric, input), false);
  const multiple = { answerType: 'multiple', answer: ['a', 'b'] };
  assert.equal(validateAnswer(multiple, ['b', 'a']), true);
  assert.equal(validateAnswer(multiple, ['a', 'a']), false);
  assert.equal(validateAnswer(multiple, ['a', 'b', 'c']), false);
});

test('sessions support retries, hints, worked examples, and one reward per solve', () => {
  const session = new Session(generateSession('story', 123));
  assert.equal(session.next(), false);
  assert.deepEqual(session.answer('0'), { correct: false });
  assert.equal(session.hint(), session.current.hints[0]);
  assert.deepEqual(session.answer(String(session.current.answer)), { correct: true, assisted: true });
  assert.equal(session.answer(String(session.current.answer)), null);
  assert.equal(session.stars, 1);
  session.next();
  for (const hint of session.current.hints) assert.equal(session.hint(), hint);
  assert.match(session.hint(), /^Worked example/);
  assert.equal(session.stars, 1);
  session.next();
  assert.equal(session.hints, 0);
  while (session.status !== 'complete') {
    session.answer(String(session.current.answer));
    session.next();
  }
  assert.equal(session.stars, 4);
  assert.equal(session.next(), false);
});

test('storage migrates prototype stars, validates stored values and tolerates errors', () => {
  const map = new Map([['mathquestStars', '6']]);
  const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  assert.deepEqual(readProgress(storage), { version: 1, stars: 6, adventures: 0, length: 5 });
  const progress = { version: 1, stars: 12, adventures: 2, length: 7 };
  assert.equal(saveProgress(storage, progress), true);
  assert.deepEqual(readProgress(storage), progress);
  map.set('math-quest.progress', '{');
  assert.equal(readProgress(storage).stars, 0);
  map.set('math-quest.progress', '{"version":1,"stars":-2,"length":100}');
  assert.equal(readProgress(storage).length, 5);
  assert.equal(readProgress(storage).stars, 0);
  assert.equal(readProgress().length, 5);
  assert.equal(saveProgress(undefined, progress), false);
});
