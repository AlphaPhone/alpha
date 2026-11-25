// spec/app/reminders/index.md, "The default list always exists, every item belongs to a valid list, timing rules hold, and ids remain unique and below the next id"; spec/app/reminders/alerts.md, "Every tracked alert has a unique positive id, never rings early, never rings while completed, and any snoozed alert is strictly in the future"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const snapshot = extract(({ document }) => {
  const main = document.querySelector("main[aria-label=Reminders]");
  const listsText = [...document.querySelectorAll("main[aria-label=Reminders] button")].map((btn) => btn.textContent ?? "");
  const alertBanners = document.querySelectorAll("[role=alertdialog][aria-label^='Due reminder:']").length;
  return {
    onOverview: Boolean(main && document.querySelector("section[aria-label='Smart lists']")),
    hasDefaultList: listsText.some((text) => text.includes("Reminders")),
    alertBanners,
  };
});

/** On the Reminders overview, the default Reminders list is always present. */
export const remindersDefaultListAlwaysShown = always(() => !snapshot.current.onOverview || snapshot.current.hasDefaultList);

/** At most one due-reminder alert banner occupies the screen at a time. */
export const remindersAtMostOneAlertBanner = always(() => snapshot.current.alertBanners <= 1);
