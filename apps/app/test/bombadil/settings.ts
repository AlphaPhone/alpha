// spec/settings/passwords.md, "Each visit of the page has its own generation, and only its own answers count"; spec/settings/passwords.md, "Only Android's own authentication unlocks the vault, and the list follows the unlock"; spec/settings/index.md, "Developer pages open only in a build with test mocks"; spec/settings/updates.md, "One check or install runs at a time, and an explicit check keeps its answer in Settings"; spec/settings/reset.md, "The native answer is worded by Alpha, and one Alpha does not know claims nothing"; spec/settings/reset.md, "Settings offers no backup, import or export of the owner's data"; spec/settings/preferences.md, "Preferences that cannot be read ask before every action and share nothing"; spec/settings/diagnostics.md, "One export runs at a time, and it is shared only when Android's chooser opened"; spec/settings/vocabulary.md, "A reported switch is on or off, and anything else is unknown"
// What Bombadil checks of Settings and Passwords in every state it reaches.
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const noPasswordValue = extract(({ document }) =>
  Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"]')).every((input) => input.getAttribute("aria-label") === "Network password"));

const developerHidden = extract(({ document }) =>
  !Array.from(document.querySelectorAll("button")).some((b) => b.getAttribute("aria-label") === "Developer") || document.documentElement.dataset.testMocks === "true");

const oneUpdateTask = extract(({ document }) =>
  document.querySelectorAll('[aria-label="Downloading update"]').length + document.querySelectorAll('[aria-label="Checking for updates"][aria-busy="true"]').length <= 1);

const eraseIsReviewed = extract(({ document }) =>
  !/Alpha’s data was erased|Alpha's data was erased|Everything was erased/.test(document.body.textContent ?? ""));

const vault = extract(({ document }) => ({
  locked: document.querySelector('[aria-label="Unlock passwords"]') !== null,
  listed: document.querySelector('input[aria-label="Search passwords"]') !== null,
}));

const askSwitch = extract(({ document }) => {
  const toggle = document.querySelector('[role="switch"][aria-label="Ask before Alpha acts"]');
  return {
    locked: toggle?.hasAttribute("disabled") === true || toggle?.hasAttribute("data-disabled") === true,
    on: toggle?.getAttribute("aria-checked") === "true",
    recovering: Array.from(document.querySelectorAll("button")).some((b) => b.getAttribute("aria-label") === "Reset device preferences"),
  };
});

const dataActions = extract(({ document }) =>
  Array.from(document.querySelectorAll("button")).filter((b) => /^(Import|Export|Back up|Restore) (data|Alpha|settings|device|all)/i.test(b.getAttribute("aria-label") ?? b.textContent ?? "")).length);

const exports = extract(({ document }) =>
  document.querySelectorAll('[aria-label="Export diagnostics"][aria-busy="true"]').length);

const unknownSwitches = extract(({ document }) =>
  Array.from(document.querySelectorAll("button[aria-label]")).filter((b) => /^(Bluetooth|Airplane mode|Do Not Disturb), Open settings, opens Android settings$/.test(b.getAttribute("aria-label") ?? "")
    && /\bOff\b/.test(b.textContent ?? "")).length);

/** No page of Settings or Passwords holds a password field other than the masked Wi-Fi passphrase that goes to Android. */
export const settingsNeverTakesAPassword = always(() => noPasswordValue.current);

/** The Developer row exists only in a build with test mocks. */
export const settingsDeveloperOnlyWithTestMocks = always(() => developerHidden.current);

/** At most one check or install shows as running. */
export const settingsOneUpdateTaskAtATime = always(() => oneUpdateTask.current);

/** Settings never claims that Alpha's data was erased; only the native reset can, by restarting the app. */
export const settingsNeverClaimsAnErasure = always(() => eraseIsReviewed.current);

/** A locked vault never shows its list of passwords. */
export const settingsVaultListOnlyWhileUnlocked = always(() => !(vault.current.locked && vault.current.listed));

/** Preferences that need recovery keep Ask before Alpha acts on and locked. */
export const settingsUnreadablePreferencesAskFirst = always(() => !askSwitch.current.recovering || (askSwitch.current.locked && askSwitch.current.on));

/** Settings offers no import, export or backup of the owner's data. */
export const settingsOffersNoDataImportOrExport = always(() => dataActions.current === 0);

/** At most one diagnostics export runs at a time. */
export const settingsOneExportAtATime = always(() => exports.current <= 1);

/** A switch Android did not report is never drawn as Off. */
export const settingsUnknownIsNeverOff = always(() => unknownSwitches.current === 0);
