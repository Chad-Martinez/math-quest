import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chapterKey } from '../js/chapter.js';

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.CHAPTER_BROWSER === 'webkit' ? webkit : chromium;
const systemChromium = engine === chromium && !existsSync(chromium.executablePath()) && existsSync('/usr/bin/chromium');
const browser = await engine.launch({
  executablePath: process.env.CHAPTER_BROWSER_PATH || (systemChromium ? '/usr/bin/chromium' : undefined),
});
const base = process.env.CHAPTER_URL || 'http://127.0.0.1:8421/math-quest/';
const pictures = process.env.CHAPTER_SCREENSHOTS;
if (pictures) mkdirSync(pictures, { recursive: true });

const saved = {
  version: 1, autoBreak: false, badge: true, runs: 2,
  run: { seed: 12345, scene: 'footprints', outcomes: ['assisted', null, null, null, null],
    attempt: { step: 0, draft: '6', hints: 1, assisted: true, solved: false, error: '', teach: false } },
};
const greeting = 'Hi, Harrison! Are you ready for a dinosaur adventure?';
const errors = [];
const button = (page, name) => page.getByRole('button', { name, exact: true });
const heading = (page, name) => page.getByRole('heading', { name, exact: true });
const backdrop = page => page.locator('.welcome-background');
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), chapterKey);

async function open(viewport, { fixture, reducedMotion = 'no-preference', mockSpeech = false } = {}) {
  const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion });
  await context.addInitScript(({ chapterKey, fixture, mockSpeech }) => {
    if (mockSpeech) {
      window.spoken = [];
      window.cancellations = 0;
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class {
        constructor(text) { this.text = text; }
      } });
      Object.defineProperty(window, 'speechSynthesis', { value: {
        getVoices: () => [],
        speak: utterance => { window.spoken.push(utterance.text); utterance.onstart(); },
        cancel: () => window.cancellations++,
      } });
    }
    if (fixture && !localStorage.getItem(chapterKey)) localStorage.setItem(chapterKey, JSON.stringify(fixture));
    const original = crypto.getRandomValues.bind(crypto);
    window.sceneStartCount = 0;
    crypto.getRandomValues = list => {
      if (list instanceof Uint32Array && list.length === 1) window.sceneStartCount++;
      return original(list);
    };
  }, { chapterKey, fixture, mockSpeech });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.goto(base);
  await heading(page, 'The Lost Egg').waitFor();
  return page;
}

async function capture(page, name) {
  await page.locator('.welcome-stage img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (pictures) await page.screenshot({ path: join(pictures, name + '.png'), fullPage: true });
}

async function entranceEnds(page) {
  await page.locator('.welcome-stage').evaluate(stage => Promise.all(stage.getAnimations({ subtree: true }).map(a => a.finished)));
}

async function buttonsFit(page) {
  const size = page.viewportSize();
  for (const control of await page.locator('.welcome-stage button').all()) {
    const bounds = await control.boundingBox();
    assert.ok(bounds.width >= 44 && bounds.height >= 44);
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= size.width);
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= size.height);
  }
  const pose = await page.locator('.welcome-character').boundingBox();
  const actions = await page.locator('.welcome-actions').boundingBox();
  if (size.width < size.height) assert.ok(pose.y + pose.height <= actions.y);
}

