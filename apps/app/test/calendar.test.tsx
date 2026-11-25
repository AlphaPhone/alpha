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
import { Machine as Reminders } from "../gen/app__reminders.effect.vibe";
import { Machine as Alerts } from "../gen/app__reminders__alerts.effect.vibe";
import calendar from "../src/calendar/index.tsx";
import { civilDay, dateOf, dayStart } from "../src/calendar/time.ts";
import { createReminderItem, resetReminderStores } from "../src/reminders/reminders.vibe";
import { DEFAULT_LIST_ID, remindersStore } from "../src/reminders/store.ts";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, closeAll, drawn, fill, hardware, later, only, open, press, seen, underAct, until } from "./alpha.tsx";
import { agentEvent, agentRequest } from "./fakes/calendar.ts";
import { type Scene, scene } from "./fakes/scene.ts";

underAct();
afterEach(async () => {
  await closeAll();
  resetReminderStores();
});

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

async function onCalendar(world: ReturnType<typeof morning>) {
  const { alpha } = await open(world, only("view:Calendar"));
  const runtime = calendar.runtime(alpha);
  await openCalendar(alpha);
  return { alpha, runtime, world };
}

async function onBrowserCalendar() {
  const running = await onCalendar(morning(false));
  await until(running.alpha, running.runtime, View, (s) => s.googleRows === 2);
  return running;
}

const calendarSettings = () => document.querySelector('[data-settings-page="Calendar"]');

const dayButton = (day: number) => `${narrowDay.format(dateOf(day))} ${dateOf(day).getDate()}`;

