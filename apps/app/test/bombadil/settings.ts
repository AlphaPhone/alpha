// spec/settings/passwords.md, "The page sees vault entries only as metadata, and only while it is unlocked"; spec/settings/index.md, "Developer pages open only in a build with test mocks"; spec/settings/updates.md, "Install is offered only for the offer the last answer holds for this install"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const noPasswordValue = extract(({ document }) =>
  Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"]')).every((input) => input.getAttribute("aria-label") === "Network password"));

const developerHidden = extract(({ document }) =>
  !Array.from(document.querySelectorAll("button")).some((b) => b.getAttribute("aria-label") === "Developer") || document.documentElement.dataset.testMocks === "true");

const oneInstallAtATime = extract(({ document }) =>
  document.querySelectorAll('[aria-label="Downloading update"]').length <= 1 && document.querySelectorAll('[aria-label="Checking for updates"][aria-busy="true"]').length <= 1);

const eraseIsReviewed = extract(({ document }) =>
  !document.body.textContent?.includes("Alpha’s data was erased"));

/** No page of Settings or Passwords holds a password field other than the masked Wi-Fi passphrase that goes to Android. */
export const settingsNeverTakesAPassword = always(() => noPasswordValue.current);

/** The Developer row exists only in a build with test mocks. */
export const settingsDeveloperOnlyWithTestMocks = always(() => developerHidden.current);

/** At most one check or install shows as running. */
export const settingsOneUpdateTaskAtATime = always(() => oneInstallAtATime.current);

/** Settings never claims that Alpha's data was erased; only the native reset can, by restarting the app. */
export const settingsNeverClaimsAnErasure = always(() => eraseIsReviewed.current);
