import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chapterKey, emptyAttempt } from '../js/chapter.js';
import { bridgeDialogue } from '../js/triceratops-content.js';
import { newBridgeBeat } from '../js/triceratops-state.js';

const { chromium, webkit } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.CHAPTER_BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch({ executablePath: process.env.CHAPTER_BROWSER_PATH ||
  (engine === chromium && !existsSync(engine.executablePath()) && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) });
const base = process.env.CHAPTER_URL || 'http://127.0.0.1:8430/math-quest/';
const images = process.env.CHAPTER_SCREENSHOTS;
const ipad = { width: 1180, height: 820 };
const phone = { width: 390, height: 844 };
const errors = [];
const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const press = (scope, name) => button(scope, name).click();
const stage = page => page.locator('.bridge-stage');
const field = page => page.getByLabel('Your answer');
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), chapterKey);
const speech = page => page.evaluate(() => window.bridgeSpeech);

async function setup({ viewport = ipad, phase = 'arrival', motion = 'reduce', pending = false, variant = 0, shared = 0 } = {}) {
  const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion: motion });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    const fixture = window.bridgeSpeech = { spoken: [], canceled: 0 };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class {
      constructor(text) { this.text = text; }
    } });
    Object.defineProperty(window, 'speechSynthesis', { value: {
      speak: utterance => { fixture.spoken.push(utterance.text); utterance.onstart?.(); },
      cancel: () => { fixture.canceled++; }, getVoices: () => [],
    } });
  }, { key: chapterKey, state: { version: 1, autoBreak: true, runs: 1, badge: true, run: {
    scene: 'share', seed: 2026, bridgeVariant: variant, ...(pending ? { mapFrom: '2' } : {}),
    outcomes: ['independent', 'assisted', null, null, null],
    attempt: { ...emptyAttempt(), bridge: { ...newBridgeBeat(phase), shared, tool: shared ? 'model' : 'closed' } },
  } } });
  await page.goto(base);
  await press(page, 'Continue Adventure');
  if (pending) {
    assert.equal(await page.locator('.map-marker[data-waypoint="3"]').getAttribute('aria-current'), 'step');
    await press(page, 'Visit Triceratops Bridge');
  }
  return { page, context };
}

