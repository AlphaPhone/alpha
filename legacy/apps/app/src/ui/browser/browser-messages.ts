/**
 * What Alpha's Browser says for the shared native tab host's refusals, notices and page errors.
 * Android's `BrowserTabHostPlugin` (plugin-native-browser-surface, registered as `AlphaBrowser`
 * with Alpha's names "Alpha Phone", "Alpha" and "Alpha Browser"), its reviewed reading and the
 * staged `BrowserTabSession` answer in English sentences; each one is worded by Alpha here and the
 * host's text is never shown.
 */
import { READING_UNSUPPORTED_MESSAGE, SENSITIVE_PAGE_MESSAGE } from "./page-reading";

/** Alpha's sentence when the WebView lacks isolated profiles. */
export const PROFILE_UNSUPPORTED_MESSAGE = "Update WebView";

/** Keyed by every sentence a Browser call can be refused with. */
export const BROWSER_REFUSALS: ReadonlyMap<string, string> = new Map([
  ["Browser closed", "Browser closed. Open it again to continue."],
  ["Expired browser session", "This Browser session ended. Try again."],
  ["Browser tab is unavailable", "This tab is no longer open."],
  ["Browser operation failed", "Browser couldn’t do that. Try again."],
  ["Invalid browser identity", "This tab couldn’t be opened."],
  ["Invalid tab", "This tab couldn’t be opened."],
  ["Browser tab identity changed", "This tab changed between private and normal. Open it again."],
  ["Close a tab before opening another", "Tab limit. Close a tab before opening another."],
  ["Close a tab before opening another.", "Tab limit. Close a tab before opening another."],
  ["Browsing data is being cleared. Try again in a moment.", "Clearing browsing data. Try again in a moment."],
  ["This Android WebView does not support isolated browser profiles", PROFILE_UNSUPPORTED_MESSAGE],
  [
    "Private tabs need an Android System WebView that can securely delete their data. Update Android System WebView to use private tabs.",
    "Private tabs need an Android System WebView that can safely delete their data. Update it to use private tabs.",
  ],
  ["Could not create an isolated browser tab", "The tab couldn’t be opened."],
  ["Enter an HTTP or HTTPS address without credentials", "Enter an HTTP or HTTPS address without a username or password."],
  ["Saved bookmarks could not be read. Existing bookmarks were not changed.", "Saved bookmarks couldn’t be read. They weren’t changed."],
  ["Only HTTPS addresses without embedded credentials can be bookmarked.", "Only HTTPS addresses without a username or password can be bookmarked."],
  [
    "Bookmark could not be saved. The device stores up to 100 bookmarks; existing data was not changed.",
    "Bookmark not saved. Alpha keeps up to 100 bookmarks; nothing else changed.",
  ],
  ["Saved tabs and history could not be read. They were not changed.", "Saved tabs and history couldn’t be read. They weren’t changed."],
  ["Browsing data is being cleared.", "Clearing browsing data. Try again in a moment."],
  ["Tabs and history could not be saved.", "Tabs and history couldn’t be saved."],
  ["Browsing data is already being cleared.", "Browsing data is already being cleared."],
  [
    "This Android WebView cannot clear browser data. Update Android System WebView.",
    "This phone’s WebView can’t clear browsing data. Update Android System WebView.",
  ],
  ["Browsing history could not be cleared.", "Browsing history couldn’t be cleared."],
  ["Website data could not be cleared.", "Website data couldn’t be cleared."],
  ["Load a website before clearing its data.", "Load a website before clearing its data."],
  ["This Android WebView cannot clear site data.", "This phone’s WebView can’t clear a site’s data."],
  ["Site data could not be cleared.", "This site’s data couldn’t be cleared."],
  ["Load a visible HTTPS page before reading", "Load an HTTPS page before reading."],
  ["The visible HTTPS page changed. Review it again before leaving Alpha.", "The page changed. Review it again before leaving Alpha."],
  [
    "No other installed browser can open this page. Use a password or another sign-in method.",
    "No other browser on this phone can open this page. Use a password or another way to sign in.",
  ],
  ["The other browser could not be opened. Your page remains in Alpha.", "The other browser didn’t open. Your page is still open in Alpha."],
  // BrowserReviewedReading and BrowserPageReading.
  ["Select an available speech route before reading", "Choose an available voice before reading."],
  ["Reading unavailable on a sensitive or unverified page", SENSITIVE_PAGE_MESSAGE],
  ["Reading unavailable on a sensitive or ambiguous page", SENSITIVE_PAGE_MESSAGE],
  [
    "This page is not ready for private reading. Reload this page, then try again.",
    "This page isn’t ready to be read privately. Reload it, then try again.",
  ],
  ["Reading cancelled or page unavailable", "Reading stopped, or the page is no longer available."],
  [
    "Read aloud and Ask about page are unavailable on this device: its Android System WebView cannot read a page privately. Update Android System WebView.",
    READING_UNSUPPORTED_MESSAGE,
  ],
]);

