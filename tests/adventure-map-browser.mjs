import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chapterBerryQuestion, chapterBridgeQuestion, chapterKey, chapterQuestions, chapterTrailQuestion, emptyAttempt } from '../js/chapter.js';
import { mapSpec } from '../js/adventure-map-data.js';

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.CHAPTER_BROWSER === 'webkit' ? webkit : chromium;
const executablePath = process.env.CHAPTER_BROWSER_PATH ||
  (engine === chromium && !existsSync(engine.executablePath()) && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await engine.launch({ executablePath });
const base = process.env.CHAPTER_URL || 'http://127.0.0.1:8421/math-quest/';
const images = process.env.CHAPTER_SCREENSHOTS;
const errors = [];
const seed = 2026;
const ipad = { width: 1180, height: 820 };
const iphone = { width: 390, height: 844 };

const button = (page, name) => page.getByRole('button', { name, exact: true });
const press = (page, name) => button(page, name).click();
const heading = (page, name) => page.getByRole('heading', { name, exact: true }).waitFor();
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), chapterKey);
const marker = (page, waypoint) => page.locator(`.map-marker[data-waypoint="${waypoint}"]`);
const map = page => page.locator('.adventure-map');
const speech = page => page.evaluate(() => window.mapSpeech);

async function setup(viewport, scene = 'map', count = 0, mapFrom, { autoBreak = true, motion = 'reduce' } = {}) {
  const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion: motion });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.addInitScript(({ chapterKey, checkpoint }) => {
    if (!localStorage.getItem(chapterKey)) localStorage.setItem(chapterKey, JSON.stringify(checkpoint));
    const audio = { spoken: [], canceled: 0 };
    window.mapSpeech = audio;
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class {
      constructor(text) { this.text = text; }
    } });
    Object.defineProperty(window, 'speechSynthesis', { value: {
      speak: utterance => { audio.spoken.push(utterance.text); utterance.onstart?.(); },
      cancel: () => { audio.canceled++; }, getVoices: () => [],
    } });
  }, { chapterKey, checkpoint: { version: 1, runs: 0, badge: false, autoBreak, run: {
    scene, seed, mapFrom, outcomes: Array.from({ length: 5 }, (_, index) => index < count ? 'independent' : null),
    attempt: emptyAttempt(),
  } } });
  await page.goto(base);
  await press(page, 'Continue Adventure');
  return { page, context };
}

async function capture(page, name, animations = 'disabled') {
  await heading(page, 'Dinosaur Island Adventure');
  await map(page).locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
  const layout = await map(page).evaluate(view => {
    const board = view.querySelector('.map-board').getBoundingClientRect();
    const image = view.querySelector('.map-island').getBoundingClientRect();
    const buttons = [...view.querySelectorAll('button:not(:disabled)')].map(button => button.getBoundingClientRect());
    return { boardWidth: board.width, boardHeight: board.height, imageWidth: image.width, imageHeight: image.height,
      width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
      viewportWidth: innerWidth, viewportHeight: innerHeight,
      controlsInView: buttons.every(box => box.left >= -1 && box.right <= innerWidth + 1 &&
        box.top >= -1 && box.bottom <= innerHeight + 1 && box.height >= 43 && box.width >= 43) };
  });
  assert.equal(layout.boardWidth, layout.imageWidth);
  assert.equal(layout.boardHeight, layout.imageHeight);
  assert.ok(Math.abs(layout.boardWidth / layout.boardHeight - 1648 / 928) < .01, name);
  assert.ok(layout.width <= layout.viewportWidth + 1 && layout.height <= layout.viewportHeight + 1, JSON.stringify({ name, layout }));
  assert.ok(layout.controlsInView, JSON.stringify({ name, layout }));
  if (images) {
    mkdirSync(images, { recursive: true });
    await page.screenshot({ path: join(images, name + '.png'), animations });
  }
}

async function dialogue(page, id) {
  await page.locator('.map-line').and(page.getByText(mapSpec.dialogue[id], { exact: true })).waitFor();
  assert.equal(await page.locator('.map-line').textContent(), mapSpec.dialogue[id]);
  assert.equal(await page.locator('.map-line').count(), 1);
}
async function answer(page, index) {
  const q = index === 0 ? chapterBerryQuestion((await saved(page)).run)
    : index === 1 ? chapterTrailQuestion((await saved(page)).run) : index === 2 ? chapterBridgeQuestion((await saved(page)).run) : chapterQuestions(seed)[index];
  for (const [step, value] of q.answers.entries()) {
    await page.getByLabel('Your answer').fill(String(value));
    await press(page, index <= 2 ? 'Check Answer' : 'Check answer');
    if (index === 0 && step === 0) await press(page, 'Continue');
  }
}

async function leaveBridge(page) {
  for (let i = 0; i < 3; i++) await press(page, 'Continue');
  await press(page, 'Continue the Adventure');
}

