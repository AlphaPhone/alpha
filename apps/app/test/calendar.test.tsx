// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as View } from "../gen/app__calendar.effect.vibe";
import { Machine as Changes } from "../gen/app__calendar__agent.effect.vibe";
import { Machine as Editor } from "../gen/app__calendar__editor.effect.vibe";
import { Machine as Held } from "../gen/app__calendar__deletions.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Settings } from "../gen/app__settings.effect.vibe";
import { Machine as Link } from "../gen/app__calendar__link.effect.vibe";
import calendar from "../src/calendar/index.tsx";
import { mapsHandoffKey } from "../src/calendar/calendar.vibe";
import { agentFields } from "../src/calendar/editor.vibe";
import { complete, createRequestsStore, decodeRequest } from "../src/calendar/requests.ts";
import { createShownStore } from "../src/calendar/shown.ts";
import { Requests } from "../src/calendar/stores.vibe";
import { civilDay, dateOf, dayStart, localWallTime, shiftDays, utcDate, wallDateTime } from "../src/calendar/time.ts";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, closeAll, drawn, fill, hardware, later, only, open, press, underAct, until } from "./alpha.tsx";
import { agentEvent, agentRequest } from "./fakes/calendar.ts";
import { type Scene, scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const hour = 3_600_000;
const narrowDay = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });

/** A world at nine in the morning of a Tuesday, whose agent keeps a stand-up, a lunch it was invited to and a dentist's appointment, and whose phone keeps the gym. */
function morning(phone: boolean): Scene & { at: (day: number, hours: number) => number; today: number } {
  const world = { ...scene(), phone };
  world.now = new Date(2026, 10, 24, 9).getTime();
  const today = civilDay(world.now);
  const at = (day: number, hours: number) => dayStart(today + day) + hours * hour;
  world.calendar.events.push(
    agentEvent("Standup", at(0, 10), at(0, 10.5), { conferenceLink: "https://meet.alpha.test/standup" }),
    agentEvent("Team lunch", at(0, 12), at(0, 13), {
      location: "Cafe", htmlLink: "https://calendar.google.com/event?eid=1", provider: "google", organizer: { email: "sam@alpha.test" },
      attendees: [
        { email: "sam@alpha.test", displayName: "Sam", responseStatus: "accepted", self: false, organizer: true, optional: false },
        { email: "owner@alpha.test", displayName: "You", responseStatus: "needsAction", self: true, organizer: false, optional: false },
      ],
    }),
    agentEvent("Dentist", at(2, 15), at(2, 16)),
  );
  world.calendar.phoneEvents.push({ id: "p1", calendarId: "local", title: "Gym", begin: at(0, 18), end: at(0, 19), allDay: false, recurring: false });
  return Object.assign(world, { at, today });
}

/** The timeline and list rows, separate from the invitation banner above them. */
const events = () => [...document.querySelectorAll("[data-alpha-subview=calendar-list] [role=region] button")];

/** The titles of the events the days show, in order: each event's button is named by its title and time. */
const titles = () => events().map((found) => (found.getAttribute("aria-label") ?? "").split(", "))
  .map((names) => ["Standup", "Team lunch", "Dentist", "Gym", "Coffee"].find((title) => names.includes(title)) ?? "").filter((title) => title !== "");

/** Tap the row or block with `text` as the event title. */
async function tap(text: string) {
  const found = events().find((candidate) => (candidate.getAttribute("aria-label") ?? "").split(", ").includes(text));
  if (!found) throw new Error(`no row ${text}`);
  await press(found.getAttribute("aria-label") ?? "");
}

const chooseDate = () => press(`Choose date: ${document.querySelector("[data-host-chrome] h1")?.textContent ?? ""}`);

/** Open the month dialog under the title and choose `pill` there: a layout, or the Calendars sheet. */
async function fromMonth(pill: string) {
  await chooseDate();
  await press(pill);
}

/** Bring Calendar forward, as Home, a notice or Ask Alpha does through the shell. */
const openCalendar = (alpha: Alpha) => alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Calendar" })));

const dayButton = (day: number) => `${narrowDay.format(dateOf(day))} ${dateOf(day).getDate()}`;

