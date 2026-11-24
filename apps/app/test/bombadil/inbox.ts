// spec/inbox/reader.md, "Formatted mail is sanitized, isolated and shown whole or not at all"; spec/inbox/accounts.md, "Saved accounts show at once but stay read-only until Cloud confirms them"; spec/inbox/operations.md, "An account holds at most one operation, and a kind is offered only when the account allows it"; spec/inbox/reader.md, "A mail link opens only over HTTPS, only in Alpha's Browser, after the owner reviews it"; spec/inbox/mailbox.md, "Home learns only the unread count of the loaded inbox and whether more mail is beyond it"; spec/inbox/reader.md, "Saving keeps the exact copy, and an unconfirmed save is never offered again in the same review"; spec/inbox/drafts.md, "Edits apply only to the open draft at the revision they were made on"; spec/inbox/accounts.md, "Saved accounts show at once but stay read-only until Cloud confirms them"; spec/inbox/drafts.md, "Suggestions are recent addresses of the same account that match what is typed, each once, never one already added"; spec/inbox/attachments.md, "Attachments stay within the account's policy, ten files and 5 MiB, with distinct names"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const formattedMailIsInert = extract(({ document }) =>
  [...document.querySelectorAll<HTMLIFrameElement>('iframe[title="Formatted email"]')].every((frame) => {
    const sandbox = frame.getAttribute("sandbox") ?? "";
    return frame.hasAttribute("sandbox") && !sandbox.includes("allow-scripts") && !sandbox.includes("allow-forms") && !sandbox.includes("allow-top-navigation");
  }),
);

const savedMailChangesNothing = extract(({ document }) => {
  const saved = [...document.querySelectorAll("p")].some((node) => node.textContent?.trim() === "Saved mail");
  if (!saved) return true;
  return ["Archive", "Move to Trash", "Star", "Mark read", "Mark unread"].every((name) => {
    const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
    return !button || button.disabled;
  });
});

const sendNeedsARecipient = extract(({ document }) => {
  const form = document.querySelector<HTMLFormElement>('form[aria-label="New email"], form[aria-label="Reply"], form[aria-label="Reply all"], form[aria-label="Forward"]');
  if (!form) return true;
  const chips = form.querySelectorAll('button[aria-label^="Remove "]').length;
  const send = [...form.querySelectorAll<HTMLButtonElement>('button[type="submit"]')][0];
  const cc = form.querySelector<HTMLInputElement>('input[aria-label="Cc"]')?.value.trim() ?? "";
  const bcc = form.querySelector<HTMLInputElement>('input[aria-label="Bcc"]')?.value.trim() ?? "";
  return chips > 0 || cc !== "" || bcc !== "" || !send || send.disabled;
});

const linksOpenOnlyAfterReview = extract(({ document }) =>
  [...document.querySelectorAll<HTMLAnchorElement>('article a[href]')].every((anchor) => anchor.closest('[role="dialog"]') !== null),
);

const homeShowsOnlyACount = extract(({ document }) =>
  [...document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Open Inbox:"]')].every((button) =>
    /^Open Inbox: \d+\+? unread emails$/.test(button.getAttribute("aria-label") ?? "") && /^\d+\+?$/.test(button.textContent?.trim() ?? "")),
);

const unconfirmedSaveIsNotOfferedAgain = extract(({ document }) => {
  const unconfirmed = [...document.querySelectorAll('[role="status"]')].some((node) => node.textContent?.startsWith("Couldn't confirm the save"));
  if (!unconfirmed) return true;
  return [...document.querySelectorAll<HTMLButtonElement>("button")].filter((button) => button.textContent?.trim() === "Save").every((button) => button.disabled);
});

const replySubjectIsFixed = extract(({ document }) =>
  [...document.querySelectorAll<HTMLFormElement>('form[aria-label="Reply"], form[aria-label="Reply all"]')].every((form) =>
    form.querySelector<HTMLInputElement>('input[aria-label="Subject"]')?.readOnly !== false),
);

