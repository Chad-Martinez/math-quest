import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chapterKey, chapterQuestions, chapterTrailQuestion, applyChapterAnswer, readChapter,
  startChapter, advanceChapter, emptyAttempt } from '../js/chapter.js';
import { trailChallenge, trailScene, trailDialogue } from '../js/velociraptor-content.js';
import { legalPairs, newTrailBeat, nextTrailPair, trailQuestion } from '../js/velociraptor-state.js';
import { advanceToMap } from '../js/adventure-map-state.js';

const restore = value => readChapter({ getItem: key => key === chapterKey ? JSON.stringify(value) : null });
const initial = restore(null);

test('authored variants agree on direction, absolute difference, units and utterance', () => {
  assert.deepEqual(trailScene.beats.map(beat => beat.id), ['arrival', 'intro', 'compare', 'solve', 'success', 'clue']);
  for (const id of trailScene.beats.flatMap(beat => beat.dialogueIds ?? [])) assert.ok(trailDialogue[id]);
  assert.equal(trailChallenge.variants.length, 6);
  const counts = new Set();
  for (const variant of trailChallenge.variants) {
    const q = trailQuestion(variant);
    assert.ok([variant.first, variant.second].every(value => Number.isInteger(value) && value > 0));
    const other = variant.subject === 'first' ? 'second' : 'first';
    assert.equal(variant[variant.subject] - variant[other], variant.relation === 'more' ? variant.answer : -variant.answer);
    assert.match(q.prompts[0], new RegExp(`How many ${variant.relation} footprints does the ${variant.subject}`));
    assert.equal(q.answers[0], Math.abs(variant.first - variant.second));
    assert.equal(q.answers[0], variant.answer);
    assert.equal(q.equations[0], `${q.values.larger} − ${q.values.smaller} = ${q.values.difference}`);
    counts.add(q.values.difference);
  }
  assert.ok(counts.size >= 4);
  assert.equal(trailQuestion(trailChallenge.variants[0]).values.statement, 'The first trail has four more footprints');
});

test('first play, deterministic replays and existing questions retain their checkpoints', () => {
  let state = startChapter(initial, 123);
  assert.equal(state.run.trailVariant, 0);
  assert.deepEqual(chapterTrailQuestion(state.run).answers, [4]);
  const variants = new Set();
  for (let seed = 0; seed < 60; seed++) {
    const replay = startChapter(state, seed);
    assert.notEqual(replay.run.trailVariant, state.run.trailVariant);
    assert.equal(restore(replay).run.trailVariant, replay.run.trailVariant);
    variants.add(replay.run.trailVariant);
    state = replay;
  }
  assert.equal(variants.size, 6);
  const old = { ...initial, run: { seed: 2493, scene: 'footprints', outcomes: Array(5).fill(null),
    attempt: { ...emptyAttempt(), draft: '3' } } };
  assert.equal(restore(old).run.attempt.trail.phase, 'solve');
  assert.equal(restore(old).run.attempt.draft, '3');
  assert.deepEqual(chapterTrailQuestion(restore(old).run).answers, chapterQuestions(old.run.seed)[1].answers);
});

test('pairs are bounded and unique; successful completion takes priority and is idempotent', () => {
  const q = trailQuestion(trailChallenge.variants[3]);
  assert.deepEqual(legalPairs([[0, 1], [0, 2], [1, 1], [15, 8], [12, 0]], q.values), [[0, 1], [12, 0]]);
  assert.deepEqual(nextTrailPair([[0, 1], [12, 0]], q.values), [1, 2]);
  const all = Array.from({ length: q.values.smaller }, (_, i) => [i, i]);
  assert.equal(nextTrailPair(all, q.values), null);
  let state = { ...initial, run: { seed: 43, trailVariant: 3, scene: 'footprints', outcomes: Array(5).fill(null),
    attempt: { ...emptyAttempt(), draft: '23', trail: { ...newTrailBeat('solve'), pairs: [[0, 1]], selected: [0, 2],
      mistakes: 1, help: ['tools'], tools: true } } } };
  state = restore(state);
  assert.deepEqual(state.run.attempt.trail.pairs, [[0, 1]]);
  assert.deepEqual(state.run.attempt.trail.selected, [0, 2]);
  assert.equal(applyChapterAnswer(state.run, q, '23').attempt.error, trailChallenge.feedback.total);
  assert.equal(applyChapterAnswer(state.run, q, '9').attempt.error, trailChallenge.feedback.group);
  assert.strictEqual(applyChapterAnswer(state.run, q, '1.5'), state.run);
  assert.strictEqual(advanceChapter(state), state);
  const collision = trailQuestion({ first: 8, second: 4, question: 'How many more does the first trail have' });
  assert.equal(applyChapterAnswer(state.run, collision, '4').outcomes[1], 'assisted');
  const solved = applyChapterAnswer(state.run, q, '5');
  assert.equal(solved.outcomes[1], 'assisted');
  assert.strictEqual(applyChapterAnswer(solved, q, '5'), solved);
  solved.attempt.trail = { ...solved.attempt.trail, phase: 'clue', line: 3 };
  solved.trailHelp = ['tools', 'guided'];
  state = restore({ ...state, run: solved });
  assert.equal(state.run.attempt.trail.line, 3);
  const map = advanceToMap(state);
  assert.equal(map.run.mapFrom, '2');
  assert.equal(map.run.scene, 'share');
  assert.deepEqual(restore(map).run.trailHelp, ['tools', 'guided']);
  assert.equal(map.runs, 0);
});
