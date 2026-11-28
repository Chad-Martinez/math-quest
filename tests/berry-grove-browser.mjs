import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chapterKey, emptyAttempt } from '../js/chapter.js';
import { berryChallenge, berryDialogue, berryGuide } from '../js/berry-grove-content.js';

const { chromium, webkit } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.CHAPTER_BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch({ executablePath: process.env.CHAPTER_BROWSER_PATH ||
  (engine === chromium && !existsSync(engine.executablePath()) && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) });
const base = process.env.CHAPTER_URL || 'http://127.0.0.1:8428/math-quest/';
const images = process.env.CHAPTER_SCREENSHOTS;
const ipad = { width: 1180, height: 820 };
const phone = { width: 390, height: 844 };
const errors = [];
const grove = page => page.locator('.grove-stage');
const button = (page, label) => page.getByRole('button', { name: label, exact: true });
const press = (page, label) => button(page, label).click();
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), chapterKey);
const digits = page => page.getByLabel('Your answer', { exact: true });
const question = (page, step) => page.getByRole('heading', { name: berryChallenge.steps[step].question, exact: true });

async function at(page, phase, line = 0) {
  await grove(page).and(page.locator(`[data-beat="${phase}"][data-line="${line}"]`)).waitFor();
  assert.equal(await page.locator('.grove-line').count(), 1);
}
async function check(page, answer) {
  await digits(page).fill(String(answer));
  await press(page, 'Check Answer');
}

async function setup(viewport = ipad, { motion = 'reduce', scene = 'map', variant = 0, support, resume } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: motion, hasTouch: true });
  await context.addInitScript(({ key, fixture }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture));
    window.groveAudio = { read: [], cancellations: 0 };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class {
      constructor(line) { this.text = line; }
    } });
    Object.defineProperty(window, 'speechSynthesis', { value: {
      getVoices: () => [], speak: say => { window.groveAudio.read.push(say.text); say.onstart?.(); },
      cancel: () => window.groveAudio.cancellations++,
    } });
  }, { key: chapterKey, fixture: { version: 1, autoBreak: true, runs: 0, badge: false, run: {
    scene, seed: 2026, berryVariant: variant, outcomes: [null, null, null, null, null],
    attempt: { ...emptyAttempt(), ...support, ...(resume ? { berry: { phase: resume, line: 0 } } : {}) },
  } } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.goto(base);
  await press(page, 'Continue Adventure');
  if (scene === 'map') {
    await press(page, "Let's Go!");
    await press(page, 'Visit Berry Grove');
  }
  return { page, context };
}

