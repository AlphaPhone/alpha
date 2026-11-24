// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as View } from "../gen/app__calendar.effect.vibe";
import { Machine as Changes } from "../gen/app__calendar__agent.effect.vibe";
import { Machine as Editor } from "../gen/app__calendar__editor.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import calendar from "../src/calendar/index.tsx";
import { shown } from "../src/calendar/shown.ts";
import { civilDay, dateOf, dayStart } from "../src/calendar/time.ts";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, closeAll, fill, hardware, only, open, press, underAct, until } from "./alpha.tsx";
import { agentEvent } from "./fakes/calendar.ts";
import { type Scene, scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const hour = 3_600_000;
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });

/** A world at nine in the morning of a Tuesday, whose agent keeps a stand-up, a lunch it was invited to and a dentist's appointment, and whose phone keeps the gym. */
function morning(phone: boolean): Scene & { at: (day: number, hours: number) => number; today: number } {
  const world = { ...scene(), phone };
  world.now = new Date(2026, 10, 24, 9).getTime();
  const today = civilDay(world.now);
  const at = (day: number, hours: number) => dayStart(today + day) + hours * hour;
  world.calendar.events.push(
    agentEvent("Standup", at(0, 10), at(0, 10.5), { conferenceLink: "https://meet.alpha.test/standup" }),
    agentEvent("Team lunch", at(0, 12), at(0, 13), { location: "Cafe", htmlLink: "https://calendar.google.com/event?eid=1" }),
    agentEvent("Dentist", at(2, 15), at(2, 16)),
  );
  world.calendar.phoneEvents.push({ id: "p1", calendarId: "local", title: "Gym", begin: at(0, 18), end: at(0, 19), allDay: false, recurring: false });
  return Object.assign(world, { at, today });
}

/** The titles of the rows the day shows, in order. */
const titles = () => [...document.querySelectorAll("main button")].map((found) => found.querySelector("span, div")?.textContent ?? found.textContent ?? "")
  .map((text) => ["Standup", "Team lunch", "Dentist", "Gym", "Coffee"].find((title) => text.startsWith(title)) ?? "").filter((title) => title !== "");

/** Tap the button whose text starts with `text`, as a row's does. */
async function tap(text: string) {
  const found = [...document.querySelectorAll("button")].find((candidate) => (candidate.textContent ?? "").startsWith(text));
  if (!found) throw new Error(`no row ${text}`);
  await press(found.getAttribute("aria-label") ?? found.textContent ?? "");
}

/** Bring Calendar forward, as Home, a notice or Ask Alpha does through the shell. */
const openCalendar = (alpha: Alpha) => alpha.runtime.runPromise(Shell.use((shell) => shell.send({ type: "openView", view: "Calendar" })));

