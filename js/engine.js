import { questionsFor, worlds } from './curriculum.js';

export function seededRandom(seed) {
  let state = seed >>> 0;
  return (min, max) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return min + Math.floor(state / 4294967296 * (max - min + 1));
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
    questions.push({
      id: `${world}-${seed}-${questions.length}`, templateId: `${category}/${key}`, category,
      theme: world, difficulty: 1, intermediate: [], vocabulary: [], visual: null,
      manipulative: null, misconceptions: {}, ...content,
      explanation: content.equation,
    });
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
    this.questions = questions;
    this.index = 0;
    this.stars = 0;
    this.prepare();
  }

  prepare() {
    this.hints = 0;
    this.status = 'solving';
  }

  get current() { return this.questions[this.index]; }

  hint() {
    if (this.status !== 'solving') return '';
    if (this.hints < this.current.hints.length) return this.current.hints[this.hints++];
    this.status = 'guided';
    return `Worked example. ${this.current.explanation}`;
  }

  answer(value) {
    if (this.status !== 'solving') return null;
    if (!validateAnswer(this.current, value)) return { correct: false };
    this.status = 'solved';
    this.stars++;
    return { correct: true, assisted: this.hints > 0 };
  }

  next() {
    if (!['guided', 'solved'].includes(this.status)) return false;
    this.index++;
    this.prepare();
    if (this.index === this.questions.length) this.status = 'complete';
    return true;
  }
}
