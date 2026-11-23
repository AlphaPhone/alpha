// spec/voice/conversation.md, "A Cloud stream listens, speaks the replies and the cue and mutes the speaker on one relay session, and only voice retiring ends it"

/**
 * A check for the shared Cloud streaming speech that throws an AbortError once `current` no longer holds.
 * @throws {never}
 */
export function currentness(current: () => boolean): () => void {
  return () => {
    if (current()) return;
    throw typeof DOMException === "function"
      ? new DOMException("Voice moved on.", "AbortError")
      : Object.assign(new Error("Voice moved on."), { name: "AbortError" });
  };
}

/**
 * A fresh abort controller for one streamed voice session or one passage spoken on it.
 * @throws {never}
 */
export function voiceAbort(): AbortController {
  return new AbortController();
}
