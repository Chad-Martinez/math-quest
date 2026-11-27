import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chapterKey, chapterQuestions, freshQuestion } from '../js/chapter.js';
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
const qs = chapterQuestions(seed);
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
async function check(page, value) {
  await page.getByLabel('Your answer').fill(String(value));
  await press(page, 'Check answer');
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
  assert.ok(await modal.getByText(qs[index].objective, { exact: true }).isVisible());
  assert.equal(await modal.getByText(qs[index].equations.at(-1), { exact: true }).count(), 0);
  if (reveal) {
    await press(page, 'I helped with this problem');
    assert.equal(await button(page, 'I helped with this problem').getAttribute('aria-pressed'), 'true');
    await press(page, 'Reveal worked solution');
    assert.ok(await modal.getByText(qs[index].equations.at(-1), { exact: true }).isVisible());
  }
  await modal.locator('summary').click();
  await modal.getByLabel('Transfer answer').fill(String(freshQuestion(seed, index).answers.at(-1)));
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
  await heading(page, 'An egg is missing!');
  await press(page, 'See the trail');
  assert.equal(await page.locator('.chapter-map-node').count(), 5);
  assert.equal(await page.locator('.chapter-map-node[aria-current=step]').textContent(), '1');
  await screen(page, '02-trail');
  const mapCheckpoint = await stored(page);
  await button(page, '2. Follow footprints').tap();
  await heading(page, 'Follow footprints');
  await check(page, qs[1].answers[0]);
  assert.deepEqual(await stored(page), mapCheckpoint);
  await press(page, 'Back to adventure');
  await button(page, '1. Gather supplies').tap();
  await heading(page, 'Gather supplies');
  assert.equal(await page.locator('.chapter-group').nth(0).locator('.chapter-token').count(), qs[0].params.a);
  assert.equal(await page.locator('.chapter-group').nth(1).locator('.chapter-token').count(), qs[0].params.b);
  await screen(page, '03-gather-supplies');
  await page.getByLabel('Your answer').fill('8');
  await page.locator('.chapter-group').nth(0).getByRole('button').first().tap();
  const basket = page.locator('.chapter-group').nth(2);
  assert.equal(await basket.getByRole('button').count(), 1);
  await drag(page, page.locator('.chapter-group').nth(0).getByRole('button').first(), basket);
  assert.equal(await basket.getByRole('button').count(), 2);
  await press(page, 'Take a break');
  await heading(page, 'Dino Wiggle Break');
  await press(page, 'Next move');
  await press(page, 'I’m ready!');
  assert.equal(await page.getByLabel('Your answer').inputValue(), '8');
  assert.equal(await basket.getByRole('button').count(), 2);
  await press(page, '◖ Listen');
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
  assert.match(await page.locator('#chapter-feedback').textContent(), /Try again/);
  await check(page, qs[0].answers[0]);
  await heading(page, qs[0].prompts[1]);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'chapter-question');
  await page.reload();
  await press(page, 'Continue Adventure');
  await heading(page, qs[0].prompts[1]);
  await page.getByLabel('Your answer').fill('1');
  await press(page, 'Restart stop');
  await heading(page, qs[0].prompts[0]);
  assert.equal(await page.getByLabel('Your answer').inputValue(), '');
  assert.equal(await page.getByRole('region', { name: 'Red berries' }).getByRole('button').count(), qs[0].params.a);
  assert.equal((await stored(page)).run.seed, seed);
  await check(page, qs[0].answers[0]);
  await button(page, String(qs[0].params.have + 1)).tap();
  assert.equal(await page.locator('.number-line-jumps .jumped').count(), 1);
  await screen(page, '04-count-on');
  await check(page, qs[0].answers[1]);
  assert.equal((await stored(page)).run.outcomes[0], 'independent');
  await press(page, 'Continue the search');

  await heading(page, 'Follow footprints');
  await page.getByLabel('Your answer').fill('2');
  await press(page, 'Trail map');
  assert.equal(await page.locator('.chapter-map-node[data-complete]').count(), 1);
  const footprintsCheckpoint = await stored(page);
  await button(page, '1. Gather supplies, done').tap();
  await heading(page, qs[0].prompts[0]);
  assert.equal(await page.getByRole('region', { name: 'Blue berries' }).getByRole('button').count(), qs[0].params.b);
  await press(page, 'Leave practice');
  await heading(page, 'Follow footprints');
  assert.equal(await page.getByLabel('Your answer').inputValue(), '2');
  assert.deepEqual(await stored(page), footprintsCheckpoint);
  await press(page, 'Trail map');
  await button(page, '2. Follow footprints').tap();
  assert.deepEqual(await stored(page), footprintsCheckpoint);
  assert.equal(await page.locator('.chapter-group').nth(0).locator('.chapter-token').count(), qs[1].params.large);
  assert.equal(await page.locator('.chapter-group').nth(1).locator('.chapter-token').count(), qs[1].params.small);
  await page.locator('.chapter-group').nth(0).getByRole('button').first().press('Enter');
  assert.equal(await page.locator('.chapter-token[aria-pressed=true]').count(), 2);
  await teachingTips(page, 1);
  await screen(page, '05-follow-footprints');
  await check(page, qs[1].params.large + qs[1].params.small);
  assert.match(await page.locator('#chapter-feedback').textContent(), /both trails/);
  await check(page, qs[1].answers[0]);
  await press(page, 'Continue the search');

  await heading(page, 'Share the food');
  await teachingTips(page, 2, true);
  await screen(page, '06-share-the-food');
  for (let i = 0; i < qs[2].answers[0]; i++) await page.locator('.chapter-group').nth(2).getByRole('button').first().click();
  assert.match(await page.locator('.chapter-model-status').textContent(), /match/);
  await check(page, qs[2].answers[0]);
  assert.equal((await stored(page)).run.outcomes[2], 'assisted');
  await press(page, 'Continue the search');
  await heading(page, 'Dino Wiggle Break');
  await screen(page, '07-wiggle-break');
  await page.reload();
  await press(page, 'Continue Adventure');
  await heading(page, 'Dino Wiggle Break');
  await press(page, 'Skip for now');

  await heading(page, 'Collect gems');
  for (let i = 0; i < qs[3].answers[0] - 1; i++) await page.locator('.chapter-group').nth(2).getByRole('button').first().click();
  assert.match(await page.locator('.chapter-model-status').textContent(), /tie/);
  await check(page, qs[3].answers[0] - 1);
  assert.match(await page.locator('#chapter-feedback').textContent(), /tie/);
  await screen(page, '08-collect-gems');
  await teachingTips(page, 3);
  await press(page, 'Hint');
  await press(page, 'Another hint');
  await press(page, 'See an example');
  await heading(page, 'See a different example');
  await press(page, 'Show how');
  await press(page, 'Back to my problem');
  assert.equal(await page.getByLabel('Your answer').inputValue(), String(qs[3].answers[0] - 1));
  await check(page, qs[3].answers[0]);
  assert.equal((await stored(page)).run.outcomes[3], 'assisted');
  await press(page, 'Continue the search');

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
  await heading(page, 'An egg is missing!');
  assert.notEqual((await stored(page)).run.seed, seed);

  const portrait = { width: 768, height: 1024 };
  await page.setViewportSize(portrait);
  await press(page, 'See the trail');
  await press(page, 'Go to the first stop');
  await screen(page, '13-ipad-portrait');
  await page.setViewportSize({ width: 390, height: 844 });
  await screen(page, '14-phone');

  // Exercise the opt-out through the UI and confirm the worked path is recorded separately.
  await press(page, 'Grown-ups');
  await page.getByLabel('Offer a wiggle break after challenge three').uncheck();
  await press(page, 'Close');
  await press(page, 'Hint');
  await press(page, 'Another hint');
  await press(page, 'See an example');
  await press(page, 'Show how');
  await press(page, 'See the next step');
  await press(page, 'Show how');
  await page.getByText('I need the answer to my problem').click();
  await press(page, 'Show my answer');
  assert.equal((await stored(page)).run.outcomes[0], 'worked-example');
  await press(page, 'Continue the search');
  const replay = chapterQuestions((await stored(page)).run.seed);
  await check(page, replay[1].answers[0]);
  await press(page, 'Continue the search');
  await check(page, replay[2].answers[0]);
  await press(page, 'Continue the search');
  await heading(page, 'Collect gems');
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
