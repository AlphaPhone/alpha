// spec/camera/viewfinder.md, "Story: Take photos"; spec/camera/viewfinder.md, "Story: Recover when the camera is denied or stops"; spec/camera/browse.md, "Story: Select what I see"; spec/camera/scanDialogs.md, "Save to Notes runs once per review; an unconfirmed save stays latched because the text may already be saved"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const notice = extract(({ document }) => {
  const alert = document.querySelector<HTMLElement>('[role="alert"][aria-label="Camera off"], [role="alert"][aria-label="Can’t start camera"], [role="alert"][aria-label="Mic off"]');
  return alert === null ? "none" : alert.querySelectorAll("button").length;
});

/** A Camera access notice always offers a way on: Retry at least. */
export const cameraNoticeOffersRetry = always(() => notice.current === "none" || (typeof notice.current === "number" && notice.current >= 1));

const recordingControls = extract(({ document }) => {
  const recording = document.querySelector('[role="timer"][aria-label="Recording"]') !== null;
  const modes = document.querySelector('[role="group"][aria-label="Mode"]') !== null;
  const flip = document.querySelector('button[aria-label="Switch camera"]') !== null;
  return !recording || (!modes && !flip);
});

/** While a recording runs, the mode row and Switch camera are hidden. */
export const cameraRecordingHidesModeAndFlip = always(() => recordingControls.current);

const countdown = extract(({ document }) => {
  const counting = document.querySelector('[role="timer"][aria-label^="Photo in"]') !== null;
  const video = document.querySelector('button[aria-label="Video mode"][aria-pressed="true"]') !== null;
  return !(counting && video);
});

/** The self-timer counts only in Photo mode. */
export const cameraCountdownOnlyInPhoto = always(() => countdown.current);

const selection = extract(({ document }) => {
  const bar = document.querySelector('footer[aria-label="Selection"]');
  const pressed = document.querySelectorAll('[data-media-id][aria-pressed="true"]').length;
  return bar !== null || pressed === 0;
});

/** No tile shows as selected outside selection mode. */
export const cameraPhotosSelectionOnlyWhileSelecting = always(() => selection.current);

const notesSave = extract(({ document }) => {
  const saved = [...document.querySelectorAll("button")].find((button) => button.textContent === "Saved");
  return saved === undefined || saved.hasAttribute("disabled");
});

/** A scan saved to Notes never offers its save again. */
export const cameraScanSavesToNotesOnce = always(() => notesSave.current);
