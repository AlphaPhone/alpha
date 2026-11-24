// spec/browser/session.md, "A new tab, normal or private, opens selected with its address field, unless eight are open"; spec/browser/egress.md, "Share waits for the menu to close, then hands Android only the same document, one share at a time"; spec/browser/reading.md, "Read aloud asks the native host for one reading of the shown settled HTTPS page, and speaks only the token it returns, once"; spec/browser/pageContext.md, "The agent has no separate page read: a page-text request is refused with where the page comes from, and only back, forward and reload are view commands"
import type { AgentOutcome, BrowserNotice } from "../../gen/browser__session.ts";
import type { EgressProblem } from "../../gen/browser__egress.ts";
import type { HandoffProblem } from "../../gen/browser__handoff.ts";
import type { ReadingProblem } from "../../gen/browser__reading.ts";

/** Alpha's sentence when the WebView lacks isolated profiles. */
export const PROFILE_UNSUPPORTED = "Update WebView";
/** The native tab host's refusal for a WebView without isolated profiles. */
export const PROFILE_UNSUPPORTED_NATIVE = "This Android WebView does not support isolated browser profiles";
/** Why Read aloud and Ask about page are unavailable on this device. */
export const READING_UNSUPPORTED =
  "Read aloud and Ask about page are unavailable on this device: its Android System WebView cannot read a page privately. Update Android System WebView.";
/** The refusal for a page or excerpt that reads as credentials or a code. */
export const SENSITIVE_READING = "This page may contain credentials or verification codes. Open a different page.";
/** What the agent is told when it asks to read page text: the open page comes with each message, or through Ask about page. */
export const NO_PAGE_READ =
  "There is no separate page read. While Browser is on screen, the open page comes with each message as browserPage, unless the owner turned off Browser page for Alpha in Settings, Privacy. Without it, the owner can choose \"Ask about page\" in the Browser menu to share a reviewed excerpt.";
/** What the agent is told for a view interaction Browser has no command for. */
export const NO_VIEW_COMMAND = "Browser supports back, forward and reload from chat.";
/** Why an open of an address the page wrote, not the owner, did not run without its card. */
export const PAGE_LINK_UNREVIEWED = "That link came from the page, not from you, so Alpha opens it only after you approve its card.";
/** The native refusal for a page the reader treats as sensitive or cannot verify. */
export const SENSITIVE_PAGE = "Alpha doesn’t read pages that may be sensitive or that it can’t verify. Open a different page.";

const REFUSALS: ReadonlyMap<string, string> = new Map([
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
  [PROFILE_UNSUPPORTED_NATIVE, PROFILE_UNSUPPORTED],
  ["Private tabs need an Android System WebView that can securely delete their data. Update Android System WebView to use private tabs.", "Private tabs need an Android System WebView that can safely delete their data. Update it to use private tabs."],
  ["Could not create an isolated browser tab", "The tab couldn’t be opened."],
  ["Enter an HTTP or HTTPS address without credentials", "Enter an HTTP or HTTPS address without a username or password."],
  ["Saved bookmarks could not be read. Existing bookmarks were not changed.", "Saved bookmarks couldn’t be read. They weren’t changed."],
  ["Only HTTPS addresses without embedded credentials can be bookmarked.", "Only HTTPS addresses without a username or password can be bookmarked."],
  ["Bookmark could not be saved. The device stores up to 100 bookmarks; existing data was not changed.", "Bookmark not saved. Alpha keeps up to 100 bookmarks; nothing else changed."],
  ["Saved tabs and history could not be read. They were not changed.", "Saved tabs and history couldn’t be read. They weren’t changed."],
  ["Browsing data is being cleared.", "Clearing browsing data. Try again in a moment."],
  ["Tabs and history could not be saved.", "Tabs and history couldn’t be saved."],
  ["Browsing data is already being cleared.", "Browsing data is already being cleared."],
  ["This Android WebView cannot clear browser data. Update Android System WebView.", "This phone’s WebView can’t clear browsing data. Update Android System WebView."],
  ["Browsing history could not be cleared.", "Browsing history couldn’t be cleared."],
  ["Website data could not be cleared.", "Website data couldn’t be cleared."],
  ["Load a website before clearing its data.", "Load a website before clearing its data."],
  ["This Android WebView cannot clear site data.", "This phone’s WebView can’t clear a site’s data."],
  ["Site data could not be cleared.", "This site’s data couldn’t be cleared."],
  ["Load a visible HTTPS page before reading", "Load an HTTPS page before reading."],
  ["Browser page changed", "The page changed. Alpha didn’t get it with this message."],
  ["Private tabs are never shared", "Private tabs aren’t shared with Alpha."],
  ["Only public HTTPS pages are shared", "Only public HTTPS pages are shared with Alpha."],
  ["The visible HTTPS page changed. Review it again before leaving Alpha.", "The page changed. Review it again before leaving Alpha."],
  ["No other installed browser can open this page. Use a password or another sign-in method.", "No other browser on this phone can open this page. Use a password or another way to sign in."],
  ["The other browser could not be opened. Your page remains in Alpha.", "The other browser didn’t open. Your page is still open in Alpha."],
  ["The page changed. Try again from the page.", "The page changed. Try again from the page."],
  ["No other installed browser can open this page.", "No other browser on this phone can open this page."],
  ["Select an available speech route before reading", "Choose an available voice before reading."],
  ["Reading unavailable on a sensitive or unverified page", SENSITIVE_PAGE],
  ["Reading unavailable on a sensitive or ambiguous page", SENSITIVE_PAGE],
  ["This page is not ready for private reading. Reload this page, then try again.", "This page isn’t ready to be read privately. Reload it, then try again."],
  ["Reading cancelled or page unavailable", "Reading stopped, or the page is no longer available."],
  ["Clear website data in your browser settings.", "Clear this site’s data in your browser’s settings."],
  ["Sharing is unavailable in this browser. Use Copy text.", "Sharing isn’t available in this browser. Use Copy link."],
  ["The page changed. Share it again.", "The page changed. Share it again."],
  [READING_UNSUPPORTED, "Read aloud and Ask about page need a newer Android System WebView. Update it to use them."],
]);

