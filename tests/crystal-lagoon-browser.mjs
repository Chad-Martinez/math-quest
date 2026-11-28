import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chapterKey, emptyAttempt } from '../js/chapter.js';
import { lagoonDialogue, lagoonGuide } from '../js/crystal-lagoon-content.js';
import { lagoonCopy, lagoonQuestion, lagoonVariants, newLagoonBeat } from '../js/crystal-lagoon-state.js';

const { chromium, webkit } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.CHAPTER_BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch({ executablePath: process.env.CHAPTER_BROWSER_PATH ||
  (engine === chromium && !existsSync(engine.executablePath()) && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) });
const base = process.env.CHAPTER_URL || 'http://127.0.0.1:8432/math-quest/';
const images = process.env.CHAPTER_SCREENSHOTS;
const ipad = { width: 1180, height: 820 };
const phone = { width: 390, height: 844 };
const errors = [];
const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const press = (scope, name) => button(scope, name).click();
const stage = page => page.locator('.lagoon-stage');
const field = page => page.getByLabel('Your answer');
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), chapterKey);
const speech = page => page.evaluate(() => window.lagoonSpeech);
const first = lagoonQuestion(lagoonVariants[0]).values;

async function setup({ viewport = ipad, phase = 'arrival', motion = 'reduce', pending = false, variant = 0, added = 0 } = {}) {
  const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion: motion });
  const page = await context.newPage();
  const passages = [];
  page.on('request', req => { if (/passage-(landscape|portrait)\.webp/.test(req.url())) passages.push(req.url()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    const fixture = window.lagoonSpeech = { spoken: [], canceled: 0 };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class {
      constructor(text) { this.text = text; }
    } });
    Object.defineProperty(window, 'speechSynthesis', { value: {
      speak: utterance => { fixture.spoken.push(utterance.text); utterance.onstart?.(); },
      cancel: () => { fixture.canceled++; }, getVoices: () => [],
    } });
  }, { key: chapterKey, state: { version: 1, autoBreak: true, runs: 1, badge: true, run: {
    scene: 'gems', seed: 2026, lagoonVariant: variant, ...(pending ? { mapFrom: 'break' } : {}),
    outcomes: ['independent', 'assisted', 'independent', null, null],
    attempt: { ...emptyAttempt(), lagoon: { ...newLagoonBeat(phase), added, tool: added ? 'model' : 'closed' } },
  } } });
  await page.goto(base);
  await press(page, 'Continue Adventure');
  if (pending) await press(page, 'Visit Crystal Lagoon');
  return { page, context, passages };
}

async function beat(page, phase, line = 0, values = first) {
  await stage(page).and(page.locator(`[data-beat="${phase}"][data-line="${line}"]`)).waitFor();
  const authored = lagoonDialogue[phase]?.[line];
  if (authored) {
    assert.equal(await stage(page).locator('.grove-line').count(), 1);
    assert.equal(await stage(page).locator('.grove-speaker').textContent(), authored[0]);
    assert.equal(await stage(page).locator('.grove-line').textContent(), lagoonCopy(authored[1], values));
  }
}
async function check(page, answer) {
  await field(page).fill(String(answer));
  await press(page, 'Check answer');
}
async function art(page, image) {
  const loaded = await stage(page).locator('.lagoon-backdrop img').evaluate(async img => {
    await img.decode();
    return img.currentSrc;
  });
  assert.match(loaded, image);
}
async function capture(page, name, animations = 'disabled') {
  await page.locator('#chapter img:visible').evaluateAll(images => Promise.all(images.map(img => img.decode())));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ' overflows horizontally');
  if (!images) return;
  mkdirSync(images, { recursive: true });
  await page.screenshot({ path: join(images, name + '.png'), fullPage: true, animations });
}
async function rows(page, expected) {
  const board = stage(page).locator('.lagoon-model');
  const groups = ['.bridge-fixed .bridge-plank', '.bridge-column > :nth-child(2) .bridge-plank', '.bridge-supply-grid .bridge-plank'];
  assert.deepEqual(await Promise.all(groups.map(group => board.locator(group).count())), expected);
}
async function drag(page, source, destination) {
  const from = await source.boundingBox(), to = await destination.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await page.mouse.up();
}

