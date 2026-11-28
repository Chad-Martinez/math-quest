export function chapterSceneHeader({ el, picture, action, title, titleId, art, progress, practice,
  home, grownUps, openMap, leavePractice }) {
  const brand = action('', home, 'grove-brand');
  brand.setAttribute('aria-label', 'Math Quest home');
  brand.append(picture(art + 'logo.png', '', ''));
  const parent = action('Grown-ups', grownUps, 'welcome-secondary grove-secondary');
  parent.id = 'chapter-grownups';
  return el('header', { className: 'grove-bar' }, brand,
    el('h1', { id: titleId, tabindex: '-1' }, title),
    el('div', { className: 'grove-nav' }, el('p', { className: 'grove-progress' }, progress),
      practice ? action('Leave practice', leavePractice, 'welcome-secondary grove-secondary')
        : action('Trail map', event => openMap(event.currentTarget), 'welcome-secondary grove-secondary'), parent));
}

export function chapterSceneDialogue({ el, listen, speaker, text, isQuestion = false, focus = false }) {
  return el('div', { className: 'grove-bubble-zone', 'data-speaker': speaker },
    el('div', { className: 'welcome-greeting grove-bubble' }, el('strong', { className: 'grove-speaker' }, speaker),
      el(isQuestion ? 'h2' : 'p', { className: 'grove-line', 'aria-live': 'polite', tabindex: '-1',
        ...(isQuestion ? { id: 'chapter-question' } : {}), ...(focus ? { 'data-focus-beat': '' } : {}) }, text)),
    listen(text, { label: 'Listen' }));
}
