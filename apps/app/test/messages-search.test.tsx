// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Messages } from "../gen/app__messages.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import messages from "../src/messages/index.tsx";
import { button, closeAll, drawn, fill, hardware, only, open, press, underAct, until } from "./alpha.tsx";
import { alphaImage } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const rule = "spec/app/messages/index.md, \"The search field opens over the list, and Back closes it with what it typed\"";
const searchField = () => document.querySelector<HTMLInputElement>("input[aria-label='Search conversations']");

describe("Messages search", () => {
  it(`On the launcher the search draws no Back, Android's Back closes it, and the next Back leaves Messages (${rule})`, async () => {
    const world = alphaImage();
    world.settings.roles = world.settings.roles.map((role) => role.role === "home" ? { ...role, held: true } : role);
    const { alpha } = await open(world, only("home", "view:Messages"));
    const runtime = messages.runtime(alpha);
    await until(alpha, alpha.runtime, Shell, (state) => state.image);
    await drawn(() => {
      const tile = document.querySelector<HTMLButtonElement>("[data-home-tile='view:Messages']");
      if (!tile) throw new Error("No Messages home tile");
      tile.click();
    });
    await until(alpha, runtime, Messages, (state) => state.front && state.pane === "Threads" && state.list.status === "Loaded");
    await vi.waitFor(() => expect(document.querySelector("main")?.hasAttribute("data-alpha-launcher")).toBe(true));

    await press("Search messages");
    await until(alpha, runtime, Messages, (state) => state.searching);
    await vi.waitFor(() => expect(searchField()).not.toBeNull());
    expect(button("Back to messages")).toBeUndefined();
    await fill("Search conversations", "Maya");
    await until(alpha, runtime, Messages, (state) => state.sought);

    await hardware("back");
    await until(alpha, runtime, Messages, (state) => !state.searching && !state.sought && state.front && state.pane === "Threads");
    await vi.waitFor(() => expect(searchField()).toBeNull());
    expect(button("Search messages")).toBeDefined();
    expect((await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.get()))).trail.at(-1)).toBe("Messages");

    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (state) => state.trail.length === 0);
  });

  it(`Off the launcher the search keeps its Back, which closes the search and stays in Messages (${rule})`, async () => {
    const { alpha } = await open(alphaImage(), only("home", "view:Messages"));
    const runtime = messages.runtime(alpha);
    await until(alpha, alpha.runtime, Shell, (state) => state.image);
    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Messages" }))));
    await until(alpha, runtime, Messages, (state) => state.front && state.pane === "Threads" && state.list.status === "Loaded");
    expect(document.querySelector("main")?.hasAttribute("data-alpha-launcher")).toBe(false);

    await press("Search messages");
    await vi.waitFor(() => expect(button("Back to messages")).toBeDefined());
    await fill("Search conversations", "Maya");
    await until(alpha, runtime, Messages, (state) => state.sought);
    await press("Back to messages");
    await until(alpha, runtime, Messages, (state) => !state.searching && !state.sought && state.front && state.pane === "Threads");
    await vi.waitFor(() => expect(searchField()).toBeNull());
  });

  it(`The search opens empty, and a conversation opened from its results returns to them before Back closes the search (${rule})`, async () => {
    const { alpha } = await open(alphaImage(), only("home", "assistant", "view:Messages"));
    const runtime = messages.runtime(alpha);
    await until(alpha, alpha.runtime, Shell, (state) => state.image);
    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Messages" }))));
    await until(alpha, runtime, Messages, (state) => state.front && state.pane === "Threads" && state.list.status === "Loaded");
    const everyone = (await runtime.runPromise(Effect.flatMap(Messages, (machine) => machine.get()))).threads;
    const words = document.querySelector("ul[aria-label='Conversations'] button")?.getAttribute("aria-label")?.split(" ")[0] ?? "";

    await fill("Search or ask", "Nobody by this name");
    await until(alpha, runtime, Messages, (state) => state.sought && !state.searching && state.list.status === "Loaded" && state.threads === 0);
    await press("Search messages");
    await until(alpha, runtime, Messages, (state) => state.searching && !state.sought && state.list.status === "Loaded" && everyone > 0 && state.threads === everyone);
    await vi.waitFor(() => expect(searchField()?.value).toBe(""));

    await fill("Search conversations", words);
    await until(alpha, runtime, Messages, (state) => state.sought && state.list.status === "Loaded" && state.threads > 0);
    const found = (await runtime.runPromise(Effect.flatMap(Messages, (machine) => machine.get()))).threads;
    await drawn(() => document.querySelector<HTMLButtonElement>("ul[aria-label='Conversations'] button")?.click());
    await until(alpha, runtime, Messages, (state) => state.pane === "Conversation");

    await hardware("back");
    await until(alpha, runtime, Messages, (state) => state.pane === "Threads" && state.searching && state.sought && state.list.status === "Loaded" && state.threads === found);
    await vi.waitFor(() => expect(searchField()?.value).toBe(words));

    await hardware("back");
    await until(alpha, runtime, Messages, (state) => state.pane === "Threads" && !state.searching && !state.sought);
    await vi.waitFor(() => expect(searchField()).toBeNull());
    expect((await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.get()))).trail.at(-1)).toBe("Messages");
  });
});
