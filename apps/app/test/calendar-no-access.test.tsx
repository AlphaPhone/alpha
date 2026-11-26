// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as View } from "../gen/app__calendar.effect.vibe";
import { Machine as Editor } from "../gen/app__calendar__editor.effect.vibe";
import calendar from "../src/calendar/index.tsx";
import { button, closeAll, drawn, fill, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const options = ["Once", "Daily", "Weekdays", "Weekly", "Video link", "None", "At start", "10 min", "1 hour"];

/** Calendar in front on `world`, a Tuesday morning whose phone keeps the gym at six. */
async function onCalendar(world: ReturnType<typeof scene>) {
  world.now = new Date(2026, 10, 24, 9).getTime();
  world.calendar.phoneEvents.push({ id: "p1", calendarId: "local", title: "Gym", begin: new Date(2026, 10, 24, 18).getTime(), end: new Date(2026, 10, 24, 19).getTime(), allDay: false, recurring: false });
  const { alpha } = await open(world, only("view:Calendar"));
  const runtime = calendar.runtime(alpha);
  await drawn(() => alpha.runtime.runPromise(Shell.use((shell) => shell.send({ type: "openView", view: "Calendar" }))));
  return { alpha, runtime };
}

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  // spec/app/calendar/index.md, "Calendar asks for the phone's calendar only while it lacks it, and only once"; spec/app/calendar/writing.md, "The form offers with the agent's calendar only what it holds, and keeps the calendar chosen"
  it("New event asks for the phone's calendar and draws the options of a calendar that exists, with no notice asking first (spec/app/calendar/index.md, \"Story: Let Calendar read my phone's calendar\")", async () => {
    const world = { ...scene(), phone };
    world.calendar.down = true;
    const { alpha, runtime } = await onCalendar(world);
    await until(alpha, runtime, View, (state) => state.front && state.owner > 0 && !state.connected);
    expect([Boolean(button("Allow")), document.body.textContent?.includes("needs access"), world.calendar.asked]).toEqual([false, false, 0]);

    await press("New event");
    await until(alpha, runtime, Editor, (state) => state.shown && state.form === "NewEvent");
    await until(alpha, runtime, View, (state) => state.access.asked === phone);
    if (phone) await until(alpha, runtime, View, (state) => state.phoneRows === 1);
    expect([world.calendar.asked, options.filter((name) => button(name) !== undefined)]).toEqual(phone ? [1, options] : [0, []]);

    // spec/app/calendar/writing.md, "Save is off while loading, while saving, for another account, for an event that changed, without a title, with no calendar to take a new event, and for the phone's calendar once Android said no, in that order": a browser without an account has no calendar for the event, and Save says so in v119's words instead of being refused unsaid
    await fill("Title", "Swim");
    await until(alpha, runtime, Editor, (state) => state.titled && state.kept);
    const status = document.querySelector('[aria-label="Calendar form draft status"]')?.textContent;
    expect([status, button("Save event")?.getAttribute("aria-disabled")]).toEqual(phone ? ["", "false"] : ["Calendar unavailable", "true"]);
  });
});

// spec/app/calendar/index.md, "Calendar asks for the phone's calendar only while it lacks it, and only once": with the agent's calendar connected New event does not ask; Save to the phone's calendar asks, and refused access stops it with the way to Settings
it("Save to the phone's calendar asks for it, and a refusal says so and offers Settings (spec/app/calendar/index.md, \"Story: Let Calendar read my phone's calendar\")", async () => {
  const world = { ...scene(), phone: true };
  world.calendar.denies = true;
  const { alpha, runtime } = await onCalendar(world);
  await until(alpha, runtime, View, (state) => state.front && state.connected);
  await press("New event");
  await until(alpha, runtime, Editor, (state) => state.shown && state.form === "NewEvent" && state.receipts.status === "Loaded");
  expect(world.calendar.asked).toBe(0);
  await fill("Title", "Piano");
  await press("This phone's calendar");
  await until(alpha, runtime, Editor, (state) => state.titled && state.kept);
  await press("Save event");
  await until(alpha, runtime, View, (state) => state.access.asked && state.access.grant === "Denied");
  await drawn(() => expect([world.calendar.asked, document.body.textContent?.includes("No access"), button("Save event")?.getAttribute("aria-disabled"), Boolean(button("Open Calendar settings"))])
    .toEqual([1, true, "true", true]));
  expect([world.calendar.phoneEvents.map(({ title }) => title)]).toEqual([["Gym"]]);
  await until(alpha, runtime, Editor, (state) => state.shown && state.write.id === 0);
});

// spec/app/calendar/index.md, "Calendar asks for the phone's calendar only while it lacks it, and only once": with the agent's calendar connected New event does not ask, and Save to the phone's calendar asks and then goes out
it("Save to the phone's calendar asks for it at Save, and a grant saves the event there (spec/app/calendar/index.md, \"Story: Let Calendar read my phone's calendar\")", async () => {
  const world = { ...scene(), phone: true };
  const { alpha, runtime } = await onCalendar(world);
  await until(alpha, runtime, View, (state) => state.front && state.connected);
  await press("New event");
  await until(alpha, runtime, Editor, (state) => state.shown && state.form === "NewEvent" && state.receipts.status === "Loaded");
  await fill("Title", "Swim");
  await press("This phone's calendar");
  await until(alpha, runtime, Editor, (state) => state.titled && state.kept);
  expect(world.calendar.asked).toBe(0);
  await press("Save event");
  await until(alpha, runtime, Editor, (state) => state.form === "NoForm" && state.write.outcome === "Confirmed");
  expect([world.calendar.asked, world.calendar.phoneEvents.map(({ title }) => title), world.calendar.events.some(({ title }) => title === "Swim")]).toEqual([1, ["Gym", "Swim"], false]);
});
