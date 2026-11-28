// A one-use tab checkpoint for a reload while the optional overlay is open.
const key = 'math-quest.movement-workspace';
const sameRun = run => JSON.stringify([run?.seed, run?.scene, run?.mapFrom, run?.attempt?.step,
  run?.outcomes]);

export function saveMovementWorkspace(run, workspace, practice) {
  try {
    const canvas = workspace.querySelector('canvas');
    const model = workspace.querySelector('.chapter-model');
    const art = workspace.querySelector('.chapter-sketch');
    const groups = [...(model?.querySelectorAll('.chapter-units') ?? [])]
      .map(group => [...group.querySelectorAll('[data-chapter-piece]')].map(piece => piece.dataset.chapterPiece));
    const balance = ['.scale-left', '.block-tray'].map(group =>
      [...(model?.querySelectorAll(group + ' [data-block]') ?? [])].map(piece => Number(piece.dataset.block)));
    sessionStorage.setItem(key, JSON.stringify({ run: sameRun(run), practice, groups, balance,
      draft: workspace.querySelector('#chapter-answer')?.value, feedback: workspace.querySelector('#chapter-feedback')?.textContent, drawing: canvas?.toDataURL(), drawOpen: Boolean(art && !art.hidden), scroll: window.scrollY }));
  } catch { /* The live workspace stays mounted when tab storage is unavailable. */ }
}

export function clearMovementWorkspace() {
  try { sessionStorage.removeItem(key); } catch { /* Tab storage is optional. */ }
}

export function takeMovementWorkspace(run) {
  try {
    const saved = sessionStorage.getItem(key);
    clearMovementWorkspace();
    const snapshot = JSON.parse(saved);
    return snapshot?.run === sameRun(run) ? snapshot : undefined;
  } catch { return undefined; }
}

export function restoreMovementWorkspace(workspace, snapshot) {
  const field = workspace.querySelector('#chapter-answer');
  if (field && typeof snapshot.draft === 'string' && field.value !== snapshot.draft) {
    field.value = snapshot.draft;
    field.dispatchEvent(new Event('input'));
  }
  const feedback = workspace.querySelector('#chapter-feedback');
  if (feedback && typeof snapshot.feedback === 'string') feedback.textContent = snapshot.feedback;
  const canvas = workspace.querySelector('canvas');
  if (canvas && typeof snapshot.drawing === 'string' && snapshot.drawing.startsWith('data:image/png;base64,')) {
    const picture = new Image();
    picture.onload = () => {
      if (canvas.isConnected) canvas.getContext('2d').drawImage(picture, 0, 0);
    };
    picture.src = snapshot.drawing;
  }
  if (snapshot.drawOpen) {
    const draw = [...workspace.querySelectorAll('button')].find(button => button.textContent === 'Draw');
    if (draw?.getAttribute('aria-pressed') !== 'true') draw?.click();
  }
  if (Number.isFinite(snapshot.scroll)) window.scrollTo(0, snapshot.scroll);
  [...workspace.querySelectorAll('button')].find(button => button.textContent === 'Take a break')?.focus({ preventScroll: true });
}
