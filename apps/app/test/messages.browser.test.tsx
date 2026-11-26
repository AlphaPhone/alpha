import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Machine as Messages } from "../gen/app__messages.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Canvas } from "../gen/app__shell__keyboard.effect.vibe";
import { closeAll, coverLifted, later, only, open, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import "../src/main.css";

afterEach(async () => {
  await closeAll();
  document.documentElement.style.removeProperty("font-size");
});

/** Open Messages from Home's tile on the phone image, once its one thread is listed. */
async function messagesFromHome(world: ReturnType<typeof scene>) {
  const { alpha } = await open(world, only("home", "view:Messages"));
  await coverLifted(alpha);
  await until(alpha, alpha.runtime, Shell, (state) => state.image);
  // spec/app/home/tiles.md, "Only Phone, Messages, Inbox, Telegram and Slack carry a badge, only when something waits there, and no tile does while Home is being edited": the tile's name is its app's, with what waits there said after it
  await page.getByRole("button", { name: /^Messages(?![A-Za-z])/ }).click();
  await until(alpha, alpha.runtime, Messages, (state) => state.threads === 1 && state.list.status === "Loaded");
  return alpha;
}

it("Opens message actions while held and toggles them by tap (spec/app/messages/index.md, \"A tap toggles message actions and a stationary hold opens them\")", async () => {
  await page.viewport(390, 844);
  const world = { ...scene(), phone: true, image: true };
  const alpha = await messagesFromHome(world);
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
      await pointer.pointer({ keys: "[/MouseLeft]", target });
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
      await pointer.pointer({ keys: "[/MouseLeft]", target });
    }
    await expect.element(menu).not.toBeInTheDocument();
  } finally {
    observed.abort();
  }
  expect(world.telephony.sent).toEqual([]);
  expect(world.settings.copied).toEqual([]);
});

it("Keeps the Messages title in its header at large text (spec/app/shell/keyboard.md, \"Story: Read everything at the text size I chose\")", async () => {
  await page.viewport(390, 844);
  const world = { ...scene(), phone: true, image: true };
  world.settings.roles = world.settings.roles.map((role) => role.role === "home" ? { ...role, held: true } : role);
  const alpha = await messagesFromHome(world);
  await expect.element(page.getByRole("button", { name: "Maya Chen", exact: true })).toBeVisible();
  const header = () => {
    const top = document.querySelector<HTMLElement>("[data-alpha-messages-header]");
    const title = top?.querySelector("h1");
    const row = page.getByRole("button", { name: "Maya Chen", exact: true }).element();
    if (!top || !title) throw new Error("The Messages header is not drawn");
    return { top: top.getBoundingClientRect(), title: title.getBoundingClientRect(), row: row.getBoundingClientRect() };
  };
  await vi.waitFor(() => expect(document.querySelector("main")?.hasAttribute("data-alpha-launcher")).toBe(true));
  expect(header().top.height).toBeCloseTo(56, 1);
  // spec/app/shell/index.md, "On the launcher the first page of Settings and of Workflows draws no Back, and Android's Back still leaves it": v119 drew no Back on the launcher.
  expect(document.querySelector('[data-alpha-messages-header] button[aria-label^="Back"]')).toBeNull();

  document.documentElement.style.fontSize = "32px";
  await until(alpha, alpha.runtime, Canvas, (canvas) => canvas.textScale === 200);
  await vi.waitFor(() => expect(document.querySelector("[data-alpha-title-row]")).not.toBeNull());
  const large = header();
  expect(large.top.height).toBeGreaterThan(3.5 * 32);
  expect(large.title.bottom).toBeLessThanOrEqual(large.top.bottom + 0.5);
  expect(large.row.top).toBeGreaterThanOrEqual(large.top.bottom - 0.5);

  await page.getByRole("button", { name: "Search messages", exact: true }).click();
  const search = document.querySelector<HTMLElement>("[data-alpha-messages-search-header]");
  expect(search?.getBoundingClientRect().height).toBeCloseTo(3.5 * 32, 1);
});
