import { test } from 'node:test';
import assert from 'node:assert/strict';
import { berryAnimations, berryChallenge, berryDialogue, berryGuide, berryScene } from '../js/berry-grove-content.js';
import { berryQuestion, berryVariants, fillBerryCopy, newBerryBeat } from '../js/berry-grove-state.js';
import { advanceChapter, applyChapterAnswer, chapterBerryQuestion, chapterQuestions,
  emptyAttempt, readChapter, startChapter } from '../js/chapter.js';

const snapshot = value => readChapter({ getItem: () => JSON.stringify(value) });
const initial = snapshot(null);
const start = seed => startChapter(initial, seed);
const enter = value => advanceChapter(advanceChapter(value));

test('six beats, authored dialogue, supplied variants and teaching equations use the same math', () => {
  assert.deepEqual(berryScene.beats.map(({ id }) => id), ['arrival', 'intro', 'combine', 'missing', 'success', 'clue']);
  assert.ok(berryScene.beats.flatMap(beat => beat.dialogueIds).every(id => berryDialogue.lines[id]));
  assert.equal(berryAnimations.sequences.find(sequence => sequence.trigger === 'collection').durationMs, 500);
  assert.deepEqual(chapterBerryQuestion(enter(start(13)).run).answers, [12, 4]);
  const wrong = berryQuestion(berryChallenge.replayVariants.at(-1));
  assert.deepEqual(wrong.answers, [13, 1]);
  for (const { red, blue, target } of [...berryVariants, berryChallenge.workedExample, berryChallenge.transfer]) {
    const q = berryQuestion({ red, blue, target });
    assert.ok([red, blue, target].every(Number.isInteger));
    assert.ok(red > 0 && blue > 0 && target <= 20);
    assert.deepEqual(q.answers, [red + blue, target - red - blue]);
    assert.ok(q.values.missing >= 1 && q.values.missing <= 5);
    assert.equal(q.blanks[1], `${red + blue} + □ = ${target}`);
    assert.equal(q.equations[1], `${red + blue} + ${target - red - blue} = ${target}`);
    assert.equal(fillBerryCopy(berryGuide.equations[1], q.values), `${target} − ${red + blue} = ${target - red - blue}`);
  }
  assert.equal(berryGuide.transfer.answer, 15 - (4 + 6));
});

test('replay chooses a different allowed variant without changing later checkpoints and questions', () => {
  let previous = start(0);
  const seen = new Set();
  for (let seed = 0; seed < 32; seed++) {
    const run = startChapter(previous, seed);
    assert.notEqual(previous.run.berryVariant, run.run.berryVariant);
    assert.ok(run.run.berryVariant > 0 && run.run.berryVariant < berryVariants.length);
    seen.add(run.run.berryVariant);
    assert.equal(snapshot(run).run.berryVariant, run.run.berryVariant);
    assert.deepEqual(chapterQuestions(seed, run.run.berryVariant).slice(1), chapterQuestions(seed).slice(1));
    previous = run;
  }
  assert.equal(seen.size, berryChallenge.replayVariants.length);
});

test('draft, validated model state, exact beat, and post-answer support persist in existing save', () => {
  let value = enter(start(8));
  assert.equal(value.run.attempt.berry.phase, 'arrival');
  const question = chapterBerryQuestion(value.run);
  value.run.attempt = { ...emptyAttempt(), draft: '5', hints: 3, assisted: true,
    berry: { ...newBerryBeat('combine'), tools: true, moved: [0, 2, 2, -1, 99], mistakes: 2, help: ['tools', 'hints'] } };
  value = snapshot(value);
  assert.deepEqual(value.run.attempt.berry.moved, [0, 2]);
  assert.deepEqual(value.run.attempt.berry.help, ['tools', 'hints']);
  assert.equal(value.run.attempt.draft, '5');
  assert.equal(value.run.attempt.hints, 3);
  assert.strictEqual(applyChapterAnswer(value.run, question, '1.5'), value.run);
  const mistake = applyChapterAnswer(value.run, question, '5');
  assert.equal(mistake.attempt.error, berryChallenge.steps[0].feedback.group);
  value.run = applyChapterAnswer(value.run, question, '12');
  value.run.attempt.berry = { ...newBerryBeat('combine'), line: 1 };
  value = snapshot(value);
  assert.equal(value.run.attempt.berry.line, 1);
  assert.equal(value.run.outcomes[0], null);
  value.run = applyChapterAnswer(value.run, question, '4');
  value.run.attempt.berry = { ...newBerryBeat('clue'), line: 1 };
  value.run.berryHelp = ['worked-example', 'guided'];
  value = snapshot(value);
  assert.equal(value.run.outcomes[0], 'assisted');
  assert.equal(value.run.attempt.berry.phase, 'clue');
  assert.equal(value.run.attempt.berry.line, 1);
  assert.deepEqual(snapshot(advanceChapter(value)).run.berryHelp, ['worked-example', 'guided']);
  assert.strictEqual(applyChapterAnswer(value.run, question, '4'), value.run);
});

test('legacy supplies checkpoint retains the original generated problem and intermediate attempt', () => {
  const run = { seed: 314, scene: 'supplies', outcomes: Array(5).fill(null),
    attempt: { ...emptyAttempt(), step: 1, draft: '2' } };
  const restored = snapshot({ ...initial, run }).run;
  assert.equal(restored.berryVariant, undefined);
  assert.deepEqual(chapterBerryQuestion(restored).answers, chapterQuestions(run.seed)[0].answers);
  assert.equal(restored.attempt.berry.phase, 'missing');
  assert.equal(restored.attempt.draft, '2');
});
