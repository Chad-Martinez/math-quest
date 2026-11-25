import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lessonTopics } from '../js/curriculum.js';
import { generateLesson, generateSession, Session } from '../js/engine.js';
import { clearReview, readProgress, recordEvidence, resetProgress, saveProgress, saveReview } from '../js/storage.js';

test('each topic yields a seeded example, guided item, independent item, and later review with fresh answers', () => {
  for (const templateId of Object.keys(lessonTopics)) {
    assert.deepEqual(generateLesson(templateId, 415), generateLesson(templateId, 415));
    for (let seed = 0; seed < 2000; seed++) {
      const { items, review } = generateLesson(templateId, Math.imul(seed, 2654435761) >>> 0);
      const questions = [...items, review];
      assert.deepEqual(questions.map(item => item.lessonStage), ['example', 'guided', 'independent', 'review']);
      assert.ok(questions.every(item => item.templateId === templateId && item.unknownRole === review.unknownRole));
      assert.ok(questions.every(item => item.models.length > 0 && item.hints.length > 0));
      assert.equal(new Set(questions.map(item => item.prompt)).size, 4);
      assert.equal(new Set(questions.map(item => item.answer)).size, 4);
    }
  }
});

test('guided and independent results use distinct evidence and awards', () => {
  const session = new Session(generateLesson('story/combinePart', 415).items);
  assert.equal(session.evidence().outcome, 'worked-example');
  assert.equal(session.answer(String(session.current.answer)), null);
  assert.equal(session.stars, 0);
  assert.ok(session.next());
  assert.equal(session.addPractice(), 'unavailable');
  assert.deepEqual(session.answer(String(session.current.answer)), { correct: true, assisted: true });
  assert.equal(session.evidence().lessonStage, 'guided');
  assert.equal(session.evidence().outcome, 'assisted-correct');
  assert.ok(session.next());
  session.markSupport('mathTools');
  assert.deepEqual(session.answer(String(session.current.answer)), { correct: true, assisted: false });
  assert.equal(session.evidence().outcome, 'independent-correct');
  assert.equal(session.evidence().lessonStage, 'independent');
  assert.equal(session.stars, 2);
  assert.ok(session.next());
  assert.equal(session.status, 'complete');
});

test('a persisted review takes one normal adventure slot, avoids duplicates, and follows resets', () => {
  let saved = JSON.stringify({ version: 3, length: 3, legacy: { stars: 2 }, byAdventure: {}, evidence: [] });
  const storage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  let progress = readProgress(storage);
  assert.equal(progress.legacy.stars, 2);
  assert.deepEqual(progress.reviews, {});
  const recipe = { seed: 415, templateId: 'story/combinePart' };
  progress = saveReview(progress, 'story', { ...recipe, unrelated: 'excluded' });
  assert.equal(saveProgress(storage, progress), true);
  progress = readProgress(storage);
  assert.deepEqual(progress.reviews.story, [recipe]);
  const [{ templateId, seed }] = progress.reviews.story;
  const review = generateLesson(templateId, seed).review;
  const items = generateSession('story', seed, progress.length, review);
  assert.equal(items[0], review);
  assert.equal(items.length, 3);
  assert.equal(new Set(items.map(item => item.prompt)).size, 3);
  assert.ok(generateSession('compare', seed, 3, review).every(item => item.lessonStage !== 'review'));
  const session = new Session(items);
  session.answer(String(review.answer));
  progress = recordEvidence(progress, session.evidence());
  assert.equal(progress.evidence[0].lessonStage, 'review');
  assert.deepEqual(readProgress(storage).reviews.story, [recipe]);
  const followup = { templateId: 'story/joinStart', seed: 7 };
  progress = saveReview(progress, 'story', followup);
  assert.deepEqual(progress.reviews.story, [recipe, followup]);
  assert.deepEqual(clearReview(progress, 'story', recipe).reviews.story, [followup]);
  const updated = saveReview(progress, 'story', { ...recipe, seed: 19 });
  assert.deepEqual(clearReview(updated, 'story', recipe).reviews.story, [{ ...recipe, seed: 19 }, followup]);
  assert.deepEqual(resetProgress(progress, 'story').evidence, []);
  assert.deepEqual(resetProgress(progress, 'story').reviews, {});
  assert.deepEqual(resetProgress(progress, 'all').reviews, {});
});

test('chart choice positions vary while graph answers stay valid', () => {
  const positions = new Set();
  for (let seed = 0; seed < 250; seed++) {
    for (const item of generateSession('picture', seed)) {
      if (item.answerType !== 'multiple') continue;
      assert.ok(item.answer.every(answer => item.choices.includes(answer)));
      positions.add(item.choices.indexOf(item.answer[0]));
    }
  }
  assert.equal(positions.size, 4);
});
