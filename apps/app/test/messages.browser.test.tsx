import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Machine as Messages } from "../gen/app__messages.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { closeAll, later, only, open, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import "../src/main.css";

afterEach(closeAll);

it("Opens message actions while held and toggles them by tap (spec/app/messages/index.md, \"A tap toggles message actions and a stationary hold opens them\")", async () => {
  await page.viewport(390, 844);
  const world = { ...scene(), phone: true, image: true };
  const { alpha } = await open(world, only("home", "view:Messages"));
  await until(alpha, alpha.runtime, Shell, (state) => state.image);
  await page.getByRole("button", { name: "Messages", exact: true }).click();
  await until(alpha, alpha.runtime, Messages, (state) => state.threads === 1 && state.list.status === "Loaded");
  await page.getByRole("button", { name: "Maya Chen", exact: true }).click();
  await until(alpha, alpha.runtime, Messages, (state) => state.shown.rows === 1 && state.page.status === "Loaded");

  const bubble = page.getByRole("button", { name: "Message actions: See you at five", exact: true });
  const menu = page.getByRole("menu", { name: "Message actions", exact: true });
  const target = bubble.element();
  const pointer = userEvent.setup();
  const observed = new AbortController();
  const options = { signal: observed.signal };
  const down: boolean[] = [];
  const up: boolean[] = [];
  const moving: Array<{ trusted: boolean; allowed: boolean }> = [];
  target.addEventListener("pointerdown", (event) => down.push(event.isTrusted), options);
  target.addEventListener("pointerup", (event) => up.push(event.isTrusted), options);
  document.addEventListener("pointermove", (event) => {
    if (event.target instanceof Node && target.contains(event.target)) moving.push({ trusted: event.isTrusted, allowed: !event.defaultPrevented });
  }, options);
  try {
    await pointer.pointer({ keys: "[MouseLeft>]", target });
    try {
      expect(down).toEqual([true]);
      await later(alpha, 510);
      expect(up).toEqual([]);
      await expect.element(menu.getByRole("menuitem", { name: "Copy" })).toBeVisible();
    } finally {
      await pointer.pointer("[/MouseLeft]");
    }
    expect(up).toEqual([true]);
    await expect.element(menu).toBeVisible();
    await bubble.click();
    await expect.element(menu).not.toBeInTheDocument();

    await pointer.pointer({ keys: "[MouseLeft>]", target, coords: { x: 5, y: 8 } });
    try {
      moving.length = 0;
      await pointer.pointer({ target, coords: { x: 25, y: 8 } });
      expect(moving).toContainEqual({ trusted: true, allowed: true });
      await later(alpha, 510);
      await expect.element(menu).not.toBeInTheDocument();
    } finally {
      await pointer.pointer("[/MouseLeft]");
    }
    await expect.element(menu).not.toBeInTheDocument();
  } finally {
    observed.abort();
  }
  expect(world.telephony.sent).toEqual([]);
  expect(world.settings.copied).toEqual([]);
});
