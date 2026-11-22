// spec/voice/conversation.md, "Voice starts only from the owner, on a lit, visible phone with no sensitive screen, no reset and no call"; spec/voice/dictation.md, "A capture lost to a call discards its clip and says so once; any other loss keeps the dictation ready"
import type { Notice, Shown } from "../../../gen/voice__conversation.ts";
import type { DictationFailure } from "../../../gen/voice__dictation.ts";
import type { ListenerMode } from "../../../gen/voice__listener.ts";
import type { Route } from "../../../gen/voice__route.ts";

/** The one line a conversation notice says, or nothing. */
export function noticeText(notice: Notice): string | undefined {
  switch (notice) {
    case "NoNotice": return undefined;
    case "PausedForCall": return "Voice paused for a phone call.";
    case "CallHoldsMicrophone": return "Voice is paused during a phone call.";
    case "CannotInterrupt": return "Voice can't interrupt a reply here. Tap Stop speaking to cut it short.";
    case "ReviewInChat": return "Review it in the chat. The microphone is off.";
    case "VoicePaused": return "Voice paused. Cloud is busy; start again in a moment.";
    case "StopUnconfirmed": return "Speech could not be stopped. Restart Alpha.";
    case "RestOfReplyUnread": return "Couldn't read the rest aloud. The full reply is above.";
  }
}

/** The accessible name of what a conversation shows. */
export function shownLabel(shown: Shown): string {
  switch (shown) {
    case "Off": return "Voice off";
    case "Starting": return "Starting voice";
    case "Listening": return "Listening";
    case "Thinking": return "Thinking";
    case "Speaking": return "Speaking";
    case "AwaitingReview": return "Waiting for your review";
    case "Retrying": return "Reconnecting";
    case "Retiring": return "Stopping";
    case "Failed": return "Voice stopped";
  }
}

/** The one line a dictation failure says, on the route it used. */
export function dictationFailureText(failure: DictationFailure, route: Route, native: boolean): string | undefined {
  switch (failure) {
    case "NoFailure": return undefined;
    case "MicrophoneDenied": return native ? "Microphone access is off. Open app settings to allow it. Nothing was recorded." : "Microphone access is blocked. Allow the microphone for this site in your browser's site settings. Nothing was recorded.";
    case "NoMicrophone": return "No usable microphone was found. Connect or enable a microphone, then try again.";
    case "CallActive": return "Voice paused for a phone call.";
    case "CaptureLost": return "Recording stopped. Start again when you're ready.";
    case "NothingHeard": return route === "Device" ? "No speech was detected. Record again, or type instead." : `${route === "Direct" ? "Cartesia" : "Eliza Cloud"} heard no speech. Your recording is kept.`;
    case "TranscriptionFailed": return "Transcription failed. Your recording is kept.";
    case "MediaNotStopped": return "Speech could not be stopped. Restart Alpha.";
  }
}

/** The accessible name of the listener's mode. */
export function listenerLabel(mode: ListenerMode, microphoneOpen: boolean): string {
  if (microphoneOpen && mode !== "ListeningOn") return "Listener still holds the microphone";
  switch (mode) {
    case "Unavailable": return "No listener";
    case "ListeningOn": return "Listening for its name";
    case "ListeningPaused": return "Listening paused";
    case "ListeningOff": return "Listening off";
    case "NeedsSetup": return "Listener needs setup";
    case "StoppedByListener": return "Listener stopped";
  }
}

/** The recipient a network route names in its disclosure. */
export function recipientName(route: Route): string {
  return route === "Direct" ? "Cartesia" : route === "Cloud" ? "Eliza Cloud" : "this phone";
}