async function arrive(page, suffix) {
  await beat(page, 'arrival');
  await art(page, /shore-(landscape|portrait)\.webp$/);
  await capture(page, '01-arrival-' + suffix);
  await press(page, 'Listen');
  assert.deepEqual((await speech(page)).spoken, [lagoonDialogue.arrival[0][1]]);
  await button(page, 'Continue').evaluate(control => { control.click(); control.click(); });
  await beat(page, 'arrival', 1);
  assert.equal((await speech(page)).canceled, 1);
  await press(page, 'Explore the Lagoon!');
  await beat(page, 'marker');
  assert.equal(await stage(page).locator('.lagoon-glow').count(), 0);
  await capture(page, '02-marker-' + suffix);
  await press(page, 'Continue');
  await beat(page, 'marker', 1);
  await press(page, 'Continue');
  await beat(page, 'marker', 2);
  await press(page, 'Continue');
  await beat(page, 'compare');
  assert.equal(await stage(page).locator('.lagoon-model').isVisible(), false);
  assert.equal(await stage(page).locator('.grove-equation, .lagoon-glow, .bridge-empty').count(), 0);
  await capture(page, '03-independent-' + suffix);
}

async function activate(page, suffix) {
  await beat(page, 'activate');
  await rows(page, [9, 10, 2]);
  assert.equal(await stage(page).locator('.grove-equation').textContent(), '6 + 4 = 10 · 10 > 9');
  assert.ok(await stage(page).locator('.lagoon-glow').isVisible());
  await capture(page, '04-activate-' + suffix);
  for (const line of [1, 2]) {
    await press(page, 'Continue');
    await beat(page, 'activate', line);
  }
}

async function reveal(page, suffix) {
  await beat(page, 'reveal');
  await art(page, /shore-(landscape|portrait)\.webp$/);
  assert.ok(await stage(page).getByAltText('Mosasaurus found an underwater passage.').isVisible());
  await capture(page, '06-return-to-shore-' + suffix);
  await press(page, 'Continue');
  await beat(page, 'reveal', 1);
  await button(page, 'Explore the Crystal Cave').evaluate(control => { control.click(); control.click(); });
  await page.getByRole('heading', { name: 'Dinosaur Island Adventure' }).waitFor();
  assert.equal(await page.locator('.map-numbered[data-status=completed]').count(), 4);
  assert.ok(await button(page, 'Visit Crystal Cave').isVisible());
  const saved = await read(page);
  assert.equal(saved.run.scene, 'cave');
  assert.equal(saved.run.mapFrom, '4');
  assert.equal(saved.run.outcomes[4], null);
  assert.equal(saved.runs, 1);
  assert.equal(saved.badge, true);
  await capture(page, '07-cave-map-' + suffix);
}

