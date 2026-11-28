import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chapterKey, emptyAttempt } from '../js/chapter.js';
import { trailChallenge, trailDialogue, trailGuide } from '../js/velociraptor-content.js';

const { chromium, webkit } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.CHAPTER_BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch({ executablePath: process.env.CHAPTER_BROWSER_PATH ||
  (engine === chromium && !existsSync(engine.executablePath()) && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) });
const base = process.env.CHAPTER_URL || 'http://127.0.0.1:8429/math-quest/';
const images = process.env.CHAPTER_SCREENSHOTS;
const ipad = { width: 1180, height: 820 };
const phone = { width: 390, height: 844 };
const errors = [];
const stage = page => page.locator('.trail-stage');
const button = (page, name) => page.getByRole('button', { name, exact: true });
const press = (page, name) => button(page, name).click();
const answer = page => page.getByLabel('Your answer', { exact: true });
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), chapterKey);
const line = page => page.locator('.trail-stage .grove-line');

async function setup(viewport = ipad, { variant = 0, phase = 'arrival', pending = false, motion = 'reduce' } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: motion, hasTouch: true });
  await context.addInitScript(({ key, fixture }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture));
    window.trailSpeech = { lines: [], cancellations: 0 };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class {
      constructor(text) { this.text = text; }
    } });
    Object.defineProperty(window, 'speechSynthesis', { value: {
      getVoices: () => [], speak: utterance => { window.trailSpeech.lines.push(utterance.text); utterance.onstart?.(); },
      cancel: () => window.trailSpeech.cancellations++,
    } });
  }, { key: chapterKey, fixture: { version: 1, autoBreak: true, runs: 0, badge: false, run: {
    seed: 2026, scene: 'footprints', trailVariant: variant, ...(pending ? { mapFrom: '1' } : {}),
    outcomes: ['independent', null, null, null, null], attempt: { ...emptyAttempt(), trail: { phase } },
  } } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.goto(base);
  await press(page, 'Continue Adventure');
  if (pending) await press(page, 'Visit Raptor Trail');
  return { page, context };
}

