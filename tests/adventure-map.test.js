import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapSpec } from '../js/adventure-map-data.js';
import { advanceToMap, mapState } from '../js/adventure-map-state.js';
import { chapterQuestions, emptyAttempt, finishChallenge, readChapter, stops } from '../js/chapter.js';

const checkpoint = (scene, completed = 0, extra = {}, autoBreak = true) => ({
  version: 1, autoBreak, badge: false, runs: 0,
  run: { scene, seed: 2026, outcomes: stops.map((_, index) => index < completed ? 'independent' : null),
    attempt: emptyAttempt(), ...extra },
});
const reload = progress => readChapter({ getItem: () => JSON.stringify(progress) });

test('canonical routes connect the ordered waypoints and only five are math stops', () => {
  const order = ['start', '1', '2', '3', 'break', '4', '5'];
  assert.deepEqual(mapSpec.stops.map(stop => stop.id), order);
  assert.equal(mapSpec.stops.filter(stop => /^\d$/.test(stop.id)).length, chapterQuestions(2026).length);
  const coordinates = Object.fromEntries(mapSpec.stops.map(({ id, x, y }) => [id, [x, y]]));
  for (const [index, segment] of mapSpec.segments.entries()) {
    assert.equal(segment.from, order[index]);
    assert.equal(segment.to, order[index + 1]);
    assert.deepEqual(segment.points[0], coordinates[segment.from]);
    assert.deepEqual(segment.points.at(-1), coordinates[segment.to]);
  }
  assert.equal(mapSpec.connectorSegments.length, 2);
});

test('only existing chapter transitions determine completion, next stops and rewards', () => {
  const targets = ['2', '3', 'break', '5', null];
  const scenes = ['footprints', 'share', 'wiggle', 'cave', 'mosasaurus'];
  for (const [index, scene] of stops.entries()) {
    const progress = checkpoint(scene, index);
    assert.equal(advanceToMap(progress), progress, 'unfinished answers cannot advance');
    progress.run = finishChallenge(progress.run, 'independent');
    const saved = reload(advanceToMap(progress));
    const route = mapState(saved.run);
    assert.equal(saved.run.scene, scenes[index]);
    assert.equal(route.current, targets[index]);
    assert.equal(route.from, String(index + 1));
    assert.equal(route.completed.filter(Boolean).length, index + 1);
    assert.equal(saved.runs, 0);
    assert.equal(saved.badge, false);
  }
});

test('skipped, completed and disabled wiggle breaks go to the lagoon without a math outcome', () => {
  const offered = checkpoint('wiggle', 3, { mapFrom: '3' });
  assert.equal(mapState(offered.run).offerBreak, true);
  for (const skipBreak of [true, false]) {
    const after = reload(advanceToMap(offered, { skipBreak }));
    assert.equal(after.run.scene, 'gems');
    assert.equal(after.run.mapFrom, skipBreak ? '3' : 'break');
    assert.equal(mapState(after.run).offerBreak, false);
    assert.deepEqual(after.run.outcomes, offered.run.outcomes);
  }
  const disabled = checkpoint('share', 3, { attempt: { ...emptyAttempt(), solved: true } }, false);
  const next = reload(advanceToMap(disabled));
  assert.equal(next.run.scene, 'gems');
  assert.equal(mapState(next.run).dialogue, 'break');
  assert.equal(reload(checkpoint('cave', 4, { mapFrom: 'break' })).run.mapFrom, undefined);
});

test('on-demand map highlights the same unfinished stop and offers resume', () => {
  const progress = checkpoint('footprints', 1);
  const before = JSON.stringify(progress);
  const state = mapState(progress.run, true);
  assert.deepEqual([state.from, state.current, state.action], ['2', '2', 'Continue Stop']);
  assert.equal(JSON.stringify(progress), before);
});
