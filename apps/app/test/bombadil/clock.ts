// spec/clock/alarms.md, "A new alarm needs an unused id, a valid time and days, a next instant still to come, and room"; spec/clock/deletions.md, "An uncertain outcome can be dismissed, which keeps its receipt and repeats nothing"; spec/clock/handoff.md, "Confirming records the handoff before Clock is opened, and a review that went stale opens nothing"; spec/clock/worldClock.md, "A zone is added once, up to twenty, and can be removed"; spec/clock/ringer.md, "The sound lasts at most a minute, and silencing stops it at once"
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
