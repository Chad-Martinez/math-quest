import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chapterKey, emptyAttempt } from '../js/chapter.js';
import { newBridgeBeat } from '../js/triceratops-state.js';
import { meadowAnimations, meadowDialogue } from '../js/wiggle-meadow-content.js';

const { chromium, webkit } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.CHAPTER_BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch({ executablePath: process.env.CHAPTER_BROWSER_PATH ||
  (engine === chromium && !existsSync(engine.executablePath()) && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) });
const base = process.env.CHAPTER_URL || 'http://127.0.0.1:8431/math-quest/';
const screenshots = process.env.CHAPTER_SCREENSHOTS;
const ipad = { width: 1180, height: 820 };
const phone = { width: 390, height: 844 };
const outcomes = ['independent', 'assisted', 'independent', null, null];
const errors = [];
const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const press = (scope, name) => button(scope, name).click();
const stage = page => page.locator('.meadow-stage');
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), chapterKey);
const speech = page => page.evaluate(() => window.meadowSpeech);

async function setup({ viewport = ipad, motion = 'reduce', scene = 'wiggle', pending = true, autoBreak = true, step = 0 } = {}) {
  const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion: motion });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    const speech = window.meadowSpeech = { spoken: [], canceled: 0 };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class {
      constructor(text) { this.text = text; }
    } });
    Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [],
      speak: utterance => { speech.spoken.push(utterance.text); utterance.onstart?.(); },
      cancel: () => { speech.canceled++; },
    } });
  }, { key: chapterKey, state: { version: 1, autoBreak, runs: 2, badge: true, run: {
    scene, seed: 2026, outcomes: scene === 'share' ? [...outcomes.slice(0, 2), null, null, null] : outcomes,
    bridgeVariant: 0, ...(scene === 'wiggle' && pending ? { mapFrom: '3' } : {}),
    attempt: { ...emptyAttempt(), step, ...(scene === 'share' ? { bridge: newBridgeBeat('construction') } : {}) },
  } } });
  await page.goto(base);
  await press(page, 'Continue Adventure');
  return { page, context };
}

async function at(page, id, line = 0) {
  await stage(page).and(page.locator(`[data-beat="${id}"][data-line="${line}"]`)).waitFor();
  const authored = meadowDialogue.find(beat => beat.id === id);
  const [speaker, text] = Array.isArray(authored.dialogue) ? authored.dialogue[line] : [authored.speaker, authored.dialogue];
  assert.equal(await stage(page).locator('.grove-line').count(), 1);
  assert.equal(await stage(page).locator('.grove-line').textContent(), text);
  assert.equal(await stage(page).locator('.grove-speaker').textContent(), speaker);
  assert.equal(await stage(page).locator('input, form').count(), 0);
}

async function capture(page, name, animations = 'disabled') {
  await page.locator('#chapter img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ' overflows');
  if (!screenshots) return;
  mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: join(screenshots, name + '.png'), fullPage: true, animations });
}

async function enter(page) {
  await at(page, 'welcome');
  await press(page, 'Continue');
  await at(page, 'welcome', 1);
  await press(page, "Let's Wiggle!");
  await at(page, 'stretch');
}

async function toLagoon(page, via = 'break') {
  await button(page, 'Visit Crystal Lagoon').waitFor();
  assert.equal(await stage(page).count(), 0);
  const saved = await read(page);
  assert.equal(saved.run.scene, 'gems');
  assert.equal(saved.run.mapFrom, via);
  assert.equal(saved.run.meadow, undefined);
  assert.deepEqual(saved.run.outcomes, outcomes);
  assert.equal(saved.runs, 2);
  assert.equal(saved.badge, true);
  assert.equal(await page.locator('.map-numbered[data-status=completed]').count(), 3);
  assert.equal(await button(page, 'Take a Wiggle Break').count(), 0);
}

