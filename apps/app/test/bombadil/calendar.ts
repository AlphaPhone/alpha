// spec/calendar/presentation.md, "A day is free only when the read covering it was complete"; spec/calendar/presentation.md, "The delete sheet belongs to an open event that may be changed, and never sits under a form"; spec/calendar/editor.md, "Save is off while loading, while saving, for another account, for an event that changed, and without a title, in that order"; spec/calendar/approvals.md, "Approve needs every field the change would apply to be shown; Decline is always possible for a pending request"; spec/calendar/availability.md, "Nothing is preselected, and Check is offered only for one to sixteen ticked calendars"
// What Bombadil checks of the Calendar app in every state it reaches.
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const day = extract(({ document }) => {
  const timeline = document.querySelector('section[aria-label="Timeline"]');
  const status = timeline?.querySelector('[role="status"]')?.textContent?.trim() ?? "";
  const limited = [...document.querySelectorAll('[role="status"]')].some((node) => /2,000 max|Incomplete|Updating…|Couldn’t load/.test(node.textContent ?? ""));
  return { free: status === "Free", limited };
});

/** A day never reads "Free" while a read of it was truncated, partial or failed. */
export const calendarIncompleteDayIsNeverFree = always(() => !day.current.free || !day.current.limited);

const sheets = extract(({ document }) => ({
  deleting: document.querySelector('[role="dialog"][aria-label="Delete event?"], [role="dialog"][aria-label="Decline invitation?"]') !== null,
  editing: [...document.querySelectorAll('[role="dialog"]')].some((node) => /New event|Edit event/.test(node.textContent ?? "") && node.querySelector('button')?.textContent !== null && node.textContent?.includes("Save event") === true),
}));

/** The delete confirmation never sits under an open event form. */
export const calendarDeleteNeverUnderForm = always(() => !(sheets.current.deleting && sheets.current.editing));

const editor = extract(({ document }) => {
  const save = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === "Save event");
  const title = document.querySelector<HTMLInputElement>('[role="dialog"] label input:not([type])');
  return { open: save !== undefined, enabled: save !== undefined && !save.disabled, blankTitle: title !== null && title.value.trim() === "" };
});

/** An event without a title can never be saved. */
export const calendarBlankTitleNeverSaves = always(() => !editor.current.open || !editor.current.blankTitle || !editor.current.enabled);

const approval = extract(({ document }) => {
  const details = document.querySelector('dl[aria-label="Event details"]');
  const approve = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === "Approve");
  const unverified = [...document.querySelectorAll("p")].some((node) => node.textContent?.startsWith("Current event details could not be verified"));
  return { approveEnabled: approve !== undefined && !approve.disabled, details: details !== null, unverified };
});

/** Approve is offered only with the change's details shown and its target verified. */
export const calendarApproveNeedsVerifiedDetails = always(() => !approval.current.approveEnabled || (approval.current.details && !approval.current.unverified));

const availability = extract(({ document }) => {
  const check = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === "Check");
  const ticked = document.querySelectorAll('fieldset button[role="checkbox"][data-state="checked"]').length;
  return { offered: check !== undefined && !check.disabled, ticked };
});

/** An availability check reads only after one to sixteen calendars were ticked. */
export const calendarAvailabilityNeedsTickedCalendars = always(() => !availability.current.offered || (availability.current.ticked >= 1 && availability.current.ticked <= 16));
