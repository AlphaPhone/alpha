// spec/voice/conversation.md, "Voice starts only from the owner, on a lit, visible phone with no sensitive screen, no reset and no call"; spec/voice/dictation.md, "A capture lost to a call discards its clip and says so once; any other loss keeps the dictation ready"
import type { Notice, Shown } from "../../../gen/voice__conversation.ts";
import type { DictationFailure } from "../../../gen/voice__dictation.ts";
import type { ListenerMode } from "../../../gen/voice__listener.ts";
import type { Route } from "../../../gen/voice__route.ts";
import { CANNOT_INTERRUPT, MEDIA_UNCONFIRMED, REST_UNREAD, REVIEW_IN_CHAT, VOICE_CALL_ACTIVE, VOICE_CALL_ENDED, VOICE_PAUSED, microphoneMessage, nothingHeardMessage, serviceName } from "../../voice/failure.vibe";

/** Said when Record is pressed while Alpha's speech is still stopping. */
export const SPEECH_STILL_STOPPING = "Alpha is still stopping its speech. Try again in a moment.";

/**
 * The one line a conversation notice says, or nothing.
 * @throws {never}
 */
export function noticeText(notice: Notice): string | undefined {
  switch (notice) {
    case "NoNotice": return undefined;
    case "PausedForCall": return VOICE_CALL_ENDED;
    case "CallHoldsMicrophone": return VOICE_CALL_ACTIVE;
    case "CannotInterrupt": return CANNOT_INTERRUPT;
    case "ReviewInChat": return REVIEW_IN_CHAT;
    case "VoicePaused": return VOICE_PAUSED;
    case "StopUnconfirmed": return MEDIA_UNCONFIRMED;
    case "RestOfReplyUnread": return REST_UNREAD;
  }
}

/**
 * The accessible name of what a conversation shows.
 * @throws {never}
 */
export function shownLabel(shown: Shown): string {
  switch (shown) {
    case "Off": return "Voice off";
    case "Starting": return "Starting voice";
    case "Listening": return "Listening";
    case "Thinking": return "Thinking";
    case "Speaking": return "Speaking";
    case "Retrying": return "Reconnecting";
    case "Retiring": return "Stopping";
    case "Failed": return "Voice stopped";
  }
}

/**
 * The one line a dictation failure says, on the route it used.
 * @throws {never}
 */
export function dictationFailureText(failure: DictationFailure, route: Route, native: boolean): string | undefined {
  switch (failure) {
    case "NoFailure": return undefined;
    case "MicrophoneDenied": return microphoneMessage({ code: "permission-denied", name: "" }, !native);
    case "NoMicrophone": return microphoneMessage({ code: "", name: "NotFoundError" }, !native);
    case "CallActive": return VOICE_CALL_ENDED;
    case "CaptureLost": return "Recording stopped. Start again when you're ready.";
    case "NothingHeard": return nothingHeardMessage(route);
    case "TranscriptionFailed": return "Transcription failed. Your recording is kept.";
    case "MediaNotStopped": return MEDIA_UNCONFIRMED;
    case "SpeechStillStopping": return SPEECH_STILL_STOPPING;
  }
}

/**
 * The accessible name of the listener's mode.
 * @throws {never}
 */
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

/**
 * The recipient a network route names in its disclosure.
 * @throws {never}
 */
export function recipientName(route: Route): string {
  return route === "Device" ? "this phone" : serviceName(route);
}
