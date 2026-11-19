/**
 * What the scan reviews show when on-device text recognition fails. The shared plugin-files local
 * OCR refuses with plain errors; Alpha words each refusal, keyed by the reviewed message text, and
 * never shows that text itself.
 */
import { SCAN_TEXT_LAYER_REFUSALS } from "./scan-pdf-messages";

const REFUSALS: ReadonlyMap<string, string> = new Map([
  ["Choose a JPEG, PNG or WebP image up to 16 MB.", "Choose a JPEG, PNG or WebP photo up to 16 MB."],
  ["The local scan engine could not start.", "On-device text recognition could not start."],
  ["The local scan engine returned unreadable data.", "On-device text recognition returned unreadable data."],
  ["The image could not be read by the local scan engine.", "On-device text recognition could not read this photo."],
  ["The scan request could not start.", "The text recognition request could not start."],
  ["Choose an image with at most 32 million pixels.", "Choose a photo with at most 32 million pixels."],
  ["Image processing is unavailable.", "Photo processing is unavailable on this device."],
  ["Image conversion failed.", "This photo could not be prepared for text recognition."],
  ["The scan result is invalid or too large.", "The recognized text is invalid or too long."],
  ["The scan engine did not return text positions.", "Text recognition did not return line positions."],
  ["Invalid scanned text position.", "A recognized line has an invalid position."],
  ["Too many scanned lines.", "Too many lines were recognized on this page."],
  ...SCAN_TEXT_LAYER_REFUSALS,
]);

/** Alpha's sentence for a failed on-device text recognition; `fallback` for anything else. */
export function localOcrErrorText(error: unknown, fallback: string): string {
  const message = (error as { message?: unknown } | null)?.message;
  return (typeof message === "string" && REFUSALS.get(message)) || fallback;
}