const dayButton = (day: number) => `${weekday.format(dateOf(day))} ${dateOf(day).getDate()}`;

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  it("See my days (spec/app/calendar/index.md, \"Story: See my days\"; spec/app/calendar/index.md, \"Story: Move through the days\")", async () => {
    const world = morning(phone);
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);

    // spec/app/calendar/index.md, "Connecting an account reads the day from Google; disconnecting takes its rows away at once"
    await openCalendar(alpha);
    await until(alpha, runtime, View, (s) => s.connected && s.google.status === "Loaded" && s.googleRows === 2);
    expect(titles()).toEqual(["Standup", "Team lunch"]);

    // spec/app/calendar/index.md, "Calendar asks for the phone's calendar only while it lacks it, and only once": only a phone has a calendar of its own.
    expect(Boolean(button("Allow"))).toBe(phone);
    if (phone) {
      await press("Allow");
      await until(alpha, runtime, View, (s) => s.phoneRows === 1);
      expect([titles(), world.calendar.asked, Boolean(button("Allow"))]).toEqual([["Standup", "Team lunch", "Gym"], 1, false]);
    }

    // spec/app/calendar/index.md, "Picking a day in the week strip or the month dialog shows that day's timeline"
    const later = world.today + 2;
    await press(dayButton(later));
    await until(alpha, runtime, View, (s) => s.anchor === later && s.google.status === "Loaded");
    expect(titles()).toEqual(["Dentist"]);

    // spec/app/calendar/index.md, "Today comes back to today"
    await press("Today");
    await until(alpha, runtime, View, (s) => s.anchor === world.today && s.google.status === "Loaded");
    expect(titles()).toEqual(phone ? ["Standup", "Team lunch", "Gym"] : ["Standup", "Team lunch"]);

    // spec/app/calendar/index.md, "Choosing a layout closes the menu, and the agenda goes back to today"
    await press("Layout");
    await until(alpha, runtime, View, (s) => s.overlay === "LayoutMenu");
    await press("Agenda");
    await until(alpha, runtime, View, (s) => s.layout === "Agenda" && s.overlay === "NoOverlay");

    // spec/app/calendar/index.md, "An event opens from the rows shown, with what it offers"; spec/app/calendar/index.md, "Back closes the event"
    await tap("Team lunch");
    await until(alpha, runtime, View, (s) => s.open !== 0 && s.place && !s.video);
    expect([Boolean(button("Open in Maps")), Boolean(button("Join video call"))]).toEqual([true, false]);
    await hardware("back");
    await until(alpha, runtime, View, (s) => s.open === 0);
    expect((await alpha.runtime.runPromise(Shell.use((shell) => shell.get()))).trail).toEqual(["Calendar"]);
  });
});

