import { activeTemplateSkills, worlds } from './curriculum.js';

const key = 'math-quest.progress';
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const empty = () => ({ stars: 0, adventures: 0 });
const counts = value => ({ stars: count(value?.stars), adventures: count(value?.adventures) });
const length = value => [3, 5, 7].includes(value) ? value : 5;
const evidenceLimit = 100;
const defaults = () => ({ version: 3, length: 5, legacy: empty(), byAdventure: {}, evidence: [] });

function validEvidence(value) {
  if (!value || !worlds.some(world => world.id === value.world) ||
      typeof value.id !== 'string' ||
      !new RegExp(`^${value.world}-[0-9]{1,10}-[0-7](-practice)?$`).test(value.id) ||
      !Object.hasOwn(activeTemplateSkills, value.templateId) ||
      (value.world !== 'mixed' && !value.templateId.startsWith(`${value.world}/`)) ||
      !['independent-correct', 'assisted-correct', 'worked-example'].includes(value.outcome)) return null;
  return {
    id: value.id, templateId: value.templateId, skill: activeTemplateSkills[value.templateId],
    world: value.world, source: value.id.endsWith('-practice') ? 'transfer' : 'session',
    outcome: value.outcome, attempts: count(value.attempts),
    firstAttemptCorrect: typeof value.firstAttemptCorrect === 'boolean' ? value.firstAttemptCorrect : null,
    hintLevels: Array.isArray(value.hintLevels) ? Array.from(value.hintLevels.slice(0, 2), level => Math.min(4, count(level))) : [],
    parentHelp: value.parentHelp === true, revealedBeforeSolve: value.revealedBeforeSolve === true,
    reviewedAfterOutcome: value.reviewedAfterOutcome === true, mathTools: value.mathTools === true,
    drawing: value.drawing === true, narration: value.narration === true,
  };
}

function readEvidence(items) {
  if (!Array.isArray(items)) return [];
  const latest = new Map();
  for (const value of items.slice(-evidenceLimit).map(validEvidence).filter(Boolean)) {
    latest.delete(value.id);
    latest.set(value.id, value);
  }
  return [...latest.values()];
}

export function readProgress(storage) {
  try {
    const stored = JSON.parse(storage.getItem(key));
    if (stored?.version === 2 || stored?.version === 3) {
      const byAdventure = Object.fromEntries(worlds
        .filter(world => Object.hasOwn(stored.byAdventure ?? {}, world.id))
        .map(world => [world.id, counts(stored.byAdventure[world.id])]));
      return { ...defaults(), length: length(stored.length), legacy: counts(stored.legacy), byAdventure, evidence: readEvidence(stored.evidence) };
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
  return { ...progress, byAdventure, evidence: progress.evidence.filter(item => item.world !== world) };
}

export function recordEvidence(progress, record) {
  const value = validEvidence(record);
  if (!value) return progress;
  const prior = progress.evidence.filter(item => item.id !== value.id);
  return { ...progress, evidence: [...prior, value].slice(-evidenceLimit) };
}

export function saveProgress(storage, progress) {
  try {
    storage.setItem(key, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
