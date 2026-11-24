// spec/app/calendar/index.md, "Back closes one layer at a time: the form, the delete sheet, the event, the Calendars sheet, the date picker, then search"
import { Effect } from "effect";
import * as Calendar from "../../gen/app__calendar.effect.vibe";
import { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { type Resident, type Shown, area } from "../runtime/area.tsx";
import { Calendar as Screen } from "./Calendar.tsx";
import { calendar } from "./calendar.vibe";

function Opened({ runtime }: Shown<Calendar.Machine | Resident>) {
  return <Screen runtime={runtime} onSettings={() => void runtime.runPromise(Effect.flatMap(Shell, (shell) => Effect.ignore(shell.send({ type: "openView", view: "Settings" }))))} />;
}

/** Calendar, at its view: its machine is its own, and it takes Back for each layer it has open. */
export default area(calendar, Opened, {
  back: Effect.flatMap(Calendar.Machine, (machine) => Effect.flatMap(machine.get(), (state) =>
    Calendar.canGoBack(state) ? Effect.as(Effect.ignore(machine.send({ type: "goBack" })), true) : Effect.succeed(false))),
});
