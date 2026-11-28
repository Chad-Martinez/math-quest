import { sceneLifecycle } from './scene-lifecycle.js';

const greetingOpening = 'Hi, Harrison!';
const greetingQuestion = 'Are you ready for a dinosaur adventure?';
const greeting = `${greetingOpening} ${greetingQuestion}`;
const art = './assets/scene-01/';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function createWelcome({ resumable, start, resume, grownUps, confirmStart, listen, stopSpeech }) {
  const stage = document.createElement('section');
  stage.className = 'welcome-stage';
  stage.setAttribute('aria-labelledby', 'welcome-title');
  stage.innerHTML = `
    <picture class="welcome-background-art">
      <source media="(orientation: portrait)" srcset="${art}jungle-portrait.jpg">
      <img class="welcome-background" src="${art}jungle-background.webp" alt="">
    </picture>
    <div class="welcome-titles">
      <img class="welcome-logo" src="${art}logo.png" alt="Math Quest">
      <img class="welcome-island-sign" src="${art}island-sign.png" alt="Dinosaur Island">
      <h1 id="welcome-title" tabindex="-1"><img src="${art}lost-egg-sign.png" alt="The Lost Egg"></h1>
    </div>
    <div class="welcome-character" role="img" aria-label="T-Rex">
      <img class="welcome-greeting-pose" src="${art}trex-greeting.png" alt="">
      <img class="welcome-celebrate-pose" src="${art}trex-celebrate.png" alt="">
      ${[1, 2, 3, 4].map(frame => `<img class="welcome-walk-frame" src="${art}trex-walk-${frame}.png" alt="">`).join('')}
    </div>
    <img class="welcome-egg" src="${art}egg.png" alt="">
    <img class="welcome-flower" src="${art}foliage-flower.png" alt="">
    <img class="welcome-leaves" src="${art}foliage-leaves.png" alt="">
    <img class="welcome-rock" src="${art}foliage-rock.png" alt="">
    <img class="welcome-grass" src="${art}foliage-grass.png" alt="">
    <div class="welcome-dialogue">
      <p class="welcome-greeting"></p>
    </div>
    <div class="welcome-actions">
      ${resumable ? '<button type="button" class="welcome-continue welcome-primary">Continue Adventure</button>' : ''}
      <button type="button" class="welcome-start ${resumable ? 'welcome-secondary' : 'welcome-primary'}">Start Adventure</button>
    </div>
    <button type="button" id="chapter-grownups" class="welcome-parents welcome-secondary">Grown-ups</button>
  `;

  const dialogue = stage.querySelector('.welcome-dialogue');
  const opening = document.createElement('span');
  opening.textContent = greetingOpening;
  dialogue.querySelector('.welcome-greeting').append(opening, ' ', greetingQuestion);
  const audio = listen(greeting, { label: 'Listen' });
  audio.classList.add('welcome-audio');
  dialogue.append(audio);

  let startTimer;
  const scene = sceneLifecycle(stage, stopSpeech, () => clearTimeout(startTimer));
  const { signal } = scene;
  const startButton = stage.querySelector('.welcome-start');

  function cancelStart() {
    clearTimeout(startTimer);
    startTimer = undefined;
    stage.classList.remove('welcome-celebrating');
  }

  function celebrate() {
    if (signal.aborted || !stage.isConnected || startTimer !== undefined) return;
    if (reducedMotion.matches) {
      start();
      return;
    }
    stage.classList.add('welcome-celebrating');
    startTimer = setTimeout(() => {
      startTimer = undefined;
      if (stage.isConnected) start(stage);
    }, 400);
  }

  startButton.addEventListener('click', () => {
    if (startTimer !== undefined) return;
    stopSpeech();
    if (resumable) confirmStart(celebrate, startButton);
    else celebrate();
  }, { signal });
  stage.querySelector('.welcome-continue')?.addEventListener('click', () => {
    cancelStart();
    stopSpeech();
    resume();
  }, { signal });
  stage.querySelector('#chapter-grownups').addEventListener('click', () => {
    cancelStart();
    grownUps();
  }, { signal });
  return scene;
}