describe("Calendar without a connected account", () => {
  it("Shows Calendar settings on the empty standalone timeline (spec/app/calendar/presentation.md, \"Story: Know what to do when Calendar cannot read\")", async () => {
    const world = { ...morning(false), signedIn: false };
    world.inbox.google = undefined;
    const { alpha } = await open(world, only("view:Calendar", "view:Settings"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (state) => state.owner === 0 && !state.connected);
    const timeline = document.querySelector('[aria-label="Calendar timeline"]');
    expect(timeline?.textContent).toContain("Not connected");
    expect(button("Open Calendar settings")).toBeDefined();
    await chooseDate();
    await until(alpha, runtime, View, (state) => state.overlay === "MonthDialog");
    expect(document.querySelector<HTMLSelectElement>('select[aria-label="Calendar year"]')?.options).toHaveLength(101);
    expect(button("Day")).toBeDefined();
    expect(button("Schedule")).toBeDefined();
    expect(button("Calendars")).toBeUndefined();
    await hardware("back");
    await until(alpha, runtime, View, (state) => state.overlay === "NoOverlay");
    await press("Open Calendar settings");
    await until(alpha, alpha.runtime, Settings, (state) => state.page === "CalendarApp");
    expect((await alpha.runtime.runPromise(Shell.use((shell) => shell.get()))).trail).toEqual(["Calendar", "Settings"]);
    await vi.waitFor(() => expect(calendarSettings()?.textContent).toContain("Google CalendarNot connected"));
    expect(calendarSettings()?.textContent).not.toContain("Permissions");
  });

  it("Shows the granted local calendar while the account is signed out (spec/app/calendar/index.md, \"Story: Let Calendar read my phone's calendar\")", async () => {
    const world = { ...morning(true), signedIn: false };
    world.calendar.granted = true;
    const { alpha, runtime } = await onCalendar(world);
    await until(alpha, runtime, View, (state) => state.owner === 0 && !state.connected && state.phoneRows === 1);
    expect(titles()).toEqual(["Gym"]);
    expect(document.querySelector('[aria-label="Calendar timeline"]')?.textContent).not.toContain("Not connected");
    expect(button("Open Calendar settings")).toBeUndefined();
  });

  it("Shows the upcoming window and disconnection in standalone Schedule (spec/app/calendar/presentation.md, \"Schedule shows upcoming events and reminders through the end of next month\")", async () => {
    const world = { ...morning(false), signedIn: false };
    world.inbox.google = undefined;
    const { alpha, runtime } = await onCalendar(world);
    await until(alpha, runtime, View, (state) => state.front && state.owner === 0 && !state.connected);
    await fromMonth("Schedule");
    await until(alpha, runtime, View, (state) => state.layout === "Agenda" && state.overlay === "NoOverlay");
    const schedule = document.querySelector('[aria-label="Schedule"][role="region"]');
    expect(schedule?.textContent).toContain("Through Dec 31, 2026");
    expect(schedule?.textContent).toContain("Not connected");
    expect(schedule?.textContent).not.toContain("No upcoming events");
  });

  it("Shows and completes the exact dated reminder in Calendar (spec/app/calendar/index.md, \"Story: See reminders among my events\")", async () => {
    const world = { ...morning(false), signedIn: false };
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (state) => state.front && state.anchor === world.today);
    await until(alpha, alpha.runtime, Reminders, (state) => state.sync.status === "Loaded");

    const inputs = { listId: DEFAULT_LIST_ID, title: "Bring the blue notebook", dueMinute: 570, alertMinutes: null };
    const first = await alpha.runtime.runPromise(createReminderItem({ ...inputs, notes: "The first draft is inside.", dueDate: "2026-11-24" }));
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    const tomorrow = await alpha.runtime.runPromise(createReminderItem({ ...inputs, notes: "A different notebook.", dueDate: "2026-11-25" }));
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    if (!first || !tomorrow) throw new Error("Expected two saved reminders");

    await until(alpha, runtime, View, (state) => state.reminders === 1);
    await press(/^Bring the blue notebook,/);
    await until(alpha, runtime, View, (state) => state.reminder > 0);
    const detail = () => document.querySelector('[data-alpha-subview="calendar-detail"]')?.textContent;
    expect(detail()).toContain("The first draft is inside.");
    expect(detail()).not.toContain("A different notebook.");
    await press("Complete reminder occurrence");
    await vi.waitFor(() => expect(detail()).toContain("Completed · no further alarm scheduled"));
    expect(remindersStore.findItem(first.id)?.completed).toBe(true);
    expect(remindersStore.findItem(tomorrow.id)?.completed).toBe(false);

    await hardware("back");
    await until(alpha, runtime, View, (state) => state.reminder === 0);
    expect(detail()).toBeUndefined();
    expect(button(/^Bring the blue notebook,/)).toBeDefined();
  });

  it("Snoozes only the selected alerted revision and keeps its date in Calendar (spec/app/reminders/alerts.md, \"Story: Alert on due reminders and act from the banner\")", async () => {
    const world = morning(true);
    world.reminders.mirrorDatedItems = true;
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (state) => state.front && state.anchor === world.today);
    await until(alpha, alpha.runtime, Reminders, (state) => state.sync.status === "Loaded");

    const inputs = { listId: DEFAULT_LIST_ID, title: "Bring the blue notebook", dueMinute: 570, alertMinutes: 0 };
    const first = await alpha.runtime.runPromise(createReminderItem({ ...inputs, dueDate: "2026-11-24" }));
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    const tomorrow = await alpha.runtime.runPromise(createReminderItem({ ...inputs, dueDate: "2026-11-25" }));
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    if (!first || !tomorrow) throw new Error("Expected two saved reminders");
    const revision = first.revision + 1;
    expect(remindersStore.findItem(first.id)).toMatchObject({ agentTaskId: `task-${first.id}`, revision });

    await until(alpha, runtime, View, (state) => state.reminders === 1);
    await press(/^Bring the blue notebook,/);
    await until(alpha, runtime, View, (state) => state.reminder > 0);
    const detail = () => document.querySelector('[data-alpha-subview="calendar-detail"]')?.textContent;
    expect(detail()).toContain("Alert at start");
    await vi.waitFor(() => expect(world.reminders.scheduled.get(first.id)?.at).toBe(world.at(0, 9.5)));
    await press("Snooze reminder 10 minutes");
    const untilMs = world.now + 10 * 60_000;
    await vi.waitFor(() => expect(detail()).toContain("Snoozed until"));
    await vi.waitFor(() => expect(world.reminders.scheduled.get(first.id)).toMatchObject({ at: untilMs, dueAt: world.at(0, 9.5) }));
    expect(remindersStore.findItem(first.id)).toMatchObject({ dueDate: first.dueDate, dueMinute: first.dueMinute, snoozedUntilMs: untilMs });
    expect(world.reminders.items.find((item) => item.id === first.id)?.snoozedUntilMs).toBe(untilMs);
    expect(remindersStore.findItem(tomorrow.id)?.snoozedUntilMs).toBeNull();
    expect(world.reminders.items.find((item) => item.id === tomorrow.id)?.snoozedUntilMs).toBeNull();

    const selected = remindersStore.specIdForItem(first.id);
    world.reminders.items = world.reminders.items.map((item) => item.id === first.id ? { ...item, revision: item.revision + 1 } : item);
    await press("Snooze reminder 10 minutes");
    await until(alpha, alpha.runtime, Alerts, (state) => state.entries.some((entry) => entry.id === selected && entry.attempt.outcome === "Refused"));
    expect(remindersStore.findItem(first.id)).toMatchObject({ revision: revision + 1, snoozedUntilMs: untilMs });
  });

  it("Saves the Calendar Reminders form once without adding a calendar event (spec/app/calendar/editor.md, \"Story: Write an event\")", async () => {
    const world = { ...morning(false), signedIn: false };
    const eventCount = world.calendar.events.length;
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (state) => state.front && state.anchor === world.today);
    await until(alpha, alpha.runtime, Reminders, (state) => state.sync.status === "Loaded");

    await press("New event");
    await until(alpha, runtime, Editor, (state) => state.form === "NewEvent" && state.shown);
    await press("Reminders");
    await fill("Title", "Leave through the garden");
    await fill("Reminder time", "10:15");
    await press("Weekdays");
    await press("None");
    await fill("Notes", "Close the gate.");
    expect(document.querySelector('[aria-label="Location"]')).toBeNull();
    expect(remindersStore.snapshot().snapshot.items).toHaveLength(0);
    await press("Save event");
    await until(alpha, runtime, Editor, (state) => !state.shown && state.write.outcome === "Confirmed");
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    await until(alpha, runtime, View, (state) => state.reminders === 1);

    expect(world.calendar.events).toHaveLength(eventCount);
    expect(world.reminders.items).toHaveLength(1);
    expect(world.reminders.items[0]).toMatchObject({
      title: "Leave through the garden", notes: "Close the gate.", dueDate: "2026-11-24", dueMinute: 615, recurrence: "weekdays", alertMinutes: null,
    });
    await press(/^Leave through the garden,/);
    expect(document.querySelector('[data-alpha-subview="calendar-detail"]')?.textContent).toContain("Due 10:15 AM");
  });

  it("Reviews discarding a retained Calendar reminder draft (spec/app/calendar/editor.md, \"Story: Keep my draft through a restart\")", async () => {
    const world = { ...morning(false), signedIn: false };
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (state) => state.front && state.anchor === world.today);
    await press("New event");
    await until(alpha, runtime, Editor, (state) => state.form === "NewEvent" && state.shown);
    await press("Reminders");
    await fill("Title", "Keep this until I confirm");
    await press("Discard calendar draft");
    await until(alpha, runtime, Editor, (state) => state.confirming === "ConfirmDiscard");
    await hardware("back");
    await until(alpha, runtime, Editor, (state) => state.confirming === "NoConfirm" && state.shown);
    expect(document.querySelector<HTMLInputElement>('input[aria-label="Title"]')?.value).toBe("Keep this until I confirm");
    await press("Discard calendar draft");
    await until(alpha, runtime, Editor, (state) => state.confirming === "ConfirmDiscard");
    await press("Discard");
    await until(alpha, runtime, Editor, (state) => state.form === "NoForm");
    expect(remindersStore.snapshot().snapshot.items).toHaveLength(0);
    await press("New event");
    await until(alpha, runtime, Editor, (state) => state.form === "NewEvent" && state.shown);
    expect(document.querySelector<HTMLInputElement>('input[aria-label="Title"]')?.value).toBe("");
  });

  it("Edits a dated reminder in Calendar without changing another reminder with the same title (spec/app/calendar/editor.md, \"Story: Write an event\")", async () => {
    const world = morning(false);
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (state) => state.front && state.anchor === world.today);
    await until(alpha, alpha.runtime, Reminders, (state) => state.sync.status === "Loaded");
    const input = { listId: DEFAULT_LIST_ID, title: "Bring the blue notebook", dueMinute: 570, alertMinutes: null };
    const selected = await alpha.runtime.runPromise(createReminderItem({ ...input, notes: "The first draft is inside.", dueDate: "2026-11-24" }));
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    const other = await alpha.runtime.runPromise(createReminderItem({ ...input, notes: "A different notebook.", dueDate: "2026-11-25" }));
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    if (!selected || !other) throw new Error("Expected two saved reminders");

    await until(alpha, runtime, View, (state) => state.reminders === 1);
    await press(/^Bring the blue notebook,/);
    await until(alpha, runtime, View, (state) => state.reminder > 0);
    await press("Event actions");
    await press("Edit event");
    await until(alpha, runtime, Editor, (state) => state.form === "EditReminder" && state.shown);
    expect(document.querySelector<HTMLInputElement>('input[aria-label="Title"]')?.value).toBe(selected.title);
    expect(document.querySelector<HTMLInputElement>('input[aria-label="Reminder time"]')?.value).toBe("09:30");
    await fill("Notes", "Take the earlier draft.");
    await fill("Reminder time", "10:15");
    await press("Save event");
    await until(alpha, runtime, Editor, (state) => !state.shown && state.write.outcome === "Confirmed");
    expect(remindersStore.findItem(selected.id)).toMatchObject({ notes: "Take the earlier draft.", dueMinute: 615, revision: selected.revision + 1 });
    expect(world.reminders.items.find((item) => item.id === selected.id)).toMatchObject({ notes: "Take the earlier draft.", dueMinute: 615 });
    expect(remindersStore.findItem(other.id)).toMatchObject({ notes: "A different notebook.", dueMinute: 570, revision: other.revision });
  });

  it("Reviews reopening the exact completed reminder without an alert (spec/app/calendar/reminderReopen.md, \"Story: Review reopening the selected reminder without an alert\")", async () => {
    const world = morning(false);
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, runtime, View, (state) => state.front && state.anchor === world.today);
    await until(alpha, alpha.runtime, Reminders, (state) => state.sync.status === "Loaded");
    const inputs = { listId: DEFAULT_LIST_ID, title: "Bring the blue notebook", dueMinute: 570, alertMinutes: 0 };
    const selected = await alpha.runtime.runPromise(createReminderItem({ ...inputs, dueDate: "2026-11-24" }));
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    const other = await alpha.runtime.runPromise(createReminderItem({ ...inputs, dueDate: "2026-11-25" }));
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    if (!selected || !other) throw new Error("Expected two saved reminders");

    await until(alpha, runtime, View, (state) => state.reminders === 1);
    await press(/^Bring the blue notebook,/);
    await until(alpha, runtime, View, (state) => state.reminder > 0);
    await press("Complete reminder occurrence");
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    const detail = () => document.querySelector('[data-alpha-subview="calendar-detail"]')?.textContent;
    expect(detail()).toContain(`Completed ${new Date(world.now).toLocaleString()} · due ${new Date(world.at(0, 9.5)).toLocaleString()}`);
    await press("Reopen reminder");
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain("No alert"));
    await hardware("back");
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(world.reminders.items.find((item) => item.id === selected.id)?.completed).toBe(true);
    expect(button("Reopen reminder")).toBeDefined();

    await press("Reopen reminder");
    await vi.waitFor(() => expect(button("Reopen")).toBeDefined());
    try {
      await seen(false);
      await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    } finally {
      await seen(true);
    }
    expect(world.reminders.items.find((item) => item.id === selected.id)?.completed).toBe(true);

    await press("Reopen reminder");
    await vi.waitFor(() => expect(button("Reopen")).toBeDefined());
    await press("Reopen");
    await vi.waitFor(() => expect(detail()).toContain("No alert · saved on this device"));
    expect(world.reminders.items.find((item) => item.id === selected.id)).toMatchObject({ completed: false, alertMinutes: null, dueMinute: 570 });
    expect(world.reminders.items.find((item) => item.id === other.id)).toMatchObject({ completed: false, alertMinutes: 0, revision: other.revision });
  });

  it("Reviews a completed reminder's new time before rescheduling it (spec/app/calendar/editor.md, \"Moving a completed reminder keeps its edited draft on screen until the owner approves rescheduling\")", async () => {
    const world = morning(false);
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, alpha.runtime, Reminders, (state) => state.sync.status === "Loaded");
    const request = { listId: DEFAULT_LIST_ID, title: "Bring the same notebook", dueMinute: 570, alertMinutes: 0 };
    const selected = await alpha.runtime.runPromise(createReminderItem({ ...request, dueDate: "2026-11-24" }));
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    const other = await alpha.runtime.runPromise(createReminderItem({ ...request, dueDate: "2026-11-25" }));
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    if (!selected || !other) throw new Error("Expected two saved reminders");
    await until(alpha, runtime, View, (state) => state.front && state.reminders === 1);
    await press(/^Bring the same notebook,/);
    await press("Complete reminder occurrence");
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    await press("Event actions");
    await press("Edit event");
    await until(alpha, runtime, Editor, (state) => state.form === "EditReminder" && state.shown);
    await fill("Reminder time", "10:15");
    await press("Save event");
    await until(alpha, runtime, Editor, (state) => state.confirming === "ConfirmReschedule");
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Reschedule?");
    await press("Cancel");
    await until(alpha, runtime, Editor, (state) => state.confirming === "NoConfirm" && state.shown);
    expect(document.querySelector<HTMLInputElement>('input[aria-label="Reminder time"]')?.value).toBe("10:15");
    expect(world.reminders.items.find((item) => item.id === selected.id)).toMatchObject({ completed: true, dueMinute: 570 });
    await press("Save event");
    await until(alpha, runtime, Editor, (state) => state.confirming === "ConfirmReschedule");
    await press("Reschedule");
    await until(alpha, runtime, Editor, (state) => !state.shown && state.write.outcome === "Confirmed");
    expect(world.reminders.items.find((item) => item.id === selected.id)).toMatchObject({ completed: false, dueMinute: 615, alertMinutes: 0 });
    expect(world.reminders.items.find((item) => item.id === other.id)).toMatchObject({ completed: false, dueMinute: 570, revision: other.revision });
  });

  it("Shows the completed occurrence below the next daily reminder (spec/app/reminders/index.md, \"Completing a reminder holds a five-second Undo snapshot and advances a repeating reminder to its next due day\")", async () => {
    const world = morning(false);
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, alpha.runtime, Reminders, (state) => state.sync.status === "Loaded");
    const saved = await alpha.runtime.runPromise(createReminderItem({
      listId: DEFAULT_LIST_ID, title: "Bring a notebook", dueDate: "2026-11-24", dueMinute: 570, alertMinutes: 0, recurrence: "daily",
    }));
    if (saved === undefined) throw new Error("Expected the daily reminder");
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    await until(alpha, runtime, View, (state) => state.front && state.reminders === 1);
    await press(/^Bring a notebook,/);
    await press("Complete reminder occurrence");
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    const detail = document.querySelector('[data-alpha-subview="calendar-detail"]');
    expect(detail?.textContent).toContain("Wednesday, Nov 25");
    expect(detail?.textContent).toContain(`Completed ${new Date(world.now).toLocaleString()} · due ${new Date(world.at(0, 9.5)).toLocaleString()}`);
    expect(detail?.textContent).toContain("Next occurrence is scheduled after Done.");
    expect(button("Complete reminder occurrence")).toBeDefined();
    expect(world.reminders.items.find((item) => item.id === saved.id)).toMatchObject({ completed: false, dueDate: "2026-11-25", history: [
      { revision: saved.revision, dueAtMs: world.at(0, 9.5), completedAtMs: world.now },
    ] });
  });

  it("Shows the elapsed repeat date skipped by a late completion (spec/app/reminders/index.md, \"Completing a reminder holds a five-second Undo snapshot and advances a repeating reminder to its next due day\")", async () => {
    const world = morning(false);
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await openCalendar(alpha);
    await until(alpha, alpha.runtime, Reminders, (state) => state.sync.status === "Loaded");
    const saved = await alpha.runtime.runPromise(createReminderItem({
      listId: DEFAULT_LIST_ID, title: "Read the agenda", dueDate: "2026-11-23", dueMinute: 510, alertMinutes: 0, recurrence: "daily",
    }));
    if (saved === undefined) throw new Error("Expected the daily reminder");
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    await press(dayButton(world.today - 1));
    await until(alpha, runtime, View, (state) => state.anchor === world.today - 1 && state.reminders === 1);
    await press(/^Read the agenda,/);
    await press("Complete reminder occurrence");
    await until(alpha, alpha.runtime, Reminders, (state) => state.write.outcome === "Confirmed");
    const detail = document.querySelector('[data-alpha-subview="calendar-detail"]');
    expect(detail?.textContent).toContain("Wednesday, Nov 25");
    expect(detail?.textContent).toContain("1 elapsed repeat dates skipped");
    expect(world.reminders.items.find((item) => item.id === saved.id)).toMatchObject({ dueDate: "2026-11-25", history: [
      { dueAtMs: world.at(-1, 8.5), completedAtMs: world.now, skippedDates: 1 },
    ] });
  });
});

