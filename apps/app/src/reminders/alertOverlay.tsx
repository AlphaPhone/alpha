// spec/app/reminders/alerts.md, "Story: Alert on due reminders and act from the banner"
import { Effect, Layer } from "effect";
import { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { area, type Resident, type Shown } from "../runtime/area.tsx";
import { AlertBanner } from "./AlertBanner.tsx";
import { beginEditReminder } from "./editor.vibe";
import { remindersStore } from "./store.ts";

function RemindersAlertOverlay({ runtime }: Shown<Resident>) {
  return (
    <AlertBanner
      runtime={runtime}
      onOpenItem={(itemId) => {
        const target = remindersStore.snapshot().snapshot.items.find((item) => item.id === itemId);
        void runtime.runPromise(Effect.gen(function* () {
          const shell = yield* Shell;
          yield* Effect.ignore(shell.send({ type: "openView", view: "Reminders" }));
          if (target) yield* beginEditReminder(target);
        }));
      }}
    />
  );
}

/** Due-reminder notification banner mounted at `overlay`: reuses resident Reminders and Alerts machines. */
export default area(Layer.empty, RemindersAlertOverlay);