describe("Calendar without a connected account", () => {
  it("Shows Calendar settings on the empty standalone timeline (spec/app/calendar/presentation.md, \"Story: Know what to do when Calendar cannot read\")", async () => {
    const world = { ...morning(false), signedIn: false };
    const { alpha } = await open(world, only("view:Calendar", "view:Settings"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (state) => state.owner === 0 && !state.connected);
    const timeline = document.querySelector('[aria-label="Calendar timeline"]');
    expect(timeline?.textContent).toContain("Not connected");
    expect(button("Open Calendar settings")).toBeDefined();
    await press("Open Calendar settings");
    await until(alpha, alpha.runtime, Settings, (state) => state.page === "CalendarApp");
    expect((await alpha.runtime.runPromise(Shell.use((shell) => shell.get()))).trail).toEqual(["Calendar", "Settings"]);
  });

  it("Shows the granted local calendar while the account is signed out (spec/app/calendar/index.md, \"Story: Let Calendar read my phone's calendar\")", async () => {
    const world = { ...morning(true), signedIn: false };
    world.calendar.granted = true;
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (state) => state.owner === 0 && !state.connected && state.phoneRows === 1);
    expect(titles()).toEqual(["Gym"]);
    expect(document.querySelector('[aria-label="Calendar timeline"]')?.textContent).not.toContain("Not connected");
    expect(button("Open Calendar settings")).toBeUndefined();
  });
});

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

    // spec/app/calendar/index.md, "A day is empty only when every source it may read answered with nothing, no calendar is hidden, and there are no reminders": a browser, which may not read the phone, still calls tomorrow empty.
    await press(dayButton(world.today + 1));
    await until(alpha, runtime, View, (s) => s.anchor === world.today + 1 && s.google.status === "Loaded" && (!phone || s.phone.status === "Loaded"));
    expect([titles(), Boolean(document.body.textContent?.includes("Free all day"))]).toEqual([[], true]);
    await press("Today");
    await until(alpha, runtime, View, (s) => s.anchor === world.today && s.google.status === "Loaded");

    // spec/app/calendar/index.md, "Choosing a layout closes the menu, and the agenda goes back to today"; spec/app/calendar/presentation.md, "A read for a day covers the month before it through the month after next": the agenda lists what is coming, not only today.
    await chooseDate();
    await until(alpha, runtime, View, (s) => s.overlay === "MonthDialog");
    await press("Schedule");
    await until(alpha, runtime, View, (s) => s.layout === "Agenda" && s.overlay === "NoOverlay");
    expect(titles()).toEqual(phone ? ["Standup", "Team lunch", "Gym", "Dentist"] : ["Standup", "Team lunch", "Dentist"]);

    // spec/app/calendar/index.md, "An event opens from the rows shown, with what it offers"; spec/app/calendar/index.md, "Back closes the event"; spec/app/calendar/index.md, "The video call is joined, and the event opened in Android Calendar, only from the event shown"; spec/app/calendar/presentation.md, "The people list says Organizer or Alpha's word for each reply, never the provider's value"
    await tap("Team lunch");
    await until(alpha, runtime, View, (s) => s.open !== 0 && s.place && !s.video && s.web && !s.local);
    expect([Boolean(button("Open Cafe in Maps")), Boolean(button("Join video call")), Boolean(button("Open in Google Calendar")), Boolean(button("Open in Android Calendar"))]).toEqual([true, false, true, false]);
    expect([Boolean(document.body.textContent?.includes("Organizer")), Boolean(document.querySelector("[aria-label='You']"))]).toEqual([true, false]);
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
    await openCalendar(alpha);
    await until(alpha, runtime, View, (s) => s.googleRows === 2 && s.phoneRows === 1);

    // spec/app/calendar/index.md, "The event's place opens in Maps, and coming back reads the event again"; spec/app/calendar/index.md, "An event comes back only if the read finds it; otherwise it closes"
    await tap("Team lunch");
    await press("Open Cafe in Maps");
    await until(alpha, runtime, View, (s) => s.detail === "InMaps");
    expect((await alpha.runtime.runPromise(Shell.use((shell) => shell.get()))).trail).toEqual(["Calendar", "Maps"]);
    expect(localStorage.getItem(mapsHandoffKey)).toContain("Cafe");
    await hardware("back");
    await until(alpha, runtime, View, (s) => s.detail === "Showing" && s.open !== 0 && s.event.status === "Loaded");

    // spec/app/calendar/index.md, "An event comes back only if the read finds it; otherwise it closes": the lunch was cancelled while the owner was in Maps.
    await press("Open Cafe in Maps");
    await until(alpha, runtime, View, (s) => s.detail === "InMaps");
    world.calendar.events = world.calendar.events.filter((event) => event.title !== "Team lunch");
    await hardware("back");
    await until(alpha, runtime, View, (s) => s.open === 0 && s.event.status === "Failed");
  });

  it("Write an event (spec/app/calendar/editor.md, \"Story: Write an event\"; spec/app/calendar/editor.md, \"Story: Never create an event twice\"; spec/app/calendar/editor.md, \"Story: Delete an event, or answer an invitation\")", async () => {
    const world = morning(true);
    world.calendar.granted = true;
    const { alpha } = await open(world, only("view:Calendar", "notice"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (s) => s.phoneRows === 1);

    // spec/app/calendar/editor.md, "Saving sends the form once, as a new numbered write built on the revision its edits began from"; spec/app/calendar/writing.md, "Save is off while loading, while saving, for another account, for an event that changed, and without a title, in that order"
    await press("New event");
    await until(alpha, runtime, Editor, (e) => e.shown && e.form === "NewEvent" && e.receipts.status === "Loaded");
    await fill("Location", "Corner");
    await until(alpha, runtime, Editor, (e) => e.draft.edits === 1);
    expect(button("Save event")?.getAttribute("aria-disabled")).toBe("true");
    await fill("Title", "Coffee");
    await until(alpha, runtime, Editor, (e) => e.draft.edits === 2 && e.kept && e.titled);
    await press("This phone's calendar");
    await press("Save event");
    await until(alpha, runtime, Editor, (e) => e.form === "NoForm" && e.write.outcome === "Confirmed");
    await until(alpha, runtime, View, (s) => s.phoneRows === 2);
    expect([world.calendar.phoneEvents.map((event) => event.title), titles()]).toEqual([["Gym", "Coffee"], ["Coffee", "Standup", "Team lunch", "Gym"]]);

    // spec/app/calendar/editor.md, "While a create is in doubt its form waits; checking the phone's receipts finds it or not": the phone made the event and could not say so.
    world.calendar.lost = true;
    await press("New event");
    await fill("Title", "Walk");
    await press("This phone's calendar");
    await press("Save event");
    await until(alpha, runtime, Editor, (e) => e.unknownCreate && e.draft.sync === "Saving" && e.write.outcome === "Unknown");
    expect(button("Save event")?.getAttribute("aria-disabled")).toBe("true");
    await press("Check if events were saved");
    await until(alpha, runtime, Editor, (e) => !e.unknownCreate && e.form === "NoForm");
    expect(world.calendar.phoneEvents.filter((event) => event.title === "Walk").length).toBe(1);

    // spec/app/calendar/editor.md, "A delete names which occurrences, and only a repeating event offers more than this one"
    world.calendar.lost = false;
    await tap("Gym");
    await until(alpha, runtime, View, (s) => s.open !== 0);
    await press("Event actions");
    expect(Boolean(button("Delete the series"))).toBe(false);
    // spec/app/calendar/deletions.md, "Confirming a deletion holds it; a deletion still waiting is sent first, so the only Undo shown is the newest"; spec/app/calendar/deletions.md, "Undo inside the window sends nothing, and shows the event again"
    await press("Delete");
    await until(alpha, runtime, Held, (d) => d.waiting !== 0 && d.notice);
    expect(titles()).not.toContain("Gym");
    await press("Undo");
    await until(alpha, runtime, Held, (d) => d.waiting === 0 && d.undo.holding === "Undone");
    expect([titles().includes("Gym"), world.calendar.phoneEvents.map((event) => event.title).includes("Gym")]).toEqual([true, true]);

    // spec/app/calendar/deletions.md, "The window ends only once its Undo notice is no longer shown"; spec/app/calendar/deletions.md, "A refused send shows the event again; a sent deletion hides it until a read no longer has it unchanged"
    await tap("Gym");
    await until(alpha, runtime, View, (s) => s.open !== 0);
    vi.useFakeTimers({ toFake: ["performance"] });
    await press("Event actions");
    await press("Delete");
    await later(alpha, 6_000);
    await later(alpha, 10_000);
    await until(alpha, runtime, Editor, (e) => e.kind === "Remove" && e.write.outcome === "Sent");
    await drawn(() => {});
    vi.advanceTimersByTime(20_000);
    await later(alpha, 10_000);
    vi.useRealTimers();
    await until(alpha, runtime, Editor, (e) => e.kind === "Remove" && e.write.outcome === "Confirmed");
    await until(alpha, runtime, Held, (d) => d.sending === 0 && d.undo.holding === "Released");
    expect(world.calendar.phoneEvents.map((event) => event.title)).not.toContain("Gym");
  });

  it("Link a Google calendar I can write to, and be told it is synced only when it is (spec/app/calendar/link.md, \"Story: Link a Google calendar I can write to, and be told it is synced only when it is\"; spec/app/calendar/link.md, \"Story: Disconnect Google from Calendar without leaving sync running\")", async () => {
    const world = morning(true);
    world.calendar.granted = true;
    world.inbox.google = { email: "owner@alpha.test", connection: "google-owner", capabilities: ["google.basic_identity", "google.calendar.read"] };
    world.mailLease.held = false;
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, Link, (l) => l.owner > 0);
    await fromMonth("Calendars");
    await until(alpha, runtime, View, (s) => s.overlay === "CalendarsSheet");

    // spec/app/platform/index.md, "A cloud request the phone holds back for want of a sign-in reads as the cloud's own 401": a phone signed in before mail leases existed cannot check Google yet.
    await until(alpha, runtime, Link, (l) => l.checked === "CheckFailed");
    expect([document.body.textContent?.includes("Couldn't check"), Boolean(button("Link Google Calendar"))]).toEqual([true, false]);

    // spec/app/platform/index.md, "The owner's tap on a mail sign-in control starts the phone's one more sign-in for mail where the phone wants it, then reads again once": once the phone holds the lease, signed in from Inbox, Calendar's next read checks Google again by itself.
    world.mailLease.held = true;
    await runtime.runPromise(View.use((view) => view.send({ type: "refresh" })));
    await until(alpha, runtime, Link, (l) => l.checked === "CheckedOk");

    // spec/app/calendar/link.md, "Setup starts only from a write grant, for the owner signed in; a read-only grant goes on to consent for more access, and a missing one sends nothing"
    await press("Link Google Calendar");
    await until(alpha, runtime, Link, (l) => l.ending === "NeedsGrant" && l.said === "ReadOnlyAccess");
    expect(world.calendar.writes).toEqual([]);

    // spec/app/calendar/link.md, "A write is sent only while the owner and the reviewed revision still hold, and its answer starts another review"; spec/app/calendar/link.md, "Synced needs a clean read back of the linked events; held or many conflicts are named"
    world.inbox.google = { email: "owner@alpha.test", connection: "google-owner", capabilities: ["google.basic_identity", "google.calendar.read", "google.calendar.write"] };
    await openCalendar(alpha);
    if ((await runtime.runPromise(View.use((view) => view.get()))).overlay !== "CalendarsSheet") await fromMonth("Calendars");
    await press("Check again");
    await until(alpha, runtime, Link, (l) => l.phase === "Done" && l.ending === "Synced" && l.writes === 1 && l.linkReads === 1);
    expect(world.calendar.writes).toEqual(["sync select"]);
    expect(world.calendar.control.destination).toEqual({ connectorAccountId: "google-owner", providerCalendarId: "primary" });

    // spec/app/calendar/link.md, "A linked, unpaused destination is paused first at the revision just reviewed; the revoke never waits on it"; spec/app/calendar/link.md, "A pause is confirmed only when the control answered paused at a revision past the one reviewed"
    await press("Pause sync");
    await until(alpha, runtime, Link, (l) => l.pause === "PauseConfirmed");
    expect(world.calendar.control.paused).toBe(true);

    // spec/app/calendar/link.md, "Synced needs a clean read back of the linked events; held or many conflicts are named"
    world.calendar.control.links.push("conflicted", "conflicted");
    await press("Check again");
    await until(alpha, runtime, Link, (l) => l.phase === "Done" && l.said === "ConflictMany");
  });

  it("Approve what the agent changes (spec/app/calendar/agent.md, \"Story: Approve what the agent changes\"; spec/app/calendar/agent.md, \"Story: Know what the agent's change did\"; spec/app/calendar/agent.md, \"Story: Read where a Calendar request stands\")", async () => {
    const world = morning(true);
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (s) => s.googleRows === 2);
    const reread = () => runtime.runPromise(Effect.flatMap(View, (machine) => machine.send({ type: "refresh" })));
    const lunch = { source: { calendarId: "eliza-calendar/primary" }, eventId: "ev-team-lunch", expectedVersion: "1" };

    // spec/app/calendar/agent.md, "A card that leaves out a field its change would set can be declined, never approved"; spec/app/calendar/agent.md, "The owner declines, or the agent withdraws, and nothing is sent"
    world.calendar.approvals.push(agentRequest("approval-1", { action: "respond_invitation", account: "owner", target: lunch, scope: "instance", response: "tentative", colour: "red" }));
    await reread();
    await until(alpha, runtime, Changes, (a) => a.stage === "Awaiting");
    expect([Boolean(button("Approve")), Boolean(button("Decline")), document.body.textContent?.includes("Approval unavailable")]).toEqual([false, true, true]);
    await press("Decline");
    await until(alpha, runtime, Changes, (a) => a.result === "Declined");
    expect(world.calendar.writes).toEqual(["reject approval-1"]);

    // spec/app/calendar/agent.md, "The agent proposes one change at a time, for the revision of the event it selected, and the card shows it"; spec/app/calendar/agent.md, "What is sent is exactly the change approved, for the revision the agent selected"; spec/app/calendar/agent.md, "The read back says whether the change is there, and the agent is told"
    const start = new Date(world.at(1, 15)).toISOString();
    const end = new Date(world.at(1, 16)).toISOString();
    world.calendar.approvals.push(agentRequest("approval-2", {
      action: "schedule_event", account: "owner", source: { calendarId: "eliza-calendar/primary" }, recurrence: null,
      fields: { title: "Coffee with Ana", description: "", location: "Corner cafe", startAt: start, endAt: end, isAllDay: false, timeZone: "Europe/Lisbon" },
    }));
    await reread();
    await until(alpha, runtime, Changes, (a) => a.stage === "Awaiting" && a.change === "Create" && a.complete);
    expect(["Coffee with Ana", "Corner cafe", "Europe/Lisbon", "Waiting for you"].map((text) => document.body.textContent?.includes(text))).toEqual([true, true, true, true]);
    await press("Approve");
    await until(alpha, runtime, Changes, (a) => a.result === "Done");
    expect(world.calendar.writes).toEqual(["reject approval-1", "approve approval-2", "create ev-coffee-with-ana"]);
    expect(world.calendar.events.find((event) => event.title === "Coffee with Ana")?.startAt).toBe(start);

    // spec/app/calendar/agent.md, "When the event changes in Google, the card waiting for the owner no longer counts"; spec/app/calendar/agent.md, "A card voided by a change in Google is shown again at the event's new revision, marked updated"
    world.calendar.approvals.push(agentRequest("approval-3", { action: "respond_invitation", account: "owner", target: lunch, scope: "instance", response: "tentative" }));
    await reread();
    await until(alpha, runtime, Changes, (a) => a.stage === "Awaiting" && a.change === "Respond" && a.complete);
    const approval = world.calendar.approvals.find((one) => one.id === "approval-3");
    if (!approval) throw new Error("no request");
    approval.revision = "r2";
    await reread();
    await until(alpha, runtime, Changes, (a) => a.updated && a.complete);
    await press("Approve");
    await until(alpha, runtime, Changes, (a) => a.result === "Done");
    expect(world.calendar.writes.slice(3)).toEqual(["approve approval-3", "answer ev-team-lunch tentative"]);
  });
});

