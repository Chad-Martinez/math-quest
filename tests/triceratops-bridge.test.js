import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceChapter, applyChapterAnswer, chapterBridgeQuestion, chapterKey, emptyAttempt, readChapter, startChapter } from '../js/chapter.js';
import { advanceToMap, mapState } from '../js/adventure-map-state.js';
import { bridgeChallenge, bridgeGuide } from '../js/triceratops-content.js';
import { bridgeCopy, bridgeCounts, bridgeQuestion, bridgeVariants, chooseBridgeVariant, newBridgeBeat } from '../js/triceratops-state.js';

const defaults = { version: 1, badge: true, runs: 2, autoBreak: true };
const snapshot = state => readChapter({ getItem: key => key === chapterKey ? JSON.stringify(state) : null });
const checkpoint = (variant, shared = 0) => ({ ...defaults, run: { scene: 'share', seed: 2026, bridgeVariant: variant,
  outcomes: ['independent', 'assisted', null, null, null],
  attempt: { ...emptyAttempt(), bridge: { ...newBridgeBeat('construction'), shared } } } });

test('all six variants conserve planks and reconcile only after a correct answer', () => {
  for (const [variant, values] of bridgeVariants.entries()) {
    const { target, initial, missing, supply } = values;
    const q = chapterBridgeQuestion(checkpoint(variant).run);
    assert.deepEqual(q.values, values);
    assert.equal(target - initial, missing);
    assert.equal(supply, missing + 2);
    assert.ok(q.story.includes(`has ${target} wooden`) && q.story.includes(`has ${initial} wooden`));
    assert.equal(bridgeCopy(bridgeGuide.equations[0], values), `${initial} + ${missing} = ${target}`);
    assert.ok(bridgeCopy(bridgeGuide.physicalDemo, values).includes(`${target} and ${initial} LEGO`));
    for (let shared = 0; shared <= supply; shared++) {
      const { first, second, spare } = bridgeCounts(values, shared);
      assert.equal(first, target);
      assert.equal(second + spare, initial + supply);
      const state = checkpoint(variant, shared);
      const run = state.run;
      assert.equal(advanceChapter(state), state);
      assert.equal(applyChapterAnswer(run, q, '-1'), run);
      assert.equal(applyChapterAnswer(run, q, '2.5'), run);
      const wrong = applyChapterAnswer(run, q, String(target + initial));
      assert.match(wrong.attempt.error, /altogether/);
      assert.equal(wrong.attempt.bridge.shared, shared);
      assert.equal(wrong.outcomes[2], null);
      const solved = applyChapterAnswer(run, q, String(missing));
      assert.equal(solved.attempt.bridge.phase, 'equality');
      assert.equal(solved.outcomes[2], 'independent');
      assert.deepEqual(bridgeCounts(values, solved.attempt.bridge.shared), { first: target, second: target, spare: 2 });
      assert.equal(applyChapterAnswer(solved, q, String(missing)), solved);
      const stored = snapshot({ ...state, run: solved });
      assert.deepEqual(stored.run, solved);
      assert.equal(stored.runs, 2);
      assert.equal(stored.badge, true);
    }
  }
});

test('correct answers precede misconceptions and overlapping misses obey kit order', () => {
  const collision = bridgeQuestion(bridgeVariants[3]);
  assert.equal(collision.values.initial, collision.values.missing);
  assert.equal(applyChapterAnswer(checkpoint(3).run, collision, '5').attempt.solved, true);
  const overlappingMiss = bridgeQuestion({ target: 9, initial: 5 });
  assert.match(overlappingMiss.mistakes[0][5], /already has/);
  assert.match(bridgeQuestion(bridgeVariants[0]).mistakes[0][5], /more planks/);
  assert.equal(bridgeGuide.transfer.answer, 4);
});

test('first play, replay, saved work, legacy eligibility and map progression use existing identifiers', () => {
  const first = startChapter({ ...defaults, run: null }, 2026);
  assert.equal(first.run.bridgeVariant, 0);
  assert.deepEqual(chapterBridgeQuestion(first.run).values, bridgeVariants[0]);
  assert.equal(new Set(Array.from({ length: 36 }, (_, seed) => chooseBridgeVariant(first, seed))).size, 5);

  const state = checkpoint(0, 6);
  state.run.attempt.draft = '3';
  state.run.attempt.bridge.tool = 'line';
  state.run.attempt.bridge.position = 9;
  state.run.attempt.bridge.help = ['tools'];
  state.run.attempt.bridge.slots = true;
  state.run.attempt.bridge.mistakes = 2;
  const stored = snapshot(state);
  assert.deepEqual(stored.run.attempt.bridge, state.run.attempt.bridge);
  assert.equal(stored.run.attempt.draft, '3');
  assert.equal(stored.run.attempt.assisted, true);
  const solved = applyChapterAnswer(stored.run, chapterBridgeQuestion(stored.run), '4');
  assert.equal(solved.outcomes[2], 'assisted');
  solved.attempt.bridge.phase = 'clue';
  solved.attempt.bridge.line = 1;
  assert.deepEqual(snapshot({ ...stored, run: solved }).run, solved);
  const next = advanceToMap({ ...stored, run: solved });
  assert.equal(next.run.scene, 'wiggle');
  assert.equal(next.run.mapFrom, '3');
  assert.equal(mapState(next.run).offerBreak, true);
  const disabled = advanceToMap({ ...stored, autoBreak: false, run: solved });
  assert.equal(disabled.run.scene, 'gems');
  assert.equal(disabled.run.mapFrom, '3');
  assert.equal(mapState(disabled.run).current, '4');

  const legacy = checkpoint(undefined);
  delete legacy.run.attempt.bridge;
  const oldQuestion = chapterBridgeQuestion(legacy.run);
  legacy.run.attempt.draft = String(oldQuestion.answers[0]);
  assert.equal(snapshot(legacy).run.attempt.bridge.phase, 'construction');
  assert.equal(snapshot(legacy).run.attempt.draft, legacy.run.attempt.draft);
  legacy.run.outcomes[2] = 'independent';
  const migrated = snapshot(legacy);
  assert.equal(migrated.run.attempt.bridge.phase, 'equality');
  assert.equal(migrated.run.attempt.bridge.shared, oldQuestion.answers[0]);
  assert.equal(migrated.runs, legacy.runs);
  assert.equal(migrated.badge, legacy.badge);

  const broken = checkpoint(0, 99);
  broken.run.attempt.bridge.phase = 'crossing';
  broken.run.attempt.bridge.position = 20;
  assert.deepEqual(snapshot(broken).run.attempt.bridge, newBridgeBeat('construction'));
  assert.deepEqual(bridgeQuestion(bridgeChallenge.guidedExample).equations[0], '4 + 2 = 6');
});
