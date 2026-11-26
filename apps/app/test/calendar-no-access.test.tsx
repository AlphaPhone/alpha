// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as View } from "../gen/app__calendar.effect.vibe";
import { Machine as Editor } from "../gen/app__calendar__editor.effect.vibe";
import calendar from "../src/calendar/index.tsx";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, closeAll, drawn, fill, only, open, press, underAct, until } from "./alpha.tsx";
import { type Scene, scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const options = ["Once", "Daily", "Weekdays", "Weekly", "Video link", "None", "At start", "10 min", "1 hour"];
const drawnOptions = () => options.filter((name) => button(name) !== undefined);
const formStatus = () => document.querySelector('[aria-label="Calendar form draft status"]')?.textContent ?? "";

/** Calendar in front on `phone` or in a browser, its agent's calendar connected or not, with a Gym event on the phone. */
async function onCalendar(phone: boolean, connected: boolean, more: (world: Scene) => void = () => {}) {
  const world = { ...scene(), phone };
  world.now = new Date(2026, 10, 24, 9).getTime();
  world.calendar.down = !connected;
  world.calendar.phoneEvents.push({ id: "p1", calendarId: "local", title: "Gym", begin: new Date(2026, 10, 24, 18).getTime(), end: new Date(2026, 10, 24, 19).getTime(), allDay: false, recurring: false });
  more(world);
  const { alpha } = await open(world, only("view:Calendar"));
  const runtime = calendar.runtime(alpha);
  await drawn(() => alpha.runtime.runPromise(Shell.use((shell) => shell.send({ type: "openView", view: "Calendar" }))));
  await until(alpha, runtime, View, (state) => state.front && state.owner > 0 && state.connected === connected);
  return { world, alpha, runtime };
}

async function newEvent(alpha: Alpha, runtime: ReturnType<typeof calendar.runtime>, title: string) {
  await press("New event");
  await until(alpha, runtime, Editor, (state) => state.shown && state.form === "NewEvent" && state.receipts.status === "Loaded");
  await fill("Title", title);
  await until(alpha, runtime, Editor, (state) => state.titled && state.kept);
}

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  // spec/app/calendar/index.md, "Calendar asks for the phone's calendar only while it lacks it, and only once"; spec/app/calendar/writing.md, "The form offers with the agent's calendar only what it holds, and keeps the calendar chosen"; spec/app/calendar/writing.md, "Save is off while loading, while saving, for another account, for an event that changed, without a title, with no calendar to take a new event, and for the phone's calendar once Android said no, in that order"
  it("New event with no agent's calendar asks for the phone's and draws every option there; with no calendar at all it draws none and Save says why (spec/app/calendar/index.md, \"Story: Let Calendar read my phone's calendar\")", async () => {
    const { world, alpha, runtime } = await onCalendar(phone, false);
    expect([Boolean(button("Allow")), document.body.textContent?.includes("needs access"), world.calendar.asked]).toEqual([false, false, 0]);

    await newEvent(alpha, runtime, "Swim");
    await until(alpha, runtime, View, (state) => state.access.asked === phone);
    if (phone) await until(alpha, runtime, View, (state) => state.phoneRows === 1);
    // spec/app/calendar/writing.md, "Save is off while loading, while saving, for another account, for an event that changed, without a title, with no calendar to take a new event, and for the phone's calendar once Android said no, in that order": a browser without an account has no calendar for the event, so nothing is offered that could not be saved.
    expect([world.calendar.asked, drawnOptions(), formStatus(), button("Save event")?.getAttribute("aria-disabled")])
      .toEqual(phone ? [1, options, "", "false"] : [0, [], "Calendar unavailable", "true"]);
  });
});

describe("on a phone", () => {
  // spec/app/calendar/index.md, "Calendar asks for the phone's calendar only while it lacks it, and only once"
  it("New event never asks while the agent's calendar is connected, as v119's default Agent Calendar; Save to the phone's calendar asks then", async () => {
    const { world, alpha, runtime } = await onCalendar(true, true);
    await newEvent(alpha, runtime, "Swim");
    expect([world.calendar.asked, button("Your agent's calendar")?.getAttribute("aria-pressed")]).toEqual([0, "true"]);

    await press("This phone's calendar");
    await until(alpha, runtime, Editor, (state) => state.kept);
    expect(world.calendar.asked).toBe(0);
    await press("Save event");
    await until(alpha, runtime, Editor, (state) => state.form === "NoForm" && state.write.outcome === "Confirmed");
    expect([world.calendar.asked, world.calendar.phoneEvents.map(({ title }) => title), world.calendar.events.some(({ title }) => title === "Swim")])
      .toEqual([1, ["Gym", "Swim"], false]);
  });

  // spec/app/calendar/index.md, "Calendar asks for the phone's calendar only while it lacks it, and only once"; spec/app/calendar/writing.md, "Save is off while loading, while saving, for another account, for an event that changed, without a title, with no calendar to take a new event, and for the phone's calendar once Android said no, in that order"
  it("Save to the phone's calendar after Android said no sends nothing and says No access, as v119 did", async () => {
    const { world, alpha, runtime } = await onCalendar(true, true, (world) => { world.calendar.denies = true; });
    await newEvent(alpha, runtime, "Swim");
    await press("This phone's calendar");
    await until(alpha, runtime, Editor, (state) => state.kept);
    await press("Save event");
    await until(alpha, runtime, View, (state) => state.access.asked && state.access.grant === "Denied");
    await drawn(() => expect(formStatus()).toBe("No access"));
    const e = await runtime.runPromise(Editor.use((editor) => editor.get()));
    expect([world.calendar.asked, world.calendar.phoneEvents.map(({ title }) => title), world.calendar.creations.size, e.shown, e.write.id, button("Save event")?.getAttribute("aria-disabled")])
      .toEqual([1, ["Gym"], 0, true, 0, "true"]);
  });
});
