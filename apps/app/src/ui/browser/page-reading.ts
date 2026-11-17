/**
 * What Alpha says about page reading (read aloud, ask about a page). The reading policy itself (the
 * credential heuristics, the native reject codes, the capability probe and the page-question excerpt
 * rule) stays in the shared native browser surface; only the wording shown to the user is Alpha's.
 */

/** Why both actions are refused, in the same words as the native refusal (`BrowserPageReading.UNSUPPORTED_MESSAGE`). */
export const READING_UNSUPPORTED_MESSAGE =
  "Read aloud and Ask about page are unavailable on this device: its Android System WebView cannot read a page privately. Update Android System WebView.";
/** The refusal for a page, or a released excerpt, that reads as credentials or a verification code. */
export const SENSITIVE_READING_MESSAGE =
  "This page may contain credentials or verification codes. Open a different page.";
