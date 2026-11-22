/**
 * What Alpha says about Read aloud. The reading policy itself (the credential heuristics, the
 * native reject codes and the capability probe) stays in the shared native browser surface; only
 * the wording shown to the user is Alpha's.
 */

/** Why Read aloud is refused; Alpha's words for the native refusal (`BrowserPageReading.UNSUPPORTED_MESSAGE`). */
export const READING_UNSUPPORTED_MESSAGE =
  "Read aloud is unavailable on this device: its Android System WebView cannot read a page privately. Update Android System WebView.";
/** The refusal for a page, or a released excerpt, that reads as credentials or a verification code. */
export const SENSITIVE_READING_MESSAGE =
  "This page may contain credentials or verification codes. Open a different page.";
/**
 * The native refusal for a page the shared reader treats as sensitive or cannot verify. It names
 * no credentials: the native check refuses pages for reasons this renderer cannot see.
 */
export const SENSITIVE_PAGE_MESSAGE =
  "Alpha doesn’t read pages that may be sensitive or that it can’t verify. Open a different page.";