const PERMISSION_KINDS = ["camera", "microphone", "location"] as const;

const NOTICES: ReadonlyMap<string, string> = new Map([
  ["This address type is not supported.", "Browser can’t open this kind of address."],
  ...PERMISSION_KINDS.map((kind): [string, string] => [
    `Android has not allowed Alpha Phone to use your ${kind}. You can allow it in Android Settings.`,
    `Android hasn’t allowed Alpha to use your ${kind}. You can allow it in Android Settings.`,
  ]),
  ["Blocked a camera or microphone request from an embedded site.", "Blocked a camera or microphone request from a site inside this page."],
  ["Blocked a sign-in prompt from a different site.", "Blocked a sign-in request from a different site."],
  ["Sign-in was cancelled.", "Sign-in cancelled."],
  ["Android has not allowed Alpha Phone to use the camera. You can allow it in Android Settings.", "Android hasn’t allowed Alpha to use the camera. You can allow it in Android Settings."],
  ["The camera is unavailable.", "The camera isn’t available."],
  ["Passkeys are not supported in Alpha Browser. Use a password or open the page in another browser from the menu.", "Alpha’s Browser doesn’t support passkeys. Use a password, or open the page in another browser from the menu."],
  ["Blocked a pop-up that opened without a tap.", "Blocked a pop-up that opened without a tap."],
  ["Close a tab to open this link in a new tab.", "Tab limit. Close a tab to open this link in a new tab."],
  ["This link could not open in a new tab.", "This link couldn’t open in a new tab."],
  ["Blocked a link to another app that opened without a tap.", "Blocked a link to another app that opened without a tap."],
  ["This link type is not supported.", "Browser can’t open this kind of link."],
  ["No app on this device can open this link.", "No app on this phone can open this link."],
  ["This link could not be opened.", "This link couldn’t be opened."],
  ["Website permissions for this site could not be cleared. Use Clear browsing data.", "This site’s permissions couldn’t be cleared. Use Clear browsing data."],
]);

const PAGE_ERRORS: ReadonlyMap<string, string> = new Map([
  ["This page is taking too long. Check your connection, then reload from the menu.", "The page is taking too long to load. Check your connection, then reload from the menu."],
  ["This address type is not supported.", "Browser can’t open this kind of address."],
  ["Isolated browser renderer is unavailable.", "Browser can’t show pages right now. Close this tab and open a new one."],
  ["Secure connection failed. The certificate was not accepted.", "Secure connection failed: the site’s certificate wasn’t accepted."],
  ["Page could not load. Check the address and connection, then reload.", "The page didn’t load. Check the address and connection, then reload."],
  ["This site asks for a password over an insecure connection. It was not sent.", "This site asked for a password over an insecure connection. Nothing was sent."],
  ["Sign-in was cancelled. Reload to try again.", "Sign-in cancelled. Reload to try again."],
  ["Sign-in failed. Reload to try again.", "Sign-in didn’t work. Reload to try again."],
  ["Loading stopped. Reload from the menu to try again.", "Loading stopped. Reload from the menu to try again."],
  ["This site has no secure (HTTPS) connection.", "This site has no secure (HTTPS) connection, so it can’t be opened."],
  ["Browser renderer stopped. Close this tab and open a new one.", "This tab stopped working. Close it and open a new one."],
  ["Page blocked", "This site moved on inside its frame. Open it in your browser to continue."],
  ["Stopped", "Loading stopped. Reload from the menu to try again."],
]);

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Alpha's sentence for a refused Browser call; a sentence the host did not word reads as `fallback`. @throws {never} */
export function refusalText(message: unknown, fallback = "Browser couldn’t do that. Try again."): string {
  return REFUSALS.get(text(message)) ?? fallback;
}

