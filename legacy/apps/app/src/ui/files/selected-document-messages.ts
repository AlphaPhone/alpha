/**
 * What Files shows when an operation on a selected document (open, share, rename, PDF preview,
 * reopening a saved selection) does not succeed, or for a status line it leaves behind. Android
 * answers each with a status and a sentence from the shared `SelectedDocuments` registry
 * (plugin-native-media); several outcomes share one status, so the reviewed sentence picks the
 * outcome and Alpha words it here. The registry's own text is never shown. The text preview's
 * sentences are worded by `selectedPreviewText` in `storage-presentation.ts`.
 */

/** Keyed by every sentence `SelectedDocuments.java` answers outside its text reader. */
export const SELECTED_DOCUMENT_OUTCOMES: ReadonlyMap<string, string> = new Map([
  // Reopening the most recent or one saved selection (restore, describeSelected).
  [
    "The saved document provider is unavailable. Try again or select another document.",
    "The app that stores the saved document is unavailable. Try again or select another document.",
  ],
  ["No saved document selection", "No saved document is selected."],
  ["Access to this file ended. Select it again.", "Access to this file ended. Select it again."],
  ["The document provider is unavailable. Try again.", "The app that stores this document is unavailable. Try again."],
  // Rename.
  ["Select this document again.", "Select this document again."],
  ["Enter a valid file name.", "Enter a valid file name."],
  [
    "This provider did not grant rename access. Select the file again or rename it in its document app.",
    "The app that stores this file did not allow renaming. Select the file again or rename it in that app.",
  ],
  ["The provider did not rename the document.", "The app that stores this document did not rename it."],
  [
    "The provider completed the rename but did not retain access. Select the renamed file to verify it and continue.",
    "The file was renamed, but access to it ended. Select the renamed file to check it and continue.",
  ],
  ["Access expired. Select this document again.", "Access expired. Select this document again."],
  [
    "The provider could not confirm the rename. Refresh or reselect before retrying.",
    "The rename could not be confirmed. Refresh or select the file again before trying again.",
  ],
  // PDF preview.
  ["PDF preview is unavailable here. Open it in Android to view it.", "PDF preview is unavailable here. Open it in Android to view it."],
  ["This selection is not a PDF.", "This file is not a PDF."],
  ["PDF preview timed out. Try again.", "PDF preview took too long. Try again."],
  ["PDF rendered on this device. Nothing was uploaded.", "PDF shown from this device. Nothing was uploaded."],
  [
    "This PDF is encrypted or access expired. Open it in a compatible app or select it again.",
    "This PDF is encrypted or access to it expired. Open it in a compatible app or select it again.",
  ],
  [
    "PDF preview is unavailable. It may be malformed, encrypted, or larger than 20 MiB.",
    "PDF preview is unavailable. The file may be damaged, encrypted, or larger than 20 MiB.",
  ],
  // A picker callback with no document (readTransientText).
  ["Select a document first.", "Select a document first."],
  // Share.
  ["Select this document again before sharing it.", "Select this document again before sharing it."],
  ["This item is no longer available.", "This item is no longer available."],
  ["Choose an app to share this item. Nothing has been sent yet.", "Choose an app to share this item. Nothing has been sent yet."],
  ["Access expired or the item was removed. Select it again.", "Access expired or the item was removed. Select it again."],
  ["Android could not open sharing for this item.", "Android could not open sharing for this item."],
  // Open in Android.
  ["Select this document again before opening it.", "Select this document again before opening it."],
  [
    "Opened the selected document. Complete any further action in that app.",
    "Opened the selected document. Finish anything else in that app.",
  ],
  ["No compatible app is installed to open this document.", "No installed app can open this document."],
  ["Android could not open the selected document.", "Android could not open the selected document."],
]);

/**
 * Alpha's sentence for a selected-document result: the outcome its reviewed sentence names, else
 * `fallback`. The result's own text is never returned.
 */
export function selectedDocumentText(
  result: { message?: unknown } | null | undefined,
  fallback: string,
): string {
  const message =
    typeof result?.message === "string" ? result.message.trim() : "";
  return SELECTED_DOCUMENT_OUTCOMES.get(message) ?? fallback;
}
