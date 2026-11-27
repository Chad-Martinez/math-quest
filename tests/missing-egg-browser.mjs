import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chapterKey } from '../js/chapter.js';

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.CHAPTER_BROWSER === 'webkit' ? webkit : chromium;
const executablePath = process.env.CHAPTER_BROWSER_PATH ||
  (engine === chromium && !existsSync(engine.executablePath()) && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await engine.launch({ executablePath });
const base = process.env.CHAPTER_URL || 'http://127.0.0.1:8421/math-quest/';
const pictures = process.env.CHAPTER_SCREENSHOTS;
if (pictures) mkdirSync(pictures, { recursive: true });

const lines = [
  'Come on, Harrison! I want to show you something special.',
  'Oh no! The dinosaur egg is missing!',
  'Look! Footprints! Maybe they can help us find it.',
  'Will you help me find the lost egg?',
];
const poses = ['trex-greeting.png', 'trex-surprised.png', 'trex-investigating.png', 'trex-determined.png'];
const prior = {
  version: 1, autoBreak: false, badge: true, runs: 4,
  run: { seed: 1461, scene: 'footprints', outcomes: ['assisted', null, null, null, null],
    attempt: { step: 0, draft: '6', hints: 1, assisted: true, solved: false, error: '', teach: false } },
};
const errors = [];
const button = (page, name) => page.getByRole('button', { name, exact: true });
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), chapterKey);
const heading = (page, name) => page.getByRole('heading', { name, exact: true });

async function visit(width, height, { motion = 'reduce', fixture } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, reducedMotion: motion });
  await context.addInitScript(({ chapterKey, fixture }) => {
    if (fixture) localStorage.setItem(chapterKey, JSON.stringify(fixture));
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
  }, { chapterKey, fixture });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.goto(base);
  await heading(page, 'The Lost Egg').waitFor();
  return page;
}

async function capture(page, name) {
  if (pictures) await page.screenshot({ path: join(pictures, name + '.png') });
}

