// spec/browser/presentation.md, "A page is wanted only on the uncovered Browser view of a live tab, and is otherwise withdrawn"; spec/browser/presentation.md, "A host control that appears or goes withdraws page input over the whole page until the next frame publishes its bounds"
import type { HostChrome, Placement } from "../../../gen/browser__presentation.ts";

/** Marks a host control that sits over the page: its bounds are published so its touches never reach the website. */
export const HOST_CHROME = "data-host-chrome";
const CHROME = `[${HOST_CHROME}]`;

/** The host controls over the page that are visible now, in viewport pixels, each with its corner radius. */
export function hostChrome(root: Document = document): HostChrome[] {
  return [...root.querySelectorAll<HTMLElement>(CHROME)].flatMap((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (element.closest("[inert],[aria-hidden='true']") || style.display === "none" || style.visibility === "hidden" ||
      style.pointerEvents === "none" || Number(style.opacity) === 0 || rect.width <= 0 || rect.height <= 0) return [];
    const scale = element.offsetWidth ? rect.width / element.offsetWidth : 1;
    return [{ x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), cornerRadius: Math.round((parseFloat(style.borderTopLeftRadius) || 0) * scale) }];
  });
}

/** Where the selected tab's page goes: the viewport's box, in whole viewport pixels, with the host controls over it. */
export function placementOf(tab: string, viewport: HTMLElement): Placement {
  const rect = viewport.getBoundingClientRect();
  return { tab, x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(Math.max(0, rect.height)), below: true, rects: hostChrome() };
}

/** Whether the viewport is laid out and on screen. */
export function laidOut(viewport: HTMLElement): boolean {
  return viewport.isConnected && viewport.getClientRects().length > 0;
}

/** Whether an open modal dialog of the host covers the page. */
export function hostModalOpen(): boolean {
  return document.querySelector("dialog:modal, [role='dialog'][aria-modal='true']") !== null;
}

/** Watches the viewport's size and the host controls over it; returns how to stop. */
export function watchViewport(viewport: HTMLElement, frame: () => void, chromeChanged: () => void): () => void {
  const resize = new ResizeObserver(frame);
  resize.observe(viewport);
  const touches = (node: Node) => node instanceof Element && (node.matches(CHROME) || node.closest(CHROME) !== null || node.querySelector(CHROME) !== null);
  const mutations = new MutationObserver((records) => {
    if (records.some((r) => touches(r.target) || [...r.addedNodes, ...r.removedNodes].some(touches))) {
      chromeChanged();
      requestAnimationFrame(frame);
    }
  });
  mutations.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "hidden", "inert", "aria-hidden"] });
  const moved = () => requestAnimationFrame(frame);
  window.addEventListener("resize", moved);
  document.addEventListener("transitionend", moved, true);
  frame();
  return () => {
    resize.disconnect();
    mutations.disconnect();
    window.removeEventListener("resize", moved);
    document.removeEventListener("transitionend", moved, true);
  };
}
