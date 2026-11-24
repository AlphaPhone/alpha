import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

export * from "@antithesishq/bombadil/browser/defaults";

const phone = extract(({ document }) => {
  const shown = document.querySelector('[role="img"][aria-label^="Alpha Home"]');
  if (!shown) return { scenes: 1, picks: 1, typing: false, answered: false };
  const scenes = [...shown.querySelectorAll("img")].map((capture) => capture.parentElement?.classList.contains("opacity-100") ?? false);
  const picks = [...document.querySelectorAll('button[aria-label^="Show "]')].map((button) => button.getAttribute("aria-pressed") === "true");
  return {
    scenes: scenes.filter(Boolean).length,
    picks: picks.length === 0 ? 1 : picks.filter(Boolean).length,
    typing: shown.querySelectorAll("i").length > 0,
    answered: (shown.textContent ?? "").includes("Two things this afternoon."),
  };
});

// spec/site/index.md, "The demo is always on a beat of its scene, and a scene shown whole has one beat"
/** One scene is on the phone at a time, and the controls mark that one. */
export const siteOneSceneAtATime = always(() => phone.current.scenes === 1 && phone.current.picks === 1);

// spec/site/index.md, "The chat shows the question, the agent typing, its answer and the two events, each from its beat, and all but the typing when shown whole"
/** The agent is never shown typing beside its answer. */
export const siteTypingBeforeTheAnswer = always(() => !(phone.current.typing && phone.current.answered));

const motion = extract(({ document, window }) => {
  const handset = document.querySelector('[role="img"][aria-label^="Alpha Home"]');
  const pause = document.querySelector('button[aria-label="Pause automatic playback"]');
  const style = handset ? window.getComputedStyle(handset) : undefined;
  return {
    paused: pause?.getAttribute("aria-pressed") === "true",
    swaying: style !== undefined && style.animationName !== "none" && style.animationPlayState === "running",
  };
});

// spec/site/index.md, "Pausing keeps the time the beat has left, and playing again goes on from it"
/** The phone does not sway while the visitor has paused the demo. */
export const siteStillWhilePaused = always(() => !(motion.current.paused && motion.current.swaying));
