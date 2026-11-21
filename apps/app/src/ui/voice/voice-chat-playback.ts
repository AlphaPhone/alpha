/**
 * Speakable-text extraction for voice chat: strips structured payloads and
 * hidden model blocks, then sanitizes the text for TTS.
 */
import { sanitizeSpeechText } from "@elizaos/core/speech";
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
function extractVoiceText(input: string): string {
  let text = extractStructuredVoiceText(input) ?? input;
  text = text.replace(HIDDEN_VOICE_BLOCK_RE, " ");
  text = text.replace(/<\/?[a-zA-Z][^>]*$|<\/?$/s, "");
  return text;
}
// Keep clock ranges conversational without changing bare numeric ranges, dates or phone numbers.
const TWELVE_HOUR_CLOCK = String.raw`(?:0?[1-9]|1[0-2])(?::[0-5]\d)?`;
const SEPARATOR = String.raw`[ \t]*[-–—−][ \t]*`;
const MERIDIEM_RANGE = new RegExp(
  String.raw`(?<![\p{L}\p{N}:+.-])(${TWELVE_HOUR_CLOCK}(?:[ \t]*[ap]m)?)${SEPARATOR}(${TWELVE_HOUR_CLOCK}[ \t]*[ap]m)\b`,
  "giu",
);
const CLOCK = String.raw`(?:[01]?\d|2[0-3]):[0-5]\d`;
const CLOCK_RANGE = new RegExp(
  String.raw`(?<![\p{L}\p{N}:+.-])(${CLOCK})${SEPARATOR}(${CLOCK})\b`, "giu",
);

function speakClockRanges(text: string): string {
  return text
    .replace(/(\d[ \t]*)([ap])\.[ \t]*m\b(?:\.(?=[ \t]*[,;:–—−-]))?/gi, '$1$2m')
    .replace(/\b([ap]m)(?:[ \t]+\1)+\b/gi, '$1')
    .replace(MERIDIEM_RANGE, '$1 to $2')
    .replace(CLOCK_RANGE, '$1 to $2');
}

export function toSpeakableText(input: string): string {
  const extracted = extractVoiceText(input);
  if (!extracted) return "";
  const normalized = sanitizeSpeechText(speakClockRanges(extracted));
  if (!normalized) return "";
  return normalized;
}
