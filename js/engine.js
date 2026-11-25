import { questionsFor, worlds } from './curriculum.js';

export function seededRandom(seed) {
  let state = seed >>> 0;
  return (min, max) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return min + Math.floor(state / 4294967296 * (max - min + 1));
  };
}

function questionRecord(id, theme, category, key, content) {
  return {
    id, templateId: `${category}/${key}`, category, theme, difficulty: 1,
    intermediate: [], vocabulary: [], visual: null, models: [], misconceptions: {},
    ...content, explanation: content.equation,
  };
}

export function generateSession(world, seed, length = 5) {
  if (!worlds.some(item => item.id === world)) throw new RangeError('Unknown adventure');
  if (!Number.isInteger(length) || length < 1 || length > 7) throw new RangeError('Choose 1 to 7 challenges');
  const random = seededRandom(seed);
  const categories = world === 'mixed' ? worlds.slice(0, -1).map(item => item.id) : [world];
  const rotation = new Map();
  const seen = new Set();
  const questions = [];
  const start = random(0, categories.length - 1);
  while (questions.length < length) {
    const category = categories[(start + questions.length) % categories.length];
    const bank = questionsFor(category, random);
    if (!rotation.get(category)?.length) {
      const keys = Object.keys(bank);
      const ordered = [];
      while (keys.length) ordered.push(...keys.splice(random(0, keys.length - 1), 1));
      rotation.set(category, ordered);
    }
    const key = rotation.get(category)[0];
    const content = bank[key];
    const signature = JSON.stringify([content.prompt, content.visual]);
    if (seen.has(signature)) continue;
    seen.add(signature);
    rotation.get(category).shift();
    questions.push(questionRecord(`${world}-${seed}-${questions.length}`, world, category, key, content));
  }
  return questions;
}

export function validateAnswer(question, value) {
  if (question.answerType === 'number') {
    return typeof value === 'string' && /^\d{1,2}$/.test(value.trim()) && Number(value) === question.answer;
  }
  if (question.answerType === 'multiple') {
    return Array.isArray(value) && value.length === question.answer.length &&
      new Set(value).size === value.length && value.every(item => question.answer.includes(item));
  }
  return value === question.answer;
}

export function tallyGroups(count) {
  return Array.from({ length: Math.ceil(count / 5) }, (_, index) => Math.min(5, count - index * 5));
}

export class Session {
  constructor(questions) {
    this.questions = [...questions];
    this.extraPractice = false;
    this.index = 0;
    this.stars = 0;
    this.prepare();
  }

  prepare() {
    this.hints = 0;
    this.attempts = 0;
    this.firstAttemptCorrect = null;
    this.support = { hintLevels: [], parentHelp: false, revealedBeforeSolve: false,
      reviewedAfterOutcome: false, mathTools: false, drawing: false, narration: false };
    this.status = 'solving';
  }

  get current() { return this.questions[this.index]; }

  markSupport(kind) {
    if (kind === 'reveal') {
      if (this.status === 'solving') this.support.revealedBeforeSolve = true;
      if (['guided', 'solved'].includes(this.status)) this.support.reviewedAfterOutcome = true;
    } else if (this.status === 'solving') {
      this.support[kind] = true;
    }
  }

  get assisted() {
    const { parentHelp, revealedBeforeSolve, hintLevels } = this.support;
    return parentHelp || revealedBeforeSolve || hintLevels.some(Boolean);
  }

  evidence() {
    if (!['solved', 'guided'].includes(this.status)) return null;
    const { id, templateId, skill, theme, practice } = this.current;
    return {
      id, templateId, skill, world: theme, source: practice ? 'transfer' : 'session',
      outcome: this.status === 'guided' ? 'worked-example' : this.assisted ? 'assisted-correct' : 'independent-correct',
      attempts: this.attempts, firstAttemptCorrect: this.firstAttemptCorrect,
      ...this.support, hintLevels: Array.from(this.support.hintLevels, level => level ?? 0),
    };
  }

  hint(step = 0) {
    if (this.status !== 'solving') return '';
    const hints = this.current.stageHints?.[step] ?? this.current.hints;
    this.support.hintLevels[step] = this.hints + 1;
    if (this.hints < hints.length) return hints[this.hints++];
    this.markSupport('reveal');
    this.addPractice();
    this.status = 'guided';
    return `Worked example. ${this.current.explanation}`;
  }

  addPractice() {
    if (this.extraPractice) return 'limit';
    if (!this.current) return 'unavailable';
    const question = this.current;
    const key = question.templateId.split('/')[1];
    const seed = [...question.id].reduce((hash, char) => Math.imul(hash, 31) + char.charCodeAt(0), 0);
    const random = seededRandom(seed);
    const signature = item => JSON.stringify([item.prompt, item.visual ?? null]);
    const used = new Set(this.questions.map(signature));
    let fallback;
    for (let attempt = 0; attempt < 100; attempt++) {
      const content = questionsFor(question.category, random)[key];
      if (used.has(signature(content))) continue;
      fallback ??= content;
      if (question.answerType === 'number' && content.answer === question.answer) continue;
      return this.queuePractice(key, content);
    }
    return fallback ? this.queuePractice(key, fallback) : 'unavailable';
  }

  queuePractice(key, content) {
    const question = this.current;
    const practice = questionRecord(`${question.id}-practice`, question.theme, question.category, key, content);
    this.questions.splice(this.index + 1, 0, { ...practice, practice: true });
    this.extraPractice = true;
    return 'queued';
  }

  answer(value) {
    if (this.status !== 'solving') return null;
    const correct = validateAnswer(this.current, value);
    if (this.attempts === 0) this.firstAttemptCorrect = correct;
    this.attempts++;
    if (!correct) return { correct: false };
    this.status = 'solved';
    this.stars++;
    return { correct: true, assisted: this.assisted };
  }

  next() {
    if (!['guided', 'solved'].includes(this.status)) return false;
    this.index++;
    this.prepare();
    if (this.index === this.questions.length) this.status = 'complete';
    return true;
  }
}
