import assert from 'node:assert/strict';
import { test } from 'node:test';
import { questionsFor } from '../js/curriculum.js';
import { seededRandom } from '../js/engine.js';
import { balanceState, partWholeState, togglePiece } from '../js/workspace-state.js';

test('part–part–whole conserves beads and identifies the unknown part', () => {
  for (let seed = 0; seed < 2000; seed++) {
    const item = questionsFor('story', seededRandom(Math.imul(seed, 2654435761))).combinePart;
    const config = item.models[0];
    const [whole, red] = item.prompt.match(/\d+/g).map(Number);
    const initial = { ...config };
    assert.equal(config.kind, 'part-whole');
    for (let moved = 0; moved <= whole; moved++) {
      const result = partWholeState(config, moved);
      assert.equal(result.red + result.remaining, whole);
      assert.equal(result.relation, Math.sign(moved - red));
      if (result.relation === 0) assert.equal(result.remaining, item.answer);
    }
    assert.deepEqual(config, initial);
  }
  assert.deepEqual(partWholeState({ total: 20, known: 20 }, 20), { red: 20, remaining: 0, relation: 0 });
});

test('each equation balance is level exactly when the blank is correct', () => {
  for (let seed = 0; seed < 2000; seed++) {
    const bank = questionsFor('equation', seededRandom(Math.imul(seed, 2654435761)));
    for (const item of [bank.blank, bank.balance]) {
      const config = item.models[0];
      const adding = item === bank.blank;
      assert.equal(config.kind, 'balance');
      assert.equal(config.action, adding ? 'add-right' : 'remove-left');
      const [left, ...rightParts] = item.prompt.match(/\d+/g).map(Number);
      const right = rightParts.reduce((total, count) => total + count, 0);
      const limit = adding ? 20 - right : left;
      const balanced = [];
      for (let moved = 0; moved <= limit; moved++) {
        const result = balanceState(config, moved);
        assert.equal(result.leftCount, adding ? left : left - moved);
        assert.equal(result.rightCount, adding ? right + moved : right);
        if (result.relation === 0) balanced.push(moved);
      }
      assert.deepEqual(balanced, [item.answer]);
    }
  }
});


test('moving an individual bead preserves identity, counts, and prior state', () => {
  const initial = new Set();
  const red = togglePiece(togglePiece(initial, 4, 12), 9, 12);
  assert.deepEqual([...red], [4, 9]);
  assert.equal(initial.size, 0);
  assert.equal(togglePiece(red, -1, 12), red);
  assert.equal(togglePiece(red, 12, 12), red);
  assert.equal(togglePiece(red, 3.5, 12), red);
  assert.deepEqual([...togglePiece(red, 4, 12)], [9]);
  assert.deepEqual(partWholeState({ total: 12, known: 2 }, red.size),
    { red: 2, remaining: 10, relation: 0 });
});

test('moving the same blocks back restores both pans in addition and subtraction', () => {
  for (const [config, limit] of [
    [{ left: 12, rightParts: [8, 2], action: 'remove-left' }, 12],
    [{ left: 10, rightParts: [8], action: 'add-right' }, 12],
  ]) {
    const start = new Set();
    const a = togglePiece(start, 2, limit);
    const b = togglePiece(a, 4, limit);
    assert.deepEqual([...b], [2, 4]);
    assert.equal(balanceState(config, b.size).relation, 0);
    const past = togglePiece(b, 9, limit);
    assert.equal(balanceState(config, past.size).relation, -1);
    const back = togglePiece(togglePiece(togglePiece(past, 4, limit), 2, limit), 9, limit);
    assert.deepEqual(balanceState(config, back.size), balanceState(config, start.size));
    assert.equal(start.size, 0);
  }
});
