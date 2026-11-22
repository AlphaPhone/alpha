// spec/notes/trash.md, "Erase needs the three-day choice, a review of that exact deletion at the current revision, and no shared recording"; spec/notes/recorder.md, "Discard asks once for a recording of a second or more, and never while its save is claimed"
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
