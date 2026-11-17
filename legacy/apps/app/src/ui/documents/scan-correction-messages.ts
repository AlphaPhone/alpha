/**
 * What the scan page review shows when finding or correcting the page fails. The shared
 * plugin-files page detection and perspective correction refuse with plain errors; Alpha words
 * each refusal, keyed by the reviewed message text, and never shows that text itself.
 */
const REFUSALS: ReadonlyMap<string, string> = new Map([
  ["Keep all four corners inside the image.", "Keep all four corners inside the photo."],
  ["Keep corners in clockwise order without crossing the page edges.", "Place the corners around the page without crossing its edges."],
  ["Select a larger page area.", "Select a larger page area."],
  ["Choose an image up to 16 MB.", "Choose a photo up to 16 MB."],
  ["Image dimensions are too large.", "This photo is too large to correct."],
  ["Image correction is unavailable.", "Page correction is unavailable on this device."],
  ["Image processing is unavailable.", "Page correction is unavailable on this device."],
  ["Could not encode the corrected page.", "The corrected page could not be saved."],
  ["Page detection is unavailable.", "Page detection is unavailable on this device."],
]);

/** Alpha's sentence for a failed page detection or correction; `fallback` for anything else. */
export function scanCorrectionErrorText(error: unknown, fallback: string): string {
  const message = (error as { message?: unknown } | null)?.message;
  return (typeof message === "string" && REFUSALS.get(message)) || fallback;
}
