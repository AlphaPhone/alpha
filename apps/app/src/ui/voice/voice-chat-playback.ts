import { collapseWhitespace } from "./speech-segments";

export {
  collapseWhitespace,
  isRealSentenceEnd,
  shelterUrls,
  splitFirstSentence,
} from "./speech-segments";

/**
 * Playback / TTS logic for voice chat — text processing, sentence splitting,
 * speech text extraction, and mouth animation helpers.
 */
import { sanitizeSpeechText } from "@elizaos/core/speech";
export type SpeechSegmentKind = "full" | "first-sentence" | "remainder";
export const MOUTH_OPEN_STEP = 0.02;
// ── Text processing helpers ───────────────────────────────────────────
export function capSpeechLength(input: string): string {
  return input;
}
// ── Hidden model block stripping ──────────────────────────────────────
/**
 * Hidden model block tags whose content should never be spoken. During
 * streaming the closing tag may not have arrived yet, so we strip from
 * the opening tag to end-of-string.
 *
 * The upstream `sanitizeSpeechText` only strips *closed* `<think>` blocks,
 * so an in-progress `<think>reasoning so far` leaks "reasoning so far"
 * into the voice output.  We handle it here before sanitization.
 */
const HIDDEN_VOICE_BLOCK_RE =
  /<(think|thought|analysis|reasoning|tool_calls?|tools?)(?=[\s/>])[^>]*>[\s\S]*?(?:<\/\1>|$)/gi;
function parseJsonObject(input: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(input.trim());
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    // error-policy:J3 "is this structured?" probe — non-JSON message text is
    // the normal case and speaks as plain text
    return null;
  }
}
function extractStructuredVoiceText(input: string): string | null {
  const parsed = parseJsonObject(input);
  if (!parsed) return null;
  if (typeof parsed.text === "string") {
    return parsed.text;
  }
  if ("actions" in parsed || "params" in parsed || "providers" in parsed) {
    return "";
  }
  return null;
}
export function extractVoiceText(input: string): string {
  let text = extractStructuredVoiceText(input) ?? input;
  text = text.replace(HIDDEN_VOICE_BLOCK_RE, " ");
  text = text.replace(/<\/?[a-zA-Z][^>]*$|<\/?$/s, "");
  return text;
}
export function toSpeakableText(input: string): string {
  const extracted = extractVoiceText(input);
  if (!extracted) return "";
  const normalized = sanitizeSpeechText(extracted);
  if (!normalized) return "";
  return capSpeechLength(normalized);
}
// ── Sentence splitting ────────────────────────────────────────────────
/** Committed words may gain punctuation, but must never turn into a longer word. */
export function isCommittedSpeechPrefix(
  fullText: string,
  prefix: string,
): boolean {
  const full = collapseWhitespace(fullText);
  const committed = collapseWhitespace(prefix);
  return (
    !committed ||
    full === committed ||
    (full.startsWith(committed) &&
      /^[\s.,!?;:…]/u.test(full.slice(committed.length)))
  );
}
// ── Mouth animation ───────────────────────────────────────────────────
export function normalizeMouthOpen(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  const stepped = Math.round(clamped / MOUTH_OPEN_STEP) * MOUTH_OPEN_STEP;
  return stepped < MOUTH_OPEN_STEP ? 0 : Math.min(1, stepped);
}