describe("in a browser", () => {
  it("Search my events and choose which calendars I see (spec/app/calendar/index.md, \"Story: Search my events and choose which calendars I see\")", async () => {
    const world = morning(false);
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (s) => s.googleRows === 2);

    // spec/app/calendar/index.md, "Search and the Calendars sheet open over the days, never over an open event"
    await press("Search events");
    await until(alpha, runtime, View, (s) => s.overlay === "Search");
    await fill("Search events", "dent");
    await tap("Dentist");
    await until(alpha, runtime, View, (s) => s.anchor === world.today + 2 && s.overlay === "NoOverlay" && s.google.status === "Loaded");
    expect(titles()).toEqual(["Dentist"]);

    // spec/app/calendar/index.md, "A switch of the Calendars sheet hides or shows one calendar"; spec/app/calendar/presentation.md, "A hidden calendar's rows show neither in Calendar nor on Home"
    await fromMonth("Calendars");
    await until(alpha, runtime, View, (s) => s.overlay === "CalendarsSheet");
    const agent = [...document.querySelectorAll("[role=switch]")][0] as HTMLElement | undefined;
    if (!agent) throw new Error("no switch");
    agent.click();
    await until(alpha, runtime, View, (s) => s.hidden.includes(0));
    await hardware("back");
    await until(alpha, runtime, View, (s) => s.overlay === "NoOverlay");
    expect([titles(), Boolean(document.body.textContent?.includes("Free all day"))]).toEqual([[], false]);
  });

  it("Answer an invitation (spec/app/calendar/editor.md, \"Story: Delete an event, or answer an invitation\")", async () => {
    const world = morning(false);
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (s) => s.googleRows === 2);

    // spec/app/calendar/editor.md, "An invitation is answered Going or Maybe once, at the revision shown, and Decline is the deletion's decline"; spec/app/calendar/editor.md, "A confirmed answer holds its event until a read shows it"; spec/app/calendar/writing.md, "An applied create, change or answer is read back; only a read back that finds it as asked says saved"
    await tap("Team lunch");
    await until(alpha, runtime, View, (s) => s.open !== 0);
    expect([Boolean(button("Going")), Boolean(button("Maybe")), Boolean(button("No"))]).toEqual([true, true, true]);
    await press("Going");
    await until(alpha, runtime, Editor, (e) => e.kind === "Reply" && e.write.outcome === "Confirmed" && e.latched.length === 0);
    expect(world.calendar.writes).toEqual(["answer ev-team-lunch accepted"]);
  });
});