async function capture(page, name, animations = 'disabled') {
  await page.locator('#chapter img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ' has horizontal overflow');
  if (!images) return;
  mkdirSync(images, { recursive: true });
  await page.screenshot({ path: join(images, name + '.png'), fullPage: true, animations });
}

async function greet(page, suffix, checkNarration = false) {
  await at(page, 'arrival');
  assert.equal(await page.locator('.grove-line').textContent(), berryDialogue.lines.arrival1.text);
  assert.equal(await page.locator('.grove-trex').evaluateAll(actors =>
    actors.filter(actor => Number(getComputedStyle(actor).opacity) > 0).length), 1);
  await capture(page, `01-arrival-${suffix}`);
  if (checkNarration) {
    await press(page, 'Listen');
    assert.deepEqual(await page.evaluate(() => window.groveAudio.read), [berryDialogue.lines.arrival1.text]);
  }
  await press(page, 'Continue');
  await at(page, 'arrival', 1);
  await press(page, 'Let’s Collect Berries!');
  await at(page, 'intro');
  assert.match(await page.locator('.grove-line').textContent(), /16 berries.*5 red berries and 7 blue berries/);
  await capture(page, `02-introduction-${suffix}`);
  await press(page, 'Continue');
  await at(page, 'intro', 1);
  await press(page, 'Continue');
  await at(page, 'combine');
}

async function trail(page, suffix) {
  await at(page, 'success');
  assert.equal(await page.locator('.grove-added').count(), 4);
  assert.equal(await page.locator('.grove-collection-grid .grove-unit').count(), 16);
  assert.deepEqual(await page.locator('.grove-sign figcaption p').allTextContents(), ['5 + 7 = 12', '12 + 4 = 16']);
  await capture(page, `05-success-${suffix}`);
  await press(page, 'Continue');
  await at(page, 'success', 1);
  await press(page, 'Continue');
  await at(page, 'clue');
  assert.match(await page.locator('.grove-line').textContent(), /Velociraptor/);
  assert.ok(await page.locator('.grove-bubble').evaluate(bubble => {
    const { left, right } = bubble.getBoundingClientRect();
    return left >= 0 && right <= innerWidth;
  }));
  await capture(page, `06-clue-${suffix}`);
  await press(page, 'Continue');
  await at(page, 'clue', 1);
  await button(page, 'Follow the Trail').evaluate(control => { control.click(); control.click(); });
  await page.getByRole('heading', { name: 'Dinosaur Island Adventure', exact: true }).waitFor();
  assert.ok(await button(page, 'Visit Raptor Trail').isEnabled());
  assert.equal(await page.locator('.map-numbered[data-status=completed]').count(), 1);
  const checkpoint = await saved(page);
  assert.equal(checkpoint.run.scene, 'footprints');
  assert.equal(checkpoint.runs, 0);
  assert.equal(checkpoint.badge, false);
}

try {
  const primary = await setup();
  const page = primary.page;
  await greet(page, 'ipad-landscape', true);
  assert.equal(await page.evaluate(() => window.groveAudio.cancellations), 1);
  await question(page, 0).waitFor();
  assert.equal(await page.locator('.grove-equation').textContent(), '5 + 7 = □');
  assert.equal(await page.locator('.grove-model').isVisible(), false);
  await capture(page, '03-combine-collapsed-ipad-landscape');
  await check(page, '');
  await check(page, '1.5');
  assert.match(await page.locator('#chapter-feedback').textContent(), /whole number/);
  assert.equal((await saved(page)).run.attempt.berry.mistakes, 0);
  await check(page, '5');
  assert.equal(await page.locator('#chapter-feedback').textContent(), berryChallenge.steps[0].feedback.group);
  await check(page, '7');
  assert.ok(await button(page, 'Try with help').isVisible());
  await press(page, 'Hint');
  await press(page, 'Another hint');
  await press(page, 'Another hint');
  await capture(page, '03-progressive-hints');
  await press(page, 'Math tools');
  const red = page.getByRole('region', { name: 'Red berries' });
  const basket = page.getByRole('region', { name: 'Together in the basket' });
  assert.equal(await red.getByRole('button').count(), 5);
  assert.equal(await page.getByRole('region', { name: 'Blue berries' }).getByRole('button').count(), 7);
  await red.getByRole('button').first().press('Enter');
  assert.equal(await basket.getByRole('button').count(), 1);
  await press(page, 'Undo');
  assert.equal(await basket.getByRole('button').count(), 0);
  const start = await red.getByRole('button').first().boundingBox();
  const end = await basket.boundingBox();
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 6 });
  await page.mouse.up();
  assert.equal(await basket.getByRole('button').count(), 1);
  await capture(page, '03-combine-tools-ipad-landscape');
  await press(page, 'Take a break');
  await press(page, 'I’m ready!');
  assert.equal(await digits(page).inputValue(), '7');
  await press(page, 'Trail map');
  await press(page, 'Continue Stop');
  assert.equal(await basket.getByRole('button').count(), 1);
  await page.reload();
  await press(page, 'Continue Adventure');
  assert.equal(await basket.getByRole('button').count(), 1);
  assert.equal(await digits(page).inputValue(), '7');
  await capture(page, '03-resumed-workspace');

  await press(page, 'Try with help');
  const guide = page.getByRole('dialog', { name: 'See a different example' });
  await press(guide, 'Show how');
  assert.ok(await guide.getByText('2 + 3 = 5', { exact: true }).isVisible());
  await capture(page, '03-worked-example');
  await press(guide, 'See the next step');
  await press(guide, 'Show how');
  assert.ok(await guide.getByText('5 + 2 = 7', { exact: true }).isVisible());
  await press(guide, 'Try a similar problem');
  await guide.getByLabel('Transfer answer').fill('9');
  await press(guide, 'Hint');
  await capture(page, '03-guided-transfer');
  await press(guide, 'Check');
  await press(guide, 'Continue');
  await guide.getByLabel('Transfer answer').fill('3');
  await press(guide, 'Check');
  await press(guide, 'Back to my problem');
  assert.equal(await digits(page).inputValue(), '7');
  assert.equal(await basket.getByRole('button').count(), 1);
  await press(page, 'Grown-ups');
  await press(page, 'Teaching tips for this problem');
  const coach = page.getByRole('dialog', { name: 'Teaching tips' });
  assert.ok(await coach.getByText(berryGuide.objective, { exact: true }).isVisible());
  await press(coach, 'Reveal worked solution');
  assert.ok(await coach.getByText('16 − 12 = 4', { exact: true }).isVisible());
  await coach.locator('summary').click();
  await coach.getByLabel('Transfer answer').fill('5');
  await press(coach, 'Check');
  assert.match(await coach.getByRole('status').last().textContent(), /15 − 10 = 5/);
  await capture(page, '03-parent-teaching-tips');
  await press(coach, 'Close');

  await check(page, 12);
  await at(page, 'combine', 1);
  assert.equal((await saved(page)).run.outcomes[0], null);
  await capture(page, '03-verified-total-ipad-landscape');
  await press(page, 'Continue');
  await at(page, 'missing');
  assert.equal(await page.locator('.grove-equation').textContent(), '12 + □ = 16');
  assert.match(await page.locator('.grove-problem').textContent(), /5 red berries and 7 blue berries/);
  assert.equal(await page.locator('.chapter-known').textContent(), 'In your basket: 12 berries.');
  await check(page, 12);
  assert.match(await page.locator('#chapter-feedback').textContent(), /already have/);
  await check(page, 16);
  assert.match(await page.locator('#chapter-feedback').textContent(), /altogether/);
  await press(page, 'Number line');
  await button(page, '13').click();
  await page.reload();
  await press(page, 'Continue Adventure');
  assert.equal(await page.locator('.number-line-jumps .jumped').count(), 1);
  await press(page, 'Math tools');
  assert.equal(await page.locator('.grove-slot .grove-unit').count(), 12);
  for (let index = 0; index < 5; index++) {
    await page.getByRole('region', { name: 'Extra berries' }).getByRole('button').first().click();
  }
  assert.equal(await page.locator('.grove-slot[data-overflow] button').count(), 1);
  await press(page, 'Undo');
  await capture(page, '04-missing-ipad-landscape');
  await check(page, 4);
  await at(page, 'missing', 1);
  const completed = await saved(page);
  assert.equal(completed.run.outcomes[0], 'assisted');
  assert.deepEqual(completed.run.berryHelp, ['tools', 'hints', 'worked-example', 'guided', 'parent']);
  await page.reload();
  await press(page, 'Continue Adventure');
  await at(page, 'missing', 1);
  assert.deepEqual(await saved(page), completed);
  await press(page, 'Continue');
  await trail(page, 'ipad-landscape');
  await primary.context.close();

  const portrait = await setup(phone);
  await greet(portrait.page, 'phone-portrait');
  assert.match(await portrait.page.locator('.grove-stage').evaluate(el => getComputedStyle(el).minHeight), /px/);
  await capture(portrait.page, '03-combine-phone-portrait');
  await check(portrait.page, 12);
  await capture(portrait.page, '03-verified-total-phone-portrait');
  await press(portrait.page, 'Continue');
  await capture(portrait.page, '04-missing-phone-portrait');
  await press(portrait.page, 'Math tools');
  assert.equal(await portrait.page.locator('.grove-slot .grove-unit').count(), 12);
  await capture(portrait.page, '04-missing-tools-phone-portrait');
  await check(portrait.page, 4);
  assert.equal((await saved(portrait.page)).run.outcomes[0], 'independent');
  await press(portrait.page, 'Continue');
  await trail(portrait.page, 'phone-portrait');
  await portrait.context.close();

  for (const [width, height, suffix] of [[820, 1180, 'ipad-portrait'], [844, 390, 'phone-landscape'], [1440, 900, 'desktop']]) {
    const layout = await setup({ width, height });
    await at(layout.page, 'arrival');
    assert.match(await layout.page.locator('.grove-landscape').evaluate(img => img.currentSrc), width > height ? /landscape\.webp$/ : /portrait\.webp$/);
    assert.ok(await button(layout.page, 'Continue').evaluate(control => control.getBoundingClientRect().bottom <= innerHeight));
    await capture(layout.page, `01-arrival-${suffix}`);
    await layout.context.close();
  }

  const motion = await setup(ipad, { motion: 'no-preference', scene: 'supplies', resume: 'missing', support: { step: 1 } });
  await check(motion.page, 4);
  await motion.page.clock.install();
  await motion.page.clock.pauseAt(new Date(Date.now() + 1000));
  await button(motion.page, 'Continue').evaluate(control => control.click());
  await motion.page.clock.runFor(80);
  assert.equal(await motion.page.locator('[data-collecting]').count(), 4);
  await capture(motion.page, 'collection-01-reaching', 'allow');
  await motion.page.clock.resume();
  await motion.page.waitForFunction(() => [...document.querySelectorAll('[data-collecting]')]
    .some(berry => Number(getComputedStyle(berry).opacity) > 0));
  await capture(motion.page, 'collection-02-in-flight', 'allow');
  await motion.page.waitForFunction(() => document.querySelector('.grove-count-label')?.textContent === '16 berries in the basket');
  assert.equal(await motion.page.locator('[data-collecting]').count(), 0);
  await capture(motion.page, 'collection-03-packed', 'allow');
  await motion.context.close();

  assert.deepEqual(errors, []);
  console.log(`${engine.name()} passed Berry Grove beats, math workspace, support, save/resume, collection and layout checks.`);
} finally {
  await browser.close();
}
