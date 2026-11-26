// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Contacts } from "../gen/app__contacts.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { answerReading } from "../src/contacts/reads.vibe";
import { button, closeAll, drawn, fill, only, open, press, underAct, until } from "./alpha.tsx";
import { alphaImage } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const rule = "spec/app/contacts/index.md, \"Back from the search field clears the query and returns to Contacts\"";
const searchField = () => document.querySelector<HTMLInputElement>("form[role=search] input[aria-label='Search contacts']");
const listed = () => [...document.querySelectorAll<HTMLButtonElement>("[aria-label='Contacts'] button[aria-label]")].map((row) => row.getAttribute("aria-label")).filter((name) => name === "Maya Chen" || name === "Ben Ortiz");

async function contacts() {
  const { alpha } = await open(alphaImage(), only("home", "assistant", "notice", "phone/stage", "view:Contacts", "view:Phone", "view:Messages"));
  await until(alpha, alpha.runtime, Shell, (state) => state.image && state.contacts);
  await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Contacts" }))));
  await until(alpha, alpha.runtime, Contacts, (state) => state.front && state.list.status === "Loaded" && state.rows === 2);
  return alpha;
}

describe(`Search contacts over a filter (${rule})`, () => {
  it("opens empty over All contacts when Alpha's filter chip shows, as v119's openSearch cleared the chip first", async () => {
    const alpha = await contacts();
    expect(await alpha.runtime.runPromise(answerReading({ type: "contact_show", query: "Ben" }))).toEqual({ kind: "contact-show", status: "shown" });
    await until(alpha, alpha.runtime, Contacts, (state) => state.sought && state.list.status === "Loaded" && state.rows === 1);
    await vi.waitFor(() => expect(button("Clear filter Ben")).toBeDefined());

    await press("Search contacts");
    await until(alpha, alpha.runtime, Contacts, (state) => state.searching && !state.sought && state.list.status === "Loaded" && state.rows === 2);
    await vi.waitFor(() => expect([searchField()?.value, listed().toSorted()]).toEqual(["", ["Ben Ortiz", "Maya Chen"]]));
    expect(button("Clear filter Ben")).toBeUndefined();
  });

  it("keeps the words the owner typed in the bar and opens with them", async () => {
    const alpha = await contacts();
    await fill("Search or ask", "Maya");
    await until(alpha, alpha.runtime, Contacts, (state) => state.sought && state.list.status === "Loaded" && state.rows === 1);

    await press("Search contacts");
    await until(alpha, alpha.runtime, Contacts, (state) => state.searching);
    await vi.waitFor(() => expect([searchField()?.value, listed()]).toEqual(["Maya", ["Maya Chen"]]));
    expect((await alpha.runtime.runPromise(Effect.flatMap(Contacts, (machine) => machine.get()))).sought).toBe(true);
  });
});
