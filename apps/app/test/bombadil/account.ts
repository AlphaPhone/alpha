// spec/account/signIn.md, "A wrong code keeps the step, a spent code leaves only Resend, and any other failure returns to the choice"; spec/account/signIn.md, "Nothing starts while the phone is offline"; spec/account/billing.md, "Add funds is offered only on Eliza Cloud, never opens the plan manager, and takes $5 to $1,000"; spec/account/sheet.md, "Sign-out is confirmed only for the account that was reviewed, and closing keeps everything"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const buttonNamed = (document: Document, name: string) =>
  [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === name);

const spentCodeNotVerified = extract(({ document }) => {
  const expired = [...document.querySelectorAll('[role="alert"]')].some((node) => node.textContent?.includes("Code expired"));
  const verify = buttonNamed(document, "Verify");
  return !expired || !verify || verify.disabled;
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

const signOutOnlyInReview = extract(({ document }) => {
  const review = document.querySelector('section[aria-label="Sign out"]');
  const confirm = review ? undefined : [...document.querySelectorAll<HTMLButtonElement>("button.bg-destructive")].find((button) => button.textContent?.trim() === "Sign out");
  return confirm === undefined;
});

/** A code the host says expired is never offered for verification. */
export const accountSpentCodeIsNeverVerified = always(() => spentCodeNotVerified.current);

/** While Android reports the phone offline, no sign-in step is offered. */
export const accountNothingStartsOffline = always(() => nothingStartsOffline.current);

/** Add funds and the plan manager are never on screen together. */
export const accountFundsNeverOpenThePlanManager = always(() => fundsNotPlans.current);

/** The confirming Sign out appears only inside the sign-out review. */
export const accountSignOutNeedsItsReview = always(() => signOutOnlyInReview.current);
