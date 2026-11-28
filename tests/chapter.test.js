import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceChapter, applyChapterAnswer, chapterBridgeQuestion, chapterKey, chapterQuestions, finishChallenge, freshQuestion,
  readChapter, scenes, startChapter, stops,
} from '../js/chapter.js';

const memory = (value, legacy = '') => ({
  getItem: key => key === chapterKey ? value : legacy,
});
const initial = () => readChapter(memory(null));
const snapshot = state => readChapter(memory(JSON.stringify(state)));

function hit(state, question, value) {
  return { ...state, run: applyChapterAnswer(state.run, question, String(value)) };
}

function solved(state, question) {
  return question.answers.reduce((next, answer) => hit(next, question, answer), state);
}

test('5,000 seeds preserve all five story relationships, step answers and 0–20 bounds', () => {
  const answersByStop = stops.map(() => new Set());
  for (let seed = 0; seed < 5000; seed++) {
    const questions = chapterQuestions(seed);
    assert.deepEqual(questions, chapterQuestions(seed));
    assert.deepEqual(questions.map(q => q.id), stops);
    const [supplies, footprints, share, gems, cave] = questions;
    const { a, b, have, need } = supplies.params;
    assert.equal(have, a + b);
    assert.deepEqual(supplies.answers, [a + b, need - a - b]);
    assert.ok(need <= 20 && need > have);
    for (const question of [footprints, share, gems]) {
      const { small, large } = question.params;
      const [answer] = question.answers;
      assert.ok(small > 0 && large > small);
      assert.equal(answer, large - small + Number(question === gems));
      assert.ok(small + large + Number(question === gems) <= 20);
      if (question === gems) {
        assert.equal(small + answer - 1, large);
        assert.equal(small + answer, large + 1);
        assert.match(question.mistakes[0][answer - 1], /tie/);
        assert.match(question.prompts[0], /smallest/);
      }
    }
    const { left, rightParts: [first, second], total } = cave.params;
    assert.ok(left <= 20 && left > total && total > 0);
    assert.deepEqual(cave.answers, [first + second, left - first - second]);
    for (const [index, question] of questions.entries()) {
      assert.equal(question.answers.length, question.prompts.length);
      assert.equal(question.answers.length, question.hints.length);
      assert.ok(question.hints.every(levels => levels.length === (question === share ? 3 : 2)));
      assert.ok(question.ask && question.objective && question.activity);
      assert.ok(question.answers.every(value => Number.isInteger(value) && value >= 0 && value <= 20));
      assert.ok(question.equations.every(equation => equation.split(';').every(part => {
        const [lhs, rhs] = part.split('=');
        const sum = side => side.trim().replaceAll('−', '-').match(/[+-]?\s*\d+/g)
          .reduce((total, term) => total + Number(term.replaceAll(' ', '')), 0);
        return sum(lhs) === sum(rhs);
      })));
      answersByStop[index].add(question.answers.at(-1));
    }
  }
  assert.ok(answersByStop.every(values => values.size >= 4));
});

test('all five transfer problems are fresh, deterministic and measure the same schema', () => {
  for (let seed = 0; seed < 100; seed++) {
    chapterQuestions(seed).forEach((question, index) => {
      const transfer = freshQuestion(seed, index);
      assert.deepEqual(transfer, freshQuestion(seed, index));
      assert.equal(transfer.schema, question.schema);
      assert.notEqual(transfer.answers.at(-1), question.answers.at(-1));
    });
  }
});

test('scene sequence, saved checkpoint, default break, completion and replay', () => {
  const seed = 42;
  const questions = chapterQuestions(seed);
  let state = startChapter(initial(), seed);
  const visited = ['welcome'];
  while (state.run.scene !== 'replay') {
    visited.push(state.run.scene);
    const index = stops.indexOf(state.run.scene);
    if (index >= 0) {
      assert.equal(advanceChapter(state), state);
      state = solved(state, index === 2 ? chapterBridgeQuestion(state.run) : questions[index]);
    }
    state = snapshot(advanceChapter(state));
  }
  visited.push('replay');
  assert.deepEqual(visited, scenes);
  assert.equal(state.runs, 1);
  assert.equal(state.badge, true);
  assert.equal(advanceChapter(state), state);
  const replay = startChapter(state, seed + 1);
  assert.equal(replay.badge, true);
  assert.equal(replay.runs, 1);
  assert.deepEqual(replay.run.outcomes, Array(5).fill(null));
});

test('break preference survives storage and skips only the scheduled stop', () => {
  const initialState = startChapter({ ...initial(), autoBreak: false }, 44);
  const state = { ...initialState, run: { ...initialState.run, scene: 'share' } };
  const after = advanceChapter(solved(state, chapterBridgeQuestion(state.run)));
  assert.equal(snapshot(after).run.scene, 'gems');
  assert.equal(snapshot(after).autoBreak, false);
});

test('intermediate answers, targeted feedback and outcomes survive stage changes', () => {
  const q = chapterQuestions(19);
  const state = advanceChapter(advanceChapter(startChapter(initial(), 19)));
  assert.equal(applyChapterAnswer(state.run, q[1], '2'), state.run);
  assert.equal(applyChapterAnswer(state.run, q[0], '21'), state.run);
  assert.equal(hit(state, q[0], 0).run.attempt.step, 0);
  const stepTwo = hit(state, q[0], q[0].answers[0]);
  assert.equal(snapshot(stepTwo).run.attempt.step, 1);
  assert.equal(stepTwo.run.outcomes[0], null);
  stepTwo.run.attempt.hints = 1;
  const restored = snapshot(stepTwo);
  assert.equal(restored.run.attempt.assisted, true);
  const final = hit(restored, q[0], q[0].answers[1]);
  assert.equal(final.run.outcomes[0], 'assisted');
  const worked = finishChallenge(state.run, 'worked-example');
  assert.equal(worked.outcomes[0], 'worked-example');
  assert.equal(solved(state, q[0]).run.outcomes[0], 'independent');

  const gems = { ...state, run: { ...state.run, scene: 'gems' } };
  assert.match(hit(gems, q[3], q[3].answers[0] - 1).run.attempt.error, /tie/);
});

test('malformed chapter storage recovers without interpreting legacy progress', () => {
  const legacy = '{"stars":12}';
  const storage = memory('{', legacy);
  assert.deepEqual(readChapter(storage), initial());
  assert.equal(storage.getItem('math-quest.progress'), legacy);
  const corrupted = { version: 1, runs: Infinity, run: { seed: -4, scene: 'other' } };
  assert.deepEqual(snapshot(corrupted), initial());
});
