import { meadowDialogue, meadowScene } from './wiggle-meadow-content.js';

export const meadowBeats = meadowScene.beats.map(id => meadowDialogue.find(beat => beat.id === id));

export function readMeadowBeat(saved) {
  const index = meadowScene.beats.indexOf(saved?.beat);
  const beat = meadowBeats[Math.max(0, index)];
  const last = Array.isArray(beat.dialogue) ? beat.dialogue.length - 1 : 0;
  const line = Number.isInteger(saved?.line) && index >= 0 ? Math.min(last, Math.max(0, saved.line)) : 0;
  return { beat: beat.id, line };
}