/** Android's permission kinds a site can ask for, in the host's notice wording. */
const PERMISSION_KINDS = ["camera", "microphone", "location"] as const;

/** Keyed by every notice the tab host sends about the current page. */
export const BROWSER_NOTICES: ReadonlyMap<string, string> = new Map([
  ["This address type is not supported.", "Browser can’t open this kind of address."],
  ...PERMISSION_KINDS.map(
    (kind) =>
      [
        `Android has not allowed Alpha Phone to use your ${kind}. You can allow it in Android Settings.`,
        `Android hasn’t allowed Alpha to use your ${kind}. You can allow it in Android Settings.`,
      ] as [string, string],
  ),
  ["Blocked a camera or microphone request from an embedded site.", "Blocked a camera or microphone request from a site inside this page."],
  ["Blocked a sign-in prompt from a different site.", "Blocked a sign-in request from a different site."],
  ["Sign-in was cancelled.", "Sign-in cancelled."],
  [
    "Android has not allowed Alpha Phone to use the camera. You can allow it in Android Settings.",
    "Android hasn’t allowed Alpha to use the camera. You can allow it in Android Settings.",
  ],
  ["The camera is unavailable.", "The camera isn’t available."],
  [
    "Passkeys are not supported in Alpha Browser. Use a password or open the page in another browser from the menu.",
    "Alpha’s Browser doesn’t support passkeys. Use a password, or open the page in another browser from the menu.",
  ],
  ["Blocked a pop-up that opened without a tap.", "Blocked a pop-up that opened without a tap."],
  ["Close a tab to open this link in a new tab.", "Tab limit. Close a tab to open this link in a new tab."],
  ["This link could not open in a new tab.", "This link couldn’t open in a new tab."],
  ["Blocked a link to another app that opened without a tap.", "Blocked a link to another app that opened without a tap."],
  ["This link type is not supported.", "Browser can’t open this kind of link."],
  ["No app on this device can open this link.", "No app on this phone can open this link."],
  ["This link could not be opened.", "This link couldn’t be opened."],
  [
    "Website permissions for this site could not be cleared. Use Clear browsing data.",
    "This site’s permissions couldn’t be cleared. Use Clear browsing data.",
  ],
]);

/** Keyed by every reason the tab host gives for a page it could not show. */
export const BROWSER_PAGE_ERRORS: ReadonlyMap<string, string> = new Map([
  [
    "This page is taking too long. Check your connection, then reload from the menu.",
    "The page is taking too long to load. Check your connection, then reload from the menu.",
  ],
  ["This address type is not supported.", "Browser can’t open this kind of address."],
  ["Isolated browser renderer is unavailable.", "Browser can’t show pages right now. Close this tab and open a new one."],
  ["Secure connection failed. The certificate was not accepted.", "Secure connection failed: the site’s certificate wasn’t accepted."],
  ["Page could not load. Check the address and connection, then reload.", "The page didn’t load. Check the address and connection, then reload."],
  [
    "This site asks for a password over an insecure connection. It was not sent.",
    "This site asked for a password over an insecure connection. Nothing was sent.",
  ],
  ["Sign-in was cancelled. Reload to try again.", "Sign-in cancelled. Reload to try again."],
  ["Sign-in failed. Reload to try again.", "Sign-in didn’t work. Reload to try again."],
  ["Loading stopped. Reload from the menu to try again.", "Loading stopped. Reload from the menu to try again."],
  ["Browser renderer stopped. Close this tab and open a new one.", "This tab stopped working. Close it and open a new one."],
]);

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Alpha's sentence for a tab-host notice; an unknown notice reads as a blocked page action. */
export function browserNoticeText(message: unknown): string {
  return BROWSER_NOTICES.get(text(message)) ?? "Browser blocked something on this page.";
}

/** Alpha's sentence for a page the tab host could not show; unknown reasons read as not loaded. */
export function browserPageErrorText(message: unknown): string {
  return BROWSER_PAGE_ERRORS.get(text(message)) ?? "The page didn’t load. Reload to try again.";
}

/** Alpha's sentence for a refused Browser call, or undefined when the sentence is not the host's. */
export function browserRefusalText(message: unknown): string | undefined {
  return BROWSER_REFUSALS.get(text(message));
}
