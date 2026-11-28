import { advanceChapter, stops } from './chapter.js';

const origins = { supplies: '1', footprints: '2', share: '3', wiggle: 'break', gems: '4', cave: '5' };
const destinations = {
  map: ['start', '1', 'Visit Berry Grove'],
  footprints: ['1', '2', 'Visit Raptor Trail'],
  share: ['2', '3', 'Visit Picnic Clearing'],
  wiggle: ['3', 'break', 'Take a Wiggle Break'],
  gems: ['break', '4', 'Visit Crystal Lagoon'],
  cave: ['4', '5', 'Visit Crystal Cave'],
  mosasaurus: ['5', null, 'Find the Egg!'],
};
const stopDialogue = ['start', '1', '2', 'break', '4'];

export function advanceToMap(progress, { skipBreak = false } = {}) {
  const advanced = advanceChapter(progress);
  const from = skipBreak ? '3' : origins[progress.run?.scene];
  if (advanced !== progress && from) advanced.run.mapFrom = from;
  return advanced;
}

export function mapState(run, revisit) {
  const completed = run.outcomes.map(Boolean);
  if (revisit) {
    const index = stops.indexOf(run.scene);
    const current = index < 0 || completed[index] ? null : String(index + 1);
    const last = completed.lastIndexOf(true);
    const from = current ?? (last < 0 ? 'start' : String(last + 1));
    return { completed, from, current, dialogue: stopDialogue[index] ?? (last < 0 ? 'start' : String(last + 1)),
      action: current && !completed[index] ? 'Continue Stop' : 'Back to adventure' };
  }
  const [dialogue, current, action] = destinations[run.scene];
  return { completed, from: run.mapFrom ?? 'start', current, dialogue, action,
    introduction: run.scene === 'map', offerBreak: current === 'break', reveal: run.scene === 'mosasaurus' };
}
