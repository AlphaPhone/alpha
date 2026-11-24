// spec/clock/alarms.md, "A new alarm needs an unused id, a valid time and days, a next instant still to come, and room"; spec/clock/reminders.md, "One reminder write runs at a time, and only from a current listing of the shown revision"; spec/clock/notices.md, "One retained-data notice at a time, shown only on a visible page, and hiding closes it"; spec/clock/stopwatch.md, "A lap records the elapsed time while running, laps only grow, and at most 99 are kept"; spec/clock/deletions.md, "An uncertain outcome can be dismissed, which keeps its receipt and repeats nothing"; spec/clock/handoff.md, "Confirming records the handoff before Clock is opened, and a review that went stale opens nothing"; spec/clock/worldClock.md, "A zone is added once, up to twenty, and can be removed"; spec/clock/ringer.md, "The sound lasts at most a minute, and silencing stops it at once"; spec/clock/handoff.md, "Simulation is possible only in a test-mocks build, and a simulated request opens nothing"; spec/clock/notices.md, "Downloading and resetting exist only in a test-mocks build, and a reset needs a confirmation and runs once"
// What Bombadil checks of Clock on every state it reaches.
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const VALID_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const alarmTimeChecked = extract(({ document }) => {
  const time = document.querySelector<HTMLInputElement>("#alarm-time");
  const save = [...document.querySelectorAll<HTMLButtonElement>("button[type=submit]")].find((b) => b.textContent?.includes("Save alarm"));
  return !time || !save || VALID_TIME.test(time.value) || save.disabled;
});

/** Save alarm is never offered for a time that is not a wall time. */
export const clockAlarmNeedsAValidTime = always(() => alarmTimeChecked.current);

const uncertainWithoutUndo = extract(({ document }) =>
  [...document.querySelectorAll<HTMLElement>("section[aria-label='Pending deletions'] [role=status]")]
    .filter((row) => row.textContent?.includes("needs review"))
    .every((row) => ![...row.querySelectorAll("button")].some((b) => b.textContent?.includes("Undo"))));

/** An uncertain deletion never offers Undo. */
export const clockUncertainDeletionNeverOffersUndo = always(() => uncertainWithoutUndo.current);

const clockOpensOnlyFromAReview = extract(({ document }) =>
  [...document.querySelectorAll<HTMLButtonElement>("button")]
    .filter((b) => b.textContent?.trim() === "Open Clock")
    .every((b) => (b.closest("div.rounded-lg")?.textContent ?? "").length > "Open Clock".length));

/** Open Clock is offered only with the reviewed request beside it. */
export const clockOpenClockOnlyAfterReview = always(() => clockOpensOnlyFromAReview.current);

const unknownCityRefused = extract(({ document }) => {
  const zone = document.querySelector<HTMLInputElement>("#world-zone");
  const add = document.querySelector<HTMLButtonElement>("button[aria-label='Add city']");
  const known = [...document.querySelectorAll<HTMLOptionElement>("#world-zones option")].map((o) => o.value);
  return !zone || !add || known.includes(zone.value) || add.disabled;
});

/** Add city is never offered for a zone the phone does not know. */
export const clockUnknownCityCannotBeAdded = always(() => unknownCityRefused.current);

const ringingCanStop = extract(({ document }) => {
  const card = document.querySelector<HTMLElement>("[role=alertdialog][aria-label='Ringing']");
  return !card || [...card.querySelectorAll("button")].some((b) => /Dismiss|Stop|Snooze/.test(b.textContent ?? ""));
});

/** A ringing alarm or timer always offers a way to stop it. */
export const clockRingingCanAlwaysBeStopped = always(() => ringingCanStop.current);

const CHANGES = ["Done", "Snooze", "Reopen", "Tomorrow", "Edit"];

const staleOffersNoChange = extract(({ document }) => {
  const stale = [...document.querySelectorAll<HTMLElement>("[role=status]")].some((el) => el.textContent?.trim() === "Out of date");
  if (!stale) return true;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("main button")];
  return !buttons.some((b) => CHANGES.includes(b.textContent?.trim() ?? "") || b.getAttribute("aria-label") === "Delete reminder");
});

/** A reminder listing marked out of date offers no change to a reminder until it is read again. */
export const clockOutOfDateReminderOffersNoChange = always(() => staleOffersNoChange.current);

const oneRetainedNotice = extract(({ document }) =>
  [...document.querySelectorAll<HTMLElement>("[role=dialog]")].filter((d) => [...d.querySelectorAll("p")].some((p) => p.textContent?.trim() === "Data kept")).length <= 1);

/** At most one retained-data notice shows at a time. */
export const clockOneRetainedNoticeAtATime = always(() => oneRetainedNotice.current);

const seconds = (text: string) => {
  const [whole, tenths = "0"] = text.trim().split(".");
  return whole.split(":").map(Number).reduce((acc, part) => acc * 60 + part, 0) * 10 + Number(tenths);
};

const lapsAscend = extract(({ document }) =>
  [...document.querySelectorAll<HTMLOListElement>("ol")].every((list) => {
    const totals = [...list.querySelectorAll("li")].map((li) => li.querySelectorAll("span")[2]?.textContent ?? "").filter((t) => /^\d+(:\d\d)+\.\d$/.test(t.trim())).map(seconds);
    return totals.every((total, i) => i === 0 || total <= totals[i - 1]!);
  }));

/** The stopwatch's lap totals, newest first, never run back. */
export const clockLapsNeverRunBack = always(() => lapsAscend.current);

const worldClock = extract(({ document }) => {
  const add = document.querySelector<HTMLButtonElement>('button[aria-label="Add city"]');
  const panel = add?.closest("section");
  if (!add || !panel) return { open: false, cities: 0, addEnabled: false };
  return { open: true, cities: panel.querySelectorAll(":scope > ul > li").length, addEnabled: !add.disabled };
});

/** At most twenty cities are listed, and none can be added at twenty. */
export const clockAtMostTwentyCities = always(() => !worldClock.current.open || (worldClock.current.cities <= 20 && (worldClock.current.cities < 20 || !worldClock.current.addEnabled)));

const simulation = extract(({ document }) =>
  document.documentElement.dataset.testMocks === "false" && (document.querySelector("#handoff-simulate") !== null
    || Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.trim() === "Simulate Clock request")));

/** A Clock request can be simulated only in a build with test mocks. */
export const clockSimulationOnlyWithTestMocks = always(() => !simulation.current);

const retainedDataTools = extract(({ document }) =>
  document.documentElement.dataset.testMocks === "false" && Array.from(document.querySelectorAll('[role="dialog"]'))
    .filter((dialog) => Array.from(dialog.querySelectorAll("p")).some((line) => line.textContent?.trim() === "Data kept"))
    .some((dialog) => Array.from(dialog.querySelectorAll("button")).some((button) => ["Download", "Reset…", "Reset"].includes(button.textContent?.trim() ?? ""))));

/** Kept data is downloaded or reset only in a build with test mocks; otherwise its notice only explains. */
export const clockRetainedDataToolsOnlyWithTestMocks = always(() => !retainedDataTools.current);