try {
  const reference = await open({ width: 1672, height: 941 });
  await reference.locator('.welcome-stage').evaluate(stage => stage.getAnimations({ subtree: true }).forEach(animation => {
    animation.pause();
    animation.currentTime = 0;
  }));
  assert.ok(await button(reference, 'Start Adventure').isEnabled());
  assert.equal(await button(reference, 'Continue Adventure').count(), 0);
  const animated = reference.locator('.welcome-stage');
  if (pictures) {
    for (const [time, filename] of [[0, '01-initial'], [980, '02-walking'], [1680, '03-settling'], [2100, '04-greeting']]) {
      await animated.evaluate((stage, time) => stage.getAnimations({ subtree: true }).forEach(animation => {
        animation.currentTime = time;
      }), time);
      await capture(reference, filename);
    }
  }
  await animated.evaluate(stage => stage.getAnimations({ subtree: true }).forEach(animation => animation.finish()));
  assert.equal(await reference.getByText(greeting, { exact: true }).count(), 1);
  await capture(reference, '05-desktop');
  assert.ok(await reference.evaluate(() => document.querySelector('.welcome-stage').getBoundingClientRect().height <= innerHeight));
  await reference.close();

  const landscape = await open({ width: 1024, height: 768 }, { fixture: saved });
  await entranceEnds(landscape);
  await buttonsFit(landscape);
  assert.equal(await landscape.locator('.welcome-primary').textContent(), 'Continue Adventure');
  await capture(landscape, '06-returning-player');
  await button(landscape, 'Start Adventure').click();
  const confirmation = landscape.getByRole('dialog', { name: 'Start a new adventure?' });
  await confirmation.waitFor();
  await confirmation.getByRole('button', { name: 'Close' }).click();
  assert.deepEqual(await stored(landscape), saved);
  await button(landscape, 'Continue Adventure').click();
  await heading(landscape, 'Follow footprints').waitFor();
  assert.equal(await landscape.getByLabel('Your answer').inputValue(), '6');
  assert.deepEqual(await stored(landscape), saved);
  assert.equal(await landscape.locator('.welcome-leaving').count(), 0);
  await landscape.close();

  for (const width of [1024, 1194]) {
    const tablet = await open({ width, height: width === 1024 ? 768 : 834 });
    await entranceEnds(tablet);
    await buttonsFit(tablet);
    await capture(tablet, `07-ipad-landscape-${width}`);
    await tablet.close();
  }
  const portrait = await open({ width: 768, height: 1024 });
  await entranceEnds(portrait);
  await buttonsFit(portrait);
  await capture(portrait, '08-ipad-portrait');
  assert.match(await backdrop(portrait).evaluate(img => img.currentSrc), /jungle-portrait\.jpg$/);
  assert.equal(await portrait.locator('.welcome-egg').isVisible(), false);
  await portrait.setViewportSize({ width: 1024, height: 768 });
  await portrait.waitForFunction(() => document.querySelector('.welcome-background').currentSrc.endsWith('jungle-background.webp'));
  assert.equal(await portrait.locator('.welcome-egg').isVisible(), true);
  await portrait.setViewportSize({ width: 768, height: 1024 });
  await portrait.addStyleTag({ content: 'html { font-size: 200%; }' });
  await portrait.locator('.welcome-start').scrollIntoViewIfNeeded();
  assert.ok(await portrait.evaluate(() => {
    const bubble = document.querySelector('.welcome-greeting').getBoundingClientRect();
    const action = document.querySelector('.welcome-actions').getBoundingClientRect();
    return bubble.bottom <= action.top && document.documentElement.scrollWidth <= innerWidth;
  }));
  await portrait.close();

  for (const [width, height, screenshot] of [[390, 844, '09-phone-portrait'], [844, 390, '10-phone-landscape']]) {
    const phone = await open({ width, height });
    await entranceEnds(phone);
    await buttonsFit(phone);
    assert.ok(await phone.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
    if (width < height) {
      const pose = await phone.locator('.welcome-character').boundingBox();
      const start = await button(phone, 'Start Adventure').boundingBox();
      assert.ok((pose.y + pose.height) / height >= .77 && (pose.y + pose.height) / height <= .85);
      assert.ok(start.y / height >= .84 && start.y / height <= .93);
    }
    await capture(phone, screenshot);
    const file = width < height ? '/jungle-portrait.jpg' : '/jungle-background.webp';
    assert.ok((await backdrop(phone).evaluate(img => img.currentSrc)).endsWith(file));
    await phone.close();
  }

  for (const [width, height] of [[375, 667], [667, 375], [844, 320]]) {
    const compact = await open({ width, height }, { fixture: saved, reducedMotion: 'reduce' });
    await buttonsFit(compact);
    assert.ok(await compact.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight));
    await compact.close();
  }

  const reduced = await open({ width: 1024, height: 768 }, { reducedMotion: 'reduce' });
  assert.equal(await reduced.locator('.welcome-stage').evaluate(stage => stage.getAnimations({ subtree: true }).length), 0);
  await capture(reduced, '11-reduced-motion');
  await reduced.keyboard.press('Tab');
  assert.equal(await reduced.evaluate(() => document.activeElement.textContent), 'Listen');
  await reduced.keyboard.press('Tab');
  assert.equal(await reduced.evaluate(() => document.activeElement.textContent), 'Start Adventure');
  await reduced.keyboard.press('Enter');
  await heading(reduced, 'An egg is missing!').waitFor();
  assert.equal(await reduced.locator('.welcome-leaving').count(), 0);
  await reduced.close();

  const immediate = await open({ width: 1024, height: 768 });
  await button(immediate, 'Start Adventure').evaluate(control => { control.click(); control.click(); });
  await immediate.locator('.welcome-celebrating').waitFor();
  assert.equal(await stored(immediate), null);
  await heading(immediate, 'An egg is missing!').waitFor();
  await immediate.locator('.welcome-leaving').waitFor({ state: 'detached' });
  assert.equal(await immediate.evaluate(() => window.sceneStartCount), 1);
  await immediate.close();

  const narration = await open({ width: 390, height: 844 }, { mockSpeech: true, reducedMotion: 'reduce' });
  assert.deepEqual(await narration.evaluate(() => window.spoken), []);
  await button(narration, 'Listen').tap();
  assert.deepEqual(await narration.evaluate(() => window.spoken), [greeting]);
  await button(narration, 'Start Adventure').tap();
  await heading(narration, 'An egg is missing!').waitFor();
  assert.equal(await narration.evaluate(() => window.cancellations), 1);
  await narration.close();

  const grownUps = await open({ width: 1024, height: 768 });
  await button(grownUps, 'Grown-ups').click();
  await grownUps.getByRole('dialog', { name: 'Grown-ups' }).waitFor();
  await button(grownUps, 'Close').click();
  assert.equal(await grownUps.evaluate(() => document.activeElement.id), 'chapter-grownups');
  await grownUps.close();

  const restart = await open({ width: 1024, height: 768 }, { fixture: saved, reducedMotion: 'reduce' });
  await button(restart, 'Start Adventure').click();
  await button(restart, 'Start over').click();
  await heading(restart, 'An egg is missing!').waitFor();
  const replaced = await stored(restart);
  assert.notEqual(replaced.run.seed, saved.run.seed);
  assert.equal(replaced.badge, saved.badge);
  assert.equal(replaced.runs, saved.runs);
  assert.equal(replaced.autoBreak, saved.autoBreak);
  await restart.close();

  const complete = await open({ width: 1024, height: 768 }, {
    fixture: { ...saved, run: { ...saved.run, scene: 'replay' } }, reducedMotion: 'reduce',
  });
  assert.equal(await button(complete, 'Continue Adventure').count(), 0);
  await button(complete, 'Start Adventure').click();
  await heading(complete, 'An egg is missing!').waitFor();
  assert.equal((await stored(complete)).runs, saved.runs);

  assert.deepEqual(errors, []);
  console.log(`${engine.name()} passed Scene 01 composition, asset loads, motion, controls, and progress checks.`);
} finally {
  await browser.close();
}