async function beat(page, phase, lineIndex = 0) {
  await stage(page).and(page.locator(`[data-beat="${phase}"][data-line="${lineIndex}"]`)).waitFor();
  if (!['solve', 'compare'].includes(phase)) assert.equal(await line(page).count(), 1);
}
async function capture(page, name, animations = 'disabled') {
  await page.locator('#chapter img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ' overflows');
  if (!images) return;
  mkdirSync(images, { recursive: true });
  await page.screenshot({ path: join(images, name + '.png'), fullPage: true, animations });
}
async function check(page, value) {
  await answer(page).fill(String(value));
  await press(page, 'Check Answer');
}
async function continueFromArrival(page, suffix, listen = false) {
  await beat(page, 'arrival');
  assert.equal(await line(page).textContent(), trailDialogue.arrival1.text);
  assert.match(await stage(page).locator('.trail-landscape').evaluate(async img => { await img.decode(); return img.currentSrc; }), /trail-(landscape|portrait)\.webp$/);
  await capture(page, '01-arrival-' + suffix);
  if (listen) {
    await press(page, 'Listen');
    assert.deepEqual(await page.evaluate(() => window.trailSpeech.lines), [trailDialogue.arrival1.text]);
  }
  await press(page, 'Continue');
  await beat(page, 'arrival', 1);
  assert.equal(await line(page).textContent(), trailDialogue.arrival2.text);
  if (listen) assert.equal(await page.evaluate(() => window.trailSpeech.cancellations), 1);
  await press(page, 'Let’s Investigate!');
  await beat(page, 'intro');
  assert.equal(await line(page).textContent(), 'One trail has 12 footprints. The other trail has 8 footprints.');
  await capture(page, '02-intro-' + suffix);
  await press(page, 'Continue');
  assert.equal(await line(page).textContent(), trailChallenge.variants[0].question + ', Harrison?');
  await press(page, 'Continue');
  await beat(page, 'solve');
}
async function completeTrail(page, suffix) {
  await beat(page, 'success');
  assert.equal(await page.locator('.trail-equation').textContent(), '12 − 8 = 4');
  assert.equal(await line(page).textContent(), 'Great detective work, Harrison! The first trail has four more footprints!');
  assert.equal(await page.locator('.trail-success-panel .trail-remaining').count(), 4);
  assert.match(await stage(page).locator('.trail-landscape').evaluate(async img => { await img.decode(); return img.currentSrc; }), /trail-(landscape|portrait)\.webp$/);
  await capture(page, '05-success-' + suffix);
  await press(page, 'Continue');
  for (let i = 0; i < 4; i++) {
    await beat(page, 'clue', i);
    assert.equal(await line(page).textContent(), trailDialogue['clue' + (i + 1)].text);
    assert.match(await stage(page).locator('.trail-landscape').evaluate(async img => { await img.decode(); return img.currentSrc; }), /-clue\.webp$/);
    assert.equal(await stage(page).locator('img[src*="eggshell"]').count(), 0);
    if (i === 0) await capture(page, '06-shell-clue-' + suffix);
    if (i < 3) await press(page, 'Continue');
  }
  await button(page, 'Visit Triceratops Bridge').evaluate(control => { control.click(); control.click(); });
  await page.getByRole('heading', { name: 'Dinosaur Island Adventure', exact: true }).waitFor();
  assert.equal(await page.locator('.map-numbered[data-status=completed]').count(), 2);
  assert.ok(await button(page, 'Visit Triceratops Bridge').isEnabled());
  assert.equal((await saved(page)).runs, 0);
  assert.equal((await saved(page)).run.scene, 'share');
}

try {
  const main = await setup(ipad, { pending: true });
  const { page } = main;
  await continueFromArrival(page, 'ipad-landscape', true);
  assert.equal(await stage(page).locator('.trail-model').isVisible(), false);
  assert.equal(await stage(page).locator('.grove-equation').count(), 0);
  await capture(page, '04-independent-ipad-landscape');
  await press(page, 'Math tools');
  await beat(page, 'compare');
  const first = stage(page).locator('.trail-spot[data-row="0"]');
  const second = stage(page).locator('.trail-spot[data-row="1"]');
  assert.deepEqual([await first.count(), await second.count()], [12, 8]);
  assert.deepEqual(await first.first().evaluate(el => [el.offsetWidth, el.offsetHeight]),
    await second.first().evaluate(el => [el.offsetWidth, el.offsetHeight]));
  await press(page, 'Match a Pair');
  await first.nth(2).press('Enter');
  await second.nth(1).tap();
  await first.nth(2).press('Enter');
  assert.deepEqual((await saved(page)).run.attempt.trail.pairs, [[0, 0], [2, 1]]);
  assert.equal(await stage(page).locator('.trail-links path').count(), 2);
  assert.equal(await stage(page).locator('.trail-matched').count(), 4);
  await capture(page, '03-match-ipad-landscape');
  await press(page, 'Undo Match');
  assert.deepEqual((await saved(page)).run.attempt.trail.pairs, [[0, 0]]);
  await answer(page).fill('8');
  await first.nth(1).press('Enter');
  await page.setViewportSize({ width: 820, height: 1180 });
  assert.equal(await stage(page).locator('.trail-matched').count(), 2);
  await capture(page, '03-match-ipad-portrait');
  await page.setViewportSize(ipad);
  await press(page, 'Take a break');
  await press(page, 'I’m ready!');
  await press(page, 'Trail map');
  await press(page, 'Continue Stop');
  await page.reload();
  await press(page, 'Continue Adventure');
  assert.equal(await answer(page).inputValue(), '8');
  assert.deepEqual((await saved(page)).run.attempt.trail.selected, [0, 1]);
  assert.equal(await stage(page).locator('.trail-matched').count(), 2);
  await check(page, '');
  await check(page, '1.5');
  assert.equal((await saved(page)).run.attempt.trail.mistakes, 0);
  await check(page, '8');
  assert.equal(await page.locator('#chapter-feedback').textContent(), trailChallenge.feedback.group);
  await check(page, '20');
  assert.equal(await page.locator('#chapter-feedback').textContent(), trailChallenge.feedback.total);
  await capture(page, '04-incorrect-feedback');
  await press(page, 'Hint');
  await press(page, 'Another hint');
  await press(page, 'Another hint');
  assert.ok(await page.getByText(trailChallenge.hints[2], { exact: true }).isVisible());
  await capture(page, '04-progressive-hint');
  await press(page, 'Try with help');
  const example = page.getByRole('dialog', { name: 'See a different example' });
  assert.equal(await example.locator('.grove-equation').count(), 0);
  await press(example, 'Show how');
  assert.equal(await example.locator('.grove-equation').textContent(), trailChallenge.guidedExample.equation);
  assert.equal(await example.locator('.trail-spot').count(), 8);
  await capture(page, '04-guided-example');
  await press(example, 'Back to my problem');
  assert.equal(await answer(page).inputValue(), '20');
  assert.equal((await saved(page)).run.outcomes[1], null);

  await press(page, 'Grown-ups');
  await press(page, 'Teaching tips for this problem');
  const coach = page.getByRole('dialog', { name: 'Teaching tips' });
  assert.ok(await coach.getByText(trailGuide.objective, { exact: true }).isVisible());
  assert.ok(await coach.getByText('Align 12 and 8 LEGO bricks in two rows. Match pairs; count unmatched bricks.', { exact: true }).isVisible());
  assert.equal(await coach.getByText('12 − 8 = 4', { exact: true }).count(), 0);
  await press(coach, 'Reveal worked solution');
  assert.ok(await coach.getByText('8 + 4 = 12', { exact: true }).isVisible());
  await coach.locator('summary').click();
  await press(coach, 'Reveal transfer answer');
  assert.ok(await coach.getByText('The answer is 3.', { exact: true }).isVisible());
  await capture(page, '04-parent-teaching-tips');
  await press(coach, 'Close');

  // Finish the remaining pairs with the keyboard-friendly action. Both trail totals stay put.
  while (await button(page, 'Match a Pair').isEnabled()) await press(page, 'Match a Pair');
  assert.equal(await stage(page).locator('.trail-remaining').count(), 4);
  assert.deepEqual([await first.count(), await second.count()], [12, 8]);
  assert.equal(await stage(page).locator('.grove-equation').count(), 0);
  await check(page, '4');
  const complete = await saved(page);
  assert.equal(complete.run.outcomes[1], 'assisted');
  assert.deepEqual(complete.run.trailHelp, ['tools', 'hints', 'guided', 'parent']);
  await page.reload();
  await press(page, 'Continue Adventure');
  assert.deepEqual(await saved(page), complete);
  await completeTrail(page, 'ipad-landscape');
  await main.context.close();

  const mobile = await setup(phone);
  await continueFromArrival(mobile.page, 'phone-portrait');
  await capture(mobile.page, '04-independent-phone-portrait');
  await press(mobile.page, 'Math tools');
  await capture(mobile.page, '03-match-phone-portrait');
  await check(mobile.page, '4');
  assert.equal((await saved(mobile.page)).run.outcomes[1], 'independent');
  await completeTrail(mobile.page, 'phone-portrait');
  await mobile.context.close();

  const fewer = await setup(phone, { variant: 4, phase: 'solve' });
  assert.ok(await fewer.page.getByRole('heading', { name: trailChallenge.variants[4].question + '?' }).isVisible());
  await check(fewer.page, '2');
  assert.equal(await fewer.page.locator('.trail-equation').textContent(), '10 − 8 = 2');
  assert.match(await line(fewer.page).textContent(), /first trail has two fewer footprints/);
  await fewer.context.close();

  for (const [width, height, suffix] of [[844, 390, 'phone-landscape'], [1440, 900, 'desktop']]) {
    const layout = await setup({ width, height });
    assert.ok(await button(layout.page, 'Continue').evaluate(control => control.getBoundingClientRect().bottom <= innerHeight));
    await capture(layout.page, '01-arrival-' + suffix);
    await layout.context.close();
  }

  const motion = await setup(ipad, { phase: 'solve', motion: 'no-preference' });
  await check(motion.page, '4');
  await beat(motion.page, 'success');
  await capture(motion.page, 'motion-01-success', 'allow');
  await button(motion.page, 'Continue').evaluate(control => {
    control.click();
    const view = document.querySelector('.trail-stage');
    window.clueAnimations = view.getAnimations({ subtree: true });
    for (const animation of window.clueAnimations) { animation.pause(); animation.currentTime = 0; }
  });
  assert.ok(await motion.page.evaluate(() => window.clueAnimations.length >= 2));
  await capture(motion.page, 'motion-02-clue-entry', 'allow');
  await motion.page.evaluate(() => {
    for (const animation of window.clueAnimations) animation.currentTime = 400;
  });
  await capture(motion.page, 'motion-03-shell-highlight', 'allow');
  await press(motion.page, 'Listen');
  await press(motion.page, 'Continue');
  assert.ok(await motion.page.evaluate(() => window.clueAnimations.every(animation => animation.playState === 'idle')));
  assert.equal(await motion.page.evaluate(() => window.trailSpeech.cancellations), 1);
  await capture(motion.page, 'motion-04-clue-settled');
  await motion.context.close();

  assert.deepEqual(errors, []);
  console.log(engine.name() + ' passed Velociraptor beats, matching, support, persistence and clue animation checks.');
} finally {
  await browser.close();
}