describe("Calendar Wave 1 regressions", () => {
  it("Serializes description on agent payloads and exclusive next-day endAt for all-day events (spec/app/calendar/writing.md, \"An agent update to an all-day event names whole UTC dates\")", () => {
    const baseDay = civilDay(new Date(2026, 10, 24, 10, 0).getTime());
    const begin = wallDateTime(baseDay, 10, 0);
    const end = wallDateTime(baseDay, 11, 0);
    const timed = agentFields({ title: "Sync", place: "Room A", notes: "Bring notes", begin, end, allDay: false, people: "" });
    expect(timed.description).toBe("Bring notes");
    expect("notes" in timed).toBe(false);
    const sameDayAllDay = agentFields({ title: "Holiday", place: "", notes: "Out of office", begin, end, allDay: true, people: "" });
    expect(sameDayAllDay.startAt).toBe(utcDate(baseDay));
    expect(sameDayAllDay.endAt).toBe(utcDate(baseDay + 1));
    expect(Date.parse(sameDayAllDay.endAt)).toBeGreaterThan(Date.parse(sameDayAllDay.startAt));
    expect(sameDayAllDay.description).toBe("Out of office");
  });

  it("Preserves local wall-clock time across civil day shifts and classifies valid wall times (spec/app/calendar/writing.md, \"A missing or repeated wall time is refused, and nothing is saved\")", () => {
    const startDay = civilDay(new Date(2026, 2, 7, 10, 30).getTime());
    const original = wallDateTime(startDay, 10, 30);
    const shifted = shiftDays(original, 2);
    expect(shifted.kind).toBe("WallExists");
    const moved = new Date(shifted.ms);
    expect([moved.getHours(), moved.getMinutes(), civilDay(shifted.ms)]).toEqual([10, 30, startDay + 2]);
    expect(localWallTime(startDay, 14, 15).kind).toBe("WallExists");
  });

  it("Scopes ShownStore per instance, clears metadata on drop, and merges single-event reads without clearing partial (spec/app/calendar/index.md, \"A changed owner clears the agent's rows, closes the open event and the Calendars sheet, and takes that owner's hidden calendars\")", () => {
    const store = createShownStore();
    const day = civilDay(new Date(2026, 10, 24, 9, 0).getTime());
    const sample = {
      key: "ev-1", calendarId: "eliza-calendar/primary", title: "Private", place: "", notes: "",
      begin: wallDateTime(day, 10, 0), end: wallDateTime(day, 11, 0), allDay: false, recurring: false,
      link: "", video: "", people: [], answer: "NotInvited" as const, answerable: false, managed: false,
      series: "", editable: true, cancel: "OrganizerCancel" as const, version: "1",
    };
    const other = { ...sample, key: "ev-2", title: "Keep me", begin: wallDateTime(day, 12, 0), end: wallDateTime(day, 13, 0) };
    const keptRows = store.keep("Google", day, [sample, other], true);
    expect(store.partial("Google")).toBe(true);
    const id = keptRows[0]?.id ?? 0;
    store.mergeOne("Google", { ...sample, title: "Updated" });
    expect(store.partial("Google")).toBe(true);
    expect(store.all("Google").map((row) => row.title)).toEqual(["Updated", "Keep me"]);
    store.drop("Google");
    expect([store.all("Google").length, store.lastSeen(id), store.partial("Google"), store.revisions().length]).toEqual([0, undefined, false, 0]);
  });

  it("Verifies target startMatches and decodes persisted requests via Schema (spec/app/calendar/agent.md, \"A card is complete only with known fields, a valid time and, for a change, a verified target\")", () => {
    const store = createRequestsStore();
    const day = civilDay(new Date(2026, 10, 24, 9, 0).getTime());
    const begin = wallDateTime(day, 12, 0);
    const end = wallDateTime(day, 13, 0);
    const row = createShownStore().keep("Google", day, [{
      key: "ev-lunch", calendarId: "eliza-calendar/primary", title: "Lunch", place: "", notes: "",
      begin, end, allDay: false, recurring: false, link: "", video: "", people: [], answer: "AnswerAwaited",
      answerable: true, managed: false, series: "", editable: true, cancel: "DeclineInvitation", version: "v1",
    }])[0];
    if (!row) throw new Error("missing row");
    const matching = store.fromWire(agentRequest("req-1", {
      action: "respond_invitation", account: "owner", scope: "instance", response: "accepted",
      target: { source: { calendarId: "eliza-calendar/primary" }, eventId: "ev-lunch", startAt: new Date(begin).toISOString(), expectedVersion: "v1" },
    }), 0);
    const movedStart = store.fromWire(agentRequest("req-2", {
      action: "respond_invitation", account: "owner", scope: "instance", response: "accepted",
      target: { source: { calendarId: "eliza-calendar/primary" }, eventId: "ev-lunch", startAt: new Date(begin + hour).toISOString(), expectedVersion: "v1" },
    }), 1);
    if (!matching || !movedStart) throw new Error("missing requests");
    expect(complete(matching, [row])).toBe(true);
    expect(complete(movedStart, [row])).toBe(false);
    expect(decodeRequest(JSON.stringify(matching))?.id).toBe("req-1");
    expect(decodeRequest("not-json")).toBeUndefined();
    expect(decodeRequest(JSON.stringify({ filing: "bad" }))).toBeUndefined();
  });

  it("Keeps Ends on visible for all-day events, keeps new Phone repeats on direct save, and enforces inertness and deleted filtering (spec/app/calendar/writing.md, \"Guests, alerts and video rooms go to Android Calendar; zones, all-day and repeats use the direct save for a new event\")", async () => {
    const world = morning(true);
    world.calendar.granted = true;
    const { alpha } = await open(world, only("view:Calendar", "notice"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (s) => s.phoneRows === 1 && s.googleRows === 2);

    // spec/app/calendar/index.md, "The layout menu and the month dialog open over the days, never over an open event"
    await chooseDate();
    await until(alpha, runtime, View, (s) => s.overlay === "MonthDialog");
    expect(document.querySelector("[data-alpha-subview=calendar-list]")?.hasAttribute("inert")).toBe(true);
    await hardware("back");
    await until(alpha, runtime, View, (s) => s.overlay === "NoOverlay");

    // spec/app/calendar/writing.md, "Guests, alerts and video rooms go to Android Calendar; zones, all-day and repeats use the direct save for a new event"
    await press("New event");
    await until(alpha, runtime, Editor, (e) => e.shown && e.receipts.status === "Loaded");
    await fill("Title", "Weekly run");
    await press("This phone's calendar");
    await press("Weekly");
    await until(alpha, runtime, Editor, (e) => e.repeats && !e.extras);
    expect(button("Open in Android Calendar")).toBeUndefined();
    await press("Your agent's calendar");
    await until(alpha, runtime, Editor, (e) => !e.repeats && !e.extras);
    await press("All day");
    expect(document.querySelector('input[aria-label="End date"]')).not.toBeNull();
    await hardware("back");
    await until(alpha, runtime, Editor, (e) => !e.shown);
    await press("Discard event draft");
    await press("Discard it");
    await until(alpha, runtime, Editor, (e) => e.form === "NoForm");

    // spec/app/calendar/deletions.md, "Confirming a deletion holds it; a deletion still waiting is sent first, so the only Undo shown is the newest"
    await tap("Gym");
    await until(alpha, runtime, View, (s) => s.open !== 0);
    await press("Event actions");
    await press("Edit event");
    await until(alpha, runtime, Editor, (e) => e.shown && e.form === "EditEvent");
    expect(document.querySelector("[data-alpha-subview=calendar-detail]")?.hasAttribute("inert")).toBe(true);
    await hardware("back");
    await until(alpha, runtime, Editor, (e) => !e.shown);
    await press("Event actions");
    await press("Delete");
    await until(alpha, runtime, Held, (d) => d.waiting !== 0 && d.notice);
    await until(alpha, runtime, View, (s) => s.open === 0);
    await press("Search events");
    await until(alpha, runtime, View, (s) => s.overlay === "Search");
    await fill("Search events", "Gym");
    expect(titles()).not.toContain("Gym");
    await press("Undo");
    await until(alpha, runtime, Held, (d) => d.waiting === 0);
  });

  it("Preserves Google connected state on transient 503, marks Link unready on browser failure, and expires agent proposals (spec/app/calendar/link.md, \"Cloud overload is unavailable and retryable, never a changed account\"; spec/app/calendar/agent.md, \"The status follows the request's state and whether its owner was verified\")", async () => {
    const world = morning(false);
    const { alpha } = await open(world, only("view:Calendar", "notice"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (s) => s.connected && s.google.status === "Loaded" && s.googleRows === 2);

    // spec/app/calendar/agent.md, "The status follows the request's state and whether its owner was verified"
    const start = new Date(world.at(1, 15)).toISOString();
    const end = new Date(world.at(1, 16)).toISOString();
    const expiring = agentRequest("approval-exp", {
      action: "schedule_event", account: "owner", source: { calendarId: "eliza-calendar/primary" }, recurrence: null,
      fields: { title: "Quick chat", description: "", location: "", startAt: start, endAt: end, isAllDay: false, timeZone: "UTC" },
    });
    expiring.expiresAt = new Date(world.now + 5_000).toISOString();
    world.calendar.approvals.push(expiring);
    await runtime.runPromise(View.use((machine) => machine.send({ type: "refresh" })));
    await until(alpha, runtime, Changes, (a) => a.stage === "Awaiting" && a.complete);
    expect(Boolean(button("Approve"))).toBe(true);
    await later(alpha, 6_000);
    await drawn(() => {});
    expect(document.body.textContent?.includes("Expired")).toBe(true);
    expect(Boolean(button("Approve"))).toBe(false);
    await press("Decline");
    await until(alpha, runtime, Changes, (a) => a.stage === "Idle" && a.result === "Declined");
    const reqStore = await runtime.runPromise(Effect.flatMap(Requests, (store) => Effect.succeed(store)));
    expect(reqStore.lastResult(1)).toBe("Declined");

    // spec/app/calendar/link.md, "Cloud overload is unavailable and retryable, never a changed account"
    world.calendar.down = true;
    await runtime.runPromise(View.use((machine) => machine.send({ type: "refresh" })));
    await until(alpha, runtime, View, (s) => s.google.status === "Failed");
    expect((await runtime.runPromise(View.use((machine) => machine.get()))).connected).toBe(true);
    await until(alpha, runtime, Link, (l) => !l.ready);
  });

  it("Unhides declined invitations via readShows once the calendar read shows the decline (spec/app/calendar/deletions.md, \"A refused send shows the event again and says it was not deleted; a sent deletion hides it until a read no longer has it unchanged\")", async () => {
    const world = morning(false);
    const { alpha } = await open(world, only("view:Calendar", "notice"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (s) => s.googleRows === 2);
    await tap("Team lunch");
    await until(alpha, runtime, View, (s) => s.open !== 0);
    await press("No");
    await until(alpha, runtime, Held, (d) => d.waiting !== 0 && d.notice);
    await later(alpha, 10_000);
    await later(alpha, 1_000);
    await until(alpha, runtime, Held, (d) => d.waiting === 0 && d.sending === 0 && d.hiding === 0);
    expect(titles()).toContain("Team lunch");
  });
});
