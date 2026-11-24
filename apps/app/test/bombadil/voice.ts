// spec/voice/dictation.md, "Story: Dictate into the draft I am writing"; spec/voice/conversation.md, "A message typed while voice retires waits for the stop and goes out once, unless its chat changed"; spec/voice/capture.md, "Levels are drawn only from the open capture, as 44 bars between 4 and 48 units high"; spec/voice/listener.md, "Alpha may pause or turn off listening, one action at a time, and never turns it on or resumes it"; spec/voice/capture.md, "Open app settings is offered only on the phone, for a refused permission, while nothing records"; spec/voice/conversation.md, "Voice starts only from the owner, on a lit, visible phone with no sensitive screen, no reset and no call"; spec/voice/conversation.md, "Mute changes only the output, is offered only where the phone can mute speech, and ends with the conversation"; spec/voice/conversation.md, "Network voice listens only after its recipient was disclosed and the owner started it"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const page = extract(({ document }) => {
  const labelled = (label: string) => document.querySelectorAll(`[aria-label="${label}"]`).length;
  const enabledLabelled = (label: string) =>
    Array.from(document.querySelectorAll<HTMLButtonElement>(`button[aria-label="${label}"]`)).filter((button) => !button.disabled).length;
  const named = (text: string) => Array.from(document.querySelectorAll("button")).filter((button) => button.textContent?.trim() === text).length;
  return {
    recordingShown: document.querySelectorAll('[role="img"][aria-label="Recording"]').length,
    stopAndInsert: labelled("Stop and insert"),
    talk: labelled("Talk"),
    talkEnabled: enabledLabelled("Talk"),
    stopVoice: labelled("Stop voice"),
    speakingShown: labelled("Speaking"),
    stopSpeaking: named("Stop speaking"),
    mute: labelled("Mute Alpha") + labelled("Unmute Alpha"),
    openAppSettings: named("Open app settings"),
    stopUnconfirmed: document.querySelectorAll('[data-voice-notice="StopUnconfirmed"]').length,
    turnListeningOn: named("Turn on listening") + named("Resume listening") + labelled("Turn on listening") + labelled("Resume listening"),
  };
});

/** A recording's levels are drawn only with the control that stops it and inserts its words. */
export const voiceLevelsOnlyWhileRecording = always(() => page.current.recordingShown === 0 || page.current.stopAndInsert >= 1);

/** Talk and Stop voice are never offered together: voice is either off or running. */
export const voiceTalkOrStopNeverBoth = always(() => page.current.talk === 0 || page.current.stopVoice === 0);

/** While Alpha speaks, the owner can always stop the reply. */
export const voiceSpeakingCanBeStopped = always(() => page.current.speakingShown === 0 || page.current.stopSpeaking >= 1 || page.current.stopVoice >= 1);

/** The speaker's mute is offered only while voice runs. */
export const voiceMuteOnlyWhileRunning = always(() => page.current.mute === 0 || page.current.stopVoice >= 1);

/** Open app settings is never offered while something records. */
export const voiceSettingsOnlyWhileNothingRecords = always(() => page.current.openAppSettings === 0 || page.current.stopAndInsert === 0);

/** After a stop that could not be confirmed, Talk stays unavailable until Alpha restarts. */
export const voiceUnconfirmedStopKeepsTalkClosed = always(() => page.current.stopUnconfirmed === 0 || page.current.talkEnabled === 0);

/** Alpha never offers to turn the always-on listener on or resume it. */
export const voiceNeverRaisesListening = always(() => page.current.turnListeningOn === 0);

const levelBars = extract(({ document }) =>
  Array.from(document.querySelectorAll('[role="img"][aria-label="Recording"]')).map((levels) =>
    Array.from(levels.children).map((bar) => parseFloat((bar as HTMLElement).style.height))));

/** A recording draws at most 44 level bars, each between 4 and 48 units high. */
export const voiceLevelsAreBoundedBars = always(() => levelBars.current.every((bars) => bars.length <= 44 && bars.every((height) => height >= 4 && height <= 48)));

const disclosure = extract(({ document }) => ({
  open: Array.from(document.querySelectorAll('[role="dialog"] h2')).some((title) => title.textContent?.startsWith("Voice uses ") === true),
  listening: document.querySelector('[role="img"][aria-label="Voice is listening"]') !== null,
}));

/** Network voice never listens while the sheet naming who receives it waits for the owner. */
export const voiceDisclosedBeforeListening = always(() => !disclosure.current.open || !disclosure.current.listening);
