import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceChapter, chapterKey, emptyAttempt, readChapter } from '../js/chapter.js';
import { advanceToMap, mapState } from '../js/adventure-map-state.js';
import { meadowAnimations, meadowScene } from '../js/wiggle-meadow-content.js';
import { meadowBeats, readMeadowBeat } from '../js/wiggle-meadow-state.js';

const saved = (run, autoBreak = true) => ({
  version: 1, autoBreak, badge: true, runs: 2,
  run: { seed: 2026, outcomes: ['independent', 'assisted', 'independent', null, null], attempt: emptyAttempt(), ...run },
});
const restore = checkpoint => readChapter({ getItem: key => key === chapterKey ? JSON.stringify(checkpoint) : null });

test('the seven authored beats contain five finite demonstrations', () => {
  assert.deepEqual(meadowBeats.map(beat => beat.id), ['welcome', 'stretch', 'stomp', 'march', 'wiggle', 'cooldown', 'departure']);
  assert.deepEqual(Object.entries(meadowAnimations).filter(([, value]) => Number.isInteger(value.repetitions))
    .map(([id, { repetitions, cycleMs }]) => [id, repetitions, cycleMs]), [
    ['stretch', 3, 1800], ['stomp', 5, 850], ['march', 6, 650], ['wiggle', 4, 2000], ['cooldown', 2, 4000],
  ]);
  assert.equal(meadowScene.countsAsChallenge, false);
  assert.equal(meadowAnimations.interruptible, true);
  assert.equal(meadowScene.reward, false);
});

test('only an entered scheduled break restores a valid scene position', () => {
  const pending = restore(saved({ scene: 'wiggle', mapFrom: '3', meadow: { beat: 'cooldown', line: 1 } }));
  assert.equal(pending.run.meadow, undefined);
  assert.equal(mapState(pending.run).offerBreak, true);
  assert.deepEqual(restore(saved({ scene: 'wiggle' })).run.meadow, { beat: 'welcome', line: 0 });
  for (const beat of meadowBeats) {
    const line = Array.isArray(beat.dialogue) ? beat.dialogue.length - 1 : 0;
    const checkpoint = restore(saved({ scene: 'wiggle', meadow: { beat: beat.id, line } }));
    assert.deepEqual(checkpoint.run.meadow, { beat: beat.id, line });
  }
  assert.deepEqual(readMeadowBeat({ beat: 'unknown', line: 4 }), { beat: 'welcome', line: 0 });
  assert.deepEqual(readMeadowBeat({ beat: 'stomp', line: 9 }), { beat: 'stomp', line: 0 });
  assert.deepEqual(readMeadowBeat({ beat: 'cooldown', line: 9 }), { beat: 'cooldown', line: 1 });
});

test('end, skip and preference use the existing map and never change rewards', () => {
  const entered = restore(saved({ scene: 'wiggle', meadow: { beat: 'march', line: 0 } }));
  const end = advanceToMap(entered);
  const skipped = advanceToMap(restore(saved({ scene: 'wiggle', mapFrom: '3' })), { skipBreak: true });
  const disabled = advanceToMap({ ...saved({ scene: 'share', attempt: { ...emptyAttempt(), solved: true } }, false) });
  for (const next of [end, skipped, disabled]) {
    assert.equal(next.run.scene, 'gems');
    assert.equal(mapState(next.run).current, '4');
    assert.equal(mapState(next.run).offerBreak, false);
    assert.deepEqual(next.run.outcomes, entered.run.outcomes);
    assert.equal(next.badge, true);
    assert.equal(next.runs, 2);
    assert.equal(next.run.meadow, undefined);
    assert.equal(advanceChapter(next), next);
  }
  assert.equal(end.run.mapFrom, 'break');
  assert.equal(skipped.run.mapFrom, '3');
  assert.equal(disabled.autoBreak, false);
});
