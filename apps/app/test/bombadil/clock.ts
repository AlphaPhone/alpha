// spec/app/clock/index.md, "A ringing alarm takes priority over a ringing timer"; spec/app/clock/index.md, "One sheet opens at a time, and editing an alarm requires a positive alarm id"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const clockAlerts = extract(({ document }) =>
  document.querySelectorAll("[role=alertdialog][aria-label='Ringing alarm'], [role=alertdialog][aria-label='Ringing timer']").length);

const openSheets = extract(({ document }) =>
  document.querySelectorAll("[role=dialog]").length);

/** At most one ringing Clock alert dialog is shown at any time (alarms take priority over timers). */
export const clockAtMostOneRingingAlert = always(() => clockAlerts.current <= 1);

/** At most one modal Clock sheet or dialog is stacked at a time. */
export const clockAtMostOneModalSheet = always(() => openSheets.current <= 1);