async function inspect(page, index, width, height) {
  await page.locator(`.mission-stage[data-beat="${index + 1}"]`).waitFor();
  assert.deepEqual(await page.locator('.mission-line').allTextContents(), [lines[index]]);
  assert.ok((await page.locator('.mission-current-pose').getAttribute('src')).endsWith(poses[index]));
  const view = width > height ? 'landscape' : 'portrait';
  const backdrop = page.locator(`.mission-background[data-environment="${index < 2 ? 'nest' : 'trail'}"]`);
  assert.match(await backdrop.evaluate(async image => { await image.decode(); return image.currentSrc; }), /\/scene-02\//);
  assert.ok((await backdrop.evaluate(image => image.currentSrc)).endsWith(`-${view}.webp`));
  await page.locator('.mission-stage img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth && document.documentElement.scrollHeight === innerHeight));
  const pose = await page.locator('.mission-character').boundingBox();
  assert.ok((pose.y + pose.height) / height >= .81 && (pose.y + pose.height) / height <= .94);
  const controls = await page.locator('.mission-stage button').all();
  for (const control of controls) {
    const rect = await control.boundingBox();
    assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height);
    assert.ok(rect.width >= 44 && rect.height >= 44);
  }
}

try {
  for (const [width, height, name] of [
    [1024, 768, 'ipad-landscape'], [390, 844, 'iphone-portrait'], [768, 1024, 'ipad-portrait'],
    [844, 390, 'iphone-landscape'], [1672, 941, 'desktop'],
  ]) {
    const page = await visit(width, height);
    await button(page, 'Start Adventure').tap();
    const original = await stored(page);
    for (let index = 0; index < lines.length; index++) {
      await inspect(page, index, width, height);
      assert.deepEqual(await stored(page), original);
      assert.equal(await page.locator('.mission-stage').evaluate(stage => stage.getAnimations({ subtree: true }).length), 0);
      if (index === 1 || index === 2) {
        const clue = page.locator('.mission-clues:visible .mission-clue');
        assert.equal(await clue.count(), index === 1 ? 1 : 3);
        for (const anchor of await clue.all()) {
          const box = await anchor.boundingBox();
          assert.ok(box.x + box.width / 2 > 0 && box.x + box.width / 2 < width);
          assert.ok(box.y + box.height / 2 > 0 && box.y + box.height / 2 < height);
        }
      }
      await capture(page, `${name}-beat-${index + 1}`);
      if (name === 'ipad-landscape' && index === 2) {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForFunction(() => document.querySelector('.mission-background[data-environment=trail]')
          .currentSrc.endsWith('trail-portrait.webp'));
        await inspect(page, index, 768, 1024);
        assert.equal(await page.locator('.mission-clues-portrait:visible .mission-clue').count(), 3);
        assert.deepEqual(await stored(page), original);
        await page.setViewportSize({ width, height });
      }
      if (index > 0) await page.waitForTimeout(230);
      await button(page, index < 3 ? 'Continue' : "Let's Find It!").tap();
    }
    await heading(page, 'Follow the island trail').waitFor();
    const result = await stored(page);
    assert.equal(result.run.scene, 'map');
    assert.equal(result.run.seed, original.run.seed);
    assert.deepEqual(result.run.outcomes, original.run.outcomes);
    assert.equal(result.runs, original.runs);
    assert.equal(result.badge, original.badge);
    await page.close();
  }

  const motion = await visit(1024, 768, { motion: 'no-preference' });
  await button(motion, 'Start Adventure').tap();
  await heading(motion, 'The Missing Egg').waitFor();
  await motion.locator('.welcome-leaving').waitFor({ state: 'detached' });
  assert.deepEqual(await motion.evaluate(() => window.spoken), []);
  const entrance = motion.locator('.mission-stage');
  for (const [time, filename] of [[55, 'arrival-055ms'], [640, 'arrival-640ms'], [1250, 'arrival-1250ms']]) {
    await entrance.evaluate((stage, time) => {
      stage.testEntrance ??= stage.getAnimations({ subtree: true });
      for (const animation of stage.testEntrance) {
        animation.pause();
        animation.currentTime = time;
      }
    }, time);
    const visible = await entrance.locator('.mission-pose').evaluateAll(images =>
      images.filter(image => Number(getComputedStyle(image).opacity) > 0).map(image => image.src));
    assert.equal(visible.length, 1);
    assert.ok(visible[0].endsWith(time >= 1200 ? 'trex-greeting.png' : time === 55 ? 'trex-walk-1.png' : 'trex-walk-2.png'));
    await capture(motion, filename);
  }
  await button(motion, 'Listen').tap();
  assert.deepEqual(await motion.evaluate(() => window.spoken), [lines[0]]);
  await button(motion, 'Stop').tap();
  await button(motion, 'Listen').tap();
  await button(motion, 'Continue').evaluate(control => { control.click(); control.click(); control.click(); });
  await inspect(motion, 1, 1024, 768);
  assert.deepEqual(await motion.evaluate(() => ({ spoken: window.spoken, cancellations: window.cancellations })),
    { spoken: [lines[0], lines[0]], cancellations: 2 });
  await button(motion, 'Listen').tap();
  assert.equal(await motion.evaluate(() => window.spoken.at(-1)), lines[1]);
  await motion.waitForTimeout(230);
  await button(motion, 'Continue').tap();
  await inspect(motion, 2, 1024, 768);
  const trail = motion.locator('.mission-trail-clues.mission-clues-landscape');
  await trail.evaluate(layer => {
    layer.testPulses = layer.getAnimations({ subtree: true });
    for (const animation of layer.testPulses) animation.pause();
  });
  for (const [index, time] of [365, 615, 865].entries()) {
    const highlighted = await trail.evaluate((layer, time) => {
      for (const animation of layer.testPulses) animation.currentTime = time;
      return [...layer.querySelectorAll('ellipse')].map(mark => Number(getComputedStyle(mark).opacity) > .5);
    }, time);
    assert.deepEqual(highlighted, [0,1,2].map(candidate => candidate === index));
    await capture(motion, `footprint-pulse-${index + 1}`);
  }
  await motion.waitForTimeout(230);
  await button(motion, 'Continue').tap();
  await inspect(motion, 3, 1024, 768);
  await motion.waitForTimeout(230);
  await button(motion, "Let's Find It!").evaluate(control => { control.click(); control.click(); });
  await motion.locator('.mission-accepting').waitFor();
  assert.equal((await stored(motion)).run.scene, 'mission');
  assert.match(await motion.locator('.mission-current-pose').getAttribute('src'), /trex-celebrate.png$/);
  await capture(motion, 'mission-celebration');
  await heading(motion, 'Follow the island trail').waitFor();
  assert.equal((await stored(motion)).run.scene, 'map');
  await motion.close();

  const leaving = await visit(1024, 768, { motion: 'no-preference' });
  await button(leaving, 'Start Adventure').tap();
  await heading(leaving, 'The Missing Egg').waitFor();
  await button(leaving, 'Listen').tap();
  await button(leaving, 'Grown-ups').tap();
  await button(leaving, 'Back to welcome').tap();
  await heading(leaving, 'The Lost Egg').waitFor();
  assert.equal(await leaving.locator('.mission-stage').count(), 0);
  assert.equal(await leaving.evaluate(() => window.cancellations), 1);
  assert.equal((await stored(leaving)).run.scene, 'mission');
  await leaving.close();

  const resume = await visit(768, 1024, { fixture: prior });
  await button(resume, 'Continue Adventure').tap();
  await heading(resume, 'Follow footprints').waitFor();
  assert.equal(await resume.locator('.mission-stage').count(), 0);
  assert.equal(await resume.getByLabel('Your answer').inputValue(), '6');
  assert.deepEqual(await stored(resume), prior);

  assert.deepEqual(errors, []);
  console.log(`${engine.name()} passed Scene 02 dialogue, layout, animation, audio, and save-state checks.`);
} finally {
  await browser.close();
}