async function walkthrough(viewport, suffix) {
  const { page, context } = await setup({ viewport });
  await press(page, 'Take a Wiggle Break');
  await at(page, 'welcome');
  const photo = await stage(page).locator('.meadow-landscape').evaluate(async img => { await img.decode(); return img.currentSrc; });
  assert.match(photo, viewport.width > viewport.height ? /meadow-landscape\.webp$/ : /meadow-portrait\.webp$/);
  await capture(page, '01-welcome-' + suffix);
  await press(page, 'Listen');
  assert.deepEqual((await speech(page)).spoken, [meadowDialogue[0].dialogue[0][1]]);
  await button(page, 'Continue').evaluate(control => { control.click(); control.click(); });
  await at(page, 'welcome', 1);
  assert.equal((await speech(page)).canceled, 1);
  await press(page, "Let's Wiggle!");
  for (const [index, id] of ['stretch', 'stomp', 'march', 'wiggle'].entries()) {
    await at(page, id);
    const authored = meadowDialogue.find(beat => beat.id === id);
    assert.equal(await stage(page).locator('.meadow-instruction').textContent(), authored.instruction);
    assert.equal(await button(page, 'Show again').isVisible(), false);
    assert.equal(await stage(page).evaluate(el => el.getAnimations({ subtree: true }).length), 0);
    await page.getByText('Seated option', { exact: true }).click();
    assert.ok(await page.getByText(authored.seated, { exact: true }).isVisible());
    await capture(page, '0' + (index + 2) + '-' + id + '-' + suffix);
    if (id === 'march') {
      const saved = await read(page);
      await page.reload();
      await press(page, 'Continue Adventure');
      await at(page, id);
      assert.deepEqual(await read(page), saved);
    }
    await press(page, id === 'stomp' ? 'Skip this activity' : 'I Did It!');
  }
  await at(page, 'cooldown');
  await capture(page, '06-cooldown-' + suffix);
  await press(page, 'Continue');
  await at(page, 'cooldown', 1);
  await press(page, "I'm Ready!");
  await at(page, 'departure');
  await capture(page, '07-departure-' + suffix);
  await press(page, 'Continue');
  await at(page, 'departure', 1);
  await button(page, 'Visit Mosasaurus').evaluate(control => { control.click(); control.click(); });
  await toLagoon(page);
  await capture(page, '08-lagoon-map-' + suffix);
  await press(page, 'Visit Crystal Lagoon');
  await page.getByRole('heading', { name: 'Collect gems', exact: true }).waitFor();
  await context.close();
}

async function demo(page, id, slice) {
  const { repetitions, cycleMs } = meadowAnimations[id];
  await page.waitForFunction(() => document.querySelector('.meadow-view').getAnimations({ subtree: true }).length > 0);
  const timings = await page.locator('.meadow-view').evaluate((view, time) => {
    window.activeDemo = view.getAnimations({ subtree: true });
    return window.activeDemo.map(animation => {
      animation.pause();
      animation.currentTime = time;
      const { iterations, duration } = animation.effect.getTiming();
      return [iterations, duration];
    });
  }, slice * cycleMs);
  assert.ok(timings.every(([count, time]) => count === repetitions && time === cycleMs));
}

async function canvasBytes(page) {
  return page.getByLabel('Scratch drawing').evaluate(canvas => canvas.toDataURL());
}

async function canvasShape(page) {
  return page.getByLabel('Scratch drawing').evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const points = [];
    for (let offset = 3; offset < pixels.length; offset += 4) {
      if (pixels[offset] > 127) points.push((offset - 3) / 4);
    }
    return points;
  });
}

