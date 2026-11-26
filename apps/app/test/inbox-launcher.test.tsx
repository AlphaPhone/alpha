// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as List } from "../gen/app__inbox.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import home from "../src/home/index.tsx";
import inbox from "../src/inbox/index.tsx";
import { button, closeAll, drawn, fill, hardware, only, open, press, underAct, until } from "./alpha.tsx";
import { type Scene, scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const mounts = only("home", "view:Inbox", "assistant", "notice");

/** Opens Inbox from its Home tile once its first page has loaded. */
async function openInbox(world: Scene) {
  const { alpha } = await open(world, mounts);
  await until(alpha, alpha.runtime, Shell, (state) => state.trail.length === 0);
  await vi.waitFor(async () => {
    await drawn(() => undefined);
    expect((await home.runtime(alpha).runPromise(Home.use((machine) => machine.get()))).tiles.load.status).toBe("Loaded");
  }, { timeout: 15_000 });
  await drawn(() => {
    const tile = document.querySelector<HTMLButtonElement>("[data-home-tile='view:Inbox']");
    if (!tile) throw new Error("no Inbox tile on Home");
    tile.click();
  });
  await until(alpha, inbox.runtime(alpha), List, (state) => state.list.status === "Loaded");
  return alpha;
}

const folders = () => Boolean(document.querySelector("[role=group][aria-label=Folder]"));
const searchField = () => document.querySelector("form[role=search]");

it("On the launcher the open search draws no Back and keeps the folders under it (spec/app/inbox/index.md, \"Back from a search shows its folder without the search, before Back leaves Inbox\")", async () => {
  const world = { ...scene(), phone: true };
  world.settings.roles = world.settings.roles.map((role) => role.role === "home" ? { ...role, held: true } : role);
  const alpha = await openInbox(world);
  await vi.waitFor(() => expect(document.querySelector("main")?.hasAttribute("data-alpha-launcher")).toBe(true));
  await press("Search email");
  expect([Boolean(searchField()), button("Back to inbox"), button("Back to apps"), folders()]).toEqual([true, undefined, undefined, true]);
  await fill("Search mail", "tacos");
  await drawn(() => searchField()?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await until(alpha, inbox.runtime(alpha), List, (state) => state.selected.query === "tacos");
  await hardware("back");
  await until(alpha, inbox.runtime(alpha), List, (state) => state.selected.query === "");
  expect([searchField(), Boolean(button("Search email"))]).toEqual([null, true]);
});

it("Off the launcher the open search keeps its Back to the folder (spec/app/inbox/index.md, \"Back from a search shows its folder without the search, before Back leaves Inbox\")", async () => {
  await openInbox({ ...scene(), phone: false });
  await press("Search email");
  expect([Boolean(searchField()), Boolean(button("Back to inbox")), folders()]).toEqual([true, true, false]);
  await press("Back to inbox");
  expect([searchField(), Boolean(button("Search email"))]).toEqual([null, true]);
});
