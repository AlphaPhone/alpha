// spec/inbox/reader.md, "Formatted mail is sanitized, isolated and shown whole or not at all"; spec/inbox/accounts.md, "Saved accounts show at once but stay read-only until Cloud confirms them"; spec/inbox/operations.md, "An account holds at most one operation, and a kind is offered only when the account allows it"; spec/inbox/reader.md, "A mail link opens only over HTTPS, only in Alpha's Browser, after the owner reviews it"
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

/** Formatted mail is always in a sandbox that runs no script, submits no form and navigates nowhere. */
export const inboxFormattedMailIsInert = always(() => formattedMailIsInert.current);

/** While the shown accounts are the saved ones, no mailbox change is offered. */
export const inboxSavedMailChangesNothing = always(() => savedMailChangesNothing.current);

/** Send is never offered without a recipient. */
export const inboxSendNeedsARecipient = always(() => sendNeedsARecipient.current);

/** A message never offers a raw link; links open through the review. */
export const inboxLinksOpenOnlyAfterReview = always(() => linksOpenOnlyAfterReview.current);
