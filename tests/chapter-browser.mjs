import { lagoonGuide } from '../js/crystal-lagoon-content.js';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chapterBerryQuestion, chapterBridgeQuestion, chapterKey, chapterLagoonQuestion, chapterQuestions, chapterTrailQuestion, freshQuestion } from '../js/chapter.js';
import { bridgeGuide } from '../js/triceratops-content.js';
import { trailGuide } from '../js/velociraptor-content.js';
import { berryGuide } from '../js/berry-grove-content.js';
import { readProgress } from '../js/storage.js';

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.CHAPTER_URL || 'http://127.0.0.1:8421/math-quest/';
const images = process.env.CHAPTER_SCREENSHOTS;
const engine = process.env.CHAPTER_BROWSER === 'webkit' ? webkit : chromium;
const executablePath = process.env.CHAPTER_BROWSER_PATH ||
  (engine === chromium && !existsSync(engine.executablePath()) && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await engine.launch({ executablePath });
const seed = 2026;
const qs = chapterQuestions(seed, 0);
const errors = [];
const legacy = readProgress({ getItem: () => null });
legacy.legacy.stars = 12;
const legacyRaw = JSON.stringify(legacy);

function observe(page) {
  page.on('pageerror', error => errors.push(String(error)));
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(request.url()); });
}

async function screen(page, name) {
  await page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))));
  const dimensions = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.ok(dimensions[0] <= dimensions[1], name + ' has horizontal page overflow');
  if (!images) return;
  mkdirSync(images, { recursive: true });
  await page.screenshot({ path: join(images, name + '.png'), fullPage: true, animations: 'disabled' });
}

function button(page, name) { return page.getByRole('button', { name, exact: true }); }
async function press(page, name) { await button(page, name).click(); }
async function finishIntroduction(page) {
  for (const beat of [1, 2, 3]) {
    await page.locator(`.mission-stage[data-beat="${beat}"]`).waitFor();
    // The scene filters repeated presses in a short window, independently of its animations.
    if (beat > 1) await page.waitForTimeout(230);
    await press(page, 'Continue');
  }
  await page.waitForTimeout(230);
  await press(page, "Let's Find It!");
}
async function check(page, value) {
  await page.getByLabel('Your answer').fill(String(value));
  await press(page, await page.locator('.grove-stage:not(.lagoon-stage)').count() ? 'Check Answer' : 'Check answer');
}
async function enterGrove(page) {
  await heading(page, 'Brachiosaurus Berry Grove');
  for (const label of ['Continue', 'Let’s Collect Berries!', 'Continue', 'Continue']) await press(page, label);
}
async function leaveGrove(page) {
  for (let i = 0; i < 4; i++) await press(page, 'Continue');
  await press(page, 'Follow the Trail');
}
async function enterTrail(page) {
  await heading(page, 'Velociraptor Trail');
  for (const label of ['Continue', 'Let’s Investigate!', 'Continue', 'Continue']) await press(page, label);
}
async function leaveTrail(page) {
  for (let i = 0; i < 4; i++) await press(page, 'Continue');
  await press(page, 'Visit Triceratops Bridge');
}
async function enterBridge(page) {
  await heading(page, 'Triceratops Bridge');
  for (const label of ['Continue', 'Let’s Fix It!', 'Continue', 'Continue']) await press(page, label);
}
async function leaveBridge(page) {
  for (let i = 0; i < 3; i++) await press(page, 'Continue');
  await press(page, 'Continue the Adventure');
}
async function enterLagoon(page) {
  await heading(page, 'Mosasaurus Crystal Lagoon');
  for (const label of ['Continue', 'Explore the Lagoon!', 'Continue', 'Continue', 'Continue']) await press(page, label);
}
async function leaveLagoon(page) {
  for (let i = 0; i < 3; i++) await press(page, 'Continue');
  await press(page, 'Skip cinematic');
  await press(page, 'Continue');
  await press(page, 'Explore the Crystal Cave');
}
async function heading(page, label) { await page.getByRole('heading', { name: label, exact: true }).waitFor(); }
async function stored(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), chapterKey); }
async function drag(page, piece, target) {
  const from = await piece.boundingBox();
  const to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
}
async function teachingTips(page, index, reveal = false) {
  await press(page, 'Grown-ups');
  await press(page, 'Teaching tips for this problem');
  await heading(page, 'Teaching tips');
  const modal = page.getByRole('dialog', { name: 'Teaching tips' });
  assert.ok(await modal.getByText(index === 0 ? berryGuide.objective : index === 1 ? trailGuide.objective : index === 3 ? lagoonGuide.objective : qs[index].objective, { exact: true }).isVisible());
  const q = index === 2 ? chapterBridgeQuestion((await stored(page)).run)
    : index === 3 ? chapterLagoonQuestion((await stored(page)).run) : qs[index];
  assert.equal(await modal.getByText(q.equations.at(-1), { exact: true }).count(), 0);
  if (reveal) {
    await press(page, 'I helped with this problem');
    assert.equal(await button(page, 'I helped with this problem').getAttribute('aria-pressed'), 'true');
    await press(page, 'Reveal worked solution');
    assert.ok(await modal.getByText(q.equations.at(-1), { exact: true }).isVisible());
  }
  await modal.locator('summary').click();
  await modal.getByLabel('Transfer answer').fill(String(index === 0 ? berryGuide.transfer.answer : index === 1 ? trailGuide.transfer.answer : index === 2 ? bridgeGuide.transfer.answer : index === 3 ? lagoonGuide.transfer.answer : freshQuestion(seed, index).answers.at(-1)));
  await modal.getByRole('button', { name: 'Check', exact: true }).click();
  assert.match(await modal.locator('form + p').textContent(), /That works/);
  await press(page, 'Close');
}

