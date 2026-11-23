// spec/notes/trash.md, "Erase needs the three-day choice, a review of that exact deletion at the current revision, and no shared recording"; spec/notes/recorder.md, "Discard asks once for a recording of a second or more, and never while its save is claimed"; spec/notes/list.md, "The list holds every row once, pinned rows first, then by time, ties in stored order"; spec/notes/list.md, "Each checklist row keeps its own place and a name a screen reader can say"; spec/notes/folders.md, "A folder is created once per name, up to a hundred folders"; spec/notes/trash.md, "Every Trash dialog is named by the actions it offers and the note it reviews"; spec/notes/webSource.md, "One action per dialog, only while the dialog is fresh over the note it reviewed"
// What Bombadil checks of the Notes app in every state it reaches.
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const trash = extract(({ document }) => {
  const view = document.querySelector('section[aria-label="Recently deleted"]');
  if (!view) return { open: false, deleteNow: false, retention: false };
  const deleteNow = [...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Delete now" || button.textContent?.trim() === "Delete all");
  const retention = view.querySelector('[aria-label$="left"], [aria-label$="Deleting permanently"]') !== null;
  return { open: true, deleteNow, retention };
});

/** Without the three-day choice, Recently deleted offers Recover only, never a permanent erase. */
export const notesEraseNeedsThreeDayChoice = always(() => !trash.current.open || !trash.current.deleteNow || trash.current.retention);

const recorder = extract(({ document }) => {
  const view = document.querySelector('section[aria-label="Voice note recorder"]');
  if (!view) return { open: false, saving: false, discardEnabled: false };
  const done = view.querySelector<HTMLButtonElement>('button[aria-label="Save voice note"]');
  const discard = view.querySelector<HTMLButtonElement>('button[aria-label="Discard recording"]');
  return { open: true, saving: done?.getAttribute("aria-busy") === "true", discardEnabled: discard !== null && !discard.disabled };
});

/** While Done is saving the voice note, the recording cannot be discarded. */
export const notesRecordingNotDiscardedWhileSaving = always(() => !recorder.current.open || !recorder.current.saving || !recorder.current.discardEnabled);

const list = extract(({ document }) => {
  const notes = document.querySelector('main[aria-label="Notes"]');
  if (!notes || notes.querySelector('section[aria-label="Recently deleted"]')) return [];
  return [...notes.querySelectorAll("ul > li")].filter((row) => row.querySelector("button") !== null && row.closest("section") === null)
    .map((row) => row.querySelector('[aria-label="Pinned"]') !== null);
});

/** No unpinned note is listed above a pinned one. */
export const notesPinnedRowsFirst = always(() => !list.current.some((pinned, at) => pinned && list.current.slice(0, at).some((earlier) => !earlier)));

const checklist = extract(({ document }) => {
  const editor = document.querySelector('main[aria-label="Notes"] section');
  if (!editor) return true;
  return [...editor.querySelectorAll('button[role="checkbox"], button[aria-label^="Remove"]')].every((control) => (control.getAttribute("aria-label") ?? "").trim() !== "");
});

/** Every checklist tick box and Remove button has a name a screen reader can say, also for a blank item. */
export const notesChecklistControlsNamed = always(() => checklist.current);

const folders = extract(({ document }) => {
  const add = document.querySelector<HTMLButtonElement>('button[aria-label="Add folder"]');
  if (!add) return { open: false, count: 0, addEnabled: false };
  return { open: true, count: document.querySelectorAll('button[aria-label^="Delete folder "]').length, addEnabled: !add.disabled };
});

/** At a hundred folders, no further folder can be added. */
export const notesFolderLimitHolds = always(() => !folders.current.open || folders.current.count < 100 || !folders.current.addEnabled);

const trashDialog = extract(({ document }) => {
  const dialog = [...document.querySelectorAll('[role="dialog"]')].find((node) => /^Recover( or delete)? /.test(node.getAttribute("aria-label") ?? ""));
  if (!dialog) return { open: false, namesDelete: false, offersDelete: false };
  const offersDelete = [...dialog.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Delete now");
  return { open: true, namesDelete: (dialog.getAttribute("aria-label") ?? "").startsWith("Recover or delete "), offersDelete };
});

/** A Recently deleted row's dialog names Delete exactly when it offers Delete now. */
export const notesTrashDialogNamesItsActions = always(() => !trashDialog.current.open || trashDialog.current.namesDelete === trashDialog.current.offersDelete);

const sourceDialog = extract(({ document }) => {
  const dialog = document.querySelector('[role="dialog"][aria-label="Note web source"]');
  if (!dialog) return { open: false, unconfirmed: false, actionable: false };
  const actions = [...dialog.querySelectorAll<HTMLButtonElement>("button")].filter((button) => ["Open source page", "Remove web source"].includes(button.textContent?.trim() ?? ""));
  return { open: true, unconfirmed: [...dialog.querySelectorAll('[role="status"]')].some((node) => node.textContent?.trim() === "Unconfirmed"), actionable: actions.some((button) => !button.disabled) };
});

/** A source dialog whose removal could not be confirmed accepts no further action. */
export const notesSourceDialogUnconfirmedStaysBusy = always(() => !sourceDialog.current.open || !sourceDialog.current.unconfirmed || !sourceDialog.current.actionable);
