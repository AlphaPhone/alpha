// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Calendar } from "../gen/app__calendar.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import calendar from "../src/calendar/index.tsx";
import { civilDay, dayStart } from "../src/calendar/time.ts";
import { button, closeAll, fill, hardware, later, open, press, seen, underAct, until } from "./alpha.tsx";
import { agentEvent } from "./fakes/calendar.ts";
import { type Scene, scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const hour = 3_600_000;

/** A world at nine in the morning of a Tuesday, whose agent keeps a stand-up and a dentist's appointment, and is invited to a lunch. */
function morning(phone: boolean): Scene & { at: (day: number, hours: number) => number } {
  const world = { ...scene(), phone };
  world.now = new Date(2026, 10, 24, 9).getTime();
  const today = civilDay(world.now);
  const at = (day: number, hours: number) => dayStart(today + day) + hours * hour;
  world.calendar.events.push(
    agentEvent("Standup", at(0, 10), at(0, 10.5)),
    agentEvent("Team lunch", at(0, 12), at(0, 13), {
      provider: "google", organizer: { email: "boss@alpha.test" }, htmlLink: "https://calendar.google.com/event?eid=1",
      attendees: [
        { email: "owner@alpha.test", displayName: "Owner", responseStatus: "needsAction", self: true, organizer: false, optional: false },
        { email: "boss@alpha.test", displayName: "Boss", responseStatus: "accepted", self: false, organizer: true, optional: false },
      ],
    }),
    agentEvent("Dentist", at(2, 15), at(2, 16)),
  );
  world.calendar.phoneEvents.push({ id: "p1", calendarId: "local", title: "Gym", begin: at(0, 18), end: at(0, 19), allDay: false, recurring: false });
  return Object.assign(world, { at });
}

const shown = () => [...document.querySelectorAll("section[aria-label=Calendar] button[aria-label]")]
  .map((found) => found.getAttribute("aria-label"))
  .filter((label) => ["Standup", "Team lunch", "Dentist", "Gym", "Coffee"].includes(label ?? ""));

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  // spec/app/calendar/index.md, "Story: See only what the current read found, for the current account"
  it("See only what the current read found, for the current account (spec/app/calendar/index.md, \"Story: See only what the current read found, for the current account\")", async () => {
    const world = morning(phone);
    const first = await open(world);
    const { alpha } = first;
    const agenda = calendar.runtime(alpha);

    // spec/app/calendar/index.md, "Calendar is in front while the shell shows it and the page is visible; leaving it ends its overlays"
    // spec/app/calendar/index.md, "The account is the one the cloud says is signed in; another account empties the agent's Calendar and closes what was opened for it"
    await press("Calendar");
    await until(alpha, agenda, Calendar, (s) => s.owner === "u1" && s.agent.status === "Ready" && s.agent.rows.length === 3);
    expect(shown()).toEqual(["Standup", "Team lunch"]);

    // spec/app/calendar/index.md, "The owner reads again, and asks Android for Calendar access once": only a phone has calendars of its own, and Android asks once.
    expect(Boolean(button("Allow"))).toBe(phone);
    if (phone) {
      await press("Allow");
      await until(alpha, agenda, Calendar, (s) => s.phone.rows.length === 1);
      expect([shown(), world.calendar.asked, Boolean(button("Allow"))]).toEqual([["Standup", "Team lunch", "Gym"], 1, false]);
    }

    // spec/app/calendar/index.md, "Choosing a layout closes the open event and the date picker, and is refused while a form or the delete sheet is open"
    await press("Week");
    await until(alpha, agenda, Calendar, (s) => s.layout === "WeekView" && s.agent.read.status === "Loaded");
    expect(shown()).toEqual(phone ? ["Standup", "Team lunch", "Gym", "Dentist"] : ["Standup", "Team lunch", "Dentist"]);
    await press("Day");
    await until(alpha, agenda, Calendar, (s) => s.layout === "DayView");

    // spec/app/calendar/index.md, "Back closes one layer at a time: the form, the delete sheet, the event, the Calendars sheet, the date picker, then search"
    await press("Calendars");
    await until(alpha, agenda, Calendar, (s) => s.sources);
    await press("Your agent's calendar");
    await until(alpha, agenda, Calendar, (s) => s.hidden.includes("u1"));
    expect(shown()).toEqual(phone ? ["Gym"] : []);
    await press("Your agent's calendar");
    await hardware("back");
    await until(alpha, agenda, Calendar, (s) => !s.sources && !s.hidden.includes("u1"));
    expect((await alpha.runtime.runPromise(Shell.use((shell) => shell.get()))).trail).toEqual(["Calendar"]);

    // spec/app/calendar/index.md, "The people list says Organizer or Alpha's word for each reply, never the provider's value"
    await press("Team lunch");
    await until(alpha, agenda, Calendar, (s) => s.opened.id !== "");
    expect([document.body.textContent?.includes("Awaiting reply"), document.body.textContent?.includes("Organizer"), Boolean(button("Edit"))]).toEqual([true, true, true]);

    // spec/app/calendar/index.md, "An invitation answer is sent only by the invitee, at the version shown, and is saved only when a read shows the answer"
    await press("Going");
    await until(alpha, agenda, Calendar, (s) => s.outcome === "Saved" && s.agent.read.status === "Loaded");
    expect(world.calendar.writes).toEqual(["answer ev-team-lunch accepted"]);
    await hardware("back");
    await until(alpha, agenda, Calendar, (s) => s.opened.id === "");

    // spec/app/calendar/index.md, "Saving the agent's event writes it once: a new event is created, an open one changed at the version shown"
    await press("New event");
    await until(alpha, agenda, Calendar, (s) => s.form === "NewForm");
    await fill("Title", "Coffee");
    await press("Save");
    // spec/app/calendar/index.md, "An applied create or change is read back through the same calendar; only a readback that finds it says saved"
    await until(alpha, agenda, Calendar, (s) => s.outcome === "Saved" && s.form === "NoForm" && s.agent.rows.some((row) => row.title === "Coffee"));
    expect([world.calendar.writes.at(-1)?.startsWith("create"), shown()]).toEqual([true, phone ? ["Standup", "Coffee", "Team lunch", "Gym"] : ["Standup", "Coffee", "Team lunch"]]);

    // spec/app/calendar/index.md, "Undo inside the window sends nothing"
    await press("Standup");
    await until(alpha, agenda, Calendar, (s) => s.opened.id !== "");
    await press("Delete");
    await until(alpha, agenda, Calendar, (s) => s.sheet.showing);
    await press("Delete");
    await until(alpha, agenda, Calendar, (s) => s.held.undo.holding === "Held");
    expect(shown().includes("Standup")).toBe(false);
    await later(alpha, 4_000);
    await press("Undo");
    await until(alpha, agenda, Calendar, (s) => s.held.undo.holding === "Undone");
    expect([shown().includes("Standup"), world.calendar.writes.some((write) => write.startsWith("delete"))]).toEqual([true, false]);

    // spec/app/calendar/index.md, "Once the window is over the deletion waits for the agent to be free, and is then sent once"
    await press("Standup");
    await until(alpha, agenda, Calendar, (s) => s.opened.id !== "");
    await press("Delete");
    await until(alpha, agenda, Calendar, (s) => s.sheet.showing);
    await press("Delete");
    await until(alpha, agenda, Calendar, (s) => s.held.undo.holding === "Held");
    await later(alpha, 10_000);
    // spec/app/calendar/index.md, "An applied deletion is never reported as an event Calendar could not look up": the agent no longer lists it.
    await until(alpha, agenda, Calendar, (s) => s.outcome === "Deleted" && s.agent.read.status === "Loaded");
    expect([world.calendar.writes.at(-1), shown().includes("Standup")]).toEqual(["delete ev-standup", false]);

    // spec/app/calendar/index.md, "While Calendar is in front it reads again once a minute, never hidden, during a read or a write"
    world.calendar.events.push(agentEvent("Late meeting", world.at(0, 16), world.at(0, 17)));
    await later(alpha, 60_000);
    await until(alpha, agenda, Calendar, (s) => s.agent.rows.some((row) => row.title === "Late meeting"));

    // spec/app/calendar/index.md, "When Alpha opens again the overlays are closed, a read under way is asked again when Calendar is next in front, and a write that was sent is unknown"
    world.calendar.stalled = true;
    { const s = await agenda.runPromise(Calendar.use((m) => m.get())); console.log("DBG", JSON.stringify({ shown: s.shown, page: s.page, form: s.form, sheet: s.sheet, picker: s.picker, phase: s.phase, opened: s.opened })); }
    await press("New event");
    await fill("Title", "Unanswered");
    await press("Save");
    await until(alpha, agenda, Calendar, (s) => s.phase === "Dispatched");
    await first.close();
    world.calendar.stalled = false;
    const second = await open(world);
    const reopened = calendar.runtime(second.alpha);
    await until(second.alpha, reopened, Calendar, (s) => s.outcome === "WriteUnknown" && s.agent.read.status === "Loaded");
    expect([world.calendar.events.filter((event) => event.title === "Unanswered").length, document.body.textContent?.includes("can't tell whether")]).toEqual([1, true]);

    // spec/app/calendar/index.md, "Calendar is in front while the shell shows it and the page is visible; leaving it ends its overlays": a hidden page closes the form, and the trail keeps Calendar.
    await press("New event");
    await until(second.alpha, reopened, Calendar, (s) => s.form === "NewForm");
    await seen(false);
    await until(second.alpha, reopened, Calendar, (s) => s.form === "NoForm" && !s.page);
    await seen(true);
    await until(second.alpha, reopened, Calendar, (s) => s.page && s.agent.read.status === "Loaded");
  });
});

// spec/app/calendar/index.md, "Without an agent account Calendar says Not connected and offers Settings, never a dead Connect"
it("Without an agent account Calendar offers Settings (spec/app/calendar/index.md, \"Without an agent account Calendar says Not connected and offers Settings, never a dead Connect\")", async () => {
  const world = { ...morning(true), signedIn: false };
  const { alpha } = await open(world);
  await press("Calendar");
  const agenda = calendar.runtime(alpha);
  await until(alpha, agenda, Calendar, (s) => s.shown && s.agent.status === "NotConnected" && s.phone.read.status !== "Loading");
  expect([Boolean(button("Try again")), Boolean(button("Settings"))]).toEqual([false, true]);
  await press("Settings");
  await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Settings");
});
