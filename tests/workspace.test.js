import assert from 'node:assert/strict';
import { test } from 'node:test';
import { questionsFor } from '../js/curriculum.js';
import { seededRandom } from '../js/engine.js';
import { balanceState, moveOne, partWholeState } from '../js/workspace-state.js';

test('workspace moves stop at bounds, reverse one step and reset', () => {
  assert.equal(moveOne(0, 'return', 20), 0);
  assert.equal(moveOne(0, 'move', 0), 0);
  assert.equal(moveOne(19, 'move', 20), 20);
  assert.equal(moveOne(20, 'move', 20), 20);
  assert.equal(moveOne(20, 'return', 20), 19);
  assert.equal(moveOne(19, 'reset', 20), 0);
  assert.equal(moveOne(10, 'unknown', 20), 10);
});

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