try {
  await walkthrough(ipad, 'ipad-landscape');
  await walkthrough(phone, 'phone-portrait');
  for (const [width, height, label] of [[820, 1180, 'ipad-portrait'], [844, 390, 'phone-landscape'], [1440, 900, 'desktop']]) {
    const { page, context } = await setup({ viewport: { width, height }, pending: false });
    await enter(page);
    await capture(page, '02-stretch-' + label);
    await press(page, 'End break');
    await toLagoon(page);
    await context.close();
  }

  const ignored = await setup({ autoBreak: false });
  await toLagoon(ignored.page, '3');
  await ignored.context.close();
  const skipped = await setup({});
  await press(skipped.page, 'Take a Wiggle Break');
  await press(skipped.page, 'Skip for Now');
  await toLagoon(skipped.page);
  await capture(skipped.page, '08-skipped-to-lagoon');
  await skipped.context.close();

  const live = await setup({ pending: false, motion: 'no-preference' });
  await enter(live.page);
  for (const [id, time] of [['stretch', .43], ['stomp', .5], ['march', .65], ['wiggle', .62], ['cooldown', .5]]) {
    await at(live.page, id);
    await demo(live.page, id, time);
    await capture(live.page, 'motion-' + id + '-midpoint', 'allow');
    await press(live.page, 'Listen');
    const previous = await speech(live.page);
    await press(live.page, 'Show again');
    assert.equal((await speech(live.page)).canceled, previous.canceled + 1);
    assert.ok(await live.page.evaluate(() => window.activeDemo.every(animation => animation.playState === 'idle')));
    await demo(live.page, id, 0);
    await capture(live.page, 'motion-' + id + '-replay-start', 'allow');
    if (id === 'wiggle') {
      await live.page.emulateMedia({ reducedMotion: 'reduce' });
      await button(live.page, 'Show again').waitFor({ state: 'hidden' });
      assert.ok(await live.page.evaluate(() => window.activeDemo.every(animation => animation.playState === 'idle')));
      await live.page.emulateMedia({ reducedMotion: 'no-preference' });
      await press(live.page, 'Show again');
      await demo(live.page, id, .2);
    }
    await press(live.page, id === 'cooldown' ? 'Skip this activity' : 'I Did It!');
    assert.ok(await live.page.evaluate(() => window.activeDemo.every(animation => animation.playState === 'idle')));
  }
  await at(live.page, 'departure');
  await live.context.close();

  const off = await setup({ scene: 'share', autoBreak: false });
  const { page } = off;
  const answer = page.getByLabel('Your answer');
  await answer.fill('3');
  await press(page, 'Math tools');
  await press(page, 'Add a Plank');
  await press(page, 'Add a Plank');
  await press(page, 'Draw');
  const bounds = await page.getByLabel('Scratch drawing').boundingBox();
  const blank = await canvasBytes(page);
  await page.mouse.move(bounds.x + 15, bounds.y + 15);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 50, bounds.y + 45, { steps: 4 });
  await page.mouse.up();
  const ink = await canvasBytes(page);
  const strokes = await canvasShape(page);
  assert.notEqual(ink, blank);
  assert.ok(strokes.length > 0);
  const before = await read(page);
  await press(page, 'Take a break');
  await enter(page);
  await press(stage(page), 'Grown-ups');
  assert.ok(await page.getByText('Movement break tips', { exact: true }).isVisible());
  assert.equal(await page.getByLabel('Offer a wiggle break after challenge three').isChecked(), false);
  await capture(page, 'parent-movement-tips');
  await press(page.getByRole('dialog', { name: 'Grown-ups' }), 'Close');
  await press(page, 'End break');
  assert.equal(await answer.inputValue(), '3');
  assert.deepEqual(await read(page), before);
  assert.equal(await canvasBytes(page), ink);
  assert.equal(await button(page, 'Take a break').evaluate(btn => document.activeElement === btn), true);
  await press(page, 'Take a break');
  await enter(page);
  await page.reload();
  await press(page, 'Continue Adventure');
  await page.getByLabel('Scratch drawing').waitFor();
  // WebKit can encode the decoded PNG differently. Compare the restored stroke positions.
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
      .some((value, offset) => offset % 4 === 3 && value > 127);
  });
  assert.deepEqual(await canvasShape(page), strokes);
  assert.equal(await answer.inputValue(), '3');
  assert.deepEqual(await read(page), before);
  await capture(page, '09-resumed-bridge-drawing');
  await press(page, 'Draw');
  assert.equal(await page.locator('.bridge-piece.bridge-added').count(), 2);
  await capture(page, '10-resumed-bridge-model');
  await off.context.close();

  const later = await setup({ scene: 'gems' });
  await later.page.getByRole('button', { name: /Spare gem 2, move/ }).click();
  const groups = () => later.page.locator('.chapter-units').evaluateAll(nodes =>
    nodes.map(node => [...node.querySelectorAll('[data-chapter-piece]')].map(piece => piece.dataset.chapterPiece)));
  const pieces = await groups();
  await press(later.page, 'Take a break');
  await enter(later.page);
  await later.page.reload();
  await press(later.page, 'Continue Adventure');
  assert.deepEqual(await groups(), pieces);
  await press(later.page, 'Take a break');
  await enter(later.page);
  await press(later.page, 'Skip this activity');
  for (const id of ['stomp', 'march', 'wiggle', 'cooldown']) {
    await at(later.page, id);
    await press(later.page, 'Skip this activity');
  }
  await stage(later.page).waitFor({ state: 'detached' });
  assert.deepEqual(await groups(), pieces);
  await later.context.close();

  const balance = await setup({ scene: 'cave', step: 1 });
  await balance.page.locator('.scale-left [data-block="3"]').click();
  await balance.page.locator('.scale-left [data-block="1"]').click();
  const order = () => balance.page.locator('.block-tray [data-block]').evaluateAll(pieces => pieces.map(piece => piece.dataset.block));
  assert.deepEqual(await order(), ['3', '1']);
  await press(balance.page, 'Take a break');
  await enter(balance.page);
  await balance.page.reload();
  await press(balance.page, 'Continue Adventure');
  assert.deepEqual(await order(), ['3', '1']);
  await balance.page.locator('.block-tray [data-block="3"]').click();
  assert.deepEqual(await order(), ['1']);
  await balance.context.close();

  assert.deepEqual(errors, []);
  console.log(engine.name() + ' passed Wiggle Meadow dialogue, activities, demos, skips, persistence, workspace restoration and layouts.');
} finally {
  await browser.close();
}
