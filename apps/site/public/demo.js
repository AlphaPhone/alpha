const demo = document.querySelector('.demo');
const screen = demo.querySelector('.demo-screen');
const scenes = [...screen.querySelectorAll('[data-scene]')];
const controls = demo.querySelector('.demo-controls');
const sceneButtons = [...controls.querySelectorAll('[data-show]')];
const pauseButton = controls.querySelector('[data-toggle]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sceneDurations = { home: 2700, chat: 7500, calendar: 3900 };

let current = -1;
let paused = reducedMotion.matches;
let advanceTimer;
let advanceAt;
let remaining;

function stopTimer() {
  if (advanceTimer === undefined) return;
  clearTimeout(advanceTimer);
  advanceTimer = undefined;
  remaining = Math.max(0, advanceAt - performance.now());
}

function syncPlayback() {
  const suspended = paused || document.hidden;
  demo.dataset.paused = String(paused);
  demo.dataset.suspended = String(suspended);
  pauseButton.setAttribute('aria-pressed', String(paused));

  if (suspended) {
    stopTimer();
    return;
  }

  if (advanceTimer === undefined) {
    advanceAt = performance.now() + remaining;
    advanceTimer = setTimeout(() => {
      advanceTimer = undefined;
      showScene((current + 1) % scenes.length);
    }, remaining);
  }
}

function showScene(index) {
  if (index === current) return;
  stopTimer();

  current = index;
  const sceneName = scenes[index].dataset.scene;
  screen.dataset.current = sceneName;
  remaining = sceneDurations[sceneName];

  for (const scene of scenes) {
    const active = scene.dataset.scene === sceneName;
    scene.dataset.active = String(active);
    scene.dataset.motion = String(active && !paused && !reducedMotion.matches);
  }

  for (const button of sceneButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.show === sceneName));
  }

  syncPlayback();
}

for (const button of sceneButtons) {
  button.addEventListener('click', () => {
    showScene(scenes.findIndex((scene) => scene.dataset.scene === button.dataset.show));
  });
}

pauseButton.addEventListener('click', () => {
  paused = !paused;
  syncPlayback();
});

document.addEventListener('visibilitychange', syncPlayback);
reducedMotion.addEventListener('change', ({ matches }) => {
  if (!matches) return;
  paused = true;
  scenes[current].dataset.motion = 'false';
  syncPlayback();
});

showScene(0);
controls.hidden = false;
