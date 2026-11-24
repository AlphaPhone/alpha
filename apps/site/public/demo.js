// The phone plays the scene of whichever passage the visitor has scrolled to.
// Every conversation is staged here; the page asks no service anything.

const screen = document.querySelector('.screen');
const passages = [...document.querySelectorAll('.hero, .step')];
const rail = [...document.querySelectorAll('.rail a')];
const ask = document.querySelector('[data-ask]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 56rem)');

const prompts = ['What’s on my calendar today?', 'Text Priya I’m running late', 'Coffee near lunch?', 'What needs me in my inbox?'];
const resting = ask.textContent;

let scene = '';
let timers = [];

const later = (ms, run) => timers.push(setTimeout(run, ms));

function quiet() {
  timers.forEach(clearTimeout);
  timers = [];
  ask.textContent = resting;
  ask.classList.remove('typed');
}

function beat(thread, n) {
  thread.dataset.beat = n;
  for (const part of thread.querySelectorAll('[data-at]')) part.classList.toggle('on', Number(part.dataset.at) <= n);
  for (const part of thread.querySelectorAll('[data-only]')) part.classList.toggle('on', Number(part.dataset.only) === n);
}

// On Home the Ask Alpha bar types what a visitor might ask, one question after another.
function wonder(index) {
  const prompt = prompts[index % prompts.length];
  let at = 900;
  for (let length = 1; length <= prompt.length; length += 1) {
    later(at, () => {
      ask.classList.add('typed');
      ask.textContent = prompt.slice(0, length);
    });
    at += 42;
  }
  later(at + 1700, () => {
    ask.classList.remove('typed');
    ask.textContent = resting;
  });
  later(at + 2300, () => wonder(index + 1));
}

function show(next) {
  if (next === scene) return;
  scene = next;
  quiet();
  screen.dataset.scene = scene;
  for (const link of rail) link.setAttribute('aria-current', String(link.dataset.go === scene));
  for (const thread of screen.querySelectorAll('[data-thread]')) beat(thread, 0);
  const thread = screen.querySelector(`[data-thread="${scene}"]`);
  if (!thread) {
    if (!still.matches) wonder(0);
    return;
  }
  const holds = thread.dataset.beats.split(',').map(Number);
  if (still.matches) {
    beat(thread, holds.length);
    return;
  }
  let at = 380;
  holds.forEach((hold, index) => {
    at += hold;
    later(at, () => beat(thread, index + 1));
  });
}

function follow() {
  const line = innerHeight * (narrow.matches ? 0.9 : 0.6);
  let next = 'home';
  for (const passage of passages) if (passage.getBoundingClientRect().top < line) next = passage.dataset.scene;
  show(next);
}

let pending = false;
function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    follow();
  });
}

screen.classList.add('staged');
addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', schedule);
still.addEventListener('change', () => {
  const now = scene;
  scene = '';
  show(now);
});
follow();

for (const button of document.querySelectorAll('[data-copy]')) {
  const source = document.getElementById(button.dataset.copy);
  const label = button.querySelector('[data-copy-label]');
  button.hidden = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(source.textContent);
      label.textContent = 'Copied';
      setTimeout(() => {
        label.textContent = 'Copy';
      }, 1600);
    } catch {
      getSelection().selectAllChildren(source);
    }
  });
}
