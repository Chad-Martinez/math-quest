import { release } from './release.js';

if (release.legacyAdventures) {
  await import('./app.js');
} else if (release.chapter === 'lost-egg-1') {
  document.body.classList.add('chapter-release');
  await import('./chapter-ui.js');
}