/** Alpha's sentence for a tab-host notice; an unknown notice reads as a blocked page action. @throws {never} */
export function noticeText(message: unknown): string {
  return NOTICES.get(text(message)) ?? "Browser blocked something on this page.";
}

/** Alpha's sentence for a page the tab host could not show. @throws {never} */
export function pageErrorText(message: unknown): string {
  return PAGE_ERRORS.get(text(message)) ?? "The page didn’t load. Reload to try again.";
}

/** Alpha's sentence for each session notice. */
export const SESSION_NOTICES: Readonly<Record<BrowserNotice, string>> = {
  TabLimit: "Tab limit. Close a tab before opening another.",
  InvalidAddress: "Enter search words or a valid HTTP or HTTPS address without a username or password.",
  SavedTabsUnreadable: "Saved tabs and history couldn’t be opened. They were kept unchanged; Clear browsing data resets them.",
  ClearedData: "Cleared",
  ClearFailed: "Browsing data couldn’t be cleared.",
  NoSecureConnection: "This site has no secure (HTTPS) connection, so it can’t be opened.",
  TabFailed: "The tab couldn’t be opened.",
  ProfileUnsupported: PROFILE_UNSUPPORTED,
};

/** Alpha's sentence for each page-egress problem. */
export const EGRESS_NOTICES: Readonly<Record<EgressProblem, string>> = {
  LoadPageToShare: "Load the current page before sharing it.",
  PageChangedBeforeShare: "The page changed before sharing. Try again.",
  ShareFailed: "Sharing didn’t work. Try again.",
  LoadPageToCopy: "Load the current page before copying its link.",
  Copied: "Link copied",
  ClipboardUnavailable: "Clipboard unavailable",
  HttpsOnly: "HTTPS only",
};

/** Alpha's sentence for each handoff problem. */
export const HANDOFF_NOTICES: Readonly<Record<HandoffProblem, string>> = {
  NeedsHttpsPage: "Load an HTTPS page before opening another browser.",
  PageChanged: "The page changed. Review it again before leaving Alpha.",
  NotOpened: "The other browser didn’t open. Your page is still open in Alpha.",
};

/** Alpha's sentence for each reading problem. */
export const READING_NOTICES: Readonly<Record<ReadingProblem, string>> = {
  ReadingUnsupported: READING_UNSUPPORTED,
  NoVoice: "This agent doesn’t offer speech to read this page.",
  LoadHttpsToRead: "Load an HTTPS page before reading.",
  LoadHttpsToAsk: "Load a public HTTPS page before asking about it.",
  SensitivePage: SENSITIVE_READING,
  ReadingFailed: "Reading stopped, or the page is no longer available.",
  ReadingStopped: "The page changed. Ask again.",
  SpeechFailed: "Alpha couldn’t read this page aloud. Try again.",
};

/** What a refused agent request tells the owner, in words they can act on. */
export const AGENT_REFUSALS: Readonly<Record<AgentOutcome, string>> = {
  Dispatched: "Sent to Browser.",
  Done: "Done.",
  RefusedFull: "Browser already has 8 tabs open. Close one, then ask again.",
  RefusedChanged: "The Browser page changed after the request. Nothing was done.",
  RefusedPrivate: "The tab showing in Browser is private. Ask again from that tab.",
  RefusedShowing: "That tab is already showing.",
  RefusedNoPage: "No page is open in this tab.",
  RefusedUnloaded: "This tab’s page hasn’t loaded since Alpha restarted. Open Browser so it can load, then ask again.",
  RefusedNoHistory: "There is no page to go to in this tab.",
  RefusedNotLoading: "The page is not loading.",
  RefusedNoFind: "This Browser cannot find text in a page.",
  RefusedCovered: "Close Browser’s menu, tab list, library, share sheet or address editor first.",
  RefusedNotShowing: "Browser is not showing.",
  FailedOpen: "Browser couldn’t open that page.",
  RefusedListChanged: "Browser’s tabs changed after you reviewed them. Nothing was closed. Ask again to see the tabs that are open now.",
};
