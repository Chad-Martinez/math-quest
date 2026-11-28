import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceChapter, applyChapterAnswer, chapterKey, chapterLagoonQuestion, chapterQuestions, emptyAttempt, readChapter, startChapter } from '../js/chapter.js';
import { advanceToMap, mapState } from '../js/adventure-map-state.js';
import { lagoonChallenge, lagoonGuide } from '../js/crystal-lagoon-content.js';
import { chooseLagoonVariant, lagoonCopy, lagoonQuestion, lagoonVariants, newLagoonBeat } from '../js/crystal-lagoon-state.js';

const base = { version: 1, badge: true, runs: 2, autoBreak: true };
const restore = state => readChapter({ getItem: key => key === chapterKey ? JSON.stringify(state) : null });
const checkpoint = (variant, added = 0) => ({ ...base, run: { scene: 'gems', seed: 2026, lagoonVariant: variant,
  outcomes: ['independent', 'assisted', 'independent', null, null],
  attempt: { ...emptyAttempt(), lagoon: { ...newLagoonBeat('compare'), added } } } });

test('six variants preserve quantities and reconcile every valid placement after explicit minimum submission', () => {
  for (const [variant, parameters] of lagoonVariants.entries()) {
    const { green, blue, supply, answer, finalBlue } = parameters;
    const q = chapterLagoonQuestion(checkpoint(variant).run);
    assert.equal(q.values.answer, green - blue + 1);
    assert.equal(q.values.supply, answer + 2);
    assert.equal(q.values.finalBlue, finalBlue);
    assert.equal(finalBlue, green + 1);
    assert.equal(q.context, `The green holder has ${green} crystals. The blue holder has ${blue} crystals.`);
    assert.equal(q.equations.at(-1), `${blue} + ${answer} = ${finalBlue}`);
    assert.equal(lagoonCopy(lagoonGuide.materials, q.values), `Use ${green} green and ${blue} blue LEGO bricks; keep ${supply} spare blue bricks.`);
    for (let added = 0; added <= supply; added++) {
      const state = checkpoint(variant, added);
      const { run } = state;
      assert.equal(advanceChapter(state), state);
      for (const invalid of ['', '2.5', '-1', 'abc']) assert.equal(applyChapterAnswer(run, q, invalid), run);
      const tied = applyChapterAnswer(run, q, String(answer - 1));
      assert.match(tied.attempt.error, /equal/);
      assert.equal(tied.attempt.lagoon.added, added);
      assert.equal(tied.outcomes[3], null);
      assert.match(q.mistakes[0][green], /green crystals there are/);
      assert.match(q.mistakes[0][green + 1], /altogether/);
      const solved = applyChapterAnswer(run, q, String(answer));
      assert.equal(solved.attempt.lagoon.phase, 'activate');
      assert.equal(solved.outcomes[3], 'independent');
      assert.equal(blue + solved.attempt.lagoon.added, finalBlue);
      assert.equal(supply - solved.attempt.lagoon.added, 2);
      assert.equal(applyChapterAnswer(solved, q, String(answer)), solved);
      assert.deepEqual(restore({ ...base, run: solved }).run, solved);
    }
  }
  const first = chapterLagoonQuestion(checkpoint(0).run);
  assert.match(first.mistakes[0][5], /use fewer/);
  assert.match(first.mistakes[0][6], /use fewer/);
});

test('checkpoint protects the cinematic, preserves assistance, and unlocks the existing next stop once', () => {
  const first = startChapter({ ...base, run: null }, 2026);
  assert.equal(first.run.lagoonVariant, 0);
  assert.equal(new Set(Array.from({ length: 36 }, (_, seed) => chooseLagoonVariant(first, seed))).size, 5);
  const state = checkpoint(0, 3);
  state.run.attempt.lagoon = { ...state.run.attempt.lagoon, phase: 'reveal', line: -1, tool: 'line', position: 8, help: ['tools'] };
  const restored = restore(state);
  assert.equal(restored.run.attempt.lagoon.phase, 'compare');
  assert.equal(restored.run.attempt.lagoon.line, 0);
  assert.equal(restored.run.attempt.lagoon.added, 3);
  assert.equal(restored.run.attempt.lagoon.position, 8);
  assert.equal(restored.run.attempt.assisted, true);
  const solved = applyChapterAnswer(restored.run, chapterLagoonQuestion(restored.run), '4');
  assert.equal(solved.outcomes[3], 'assisted');
  solved.attempt.lagoon.phase = 'reveal';
  solved.attempt.lagoon.line = -1;
  assert.deepEqual(restore({ ...base, run: solved }).run, solved);
  const next = advanceToMap({ ...base, run: solved });
  assert.equal(next.run.scene, 'cave');
  assert.equal(next.run.mapFrom, '4');
  assert.equal(mapState(next.run).current, '5');
  assert.equal(advanceChapter(next), next);
  assert.deepEqual(next.run.outcomes, solved.outcomes);
  assert.equal(next.runs, 2);
  assert.equal(next.badge, true);
});

test('old visits preserve their seeded quantities and question outcome', () => {
  const state = checkpoint(undefined);
  delete state.run.attempt.lagoon;
  state.run.attempt.draft = '3';
  const old = chapterQuestions(state.run.seed)[3];
  const current = restore(state);
  assert.deepEqual(chapterLagoonQuestion(current.run).answers, old.answers);
  assert.equal(current.run.attempt.draft, '3');
  assert.equal(current.run.attempt.lagoon.phase, 'compare');
  assert.equal(lagoonQuestion(lagoonChallenge.guidedExample).equations.at(-1), '3 + 3 = 6');
});
