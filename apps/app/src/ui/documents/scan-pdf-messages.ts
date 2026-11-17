/**
 * What the scan reviews show when making a scan PDF fails. The shared plugin-files PDF conversion
 * and its text-layer check refuse with plain errors; Alpha words each refusal, keyed by the reviewed
 * message text, and never shows that text itself.
 */

/** The text-layer check (`scan-text-layer.ts`) and the saved-text copy (`scan-draft.ts`). */
export const SCAN_TEXT_LAYER_REFUSALS: ReadonlyMap<string, string> = new Map([
  ["Choose at most 2,000 text lines per page.", "A page can have at most 2,000 text lines."],
  ["Invalid scanned line or position.", "A text line or its position is invalid."],
  ["Page text exceeds 100,000 characters.", "A page's text is over 100,000 characters."],
  ["Saved text does not match the document pages.", "The saved text does not match the document pages."],
]);

/** PDF conversion (`scan-pdf.ts`). */
const PDF_REFUSALS: ReadonlyMap<string, string> = new Map([
  ["Choose 1 to 20 pages, up to 64 MB total.", "Choose 1 to 20 pages, up to 64 MB in total."],
  ["Text review must match every document page.", "The reviewed text must cover every page."],
  [
    "Searchable PDF supports English and Western European text. Correct unsupported characters or export an image-only PDF.",
    "A searchable PDF supports English and Western European text only. Correct unsupported characters or save a PDF without text.",
  ],
  ["Choose a supported image up to 16 MB.", "Each page must be a JPEG, PNG or WebP photo up to 16 MB."],
  ["Image dimensions are too large.", "A page photo is larger than 32 million pixels."],
  ["Image conversion is unavailable.", "PDF conversion is unavailable on this device."],
  ["Image conversion failed.", "A page could not be converted to PDF."],
  ["PDF exceeds the 8 MB export limit.", "The PDF is over the 8 MB limit."],
  ...SCAN_TEXT_LAYER_REFUSALS,
]);

function refusal(map: ReadonlyMap<string, string>, error: unknown): string | undefined {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" ? map.get(message) : undefined;
}

/** Alpha's sentence for a refused scan PDF; `fallback` for anything else. */
export function scanPdfErrorText(error: unknown, fallback = "PDF failed"): string {
  return refusal(PDF_REFUSALS, error) ?? fallback;
}

/** Alpha's sentence for refused reviewed or saved text lines; `fallback` for anything else. */
export function scanTextLayerErrorText(error: unknown, fallback: string): string {
  return refusal(SCAN_TEXT_LAYER_REFUSALS, error) ?? fallback;
}
