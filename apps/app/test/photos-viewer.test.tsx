// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { dockClearance } from "@repo/ui";
import { Machine as Library } from "../gen/app__photos.effect.vibe";
import { Machine as Viewer } from "../gen/app__photos__viewer.effect.vibe";
import photosArea from "../src/photos/index.tsx";
import { launcherInnerHeader, launcherTop } from "../src/shell/launcherFrame.ts";
import { closeAll, drawn, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const classes = (element: Element | null | undefined) => new Set(element?.className.split(/\s+/));
const has = (element: Element | null | undefined, list: string) => list.split(" ").every((name) => classes(element).has(name));

it("On the launcher the photo viewer's header floats below the status bar and the photo fills v119's 3:4 frame, while the editor keeps its own column, with v119's names for its controls (spec/app/photos/viewer.md, \"Story: Look at a photo or video\"; spec/app/shell/index.md, \"On the launcher the first page of Settings and of Workflows draws no Back, and Android's Back still leaves it\")", async () => {
  const world = { ...scene(), phone: true };
  world.settings.roles = world.settings.roles.map((role) => role.role === "home" ? { ...role, held: true } : role);
  const { alpha } = await open(world, only("home", "view:Photos", "notice"));
  await press("Photos");
  const runtime = photosArea.runtime(alpha);
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded");
  await drawn(() => expect(document.querySelector("main")?.hasAttribute("data-alpha-launcher")).toBe(true));
  await press("Allow access");
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded" && state.access.grant === "Granted");
  await press("Camera.jpg");
  await until(alpha, runtime, Viewer, (state) => state.read.status === "Loaded");

  const viewer = () => document.querySelector("[data-alpha-subview=photos-viewer]");
  const viewport = () => viewer()?.querySelector<HTMLElement>("[role=group][tabindex='0']");
  const header = () => document.querySelector("[data-alpha-subview^=photos-viewer] header, [data-alpha-subview=photos-editor] header");
  await drawn(() => expect(viewer()).not.toBeNull());
  const names = (selector: string) => [...viewer()?.querySelectorAll(selector) ?? []].map((element) => element.getAttribute("aria-label"));
  expect([names("header button").slice(0, 1), names("[role=toolbar] button"), viewport()?.getAttribute("aria-label")]).toEqual([
    ["Back from photo"], ["Previous photo", "Favorite", "Edit photo", "Photo info"],
    "Photo. Zoom 100 percent. Pinch or double tap to zoom; drag to pan. Use plus, minus, 0 and arrow keys.",
  ]);
  expect([has(header()?.parentElement, "absolute top-0 inset-x-0 pointer-events-none"), has(header()?.parentElement, launcherTop), has(header(), launcherInnerHeader)]).toEqual([true, true, true]);
  expect([has(viewer(), "pb-[max(108px,calc(var(--alpha-dock-clearance,102px)+6px))]"), has(viewer(), dockClearance)]).toEqual([true, false]);
  const photo = viewer()?.querySelector<HTMLImageElement>("img[alt]");
  expect([has(photo, "w-[min(100cqw,75cqh,calc(min(133.333cqw,100cqh)*var(--alpha-photo-ratio)))]"), photo?.style.getPropertyValue("--alpha-photo-ratio")]).toEqual([true, "1"]);
  const controls = document.querySelector("[role=toolbar][aria-label='Photo controls']");
  expect([has(controls?.parentElement, "absolute bottom-[max(108px,calc(var(--alpha-dock-clearance,102px)+6px))]"), has(controls, "pointer-events-auto pb-3")]).toEqual([true, true]);
  await drawn(() => viewport()?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  await until(alpha, runtime, Viewer, (state) => !state.chrome);
  await drawn(() => expect([has(header()?.parentElement, "opacity-0"), has(controls, "opacity-0")]).toEqual([true, true]));
  await drawn(() => viewport()?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  await until(alpha, runtime, Viewer, (state) => state.chrome);

  await press("Edit photo");
  await until(alpha, runtime, Viewer, (state) => state.editing);
  const editor = () => document.querySelector("[data-alpha-subview=photos-editor]");
  await drawn(() => expect(editor()).not.toBeNull());
  expect([has(header()?.parentElement, "contents"), has(header()?.parentElement, launcherTop), has(editor(), dockClearance)]).toEqual([true, false, true]);
  await press("Cancel edit");
  await until(alpha, runtime, Viewer, (state) => !state.editing);
});