describe("on a phone", () => {
  it("Look at an event (spec/app/calendar/index.md, \"Story: Look at an event\")", async () => {
    const world = morning(true);
    world.calendar.granted = true;
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    console.log("STEP 1");
    await openCalendar(alpha);
    console.log("STEP 2");
    await until(alpha, runtime, View, (s) => s.googleRows === 2 && s.phoneRows === 1);

    // spec/app/calendar/index.md, "The event's place opens in Maps, and coming back reads the event again"; spec/app/calendar/index.md, "An event comes back only if the read finds it; otherwise it closes"
    console.log("STEP 3");
    await tap("Team lunch");
    console.log("STEP 4");
    await press("Open in Maps");
    console.log("STEP 5");
    await until(alpha, runtime, View, (s) => s.detail === "InMaps");
    expect((await alpha.runtime.runPromise(Shell.use((shell) => shell.get()))).trail).toEqual(["Calendar", "Maps"]);
    console.log("STEP 6");
    await hardware("back");
    console.log("STEP 7");
    await until(alpha, runtime, View, (s) => s.detail === "Showing" && s.open !== 0 && s.event.status === "Loaded");

    // spec/app/calendar/index.md, "An event comes back only if the read finds it; otherwise it closes": the lunch was cancelled while the owner was in Maps.
    console.log("STEP 8");
    await press("Open in Maps");
    console.log("STEP 9");
    await until(alpha, runtime, View, (s) => s.detail === "InMaps");
    world.calendar.events = world.calendar.events.filter((event) => event.title !== "Team lunch");
    console.log("STEP 10");
    await hardware("back");
    console.log("STEP 11");
    await until(alpha, runtime, View, (s) => s.open === 0 && s.event.status === "Failed");
  });

  it("Write an event (spec/app/calendar/editor.md, \"Story: Write an event\"; spec/app/calendar/editor.md, \"Story: Never create an event twice\"; spec/app/calendar/editor.md, \"Story: Delete an event, or answer an invitation\")", async () => {
    const world = morning(true);
    world.calendar.granted = true;
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    console.log("STEP 12");
    await openCalendar(alpha);
    console.log("STEP 13");
    await until(alpha, runtime, View, (s) => s.phoneRows === 1);

    // spec/app/calendar/editor.md, "Saving sends the form once, as a new numbered write built on the revision its edits began from"
    console.log("STEP 14");
    await press("New event");
    console.log("STEP 15");
    await until(alpha, runtime, Editor, (e) => e.shown && e.form === "NewEvent");
    console.log("STEP 16");
    await fill("Title", "Coffee");
    console.log("STEP 17");
    await until(alpha, runtime, Editor, (e) => e.draft.edits === 1 && e.kept);
    console.log("STEP 18");
    await press("Save");
    console.log("STEP 19");
    await until(alpha, runtime, Editor, (e) => e.form === "NoForm" && e.write.outcome === "Confirmed");
    console.log("STEP 20");
    await until(alpha, runtime, View, (s) => s.phoneRows === 2);
    expect([world.calendar.phoneEvents.map((event) => event.title), titles()]).toEqual([["Gym", "Coffee"], ["Coffee", "Standup", "Team lunch", "Gym"]]);

    // spec/app/calendar/editor.md, "While a create is in doubt its form waits; checking the phone's receipts finds it or not": the phone made the event and could not say so.
    world.calendar.lost = true;
    console.log("STEP 21");
    await press("New event");
    console.log("STEP 22");
    await fill("Title", "Walk");
    console.log("STEP 23");
    await press("Save");
    console.log("STEP 24");
    await until(alpha, runtime, Editor, (e) => e.unknownCreate && e.draft.sync === "Saving" && e.write.outcome === "Unknown");
    expect(button("Save")?.hasAttribute("disabled")).toBe(true);
    console.log("STEP 25");
    await press("Check again");
    console.log("STEP 26");
    await until(alpha, runtime, Editor, (e) => !e.unknownCreate && e.form === "NoForm");
    expect(world.calendar.phoneEvents.filter((event) => event.title === "Walk").length).toBe(1);

    // spec/app/calendar/editor.md, "A delete names which occurrences, and only a repeating event offers more than this one"
    world.calendar.lost = false;
    console.log("STEP 27");
    await tap("Gym");
    console.log("STEP 28");
    await until(alpha, runtime, View, (s) => s.open !== 0);
    expect(Boolean(button("Delete the series"))).toBe(false);
    console.log("STEP 29");
    await press("Delete");
    console.log("STEP 30");
    await until(alpha, runtime, Editor, (e) => e.kind === "Remove" && e.write.outcome === "Confirmed");
    expect(world.calendar.phoneEvents.map((event) => event.title)).not.toContain("Gym");
  });

  it("Approve what the agent changes (spec/app/calendar/agent.md, \"Story: Approve what the agent changes\"; spec/app/calendar/agent.md, \"Story: Know what the agent's change did\")", async () => {
    const world = morning(true);
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    console.log("STEP 31");
    await openCalendar(alpha);
    console.log("STEP 32");
    await until(alpha, runtime, View, (s) => s.googleRows === 2);
    const lunch = shown.of("Google", world.today).find((row) => row.title === "Team lunch");
    if (!lunch) throw new Error("no lunch");

    // spec/app/calendar/agent.md, "A card that leaves out a field its change would set can be declined, never approved"
    const propose = (complete: boolean) => runtime.runPromise(Changes.use((machine) => machine.send({ type: "propose", change: "Respond", reply: "Maybe", complete, id: lunch.id, series: false, managed: false, revision: 1 }, "Agent")));
    console.log("STEP 33");
    await propose(false);
    console.log("STEP 34");
    await until(alpha, runtime, Changes, (a) => a.stage === "Awaiting");
    expect([Boolean(button("Approve")), Boolean(button("Decline"))]).toEqual([false, true]);
    console.log("STEP 35");
    await press("Decline");
    console.log("STEP 36");
    await until(alpha, runtime, Changes, (a) => a.result === "Declined");

    // spec/app/calendar/agent.md, "Only the owner approves, and approving sends the change once, under a new number"; spec/app/calendar/agent.md, "The read back says whether the change is there, and the agent is told"
    console.log("STEP 37");
    await propose(true);
    console.log("STEP 38");
    await until(alpha, runtime, Changes, (a) => a.stage === "Awaiting");
    console.log("STEP 39");
    await press("Approve");
    console.log("STEP 40");
    await until(alpha, runtime, Changes, (a) => a.result === "Done");
    expect(world.calendar.writes).toEqual(["answer ev-team-lunch tentative"]);
  });
});