it("Shows the newly verified Google grant when Calendar Settings reopens (spec/app/settings/index.md, \"Each page links to what another area owns there\")", async () => {
  const world = morning(false);
  world.inbox.google = { email: "owner@alpha.test", connection: "google-owner", capabilities: ["google.calendar.read"] };
  const { alpha } = await open(world, only("view:Settings"));
  await drawn(() => alpha.runtime.runPromise(Shell.use((shell) => shell.send({ type: "openView", view: "Settings" }))));
  await until(alpha, alpha.runtime, Settings, (state) => state.page === "Top");
  await press("Apps");
  await press("Calendar");
  await vi.waitFor(() => expect(calendarSettings()?.textContent).toContain("Google CalendarFinish setup"));

  await press("Back to Apps");
  await until(alpha, alpha.runtime, Settings, (state) => state.page === "Apps");
  world.inbox.google = { email: "owner@alpha.test", connection: "google-owner", capabilities: ["google.calendar.read", "google.calendar.write"] };
  await press("Calendar");
  await vi.waitFor(() => expect(calendarSettings()?.textContent).toContain("Google CalendarConnected"));
  expect(calendarSettings()?.textContent).not.toContain("Finish setup");
  expect(world.calendar.writes).toEqual([]);
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
    const { alpha, runtime } = await onCalendar(world);
    await until(alpha, runtime, View, (s) => s.googleRows === 2 && s.phoneRows === 1);

    // spec/app/calendar/index.md, "The event's place opens in Maps, and coming back reads the event again"; spec/app/calendar/index.md, "An event comes back only if the read finds it; otherwise it closes"
    await tap("Team lunch");
    await press("Open Cafe in Maps");
    await until(alpha, runtime, View, (s) => s.detail === "InMaps");
    expect((await alpha.runtime.runPromise(Shell.use((shell) => shell.get()))).trail).toEqual(["Calendar", "Maps"]);
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
    const { alpha, runtime } = await onCalendar(world);
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

    // spec/app/calendar/editor.md, "An event ends after it starts": an all-day event sends a positive, UTC-midnight-bounded span
    await press("New event");
    await until(alpha, runtime, Editor, (e) => e.shown && e.receipts.status === "Loaded");
    await fill("Title", "Away for the day");
    await press("All day");
    await until(alpha, runtime, Editor, (e) => e.titled && e.allDay && e.kept);
    await press("Save event");
    await until(alpha, runtime, Editor, (e) => e.form === "NoForm" && e.write.outcome === "Confirmed");
    expect(world.calendar.events.find(({ title }) => title === "Away for the day")).toMatchObject({
      isAllDay: true, startAt: "2026-11-24T00:00:00.000Z", endAt: "2026-11-25T00:00:00.000Z",
    });

    // spec/app/calendar/writing.md, "Guests, alerts and video rooms go to Android Calendar; zones, all-day and repeats use the direct save for a new event": Android keeps those options on the local row
    await press("New event");
    await until(alpha, runtime, Editor, (e) => e.shown && e.receipts.status === "Loaded");
    await fill("Title", "Office closure");
    await press("This phone's calendar");
    await press("All day");
    await press("Weekdays");
    await press("Save event");
    await until(alpha, runtime, Editor, (e) => e.form === "NoForm" && e.write.outcome === "Confirmed");
    await until(alpha, runtime, View, (state) => state.phoneRows === 3);
    expect(world.calendar.phoneEvents.find(({ title }) => title === "Office closure")).toMatchObject({
      allDay: true, recurring: true, begin: Date.UTC(2026, 10, 24), end: Date.UTC(2026, 10, 25),
    });
    expect(button("Office closure, All day")).toBeDefined();

    // spec/app/calendar/editor.md, "Story: Hand Android Calendar what Alpha cannot write": the handoff carries the requested alert and writes nothing
    await press("New event");
    await fill("Title", "Briefing");
    await press("This phone's calendar");
    await press("Video link");
    await until(alpha, runtime, Editor, (e) => e.extras);
    await press("10 min");
    await press("Video link");
    await press("Open in Android Calendar");
    await until(alpha, runtime, Editor, (e) => e.form === "NoForm");
    await vi.waitFor(() => expect(world.calendar.handoffs).toMatchObject([{ title: "Briefing", alerts: [10] }]));
    expect(world.calendar.phoneEvents.map((event) => event.title)).toEqual(["Gym", "Coffee", "Office closure"]);
    expect(world.calendar.events.some((event) => event.title === "Briefing")).toBe(false);

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

    // spec/app/calendar/deletions.md, "The window ends only once its Undo notice is no longer shown"; spec/app/calendar/deletions.md, "A refused send shows the event again and says it was not deleted; a sent deletion hides it until a read no longer has it unchanged"
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
    const { alpha, runtime, world } = await onBrowserCalendar();

    // spec/app/calendar/index.md, "Search and the Calendars sheet open over the days, never over an open event"
    await press("Search events");
    await until(alpha, runtime, View, (s) => s.overlay === "Search");
    await fill("Search events", "dent");
    await tap("Dentist");
    await until(alpha, runtime, View, (s) => s.open !== 0 && s.overlay === "NoOverlay");
    expect(document.querySelector("[data-alpha-subview=calendar-detail] h1")?.textContent).toBe("Dentist");
    await press("Back to calendar");
    await until(alpha, runtime, View, (s) => s.open === 0);
    await press(dayButton(world.today + 2));
    await until(alpha, runtime, View, (s) => s.anchor === world.today + 2 && s.google.status === "Loaded");
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
    const { alpha, runtime, world } = await onBrowserCalendar();

    // spec/app/calendar/editor.md, "An invitation is answered Going or Maybe once, at the revision shown, and Decline is the deletion's decline"; spec/app/calendar/editor.md, "A confirmed answer holds its event until a read shows it"; spec/app/calendar/writing.md, "An applied create, change or answer is read back; only a read back that finds it as asked says saved"
    await tap("Team lunch");
    await until(alpha, runtime, View, (s) => s.open !== 0);
    expect([Boolean(button("Going")), Boolean(button("Maybe")), Boolean(button("No"))]).toEqual([true, true, true]);
    await press("Going");
    await until(alpha, runtime, Editor, (e) => e.kind === "Reply" && e.write.outcome === "Confirmed" && e.latched.length === 0);
    expect(world.calendar.writes).toEqual(["answer ev-team-lunch accepted"]);
  });
});
