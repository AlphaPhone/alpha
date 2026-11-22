// spec/voice/dictation.md, "Story: Dictate into the draft I am writing"; spec/voice/conversation.md, "A message typed while voice retires waits for the stop and goes out once, unless its chat changed"; spec/voice/capture.md, "Levels are drawn only from the open capture, as 44 bars between 4 and 48 units high"; spec/voice/listener.md, "Alpha may pause or turn off listening, one action at a time, and never turns it on or resumes it"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const page = extract(({ document }) => {
  const labelled = (label: string) => document.querySelectorAll(`[aria-label="${label}"]`).length;
  const named = (text: string) => Array.from(document.querySelectorAll("button")).filter((button) => button.textContent?.trim() === text).length;
  return {
    recordingShown: labelled("Recording"),
    stopAndInsert: labelled("Stop and insert"),
    talk: labelled("Talk"),
    stopVoice: labelled("Stop voice"),
    speakingShown: labelled("Speaking"),
    stopSpeaking: named("Stop speaking"),
    turnListeningOn: named("Turn on listening") + named("Resume listening") + labelled("Turn on listening") + labelled("Resume listening"),
  };
});

/** A recording's levels are drawn only with the control that stops it and inserts its words. */
export const voiceLevelsOnlyWhileRecording = always(() => page.current.recordingShown === 0 || page.current.stopAndInsert >= 1);

/** Talk and Stop voice are never offered together: voice is either off or running. */
export const voiceTalkOrStopNeverBoth = always(() => page.current.talk === 0 || page.current.stopVoice === 0);

/** While Alpha speaks, the owner can always stop the reply. */
export const voiceSpeakingCanBeStopped = always(() => page.current.speakingShown === 0 || page.current.stopSpeaking >= 1 || page.current.stopVoice >= 1);

/** Alpha never offers to turn the always-on listener on or resume it. */
export const voiceNeverRaisesListening = always(() => page.current.turnListeningOn === 0);