try {
  const { page, context } = await setup(ipad);
  await dialogue(page, 'intro');
  await capture(page, '01-ipad-landscape-initial');
  assert.equal(await page.locator('.map-numbered').count(), 5);
  assert.equal(await page.locator('.map-numbered[data-status=locked]').count(), 4);
  assert.equal(await marker(page, '2').getAttribute('aria-disabled'), 'true');
  const original = await saved(page);
  await press(page, 'Listen');
  assert.deepEqual((await speech(page)).spoken, [mapSpec.dialogue.intro]);
  await button(page, "Let's Go!").dblclick();
  await dialogue(page, 'start');
  assert.equal((await speech(page)).canceled, 1);
  assert.deepEqual(await saved(page), original);
  await press(page, 'Listen');
  await marker(page, '1').tap();
  await heading(page, 'Brachiosaurus Berry Grove');
  for (const label of ['Continue', 'Let’s Collect Berries!', 'Continue', 'Continue']) await press(page, label);
  await press(page, 'Math tools');
  assert.equal((await speech(page)).canceled, 2);
  assert.equal(await button(page, 'Skip travel').count(), 0);

  const basket = page.getByRole('region', { name: 'Together in the basket' });
  await page.getByRole('region', { name: 'Red berries' }).getByRole('button').first().tap();
  await page.getByLabel('Your answer').fill('2');
  const unfinished = await saved(page);
  await press(page, 'Trail map');
  await heading(page, 'Dinosaur Island Adventure');
  assert.equal(await marker(page, '1').getAttribute('aria-current'), 'step');
  await press(page.getByRole('dialog'), 'Listen');
  await button(page, 'Continue Stop').evaluate(control => {
    control.click();
    const mathListen = [...document.querySelectorAll('.chapter-listen button')]
      .find(candidate => candidate.textContent === 'Listen' && candidate.closest('.grove-stage'));
    mathListen.click();
  });
  await page.locator('.adventure-map-dialog').waitFor({ state: 'detached' });
  assert.equal((await speech(page)).canceled, 3, 'the old map cannot stop the new narration');
  assert.equal(await button(page, 'Stop').count(), 1);
  await press(page, 'Stop');
  assert.deepEqual(await saved(page), unfinished);
  assert.equal(await basket.getByRole('button').count(), 1);
  assert.equal(await page.getByLabel('Your answer').inputValue(), '2');

  await answer(page, 0);
  for (let i = 0; i < 4; i++) await press(page, 'Continue');
  await press(page, 'Follow the Trail');
  await dialogue(page, '1');
  assert.equal(await marker(page, '1').getAttribute('data-status'), 'completed');
  await capture(page, '02-ipad-landscape-berry-grove-completed');
  await page.reload();
  await press(page, 'Continue Adventure');
  await dialogue(page, '1');
  await press(page, 'Visit Raptor Trail');
  await heading(page, 'Velociraptor Trail');
  for (const label of ['Continue', 'Let’s Investigate!', 'Continue', 'Continue']) await press(page, label);
  await answer(page, 1);
  for (let i = 0; i < 4; i++) await press(page, 'Continue');
  await press(page, 'Visit Triceratops Bridge');
  await dialogue(page, '2');
  await press(page, 'Visit Triceratops Bridge');
  await heading(page, 'Triceratops Bridge');
  for (const label of ['Continue', 'Let’s Fix It!', 'Continue', 'Continue']) await press(page, label);
  await answer(page, 2);
  await leaveBridge(page);
  await dialogue(page, '3');
  await capture(page, '03-ipad-landscape-wiggle-offer');
  assert.equal(await marker(page, 'break').getAttribute('data-status'), 'current');
  await press(page, 'Skip for now');
  assert.equal((await saved(page)).run.mapFrom, '3');
  await page.reload();
  await press(page, 'Continue Adventure');
  await dialogue(page, 'break');
  assert.equal(await button(page, 'Take a Wiggle Break').count(), 0);
  await capture(page, '04-ipad-landscape-crystal-lagoon');
  await press(page, 'Visit Crystal Lagoon');
  await heading(page, 'Collect gems');
  await answer(page, 3);
  await press(page, 'Continue the search');
  await dialogue(page, '4');
  await press(page, 'Visit Crystal Cave');
  await heading(page, 'Open the cave');
  await answer(page, 4);
  await press(page, 'Follow the clue');
  await dialogue(page, '5');
  await capture(page, '05-ipad-landscape-crystal-cave-completed');
  assert.equal((await saved(page)).badge, false);
  await press(page, 'Find the Egg!');
  await heading(page, 'Meet Mosasaurus!');
  await press(page, 'Look in the cave');
  await heading(page, 'You found the egg!');
  await press(page, 'Celebrate!');
  await heading(page, 'Chapter 1 complete!');
  assert.equal((await saved(page)).runs, 1);
  await context.close();

  for (const [suffix, viewport, scene, count, from] of [
    ['desktop-initial', { width: 1440, height: 900 }, 'map', 0],
    ['ipad-portrait-initial', { width: 820, height: 1180 }, 'map', 0],
    ['iphone-landscape-initial', { width: 844, height: 390 }, 'map', 0],
    ['iphone-portrait-initial', iphone, 'map', 0],
    ['iphone-portrait-berry-grove-completed', iphone, 'footprints', 1, '1'],
    ['iphone-portrait-wiggle-offer', iphone, 'wiggle', 3, '3'],
    ['iphone-portrait-crystal-lagoon', iphone, 'gems', 3, 'break'],
    ['iphone-portrait-crystal-cave-completed', iphone, 'mosasaurus', 5, '5'],
  ]) {
    const layout = await setup(viewport, scene, count, from);
    await capture(layout.page, suffix);
    await layout.context.close();
  }

  const disabled = await setup(ipad, 'share', 2, undefined, { autoBreak: false });
  await answer(disabled.page, 2);
  await leaveBridge(disabled.page);
  await dialogue(disabled.page, 'break');
  assert.equal(await button(disabled.page, 'Take a Wiggle Break').count(), 0);
  await press(disabled.page, 'Visit Crystal Lagoon');
  await heading(disabled.page, 'Collect gems');
  await disabled.context.close();

  const optOut = await setup(ipad, 'wiggle', 3, '3');
  await press(optOut.page, 'Grown-ups');
  await optOut.page.getByRole('checkbox').uncheck();
  await press(optOut.page, 'Close');
  await dialogue(optOut.page, 'break');
  assert.equal((await saved(optOut.page)).run.mapFrom, '3');
  await optOut.context.close();

  const exercise = await setup(ipad, 'wiggle', 3, '3');
  await press(exercise.page, 'Take a Wiggle Break');
  await heading(exercise.page, 'Dino Wiggle Break');
  await press(exercise.page, 'I’m ready!');
  await dialogue(exercise.page, 'break');
  assert.equal((await saved(exercise.page)).run.mapFrom, 'break');
  await exercise.context.close();

  const animated = await setup(ipad, 'gems', 3, 'break', { motion: 'no-preference' });
  const travel = animated.page;
  const traveler = travel.locator('.map-traveler');
  await capture(travel, 'travel-01-before');
  const initial = await traveler.getAttribute('style');
  await press(travel, 'Listen');
  const now = new Date();
  await travel.clock.install({ time: now });
  await travel.clock.pauseAt(new Date(now.getTime() + 1500));
  await button(travel, 'Visit Crystal Lagoon').evaluate(control => { control.click(); control.click(); });
  await button(travel, 'Skip travel').waitFor();
  assert.equal((await speech(travel)).canceled, 1);
  await travel.clock.runFor(150);
  assert.notEqual(await traveler.getAttribute('style'), initial);
  assert.equal(await traveler.locator('.map-walk-visible').count(), 1);
  await capture(travel, 'travel-02-departure', 'allow');
  await travel.clock.runFor(450);
  assert.match(await traveler.getAttribute('style'), /--map-facing: -1/);
  await capture(travel, 'travel-03-on-the-trail', 'allow');
  await button(travel, 'Skip travel').evaluate(control => control.click());
  await travel.clock.resume();
  await heading(travel, 'Collect gems');
  assert.equal((await saved(travel)).run.mapFrom, undefined);
  assert.equal((await saved(travel)).runs, 0);
  await animated.context.close();

  const natural = await setup(ipad, 'map', 0, undefined, { motion: 'no-preference' });
  await press(natural.page, "Let's Go!");
  await button(natural.page, 'Visit Berry Grove').evaluate(control => {
    control.click();
    document.querySelector('.map-brand').click();
  });
  await heading(natural.page, 'The Lost Egg');
  await natural.page.waitForTimeout(1650);
  assert.equal((await saved(natural.page)).run.scene, 'map');
  await press(natural.page, 'Continue Adventure');
  await press(natural.page, "Let's Go!");
  await press(natural.page, 'Visit Berry Grove');
  await heading(natural.page, 'Brachiosaurus Berry Grove');
  assert.equal((await saved(natural.page)).run.scene, 'supplies');
  await natural.context.close();

  const finale = await setup(ipad, 'mosasaurus', 5, '5', { motion: 'no-preference' });
  await press(finale.page, 'Find the Egg!');
  await finale.page.locator('.map-cave-reveal').waitFor();
  await heading(finale.page, 'Meet Mosasaurus!');
  assert.equal((await saved(finale.page)).runs, 0);
  await finale.context.close();

  assert.deepEqual(errors, []);
  console.log(engine.name() + ' passed map progression, locks, responsive layouts, audio, travel, break options and checkpoint checks.');
} finally {
  await browser.close();
}
