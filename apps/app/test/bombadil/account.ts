// spec/account/signIn.md, "A wrong code keeps the step, a spent code leaves only Resend, and any other failure returns to the choice"; spec/account/signIn.md, "Nothing starts while the phone is offline"; spec/account/billing.md, "Add funds is offered only on Eliza Cloud, never opens the plan manager, and takes $5 to $1,000"; spec/account/billing.md, "A plan change or cancellation needs the account's own fresh session"; spec/account/sheet.md, "Sign-out is confirmed only for the reviewed account, and closing keeps everything"; spec/account/sheet.md, "The plan notice shows on Home only, until dismissed, and never under a covering screen"; spec/account/google.md, "A disconnect is confirmed only by reading the accounts back"; spec/account/provider.md, "A key is removed only after its own review, and shown only in the host's secure dialog"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const buttonNamed = (document: Document, name: string) =>
  [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === name);

const buttonsNamed = (document: Document, name: string) =>
  [...document.querySelectorAll<HTMLButtonElement>("button")].filter((button) => button.textContent?.trim() === name);

const spentCodeNotVerified = extract(({ document }) => {
  const expired = [...document.querySelectorAll('[role="alert"]')].some((node) => node.textContent?.includes("Code expired"));
  const verify = buttonNamed(document, "Verify");
  return !expired || !verify || verify.disabled;
});

const passkeyNotVerified = extract(({ document }) => {
  const passkey = [...document.querySelectorAll('[role="alert"]')].some((node) => node.textContent?.includes("Passkeys can’t be used in Alpha"));
  return !passkey || buttonNamed(document, "Verify") === undefined;
});

const nothingStartsOffline = extract(({ document }) => {
  const offline = [...document.querySelectorAll('[aria-label="Sign-in connection"]')].some((node) => node.textContent?.includes("offline"));
  if (!offline) return true;
  return ["Send code", "Continue with Google", "Verify", "Resend"].every((name) => {
    const button = buttonNamed(document, name);
    return !button || button.disabled;
  });
});

const fundsNotPlans = extract(({ document }) => {
  const funds = document.querySelector('[aria-label="Add funds"]');
  const plans = document.querySelector('[aria-label="Plans"]');
  return !(funds && plans);
});

const fundsBounded = extract(({ document }) => {
  const funds = document.querySelector('[aria-label="Add funds"]');
  if (!funds) return true;
  const outOfRange = [...funds.querySelectorAll('[role="alert"]')].some((node) => node.textContent?.includes("$5 to $1,000"));
  const proceed = [...funds.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === "Continue");
  return !outOfRange || !proceed || proceed.disabled;
});

const expiredQuoteNotConfirmed = extract(({ document }) => buttonsNamed(document, "Review expired").every((button) => button.disabled));

const signOutOnlyInReview = extract(({ document }) => {
  const review = document.querySelector('section[aria-label="Sign out"]');
  const confirm = review ? undefined : [...document.querySelectorAll<HTMLButtonElement>("button.bg-destructive")].find((button) => button.textContent?.trim() === "Sign out");
  return confirm === undefined;
});

const planNoticeOnlyOnHome = extract(({ document }) => {
  const account = [...document.querySelectorAll("h1")].some((heading) => heading.textContent?.trim() === "Account");
  const notice = [...document.querySelectorAll('[role="alert"]')].some((node) =>
    node.textContent?.includes("Plan needed") && node.querySelector('button[aria-label="Dismiss"]') !== null);
  return !(account && notice);
});

const disconnectNeedsConfirmation = extract(({ document }) => {
  const confirming = document.body.textContent?.includes("Mail stays in Google") ?? false;
  return confirming || buttonsNamed(document, "Disconnect").length === 0;
});

const keyRemovalNeedsReview = extract(({ document }) => {
  const review = document.querySelector('[aria-label="Remove key"]');
  return buttonsNamed(document, "Remove").every((button) => review !== null && review.contains(button));
});

const providerKeysMasked = extract(({ document }) =>
  [...document.querySelectorAll<HTMLInputElement>("#provider-text-key, #provider-voice-key")].every((input) => input.type === "password" && input.autocomplete === "off"));

/** A code the host says expired is never offered for verification. */
export const accountSpentCodeIsNeverVerified = always(() => spentCodeNotVerified.current);

/** A passkey second factor is never offered a code to verify. */
export const accountPasskeyIsNeverVerified = always(() => passkeyNotVerified.current);

/** While Android reports the phone offline, no sign-in step is offered. */
export const accountNothingStartsOffline = always(() => nothingStartsOffline.current);

/** Add funds and the plan manager are never on screen together. */
export const accountFundsNeverOpenThePlanManager = always(() => fundsNotPlans.current);

/** An amount outside $5 to $1,000 is never sent to checkout. */
export const accountFundsAreBounded = always(() => fundsBounded.current);

/** An expired plan-change review is never confirmed. */
export const accountExpiredQuoteIsNeverConfirmed = always(() => expiredQuoteNotConfirmed.current);

/** The confirming Sign out appears only inside the sign-out review. */
export const accountSignOutNeedsItsReview = always(() => signOutOnlyInReview.current);

/** The plan notice never shows over the open Account screen. */
export const accountPlanNoticeOnlyOnHome = always(() => planNoticeOnlyOnHome.current);

/** Disconnecting Google is offered only after saying what stays in Google. */
export const accountDisconnectNeedsConfirmation = always(() => disconnectNeedsConfirmation.current);

/** A saved key's Remove appears only inside its own review. */
export const accountKeyRemovalNeedsItsReview = always(() => keyRemovalNeedsReview.current);

/** Own-key fields never show what is typed and are never offered to autofill. */
export const accountProviderKeysAreMasked = always(() => providerKeysMasked.current);