try {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, reducedMotion: 'reduce' });
  await context.addInitScript(({ seed, legacyRaw }) => {
    const original = crypto.getRandomValues.bind(crypto);
    let chapterSeed = seed;
    crypto.getRandomValues = values => {
      if (values instanceof Uint32Array && values.length === 1) {
        values[0] = chapterSeed++;
        return values;
      }
      return original(values);
    };
    if (!localStorage.getItem('math-quest.progress')) localStorage.setItem('math-quest.progress', legacyRaw);
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined });
  }, { seed, legacyRaw });
  const page = await context.newPage();
  observe(page);
  await page.goto(base);
  await heading(page, 'The Lost Egg');
  assert.equal(await page.getByRole('button', { name: /Chapter 2|Story Forest|Learn a skill/ }).count(), 0);
  await screen(page, '01-welcome');
  await press(page, 'Grown-ups');
  assert.ok(await page.getByText('Stars already earned in Math Quest: 12').isVisible());
  await press(page, 'Close');
  await press(page, 'Start Adventure');
  await heading(page, 'The Missing Egg');
  await finishIntroduction(page);
  await heading(page, 'Dinosaur Island Adventure');
  assert.equal(await page.locator('.map-numbered').count(), 5);
  assert.equal(await page.locator('.map-numbered[data-status=locked]').count(), 4);
  await screen(page, '02-trail');
  const mapCheckpoint = await stored(page);
  assert.equal(mapCheckpoint.run.scene, 'map');
  await press(page, "Let's Go!");
  await press(page, 'Visit Berry Grove');
  await enterGrove(page);
  await press(page, 'Math tools');
  const redGroup = page.getByRole('region', { name: 'Red berries' });
  assert.equal(await redGroup.getByRole('button').count(), qs[0].params.a);
  assert.equal(await page.getByRole('region', { name: 'Blue berries' }).getByRole('button').count(), qs[0].params.b);
  await screen(page, '03-gather-supplies');
  await page.getByLabel('Your answer').fill('8');
  await redGroup.getByRole('button').first().tap();
  const basket = page.getByRole('region', { name: 'Together in the basket' });
  assert.equal(await basket.getByRole('button').count(), 1);
  await drag(page, redGroup.getByRole('button').first(), basket);
  assert.equal(await basket.getByRole('button').count(), 2);
  await press(page, 'Take a break');
  await heading(page, 'Stegosaurus Wiggle Meadow');
  await press(page, 'Continue');
  await press(page, "Let's Wiggle!");
  await press(page, 'End break');
  assert.equal(await page.getByLabel('Your answer').inputValue(), '8');
  assert.equal(await basket.getByRole('button').count(), 2);
  await press(page, 'Listen');
  assert.ok(await page.getByText('Read aloud is unavailable in this browser.').isVisible());
  await press(page, 'Draw');
  assert.ok(await page.getByLabel('Scratch drawing').isVisible());
  assert.equal(await basket.isVisible(), false);
  const canvas = await page.getByLabel('Scratch drawing').boundingBox();
  await page.mouse.move(canvas.x + 30, canvas.y + 30);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 100, canvas.y + 60);
  await page.mouse.up();
  assert.ok(await page.locator('.chapter-sketch canvas').evaluate(c => c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(Boolean)));
  await press(page, 'Math tools');
  await teachingTips(page, 0);
  assert.equal(await page.getByLabel('Your answer').inputValue(), '8');
  assert.equal(await basket.getByRole('button').count(), 2);
  await check(page, 0);
  assert.match(await page.locator('#chapter-feedback').textContent(), /count both groups/);
  await check(page, qs[0].answers[0]);
  await press(page, 'Continue');
  await heading(page, qs[0].prompts[1]);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'chapter-question');
  await page.reload();
  await press(page, 'Continue Adventure');
  await heading(page, qs[0].prompts[1]);
  await page.getByLabel('Your answer').fill('1');
  await press(page, 'Restart stop');
  await heading(page, qs[0].prompts[0]);
  assert.equal(await page.getByLabel('Your answer').inputValue(), '');
  await press(page, 'Math tools');
  assert.equal(await redGroup.getByRole('button').count(), qs[0].params.a);
  assert.equal((await stored(page)).run.seed, seed);
  await check(page, qs[0].answers[0]);
  await press(page, 'Continue');
  await press(page, 'Number line');
  await button(page, String(qs[0].params.have + 1)).tap();
  assert.equal(await page.locator('.number-line-jumps .jumped').count(), 1);
  await screen(page, '04-count-on');
  await check(page, qs[0].answers[1]);
  assert.equal((await stored(page)).run.outcomes[0], 'assisted');
  await leaveGrove(page);

  await press(page, 'Visit Raptor Trail');
  await enterTrail(page);
  await page.getByLabel('Your answer').fill('2');
  await press(page, 'Trail map');
  assert.equal(await page.locator('.map-numbered[data-status=completed]').count(), 1);
  const footprintsCheckpoint = await stored(page);
  await button(page, 'Stop 1: Berry Grove, completed, practice').tap();
  await heading(page, qs[0].prompts[0]);
  await press(page, 'Math tools');
  assert.equal(await page.getByRole('region', { name: 'Blue berries' }).getByRole('button').count(), qs[0].params.b);
  await press(page, 'Leave practice');
  await heading(page, 'Velociraptor Trail');
  assert.equal(await page.getByLabel('Your answer').inputValue(), '2');
  assert.deepEqual(await stored(page), footprintsCheckpoint);
  await press(page, 'Trail map');
  await press(page, 'Continue Stop');
  assert.deepEqual(await stored(page), footprintsCheckpoint);
  const trail = chapterTrailQuestion((await stored(page)).run);
  await press(page, 'Math tools');
  assert.equal(await page.locator('.trail-spot[data-row="0"]').count(), trail.values.first);
  assert.equal(await page.locator('.trail-spot[data-row="1"]').count(), trail.values.second);
  await page.locator('.trail-spot[data-row="0"]').first().press('Enter');
  await page.locator('.trail-spot[data-row="1"]').first().press('Enter');
  assert.equal(await page.locator('.trail-spot.trail-matched').count(), 2);
  await teachingTips(page, 1);
  await screen(page, '05-follow-footprints');
  await check(page, trail.values.first + trail.values.second);
  assert.match(await page.locator('#chapter-feedback').textContent(), /comparing the trails/);
  await check(page, trail.answers[0]);
  await leaveTrail(page);

  await press(page, 'Visit Triceratops Bridge');
  await enterBridge(page);
  const bridge = chapterBridgeQuestion((await stored(page)).run);
  await teachingTips(page, 2, true);
  await press(page, 'Math tools');
  for (let i = 0; i < bridge.answers[0]; i++) await press(page, 'Add a Plank');
  await screen(page, '06-triceratops-bridge');
  assert.match(await page.locator('.bridge-model-status').textContent(), /match/);
  await check(page, bridge.answers[0]);
  assert.equal((await stored(page)).run.outcomes[2], 'assisted');
  await leaveBridge(page);
  await press(page, 'Take a Wiggle Break');
  await heading(page, 'Stegosaurus Wiggle Meadow');
  await screen(page, '07-wiggle-break');
  await page.reload();
  await press(page, 'Continue Adventure');
  await heading(page, 'Stegosaurus Wiggle Meadow');
  await press(page, 'Skip for Now');

  await press(page, 'Visit Crystal Lagoon');
  await enterLagoon(page);
  const crystals = chapterLagoonQuestion((await stored(page)).run);
  await press(page, 'Math tools');
  for (let i = 0; i < crystals.values.difference; i++) await press(page, 'Add a Crystal');
  assert.match(await page.locator('.bridge-model-status').textContent(), /same number/);
  await check(page, crystals.values.difference);
  assert.match(await page.locator('#chapter-feedback').textContent(), /equal/);
  await screen(page, '08-crystal-lagoon');
  await teachingTips(page, 3);
  await press(page, 'Hint');
  await press(page, 'Another hint');
  await press(page, 'Another hint');
  await press(page, 'See a worked example');
  await heading(page, 'See a different example');
  await press(page, 'Show how');
  await press(page, 'See the next step');
  await press(page, 'Back to my problem');
  assert.equal(await page.getByLabel('Your answer').inputValue(), String(crystals.values.difference));
  await check(page, crystals.values.answer);
  assert.equal((await stored(page)).run.outcomes[3], 'assisted');
  await leaveLagoon(page);

  await press(page, 'Visit Crystal Cave');
  await heading(page, 'Open the cave');
  await teachingTips(page, 4);
  await check(page, qs[4].answers[0]);
  assert.equal(await page.locator('.scale').getAttribute('data-tilt'), 'left');
  assert.equal(await page.locator('.scale-left .scale-object').count(), qs[4].params.left);
  assert.equal(await page.locator('.scale-term-second .scale-object').count(), qs[4].params.rightParts[1]);
  for (let i = 0; i < qs[4].answers[1]; i++) await page.locator('.scale-left .block-piece').first().tap();
  assert.equal(await page.locator('.scale').getAttribute('data-tilt'), 'level');
  await page.locator('.scale-left .block-piece').first().tap();
  assert.equal(await page.locator('.scale').getAttribute('data-tilt'), 'right');
  await page.locator('.block-tray .block-piece').last().tap();
  assert.equal(await page.locator('.scale').getAttribute('data-tilt'), 'level');
  await screen(page, '09-open-the-cave');
  await check(page, qs[4].answers[1]);
  await press(page, 'Follow the clue');
  await press(page, 'Find the Egg!');
  await heading(page, 'Meet Mosasaurus!');
  await screen(page, '10-meet-mosasaurus');
  await press(page, 'Look in the cave');
  await heading(page, 'You found the egg!');
  await screen(page, '11-egg-discovery');
  await press(page, 'Celebrate!');
  await heading(page, 'Chapter 1 complete!');
  await screen(page, '12-finale');
  await page.reload();
  await press(page, 'Continue Adventure');
  await heading(page, 'Chapter 1 complete!');
  assert.equal((await stored(page)).runs, 1);
  assert.equal((await stored(page)).badge, true);
  assert.equal(await page.evaluate(() => localStorage.getItem('math-quest.progress')), legacyRaw);
  await press(page, 'Finish chapter');
  await heading(page, 'Adventure complete');
  await press(page, 'Return home');
  await press(page, 'Start Adventure');
  await heading(page, 'The Missing Egg');
  assert.notEqual((await stored(page)).run.seed, seed);

  const portrait = { width: 768, height: 1024 };
  await page.setViewportSize(portrait);
  await finishIntroduction(page);
  await press(page, "Let's Go!");
  await press(page, 'Visit Berry Grove');
  await screen(page, '13-ipad-portrait');
  await page.setViewportSize({ width: 390, height: 844 });
  await screen(page, '14-phone');

  // Exercise the opt-out and distinguish Berry Grove's worked-example support from a solved answer.
  await enterGrove(page);
  await press(page, 'Grown-ups');
  await page.getByLabel('Offer a wiggle break after challenge three').uncheck();
  await press(page, 'Close');
  await press(page, 'Hint');
  await press(page, 'Another hint');
  await press(page, 'Another hint');
  await press(page, 'See a worked example');
  await press(page, 'Show how');
  await press(page, 'See the next step');
  await press(page, 'Show how');
  await press(page, 'Close');
  assert.equal((await stored(page)).run.outcomes[0], null);
  const replayGrove = chapterBerryQuestion((await stored(page)).run);
  await check(page, replayGrove.answers[0]);
  await press(page, 'Continue');
  await check(page, replayGrove.answers[1]);
  assert.equal((await stored(page)).run.outcomes[0], 'assisted');
  assert.deepEqual((await stored(page)).run.berryHelp, ['hints', 'worked-example']);
  await leaveGrove(page);
  await press(page, 'Visit Raptor Trail');
  await enterTrail(page);
  await check(page, chapterTrailQuestion((await stored(page)).run).answers[0]);
  await leaveTrail(page);
  await press(page, 'Visit Triceratops Bridge');
  await enterBridge(page);
  await check(page, chapterBridgeQuestion((await stored(page)).run).answers[0]);
  await leaveBridge(page);
  await press(page, 'Visit Crystal Lagoon');
  await heading(page, 'Mosasaurus Crystal Lagoon');
  assert.equal((await stored(page)).autoBreak, false);
  const legacyPage = await context.newPage();
  observe(legacyPage);
  await legacyPage.route('**/js/release.js', route => route.fulfill({
    contentType: 'text/javascript', body: 'export const release = { legacyAdventures: true };',
  }));
  await legacyPage.goto(base);
  await legacyPage.locator('.worlds button').last().waitFor();
  await button(legacyPage, 'Learn a skill').waitFor();
  assert.equal(await legacyPage.locator('.worlds button').count(), 7);
  assert.equal(await legacyPage.locator('#chapter').isVisible(), false);
  assert.deepEqual(errors, []);
  console.log(engine.name() + ' passed both chapter runs, iPad viewports, phone, input alternatives and preservation checks.');
} finally {
  await browser.close();
}