try {
  const main = await setup({ pending: true });
  const { page, passages } = main;
  await arrive(page, 'ipad-landscape');
  for (const invalid of ['', '-1']) {
    await check(page, invalid);
    assert.match(await page.locator('#chapter-feedback').textContent(), /whole number/);
  }
  await press(page, 'Math tools');
  await rows(page, [9, 6, 6]);
  await button(page, 'Spare crystal 6, add to blue holder').tap();
  await rows(page, [9, 7, 5]);
  await drag(page, button(page, 'Spare crystal 6, add to blue holder'), stage(page).locator('.bridge-fixed').first());
  await rows(page, [9, 7, 5]);
  await drag(page, button(page, 'Spare crystal 6, add to blue holder'), stage(page).locator('.bridge-next'));
  await rows(page, [9, 8, 4]);
  await button(page, 'Add a Crystal').press('Space');
  await rows(page, [9, 9, 3]);
  await check(page, 3);
  assert.match(await page.locator('#chapter-feedback').textContent(), /Both groups are equal/);
  await capture(page, '03-equality-feedback');
  await press(page, 'Add a Crystal');
  await rows(page, [9, 10, 2]);
  assert.equal((await read(page)).run.outcomes[3], null);
  for (const answer of [5, 6]) {
    await press(page, 'Add a Crystal');
    await check(page, answer);
    assert.match(await page.locator('#chapter-feedback').textContent(), /use fewer/);
    await rows(page, [9, 6 + answer, 6 - answer]);
  }
  await capture(page, '03-overshoot-feedback');
  assert.ok(await button(page, 'Add a Crystal').isDisabled());
  await press(page, 'Undo');
  await rows(page, [9, 11, 1]);
  await press(page, 'Reset');
  await rows(page, [9, 6, 6]);
  await press(page, 'Add a Crystal');
  await press(page, 'Take a break');
  await press(page, 'Continue');
  await press(page, "Let's Wiggle!");
  await press(page, 'End break');
  assert.equal(await field(page).inputValue(), '6');
  await rows(page, [9, 7, 5]);
  await press(page, 'Number line');
  await press(page, 'Jump one forward');
  const checkpoint = await read(page);
  await page.reload();
  await press(page, 'Continue Adventure');
  assert.deepEqual(await read(page), checkpoint);
  assert.equal(await page.locator('.number-line-jumps .jumped').count(), 1);
  await press(page, 'Math tools');
  await rows(page, [9, 7, 5]);
  await press(page, 'Hint');
  await press(page, 'Another hint');
  await press(page, 'Another hint');
  await capture(page, '03-progressive-hints');
  await press(page, 'Try with help');
  const lesson = page.getByRole('dialog', { name: 'See a different example' });
  await press(lesson, 'Show how');
  assert.ok(await lesson.getByText('3 + 2 = 5', { exact: true }).isVisible());
  await press(lesson, 'See the next step');
  assert.ok(await lesson.getByText('3 + 3 = 6', { exact: true }).isVisible());
  await capture(page, '03-guided-example');
  await press(lesson, 'Back to my problem');
  await rows(page, [9, 7, 5]);
  await press(page, 'Grown-ups');
  await press(page, 'Teaching tips for this problem');
  const coach = page.getByRole('dialog', { name: 'Teaching tips' });
  assert.ok(await coach.getByText(lagoonCopy(lagoonGuide.materials, first), { exact: true }).isVisible());
  assert.equal(await coach.getByText('6 + 4 = 10', { exact: true }).count(), 0);
  await press(coach, 'Reveal worked solution');
  assert.ok(await coach.getByText('6 + 4 = 10', { exact: true }).isVisible());
  await coach.locator('summary').click();
  await coach.getByLabel('Transfer answer').fill('4');
  await press(coach, 'Check');
  assert.ok(await coach.getByText(/one more makes nine/).isVisible());
  await capture(page, '03-parent-teaching-tips');
  await press(coach, 'Close');
  assert.deepEqual(passages, []);
  assert.equal(await stage(page).locator('.lagoon-glow').count(), 0);
  await check(page, 4);
  assert.deepEqual((await read(page)).run.lagoonHelp, ['tools', 'hints', 'guided', 'parent']);
  assert.equal((await read(page)).run.outcomes[3], 'assisted');
  const solved = await read(page);
  await page.reload();
  await press(page, 'Continue Adventure');
  assert.deepEqual(await read(page), solved);
  await activate(page, 'ipad-landscape');
  await press(page, 'Continue');
  await beat(page, 'explore');
  await art(page, /underwater-landscape\.webp$/);
  assert.equal(await stage(page).getByAltText('T-Rex', { exact: true }).count(), 0);
  assert.equal(await stage(page).evaluate(el => el.getAnimations({ subtree: true }).length), 0);
  await capture(page, '05-underwater-ipad-landscape');
  assert.deepEqual(passages, []);
  await press(page, 'Continue');
  await beat(page, 'reveal', -1);
  await art(page, /passage-landscape\.webp$/);
  assert.equal(await stage(page).getByAltText('T-Rex', { exact: true }).count(), 0);
  await capture(page, '06-passage-ipad-landscape');
  await press(page, 'Continue');
  await reveal(page, 'ipad-landscape');
  await main.context.close();

  const mobile = await setup({ viewport: phone });
  await arrive(mobile.page, 'phone-portrait');
  await check(mobile.page, 4);
  assert.equal((await read(mobile.page)).run.outcomes[3], 'independent');
  await activate(mobile.page, 'phone-portrait');
  await press(mobile.page, 'Continue');
  await beat(mobile.page, 'explore');
  await art(mobile.page, /underwater-portrait\.webp$/);
  await capture(mobile.page, '05-underwater-phone-portrait');
  await press(mobile.page, 'Continue');
  await beat(mobile.page, 'reveal', -1);
  await art(mobile.page, /passage-portrait\.webp$/);
  await capture(mobile.page, '06-passage-phone-portrait');
  await press(mobile.page, 'Skip cinematic');
  await reveal(mobile.page, 'phone-portrait');
  await mobile.context.close();

  for (const [width, height, suffix] of [[844, 390, 'phone-landscape'], [820, 1180, 'ipad-portrait'], [1440, 900, 'desktop']]) {
    const layout = await setup({ viewport: { width, height } });
    await beat(layout.page, 'arrival');
    assert.ok(await button(layout.page, 'Continue').evaluate(control => control.getBoundingClientRect().bottom <= innerHeight));
    await capture(layout.page, '01-arrival-' + suffix);
    await layout.context.close();
  }

  const moving = await setup({ phase: 'compare', added: 6, motion: 'no-preference' });
  await moving.page.evaluate(() => {
    // Hold the release's animations for reproducible screenshots and cancellation checks.
    const animate = Element.prototype.animate;
    window.lagoonAnimations = [];
    Element.prototype.animate = function (...args) {
      const animation = animate.apply(this, args);
      if (this.closest('.lagoon-stage')) {
        animation.pause();
        animation.currentTime = 0;
        window.lagoonAnimations.push(animation);
      }
      return animation;
    };
  });
  await check(moving.page, 4);
  await rows(moving.page, [9, 10, 2]);
  await moving.page.waitForFunction(() => window.lagoonAnimations.length === 3);
  await moving.page.evaluate(() => { for (const animation of window.lagoonAnimations) animation.currentTime = 150; });
  await capture(moving.page, 'motion-01-reconcile', 'allow');
  for (let index = 0; index < 3; index++) await press(moving.page, 'Continue');
  await beat(moving.page, 'explore');
  await moving.page.waitForFunction(() => window.lagoonAnimations.some(animation => animation.effect.target.matches('.lagoon-dive')));
  await capture(moving.page, 'motion-02-dive', 'allow');
  await moving.page.evaluate(async () => {
    for (const animation of window.lagoonAnimations.filter(a => a.playState === 'paused')) animation.currentTime = 1280;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await capture(moving.page, 'motion-03-underwater', 'allow');
  await press(moving.page, 'Continue');
  await beat(moving.page, 'reveal', -1);
  await moving.page.waitForFunction(() => window.lagoonAnimations.some(animation =>
    animation.effect.target.matches('.lagoon-backdrop') && animation.playState === 'paused'));
  await moving.page.evaluate(() => {
    for (const animation of window.lagoonAnimations.filter(a => a.playState === 'paused')) animation.currentTime = 550;
  });
  await capture(moving.page, 'motion-04-discovery', 'allow');
  await press(moving.page, 'Skip cinematic');
  await beat(moving.page, 'reveal');
  const beforeMap = await read(moving.page);
  await press(moving.page, 'Listen');
  await press(moving.page, 'Trail map');
  assert.ok(await moving.page.evaluate(() => window.lagoonAnimations.every(animation => animation.playState !== 'paused')));
  await press(moving.page, 'Back to adventure');
  assert.equal((await speech(moving.page)).canceled, 1);
  assert.deepEqual(await read(moving.page), beforeMap);
  await moving.context.close();

  assert.deepEqual(errors, []);
  console.log(engine.name() + ' passed Crystal Lagoon story, minimum, transfers, lessons, persistence, cinematic and layouts.');
} finally {
  await browser.close();
}