const noConnectPromptBeforeTheCheck = extract(({ document }) => {
  const loading = [...document.querySelectorAll('[role="status"]')].some((node) => node.textContent?.trim() === "Loading Inbox…");
  return !loading || ![...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Connect Gmail");
});

const linkReviewShowsTheAddress = extract(({ document }) =>
  [...document.querySelectorAll('[role="dialog"]')].filter((dialog) => dialog.textContent?.includes("Open this link in Browser?")).every((dialog) =>
    [...dialog.querySelectorAll("p")].some((node) => /^https:\/\//.test(node.textContent?.trim() ?? ""))),
);

/** Formatted mail is always in a sandbox that runs no script, submits no form and navigates nowhere. */
export const inboxFormattedMailIsInert = always(() => formattedMailIsInert.current);

/** While the shown accounts are the saved ones, no mailbox change is offered. */
export const inboxSavedMailChangesNothing = always(() => savedMailChangesNothing.current);

/** Send is never offered without a recipient. */
export const inboxSendNeedsARecipient = always(() => sendNeedsARecipient.current);

/** A message never offers a raw link; links open through the review. */
export const inboxLinksOpenOnlyAfterReview = always(() => linksOpenOnlyAfterReview.current);

/** Home's mail word is the unread count alone, never a sender, subject or snippet. */
export const inboxHomeShowsOnlyACount = always(() => homeShowsOnlyACount.current);

/** A save whose result could not be confirmed is not offered again in the same review. */
export const inboxUnconfirmedSaveIsNotOfferedAgain = always(() => unconfirmedSaveIsNotOfferedAgain.current);

/** A reply keeps the subject of the message it answers. */
export const inboxReplySubjectIsFixed = always(() => replySubjectIsFixed.current);

/** No Connect prompt shows while the Inbox is still restoring or checking accounts. */
export const inboxNoConnectPromptBeforeTheCheck = always(() => noConnectPromptBeforeTheCheck.current);

/** The link review always shows the full HTTPS address that would open. */
export const inboxLinkReviewShowsTheAddress = always(() => linkReviewShowsTheAddress.current);

const recipientSuggestions = extract(({ document }) =>
  Array.from(document.querySelectorAll("form")).flatMap((form) => {
    const list = form.querySelector('ul[aria-label="Suggested recipients"]');
    if (list === null) return [];
    const offered = Array.from(list.querySelectorAll("button")).map((button) => button.textContent?.trim() ?? "");
    const added = Array.from(form.querySelectorAll('button[aria-label^="Remove "]')).map((button) => (button.getAttribute("aria-label") ?? "").slice("Remove ".length));
    return [{ offered, added }];
  }));

/** At most eight recipients are suggested, each once, and never one already added. */
export const inboxSuggestionsAreNewAddresses = always(() => recipientSuggestions.current.every(({ offered, added }) =>
  offered.length <= 8 && new Set(offered).size === offered.length && offered.every((address) => !added.includes(address))));

const outgoingFiles = extract(({ document }) =>
  Array.from(document.querySelectorAll('form ul[aria-label="Attachments"]')).map((list) => ({
    names: Array.from(list.querySelectorAll('button[aria-label^="Remove "]')).map((button) => (button.getAttribute("aria-label") ?? "").slice("Remove ".length).toLowerCase()),
    bytes: Array.from(list.querySelectorAll("li")).reduce((sum, row) => sum + Number(/· (\d+) bytes/.exec(row.textContent ?? "")?.[1] ?? "0"), 0),
  })));

/** A draft holds at most ten attachments, of distinct names, within 5 MiB in all. */
export const inboxAttachmentsWithinPolicy = always(() => outgoingFiles.current.every(({ names, bytes }) =>
  names.length <= 10 && new Set(names).size === names.length && bytes <= 5242880));
