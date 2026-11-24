// spec/camera/viewfinder.md, "Story: Take photos"; spec/camera/viewfinder.md, "Story: Record videos"; spec/camera/viewfinder.md, "Story: Recover when the camera is denied or stops"; spec/camera/browse.md, "Story: Select what I see"; spec/camera/browse.md, "Delete forever runs only from Recently deleted, on the items its confirmation prepared"; spec/camera/scanDialogs.md, "Save to Notes runs once per review; an unconfirmed save stays latched because the text may already be saved"; spec/camera/scanDialogs.md, "Keep text needs the recognised text; a PDF request already sent is unconfirmed if the dialog closes"; spec/camera/browse.md, "Sharing hands up to 100 selected items to Android's share sheet; nothing is sent until the owner picks an app there"
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

const light = extract(({ document }) => {
  const toggle = document.querySelector('button[aria-label="Light on"], button[aria-label="Light off"]') !== null;
  const recording = document.querySelector('[role="timer"][aria-label="Recording"]') !== null;
  return !toggle || (document.querySelector('button[aria-label="Video mode"][aria-pressed="true"]') !== null && !recording);
});

/** Video's light is offered only in Video mode, before a recording starts. */
export const cameraLightOnlyBeforeVideoRecording = always(() => light.current);

const timer = extract(({ document }) => {
  const toggle = document.querySelector('button[aria-label^="Timer"]') !== null;
  return !toggle || !document.querySelector('button[aria-label="Video mode"][aria-pressed="true"]') !== null;
});

/** The self-timer control belongs to Photo mode. */
export const cameraTimerOnlyInPhoto = always(() => timer.current);

const zoom = extract(({ document }) => {
  const recording = document.querySelector('[role="timer"][aria-label="Recording"]') !== null;
  const chips = document.querySelector('[role="group"][aria-label="Zoom"]') !== null;
  return !(recording && chips);
});

/** In the browser build zoom never changes during a recording: its chips are hidden while one runs (the phone zooms while it records). */
export const cameraZoomHiddenWhileRecording = always(() => zoom.current);

const microphoneNotice = extract(({ document }) => {
  const notice = document.querySelector('[role="alert"][aria-label="Mic off"]') !== null;
  return !notice || document.querySelector('button[aria-label="Video mode"][aria-pressed="true"]') !== null;
});

/** The microphone notice belongs to Video mode. */
export const cameraMicrophoneNoticeOnlyInVideo = always(() => microphoneNotice.current);

const deleteForever = extract(({ document }) => {
  const bar = document.querySelector('footer[aria-label="Selection"]');
  const remove = bar === null ? undefined : [...bar.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Delete");
  const inTrash = [...document.querySelectorAll('[role="tab"][aria-selected="true"]')].some((tab) => tab.textContent?.trim() === "Recently deleted");
  return remove === undefined || inTrash;
});

/** Delete forever is offered only in Recently deleted. */
export const cameraDeleteForeverOnlyInRecentlyDeleted = always(() => deleteForever.current);

const searchable = extract(({ document }) => {
  const save = document.querySelector<HTMLButtonElement>('button[aria-label="Save reviewed searchable PDF"]');
  const reading = [...document.querySelectorAll('[role="status"]')].some((status) => status.textContent === "Reading text…");
  return save === null || !reading || save.disabled;
});

/** The searchable PDF cannot be made before its text has been read for review. */
export const cameraSearchablePdfWaitsForReviewedText = always(() => searchable.current);

const share = extract(({ document }) => {
  const bar = document.querySelector('footer[aria-label="Selection"]');
  const button = bar?.querySelector<HTMLButtonElement>('button[aria-label="Share"]');
  return { offered: button !== null && button !== undefined && !button.disabled, count: Number(bar?.querySelector("span")?.textContent?.trim() ?? "0") };
});

/** Share is offered only for one to 100 selected items. */
export const cameraShareTakesOneToAHundred = always(() => !share.current.offered || (share.current.count >= 1 && share.current.count <= 100));
