const key = 'math-quest.progress';
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const defaults = () => ({ version: 1, stars: 0, adventures: 0, length: 5 });

export function readProgress(storage) {
  try {
    const stored = JSON.parse(storage.getItem(key));
    if (stored?.version === 1) {
      return {
        version: 1, stars: count(stored.stars), adventures: count(stored.adventures),
        length: [3, 5, 7].includes(stored.length) ? stored.length : 5,
      };
    }
    if (stored === null) return { ...defaults(), stars: count(Number(storage.getItem('mathquestStars'))) };
  } catch {
    // Storage can be blocked or contain invalid JSON.
  }
  return defaults();
}

export function saveProgress(storage, progress) {
  try {
    storage.setItem(key, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
