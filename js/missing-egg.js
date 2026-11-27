const sceneArt = './assets/scene-02/';
const welcomeArt = './assets/scene-01/';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const beats = [
  { pose: welcomeArt + 'trex-greeting.png', dialogue: 'Come on, Harrison! I want to show you something special.' },
  { pose: sceneArt + 'trex-surprised.png', dialogue: 'Oh no! The dinosaur egg is missing!' },
  { pose: sceneArt + 'trex-investigating.png', dialogue: 'Look! Footprints! Maybe they can help us find it.' },
  { pose: sceneArt + 'trex-determined.png', dialogue: 'Will you help me find the lost egg?' },
];

const clues = {
  nest: {
    landscape: { size: [498, 231], rings: [[341, 163, 81, 22, 0]] },
    portrait: { size: [257, 337], rings: [[193, 241, 60, 17, 0]] },
  },
  trail: {
    landscape: { size: [453, 231], rings: [[212, 209, 37, 12, -20], [282, 177, 24, 8, -17], [312, 155, 17, 6, -15]] },
    portrait: { size: [229, 337], rings: [[65, 305, 42, 18, -24], [122, 257, 23, 10, -17], [141, 228, 15, 7, -12]] },
  },
};

function scenery(name) {
  return `<picture class="mission-picture">
    <source media="(orientation: portrait)" srcset="${sceneArt}${name}-portrait.webp">
    <img class="mission-background" data-environment="${name}" src="${sceneArt}${name}-landscape.webp" alt="">
  </picture>`;
}

function highlights(name) {
  return Object.entries(clues[name]).map(([orientation, { size, rings }]) => `
    <svg class="mission-clues mission-${name}-clues mission-clues-${orientation}" aria-hidden="true"
      viewBox="0 0 ${size.join(' ')}" preserveAspectRatio="xMidYMax slice">
      ${rings.map(([x, y, rx, ry, angle], index) => `
        <g transform="rotate(${angle} ${x} ${y})">
          <ellipse class="mission-clue" style="--clue-delay: ${.25 + index * .25}s" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>
        </g>
      `).join('')}
    </svg>`).join('');
}

export function createMissingEgg({ listen, stopSpeech, grownUps, openMap }) {
  const stage = document.createElement('section');
  stage.className = 'mission-stage';
  stage.setAttribute('aria-labelledby', 'missing-egg-title');
  stage.innerHTML = `
    <h1 id="missing-egg-title" class="mission-heading" tabindex="-1">The Missing Egg</h1>
    ${scenery('nest')}${scenery('trail')}
    ${highlights('nest')}${highlights('trail')}
    <div class="mission-character" role="img" aria-label="T-Rex">
      <img class="mission-pose mission-current-pose" alt="">
      ${[1, 2, 3, 4].map(frame => `<img class="mission-pose mission-walk-frame" src="${welcomeArt}trex-walk-${frame}.png" alt="">`).join('')}
    </div>
    <div class="mission-dialogue">
      <p class="welcome-greeting mission-line" aria-live="polite" aria-atomic="true"></p>
      <div class="mission-audio"></div>
    </div>
    <button type="button" class="welcome-primary mission-advance">Continue</button>
    <button type="button" id="chapter-grownups" class="welcome-parents welcome-secondary">Grown-ups</button>
  `;
  const dialogue = stage.querySelector('.mission-line');
  const pose = stage.querySelector('.mission-current-pose');
  const audio = stage.querySelector('.mission-audio');
  const advance = stage.querySelector('.mission-advance');

  let beat = 0;
  let lastPress = -Infinity;
  let accepting = false;
  let mapTimer;

  // These small images can decode in parallel while the first beat is playing.
  for (const src of [...beats.slice(1).map(({ pose }) => pose), welcomeArt + 'trex-celebrate.png']) {
    const preload = new Image();
    preload.src = src;
  }

  function showBeat() {
    const current = beats[beat];
    stage.dataset.beat = beat + 1;
    pose.src = current.pose;
    dialogue.textContent = current.dialogue;
    audio.replaceChildren(listen(current.dialogue, { label: 'Listen' }));
    advance.textContent = beat === beats.length - 1 ? "Let's Find It!" : 'Continue';
  }

  advance.addEventListener('keydown', event => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  });
  advance.addEventListener('click', () => {
    const now = performance.now();
    if (accepting || now - lastPress < 220) return;
    lastPress = now;
    stopSpeech();
    if (beat < beats.length - 1) {
      beat++;
      showBeat();
      return;
    }
    accepting = true;
    if (reducedMotion.matches) {
      openMap();
      return;
    }
    advance.setAttribute('aria-disabled', 'true');
    pose.src = welcomeArt + 'trex-celebrate.png';
    stage.classList.add('mission-accepting');
    mapTimer = setTimeout(() => {
      if (stage.isConnected) openMap(stage);
    }, 400);
  });

  stage.querySelector('#chapter-grownups').addEventListener('click', grownUps);
  showBeat();
  return {
    stage,
    dispose() {
      clearTimeout(mapTimer);
      stopSpeech();
      for (const animation of stage.getAnimations({ subtree: true })) animation.cancel();
    },
  };
}
