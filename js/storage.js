import { worlds } from './curriculum.js';

const key = 'math-quest.progress';
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const empty = () => ({ stars: 0, adventures: 0 });
const counts = value => ({ stars: count(value?.stars), adventures: count(value?.adventures) });
const length = value => [3, 5, 7].includes(value) ? value : 5;
const defaults = () => ({ version: 2, length: 5, legacy: empty(), byAdventure: {} });

export function readProgress(storage) {
  try {
    const stored = JSON.parse(storage.getItem(key));
    if (stored?.version === 2) {
      const byAdventure = Object.fromEntries(worlds
        .filter(world => Object.hasOwn(stored.byAdventure ?? {}, world.id))
        .map(world => [world.id, counts(stored.byAdventure[world.id])]));
      return { version: 2, length: length(stored.length), legacy: counts(stored.legacy), byAdventure };
    }
    if (stored?.version === 1) {
      return { ...defaults(), length: length(stored.length), legacy: counts(stored) };
    }
    if (stored === null) {
      return { ...defaults(), legacy: { stars: count(Number(storage.getItem('mathquestStars'))), adventures: 0 } };
    }
  } catch {
    // Storage can be blocked or contain invalid JSON.
  }
  return defaults();
}

export function progressTotals(progress) {
  return Object.values(progress.byAdventure).reduce((total, adventure) => ({
    stars: total.stars + adventure.stars,
    adventures: total.adventures + adventure.adventures,
  }), progress.legacy);
}

export function addProgress(progress, world, field) {
  const previous = progress.byAdventure[world] ?? empty();
  return {
    ...progress,
    byAdventure: { ...progress.byAdventure, [world]: { ...previous, [field]: previous[field] + 1 } },
  };
}

export function resetProgress(progress, world) {
  if (world === 'all') return defaults();
  const byAdventure = { ...progress.byAdventure };
  delete byAdventure[world];
  return { ...progress, byAdventure };
}

export function saveProgress(storage, progress) {
  try {
    storage.setItem(key, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
