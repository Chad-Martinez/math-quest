import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCoachGuide, coachTemplateIds } from '../js/coach.js';
import { activeTemplateSkills, questionsFor, templates, worlds } from '../js/curriculum.js';
import { generateSession, seededRandom, Session } from '../js/engine.js';
import { readProgress, recordEvidence, resetProgress, saveProgress } from '../js/storage.js';

const checkNumber = expression => {
  const parts = expression.match(/\d+/g).map(Number);
  return expression.includes('−') ? parts[0] - parts[1] : parts.reduce((sum, value) => sum + value, 0);
};

function expected(key, question) {
  if (question.visual) {
    const order = [...question.visual.rows].sort((a, b) => a.count - b.count);
    const [low, middle, high] = order;
    const answers = {
      count: middle.count, most: high.label, least: low.label, gap: high.count - low.count,
      tie: high.count - low.count, exceed: high.count - low.count + 1,
      total: low.count + middle.count + high.count,
      statements: [`${high.label} got the most votes.`, `${low.label} got the fewest votes.`],
    };
    return answers[key];
  }
  if (key === 'truth') {
    const [, left, right] = question.prompt.match(/^Is (.+) = (.+) true/);
    return checkNumber(left) === checkNumber(right) ? 'True' : 'False';
  }
  if (key === 'symbol') {
    const [a, b, target] = question.prompt.match(/\d+/g).map(Number);
    return a + b === target ? '+' : '−';
  }
  if (question.category === 'equation') {
    const [left, right] = question.prompt.split(' = ');
    const answers = Array.from({ length: 21 }, (_, n) => n)
      .filter(n => checkNumber(left.replace('□', n)) === checkNumber(right.replace('□', n)));
    assert.equal(answers.length, 1);
    return answers[0];
  }
  const [a, b, c] = question.prompt.match(/\d+/g).map(Number);
  const answers = {
    'story/join': a + b, 'story/separate': a - b,
    'compare/difference': a - b, 'compare/fewer': b - a, 'compare/fewerGiven': a - b,
    'compare/match': b - a, 'compare/exceed': b + 1 - a,
    'steps/reach': a - b - c, 'steps/remaining': a + b - c, 'steps/shareThenMatch': c - (a - b),
  };
  return answers[question.templateId];
}

test('all 31 contextual guides agree with 2,000 independently checked items per template', () => {
  const exercised = new Map();
  for (const { id: category } of worlds.filter(world => world.id !== 'mixed')) {
    for (let seed = 0; seed < 2000; seed++) {
      const bank = questionsFor(category, seededRandom(Math.imul(seed, 2654435761)));
      for (const [key, content] of Object.entries(bank)) {
        const templateId = `${category}/${key}`;
        const item = { ...content, category, templateId, explanation: content.equation };
        const guide = buildCoachGuide(item);
        assert.ok(guide, templateId);
        assert.equal(item.skill, activeTemplateSkills[templateId]);
        assert.equal(guide.solution.explanation, content.equation);
        assert.deepEqual(guide.solution.value, expected(key, item), templateId);
        assert.ok(guide.steps.length >= 2 && guide.steps.length <= 4);
        assert.equal(new Set(guide.steps).size, guide.steps.length);
        for (const field of ['objective', 'prerequisite', 'quickTip', 'accommodation', 'offlineActivity']) {
          assert.ok(guide[field].trim().length > 10, `${templateId} ${field}`);
        }
        assert.ok(guide.misconceptions.length);
        if (item.answerType !== 'number') assert.equal(guide.solution.unit, '');
        if (item.visual && item.answerType === 'number') {
          assert.equal(guide.solution.unit, item.answer === 1 ? 'vote' : 'votes');
        }
        exercised.set(templateId, (exercised.get(templateId) ?? 0) + 1);
      }
    }
  }
  assert.equal(exercised.size, 31);
  assert.deepEqual(Object.keys(activeTemplateSkills).sort(), [...exercised.keys()].sort());
  assert.deepEqual([...coachTemplateIds].sort(), [...exercised.keys()].sort());
  assert.ok([...exercised.values()].every(count => count === 2000));
  assert.equal(buildCoachGuide({ templateId: 'missing/example' }), null);
});