async function beat(page, phase, line = 0) {
  await stage(page).and(page.locator(`[data-beat="${phase}"][data-line="${line}"]`)).waitFor();
  if (phase !== 'construction') assert.equal(await stage(page).locator('.grove-line').count(), 1);
}
async function check(page, value) {
  await field(page).fill(String(value));
  await press(page, 'Check Answer');
}
async function art(page, expected) {
  const result = await stage(page).locator('.bridge-landscape').evaluate(async img => { await img.decode(); return img.currentSrc; });
  assert.match(result, expected);
}
async function capture(page, name, animations = 'disabled') {
  await page.locator('#chapter img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ' overflows horizontally');
  if (!images) return;
  mkdirSync(images, { recursive: true });
  await page.screenshot({ path: join(images, name + '.png'), fullPage: true, animations });
}

async function rows(page, expected) {
  const board = stage(page).locator('.bridge-model');
  const groups = ['.bridge-fixed .bridge-plank', '.bridge-column > :nth-child(2) .bridge-plank', '.bridge-supply-grid .bridge-plank'];
  assert.deepEqual(await Promise.all(groups.map(group => board.locator(group).count())), expected);
  assert.equal(expected[0] + expected[1] + expected[2], 24);
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
  const line = () => stage(page).locator('.grove-line').textContent();
  assert.equal(await line(), bridgeDialogue.arrival[0][1]);
  await art(page, /broken-(landscape|portrait)\.webp$/);
  await capture(page, '01-arrival-' + suffix);
  await press(page, 'Listen');
  assert.deepEqual((await speech(page)).spoken, [bridgeDialogue.arrival[0][1]]);
  await button(page, 'Continue').evaluate(control => { control.click(); control.click(); });
  await beat(page, 'arrival', 1);
  assert.equal(await line(), bridgeDialogue.arrival[1][1]);
  assert.equal((await speech(page)).canceled, 1);
  await press(page, 'Let’s Fix It!');
  await beat(page, 'introduction');
  assert.equal(await line(), bridgeDialogue.introduction[0][1].replace('{target}', '11').replace('{initial}', '7'));
  await capture(page, '02-introduction-' + suffix);
  await press(page, 'Continue');
  assert.equal(await line(), bridgeDialogue.introduction[1][1]);
  await press(page, 'Continue');
  await beat(page, 'construction');
  assert.equal(await stage(page).locator('.bridge-model').isVisible(), false);
  assert.equal(await stage(page).locator('.grove-equation').count(), 0);
  await capture(page, '03-independent-' + suffix);
}

async function afterRepair(page, suffix) {
  await beat(page, 'equality');
  await rows(page, [11, 11, 2]);
  assert.equal(await stage(page).locator('.grove-equation').textContent(), '7 + 4 = 11');
  assert.equal(await stage(page).locator('img[src*="repaired-"]').count(), 0);
  await capture(page, '04-equality-' + suffix);
  await press(page, 'Continue');
  await beat(page, 'crossing');
  await art(page, /repaired-(landscape|portrait)\.webp$/);
  assert.equal(await button(page, 'Skip crossing').count(), 0);
  assert.equal(await stage(page).evaluate(el => el.getAnimations({ subtree: true }).length), 0);
  await capture(page, '05-crossing-' + suffix);
  await press(page, 'Continue');
  await beat(page, 'clue');
  assert.equal(await stage(page).locator('.grove-line').textContent(), bridgeDialogue.clue[0][1]);
  await capture(page, '06-clue-' + suffix);
  await press(page, 'Continue');
  assert.equal(await stage(page).locator('.grove-line').textContent(), bridgeDialogue.clue[1][1]);
  await button(page, 'Continue the Adventure').evaluate(control => { control.click(); control.click(); });
  await page.getByRole('heading', { name: 'Dinosaur Island Adventure' }).waitFor();
  assert.equal(await page.locator('.map-numbered[data-status=completed]').count(), 3);
  assert.ok(await button(page, 'Take a Wiggle Break').isVisible());
  assert.equal((await read(page)).runs, 1);
  await capture(page, '07-map-' + suffix);
  await press(page, 'Skip for now');
  await button(page, 'Visit Crystal Lagoon').waitFor();
  assert.equal((await read(page)).run.scene, 'gems');
}

try {
  const main = await setup({ pending: true });
  const { page } = main;
  await arrive(page, 'ipad-landscape');
  await field(page).fill('-1');
  await press(page, 'Check Answer');
  assert.match(await page.locator('#chapter-feedback').textContent(), /whole number/);
  await field(page).fill('');
  await press(page, 'Math tools');
  await rows(page, [11, 7, 6]);
  await button(page, 'Spare plank 6, add to second row').tap();
  await rows(page, [11, 8, 5]);
  await drag(page, button(page, 'Spare plank 6, add to second row'), stage(page).locator('.bridge-fixed').first());
  await rows(page, [11, 8, 5]);
  await drag(page, button(page, 'Spare plank 6, add to second row'), stage(page).locator('.bridge-next'));
  await rows(page, [11, 9, 4]);
  await button(page, 'Add a Plank').press('Space');
  await rows(page, [11, 10, 3]);
  await capture(page, '03-matching');
  await press(page, 'Show empty slots');
  assert.equal(await stage(page).locator('.bridge-empty').count(), 1);
  await press(page, 'Add a Plank');
  assert.equal(await stage(page).locator('.bridge-model').getAttribute('data-relation'), 'equal');
  assert.equal((await read(page)).run.outcomes[2], null);
  await press(page, 'Add a Plank');
  await press(page, 'Add a Plank');
  await rows(page, [11, 13, 0]);
  assert.ok(await button(page, 'Add a Plank').isDisabled());
  await capture(page, '03-overshoot');
  await press(page, 'Undo');
  await rows(page, [11, 12, 1]);
  await press(page, 'Reset');
  await rows(page, [11, 7, 6]);
  await press(page, 'Add a Plank');
  await press(page, 'Number line');
  await press(page, 'Jump one forward');
  assert.equal((await read(page)).run.attempt.bridge.position, 8);
  await field(page).fill('5');
  const checkpoint = await read(page);
  await press(page, 'Take a break');
  await press(page, 'I’m ready!');
  await press(page, 'Trail map');
  await press(page, 'Continue Stop');
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.reload();
  await press(page, 'Continue Adventure');
  assert.deepEqual(await read(page), checkpoint);
  assert.equal(await field(page).inputValue(), '5');
  assert.equal(await page.locator('.number-line-jumps .jumped').count(), 1);
  await press(page, 'Math tools');
  await rows(page, [11, 8, 5]);
  await capture(page, '03-ipad-portrait');
  await page.setViewportSize(ipad);
  await check(page, 5);
  assert.match(await page.locator('#chapter-feedback').textContent(), /more planks/);
  await check(page, 18);
  assert.match(await page.locator('#chapter-feedback').textContent(), /altogether/);
  await capture(page, '03-incorrect-feedback');
  await press(page, 'Hint');
  await press(page, 'Another hint');
  await press(page, 'Another hint');
  await capture(page, '03-progressive-hint');
  await press(page, 'Try with help');
  const example = page.getByRole('dialog', { name: 'See a different example' });
  await press(example, 'Show how');
  assert.ok(await example.getByText('4 + 2 = 6', { exact: true }).isVisible());
  await capture(page, '03-guided-example');
  await press(example, 'Back to my problem');
  await rows(page, [11, 8, 5]);
  assert.equal(await field(page).inputValue(), '18');
  await press(page, 'Grown-ups');
  await press(page, 'Teaching tips for this problem');
  const coach = page.getByRole('dialog', { name: 'Teaching tips' });
  assert.ok(await coach.getByText(/aligned rows of 11 and 7 LEGO/).isVisible());
  assert.equal(await coach.getByText('7 + 4 = 11', { exact: true }).count(), 0);
  await press(coach, 'Reveal worked solution');
  assert.ok(await coach.getByText('11 − 7 = 4', { exact: true }).isVisible());
  await coach.locator('summary').click();
  await coach.getByLabel('Transfer answer').fill('4');
  await press(coach, 'Check');
  assert.ok(await coach.getByText(/Add four to six to make ten/).isVisible());
  await capture(page, '03-parent-teaching-tips');
  await press(coach, 'Close');
  await check(page, 4);
  assert.deepEqual((await read(page)).run.bridgeHelp, ['tools', 'hints', 'guided', 'parent']);
  assert.equal((await read(page)).run.outcomes[2], 'assisted');
  const saved = await read(page);
  await page.reload();
  await press(page, 'Continue Adventure');
  assert.deepEqual(await read(page), saved);
  await afterRepair(page, 'ipad-landscape');
  await main.context.close();

  const mobile = await setup({ viewport: phone });
  await arrive(mobile.page, 'phone-portrait');
  await check(mobile.page, 4);
  assert.equal((await read(mobile.page)).run.outcomes[2], 'independent');
  await afterRepair(mobile.page, 'phone-portrait');
  await mobile.context.close();

  for (const [width, height, suffix] of [[844, 390, 'phone-landscape'], [820, 1180, 'ipad-portrait'], [1440, 900, 'desktop']]) {
    const layout = await setup({ viewport: { width, height } });
    await beat(layout.page, 'arrival');
    assert.ok(await button(layout.page, 'Continue').evaluate(control => control.getBoundingClientRect().bottom <= innerHeight));
    await capture(layout.page, '01-arrival-' + suffix);
    await layout.context.close();
  }

  const moving = await setup({ phase: 'construction', shared: 6, motion: 'no-preference' });
  await check(moving.page, 4);
  await beat(moving.page, 'equality');
  await moving.page.waitForFunction(() => document.querySelector('.bridge-results').getAnimations({ subtree: true }).length === 2);
  await moving.page.locator('.bridge-results').evaluate(view => {
    for (const animation of view.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = 120; }
  });
  await capture(moving.page, 'motion-01-return-surplus', 'allow');
  await button(moving.page, 'Continue').evaluate(control => {
    control.click();
    const current = document.querySelector('.bridge-stage');
    window.crossing = current.getAnimations({ subtree: true });
    for (const animation of window.crossing) { animation.pause(); animation.currentTime = 0; }
  });
  await beat(moving.page, 'crossing');
  await capture(moving.page, 'motion-02-near-bank', 'allow');
  await moving.page.evaluate(async () => {
    for (const animation of window.crossing) animation.currentTime = 870;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const halfway = await moving.page.locator('.bridge-trex').evaluate(el => ({
    left: parseFloat(getComputedStyle(el).left) / el.parentElement.clientWidth,
    top: parseFloat(getComputedStyle(el).top) / el.parentElement.clientHeight,
  }));
  assert.ok(halfway.left > .4 && halfway.left < .6 && halfway.top > .42 && halfway.top < .475, JSON.stringify(halfway));
  await capture(moving.page, 'motion-03-on-deck', 'allow');
  await press(moving.page, 'Listen');
  await press(moving.page, 'Skip crossing');
  assert.ok(await moving.page.evaluate(() => window.crossing.every(animation => ['idle', 'finished'].includes(animation.playState))));
  await capture(moving.page, 'motion-04-far-bank');
  await press(moving.page, 'Continue');
  assert.equal((await speech(moving.page)).canceled, 1);
  await beat(moving.page, 'clue');
  await moving.context.close();

  const interrupted = await setup({ phase: 'construction', shared: 3, motion: 'no-preference' });
  await check(interrupted.page, 4);
  await interrupted.page.waitForFunction(() => document.querySelector('.bridge-results').getAnimations({ subtree: true }).length === 1);
  await button(interrupted.page, 'Continue').evaluate(control => {
    control.click();
    const current = document.querySelector('.bridge-stage');
    window.crossing = current.getAnimations({ subtree: true });
    for (const animation of window.crossing) { animation.pause(); animation.currentTime = 600; }
  });
  await press(interrupted.page, 'Listen');
  const beforeMap = await read(interrupted.page);
  await press(interrupted.page, 'Trail map');
  assert.ok(await interrupted.page.evaluate(() => window.crossing.every(animation => ['idle', 'finished'].includes(animation.playState))));
  await press(interrupted.page, 'Back to adventure');
  assert.equal((await speech(interrupted.page)).canceled, 1);
  assert.deepEqual(await read(interrupted.page), beforeMap);
  await interrupted.page.reload();
  await press(interrupted.page, 'Continue Adventure');
  await beat(interrupted.page, 'crossing');
  assert.equal(await button(interrupted.page, 'Skip crossing').count(), 0);
  assert.deepEqual(await read(interrupted.page), beforeMap);
  await interrupted.context.close();

  assert.deepEqual(errors, []);
  console.log(engine.name() + ' passed Bridge v2 story, workspace, teaching, progress, animations and responsive checks.');
} finally {
  await browser.close();
}
