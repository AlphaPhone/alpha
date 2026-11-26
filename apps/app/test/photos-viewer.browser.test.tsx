import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Machine as Library } from "../gen/app__photos.effect.vibe";
import { Machine as Viewer } from "../gen/app__photos__viewer.effect.vibe";
import photosArea from "../src/photos/index.tsx";
import { button, closeAll, coverLifted, only, open, press, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import "../src/main.css";

afterEach(closeAll);

/** Where `element` is drawn, to the pixel. */
const box = (element: Element | null | undefined) => {
  const { top, left, width, height } = element?.getBoundingClientRect() ?? new DOMRect();
  return { top: Math.round(top), left: Math.round(left), width: Math.round(width), height: Math.round(height) };
};

/** What of `element` can be seen: its box cut to each ancestor that clips what overflows it. */
function seenOf(element: Element | null | undefined) {
  let { top, left, right, bottom } = element?.getBoundingClientRect() ?? new DOMRect();
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.overflowX === "visible" && style.overflowY === "visible") continue;
    const clip = node.getBoundingClientRect();
    [top, left, right, bottom] = [Math.max(top, clip.top), Math.max(left, clip.left), Math.min(right, clip.right), Math.min(bottom, clip.bottom)];
  }
  return { top: Math.round(top), left: Math.round(left), width: Math.round(right - left), height: Math.round(bottom - top) };
}

// spec/app/photos/viewer.md, "Story: Look at a photo or video"; spec/app/photos/viewer.md, "The owner pans a zoomed photo within its frame and shows or hides the controls from the media surface"
it("Zoom and pan a photo in its frame (spec/app/photos/viewer.md, \"Story: Look at a photo or video\")", async () => {
  await page.viewport(412, 915);
  const world = { ...scene(), phone: true };
  world.settings.roles = world.settings.roles.map((r) => ({ ...r, held: r.role === "home" ? true : r.held }));
  const { alpha } = await open(world, only("home", "view:Photos", "notice"));
  const runtime = photosArea.runtime(alpha);
  await coverLifted(alpha);
  await expect.poll(() => button("Photos")).toBeDefined();
  await press("Photos");
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded");
  await expect.poll(() => button("Allow access")).toBeDefined();
  await press("Allow access");
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded" && state.access.grant === "Granted");
  await expect.poll(() => button("Camera.jpg")).toBeDefined();
  await press("Camera.jpg");
  await until(alpha, runtime, Viewer, (state) => state.read.status === "Loaded");
  const viewer = () => document.querySelector("[data-alpha-subview=photos-viewer]");
  const photo = () => viewer()?.querySelector("img[alt]");
  await expect.poll(() => box(photo()).width).toBe(412);
  await Promise.all(document.getAnimations().map((animation) => animation.finished));

  expect([box(button("Back from photo")), box(viewer()?.querySelector("header h1")).left]).toEqual([{ top: 50, left: 8, width: 44, height: 44 }, 58]);
  const frame = { top: 129, left: 0, width: 412, height: 549 };
  const surface = page.getByRole("group", { name: /^Photo\. Zoom/u });
  viewer()?.querySelector<HTMLElement>("[role=group][tabindex='0']")?.focus();
  await userEvent.keyboard("+");
  await until(alpha, runtime, Viewer, (state) => state.zoom === 2);
  await expect.poll(() => box(photo()).width).toBe(824);
  expect(seenOf(photo())).toEqual(frame);

  await userEvent.keyboard("{ArrowUp>8/}");
  await until(alpha, runtime, Viewer, (state) => state.pan.y === 1000);
  await expect.poll(() => box(photo()).top).toBe(frame.top);
  await userEvent.dragAndDrop(surface, surface, { sourcePosition: { x: 206, y: 400 }, targetPosition: { x: 206, y: 360 } });
  await until(alpha, runtime, Viewer, (state) => state.pan.y < 1000);
  await expect.poll(() => box(photo()).top).toBe(frame.top - 40);
  expect(seenOf(photo())).toEqual(frame);

  await page.viewport(915, 412);
  await expect.poll(() => seenOf(photo()).height).toBe(412 - 108);
  expect(seenOf(photo())).toEqual({ top: 0, left: Math.round((915 - 228) / 2), width: 228, height: 304 });
});