test('fourteen handoff examples map to supported teaching relationships', () => {
  // Equivalent source templates use their own fictional objects and labels.
  const examples = [
    ['story/join', templates.story.join(6, 5), 11],
    ['story/separate', templates.story.separate(10, 4), 10],
    ['compare/difference', templates.compare.difference(8, 4), 4],
    ['compare/fewerGiven', templates.compare.fewerGiven(6, 3), 6],
    ['compare/match', templates.compare.match(4, 3), 3],
    ['compare/exceed', templates.compare.exceed(4, 3), 4],
    ['steps/reach', templates.steps.reach(5, 7, 4), 4, 12],
    ['steps/shareThenMatch', templates.steps.shareThenMatch(9, 6, 3), 3, 9],
    ['steps/remaining', templates.steps.remaining(8, 6, 4), 10, 14],
    ['picture/gap', questionsFor('picture', min => min === 2 ? 4 : min).gap, 3],
    ['tally/gap', questionsFor('tally', min => min === 2 ? 5 : min === 7 ? 8 : min === 5 ? 6 : min).gap, 3],
    ['equation/balance', templates.equation.balance(4, 5, 7), 7],
    ['equation/truth', templates.equation.truth(8, 4, 2, () => 1), 'True'],
    ['equation/symbol', templates.equation.symbol(8, 3, 1, () => 0), '−'],
  ];
  for (const [templateId, content, answer, checkpoint] of examples) {
    const guide = buildCoachGuide({ ...content, templateId, explanation: content.equation });
    assert.deepEqual(guide.solution.value, answer, templateId);
    if (checkpoint !== undefined) assert.equal(content.intermediate[0].answer, checkpoint);
  }
  assert.equal(buildCoachGuide({ ...templates.story.join(0, 1), templateId: 'story/join' }).solution.unit, 'acorn');
});

function storySession(seed = 123) {
  return new Session(generateSession('story', seed));
}

test('neutral supports, wrong first attempts, help, reveal, and post-solve review stay distinct', () => {
  const session = storySession();
  assert.equal(session.evidence(), null);
  for (const tag of ['drawing', 'mathTools', 'narration']) session.markSupport(tag);
  session.answer('0');
  assert.deepEqual(session.answer(String(session.current.answer)), { correct: true, assisted: false });
  const final = session.evidence();
  assert.equal(final.outcome, 'independent-correct');
  assert.equal(final.firstAttemptCorrect, false);
  assert.equal(final.attempts, 2);
  assert.equal(final.mathTools && final.drawing && final.narration, true);
  session.markSupport('reveal');
  assert.deepEqual(session.evidence(), { ...final, reviewedAfterOutcome: true });
  session.next();
  session.markSupport('parentHelp');
  session.markSupport('reveal');
  session.answer(String(session.current.answer));
  assert.equal(session.evidence().firstAttemptCorrect, true);
  assert.equal(session.evidence().outcome, 'assisted-correct');
  assert.equal(session.evidence().revealedBeforeSolve, true);
});

test('worked hints preserve stage levels and do not award a solve star', () => {
  const session = new Session(generateSession('steps', 231));
  session.hint(0);
  session.hints = 0;
  session.hint(1);
  session.hint(1);
  assert.match(session.hint(1), /^Worked example/);
  const evidence = session.evidence();
  assert.deepEqual(evidence.hintLevels, [1, 3]);
  assert.equal(evidence.outcome, 'worked-example');
  assert.equal(evidence.firstAttemptCorrect, null);
  assert.equal(session.stars, 0);
});

test('transfer queues once, leaves the active item intact, and avoids answer inversion rules', () => {
  let sameTruthValue = false;
  for (let seed = 0; seed < 100; seed++) {
    const session = new Session(generateSession('equation', seed));
    session.index = session.questions.findIndex(q => q.skill === 'check-equality');
    const item = session.current;
    assert.equal(session.addPractice(), 'queued');
    assert.equal(session.current, item);
    assert.equal(session.addPractice(), 'limit');
    const next = session.questions[session.index + 1];
    assert.equal(next.templateId, item.templateId);
    assert.notDeepEqual(next.parameters, item.parameters);
    if (next.answer === item.answer) sameTruthValue = true;
    session.answer(item.answer);
    session.next();
    assert.deepEqual(session.evidence(), null);
    assert.equal(session.current.practice, true);
  }
  assert.ok(sameTruthValue);
});

test('v3 evidence validates, upserts, caps at 100, and follows adventure resets', () => {
  let saved = JSON.stringify({ version: 2, length: 7, legacy: { stars: 4 }, byAdventure: { story: { stars: 5 } } });
  const storage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  let progress = readProgress(storage);
  assert.equal(progress.byAdventure.story.stars, 5);
  assert.equal(progress.legacy.stars, 4);
  assert.equal(progress.length, 7);
  for (let seed = 0; seed < 102; seed++) {
    const session = storySession(seed);
    session.answer(String(session.current.answer));
    progress = recordEvidence(progress, { ...session.evidence(), freeText: 'must be stripped' });
  }
  assert.equal(progress.evidence.length, 100);
  assert.equal(progress.evidence[0].id, 'story-2-0');
  const latest = progress.evidence.at(-1);
  progress = recordEvidence(progress, { ...latest, reviewedAfterOutcome: true });
  assert.equal(progress.evidence.length, 100);
  assert.equal(progress.evidence.at(-1).reviewedAfterOutcome, true);
  assert.ok(saveProgress(storage, progress));
  assert.ok(!saved.includes('freeText'));
  assert.deepEqual(readProgress(storage), progress);
  assert.equal(resetProgress(progress, 'compare').evidence.length, 100);
  assert.equal(resetProgress(progress, 'story').evidence.length, 0);
  assert.equal(resetProgress(progress, 'all').evidence.length, 0);
  assert.deepEqual(recordEvidence(progress, { ...latest, id: 'outside' }), progress);
});
