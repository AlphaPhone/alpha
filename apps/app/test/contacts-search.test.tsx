// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Contacts } from "../gen/app__contacts.effect.vibe";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import home from "../src/home/index.tsx";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, closeAll, drawn, fill, hardware, only, open, press, underAct, until } from "./alpha.tsx";
import { alphaImage } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const searchField = () => document.querySelector<HTMLInputElement>("input[aria-label='Search contacts']");
const mounts = only("home", "assistant", "notice", "phone/stage", "view:Phone", "view:Contacts", "view:Messages");

/** Alpha as the phone's launcher, with Home loaded. */
async function launcher() {
  const world = alphaImage();
  world.settings.roles = world.settings.roles.map((role) => role.role === "home" ? { ...role, held: true } : role);
  const { alpha } = await open(world, mounts);
  await until(alpha, alpha.runtime, Shell, (state) => state.image && state.contacts);
  await until(alpha, home.runtime(alpha), Home, (state) => state.tiles.load.status === "Loaded");
  return alpha;
}

const tile = (view: "Contacts" | "Phone") => drawn(() => {
  const found = document.querySelector<HTMLButtonElement>(`[data-home-tile='view:${view}']`);
  if (!found) throw new Error(`No ${view} home tile`);
  found.click();
});

const trail = async (alpha: Alpha) => (await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.get()))).trail.join(",");

/** Open the search, check it draws no Back, and close it with Android's Back, first empty and then with words typed. */
async function closesWithAndroidBack(alpha: Alpha, where: string) {
  for (const typed of ["", "Ma"]) {
    await press("Search contacts");
    await until(alpha, alpha.runtime, Contacts, (state) => state.searching);
    await vi.waitFor(() => expect(searchField()).not.toBeNull());
    expect(button("Back to contacts")).toBeUndefined();
    if (typed) {
      await fill("Search contacts", typed);
      await until(alpha, alpha.runtime, Contacts, (state) => state.sought);
    }
    await hardware("back");
    await until(alpha, alpha.runtime, Contacts, (state) => state.front && !state.searching && !state.sought);
    await vi.waitFor(() => expect(searchField()).toBeNull());
    expect(button("Search contacts")).toBeDefined();
    expect(await trail(alpha)).toBe(where);
  }
}

describe('Contacts search (spec/app/contacts/index.md, "Back from the search field clears the query and returns to Contacts")', () => {
  it(`On the launcher the Contacts search draws no Back, Android's Back closes it even empty, and the next Back leaves Contacts (spec/app/contacts/index.md, "Back from the search field clears the query and returns to Contacts")`, async () => {
    const alpha = await launcher();
    await tile("Contacts");
    await until(alpha, alpha.runtime, Contacts, (state) => state.front && state.list.status === "Loaded");
    await vi.waitFor(() => expect(document.querySelector("main")?.hasAttribute("data-alpha-launcher")).toBe(true));
    expect(button("Back to apps")).toBeUndefined();

    await closesWithAndroidBack(alpha, "Contacts");

    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (state) => state.trail.length === 0);
  });

  it(`On the launcher the search on Phone's Contacts tab draws no Back, and Android's Back closes it before leaving the tab (spec/app/contacts/index.md, "Back from the search field clears the query and returns to Contacts")`, async () => {
    const alpha = await launcher();
    await tile("Phone");
    await until(alpha, alpha.runtime, Phone, (state) => state.front);
    await drawn(() => {
      const found = document.querySelector<HTMLElement>("[data-alpha-phone-tab='contacts']");
      if (!found) throw new Error("No Phone Contacts tab");
      found.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
      found.click();
    });
    await until(alpha, alpha.runtime, Shell, (state) => state.trail.join(",") === "Phone,Contacts");
    await until(alpha, alpha.runtime, Contacts, (state) => state.front && state.list.status === "Loaded");

    await closesWithAndroidBack(alpha, "Phone,Contacts");
  });

  it(`Off the launcher the Contacts list's Back is Back to apps, and the search keeps a Back that closes it (spec/app/contacts/index.md, "Back from the search field clears the query and returns to Contacts")`, async () => {
    const { alpha } = await open(alphaImage(), mounts);
    await until(alpha, alpha.runtime, Shell, (state) => state.image && state.contacts);
    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Contacts" }))));
    await until(alpha, alpha.runtime, Contacts, (state) => state.front && state.list.status === "Loaded");
    expect(document.querySelector("main")?.hasAttribute("data-alpha-launcher")).toBe(false);
    await vi.waitFor(() => expect(button("Back to apps")).toBeDefined());
    expect(button("Back")).toBeUndefined();

    await press("Search contacts");
    await vi.waitFor(() => expect(button("Back to contacts")).toBeDefined());
    await press("Back to contacts");
    await until(alpha, alpha.runtime, Contacts, (state) => state.front && !state.searching);
    await vi.waitFor(() => expect(searchField()).toBeNull());
    expect(await trail(alpha)).toBe("Contacts");

    await press("Back to apps");
    await until(alpha, alpha.runtime, Shell, (state) => state.trail.length === 0);
  });
});
