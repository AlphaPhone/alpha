// spec/clock/index.md
// The Clock area's screens and its notices surface, for the shell's registry.
import { AlarmClock, BellRing } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { ClockScreen } from "./ClockScreen.tsx";
import { NoticesSurface } from "./NoticesSurface.tsx";
import { RemindersScreen } from "./RemindersScreen.tsx";

/** Clock and Reminders, on every build. */
export const screens: AppScreen[] = [
  { id: "clock", title: "Clock", icon: AlarmClock, availability: "everywhere", Screen: ClockScreen },
  { id: "reminders", title: "Reminders", icon: BellRing, availability: "everywhere", Screen: RemindersScreen },
];

/** The notices over every screen: ringing alarms and timers, deletion Undo, notification questions, workflow notices and retained data. */
export const surfaces: AppSurface[] = [
  { id: "clock-notices", slot: "notices", availability: "everywhere", Surface: NoticesSurface },
];
