// spec/clock/index.md; spec/clock/handoff.md, "Preparing shows the exact request with the phone's time zone; leaving, Back or hiding retires it"; spec/clock/reminderPage.md, "Back closes the innermost open layer: the Reopen question, then the form, then the detail; with none open it is the shell's"
// The Clock area's screens and its notices surface, for the shell's registry.
import { Effect } from "effect";
import { AlarmClock, BellRing } from "lucide-react";
import { ClockHandoff } from "../../clock/handoff.vibe";
import { RemindersPage } from "../../clock/reminder-page.vibe";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { ClockScreen } from "./ClockScreen.tsx";
import { NoticesSurface } from "./NoticesSurface.tsx";
import { RemindersScreen } from "./RemindersScreen.tsx";
import { ask } from "../shell/services.ts";

/** Back on Clock: an open Clock review is retired before Back leaves Clock. */
function clockBack(): Promise<boolean> {
  return ask(Effect.flatMap(Effect.service(ClockHandoff), (handoff) => handoff.back()), false);
}

/** Back on Reminders: a dialog, the form or the reminder shown closes before Back leaves Reminders. */
function remindersBack(): Promise<boolean> {
  return ask(Effect.flatMap(Effect.service(RemindersPage), (page) => page.back()), false);
}

/** Clock and Reminders, on every build; Back closes their own layers before the shell's. */
export const screens: AppScreen[] = [
  { id: "clock", title: "Clock", icon: AlarmClock, availability: "everywhere", Screen: ClockScreen, back: clockBack },
  { id: "reminders", title: "Reminders", icon: BellRing, availability: "everywhere", Screen: RemindersScreen, back: remindersBack },
];

/** The notices over every screen: ringing alarms and timers, deletion Undo, notification questions, workflow notices and retained data. */
export const surfaces: AppSurface[] = [
  { id: "clock-notices", slot: "notices", availability: "everywhere", Surface: NoticesSurface },
];
