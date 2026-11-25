import { buildCoachGuide } from './coach.js';

export function connectCoach({ current, currentStep, markSupport, requestPractice }) {
  const get = id => document.getElementById(id);
  const dialog = get('parent-coach');
  const trigger = get('teaching-tips');
  const status = get('coach-status');
  const solution = get('coach-solution');
  const reveal = get('coach-reveal');
  const help = get('coach-help');
  const transfer = get('coach-transfer');
  let item;
  let guide;

  function list(id, items) {
    get(id).replaceChildren(...items.map(text => {
      const node = document.createElement('li');
      node.textContent = text;
      return node;
    }));
  }

  trigger.addEventListener('click', () => {
    const session = current();
    if (!session?.current || dialog.open) return;
    item = session.current;
    guide = buildCoachGuide(item);
    get('coach-objective').textContent = guide?.objective ?? 'A contextual guide is unavailable for this problem.';
    get('coach-tip').hidden = !guide;
    get('coach-tip').textContent = guide?.quickTip ?? '';
    const checkpoint = item.intermediate[currentStep()];
    get('coach-stage').hidden = !checkpoint;
    get('coach-stage').textContent = checkpoint ? `Current step — ${checkpoint.prompt}` : '';
    for (const id of ['coach-demonstration', 'coach-more']) {
      get(id).open = false;
      get(id).hidden = !guide;
    }
    list('coach-steps', guide?.steps ?? []);
    list('coach-misconceptions', guide?.misconceptions ?? []);
    get('coach-prerequisite').textContent = guide ? `Before you start: ${guide.prerequisite}` : '';
    get('coach-accommodation').textContent = guide?.accommodation ?? '';
    get('coach-offline').textContent = guide ? `Away from the screen: ${guide.offlineActivity}` : '';
    reveal.hidden = !guide;
    reveal.setAttribute('aria-expanded', 'false');
    solution.hidden = true;
    solution.textContent = '';
    help.hidden = session.status !== 'solving';
    help.setAttribute('aria-pressed', String(session.support.parentHelp));
    transfer.hidden = !guide || ['example', 'guided', 'independent'].includes(item.lessonStage);
    status.textContent = session.questions[session.index + 1]?.practice ? 'A similar problem is ready to try next.' : '';
    dialog.showModal();
    dialog.scrollTop = 0;
  });

  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    solution.hidden = true;
    solution.textContent = '';
    trigger.focus({ preventScroll: true });
  });

  reveal.addEventListener('click', () => {
    if (!dialog.open || !guide || !solution.hidden || current()?.current !== item) return;
    markSupport('reveal');
    const { value, unit, explanation } = guide.solution;
    const answer = Array.isArray(value) ? value.join(' ') : [value, unit].filter(part => part !== '').join(' ');
    solution.hidden = false;
    const label = Array.isArray(value) ? 'Correct statements' : 'Answer';
    solution.textContent = `${label}: ${answer}${Array.isArray(value) ? '' : '.'} ${explanation}`;
    reveal.setAttribute('aria-expanded', 'true');
    solution.scrollIntoView({ block: 'nearest' });
  });

  help.addEventListener('click', () => {
    if (!dialog.open || current()?.current !== item || current().status !== 'solving') return;
    markSupport('parentHelp');
    help.setAttribute('aria-pressed', 'true');
    status.textContent = 'Help recorded for this problem.';
  });

  transfer.addEventListener('click', () => {
    if (!dialog.open || !guide || current()?.current !== item) return;
    const result = requestPractice();
    status.textContent = {
      queued: 'A similar problem is ready to try next.',
      limit: 'This adventure already has an extra practice problem.',
      unavailable: 'No fresh problem is available for this skill right now.',
    }[result];
  });
}
