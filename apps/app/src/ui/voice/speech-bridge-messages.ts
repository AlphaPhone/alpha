/**
 * What Alpha says when the shared on-device speech bridge refuses or stops speech. Android's
 * `LocalSpeechBridgePlugin` (plugin-local-inference speech-bridge, which Alpha's
 * `AlphaVoiceCloudPlugin` extends) and the staged speech request (`packages/voice`) answer in
 * English; each sentence is worded by Alpha here and never shown itself. Cloud voice failures are
 * worded by `runtime/cloud-voice.ts`.
 */
import { isNativeRejection } from "../utils/native-refusal";

/** Keyed by every sentence the speech bridge rejects a speak or playback with. */
export const SPEECH_BRIDGE_REFUSALS: ReadonlyMap<string, string> = new Map([
  ["Speaker is in use", "Another app is using the speaker."],
  ["Another app is using the speaker", "Another app is using the speaker."],
  ["Speaker mute was missing", "Could not change the speaker volume."],
  ["Voice is closed", "Voice stopped."],
  ["Voice request already active or unavailable", "Voice is busy or unavailable."],
  ["Voice request cancelled", "Voice stopped."],
  ["Voice cancelled", "Voice stopped."],
  ["Voice request failed", "Voice couldn’t speak this."],
  ["Voice request cleanup failed", "Voice couldn’t finish cleanly."],
  ["Voice unavailable", "Voice is unavailable."],
  ["Voice cancellation is still draining", "Voice is still stopping. Try again in a moment."],
  ["Speech is paused while a phone call is active", "Voice is paused during a phone call."],
  ["Voice is paused while a phone call is active", "Voice is paused during a phone call."],
  ["Playback replaced", "Voice was replaced by newer speech."],
  ["Playback cancelled", "Voice stopped."],
  ["Playback preparation failed", "Voice couldn’t prepare the audio."],
  ["Playback unavailable", "Voice playback is unavailable."],
  ["Close the protected credential surface before using speech.", "Close the password screen to use voice."],
  ["Invalid request", "Voice couldn’t take this request."],
  [
    "Android could not show this request; the app may have closed. Reopen it and try again.",
    "Android could not show this request; Alpha may have closed. Reopen Alpha and try again.",
  ],
  // The staged Cloud speech chunk planner (packages/voice/src/cloud-speech-chunks.ts), used for
  // read-aloud over Cloud and Direct voice.
  ["Cloud speech requires text.", "There’s no text to read aloud."],
  ["A word is too long for Cloud speech.", "This text has a word too long to read aloud."],
]);

/**
 * Alpha's reason for a speech failure: the bridge's sentence worded by Alpha; else null for a
 * native rejection or an abort (the caller words those); else Alpha's own error message.
 */
export function speechFailureReason(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const known = SPEECH_BRIDGE_REFUSALS.get(error.message.trim());
  if (known) return known;
  if (isNativeRejection(error) || error.name === "AbortError") return null;
  if (typeof DOMException !== "undefined" && error instanceof DOMException) return null;
  return error.message.trim() || null;
}
