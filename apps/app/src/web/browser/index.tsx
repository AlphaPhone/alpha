// spec/browser/session.md, "Story: Browse in tabs"
import { Globe } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { BrowserScreen } from "./BrowserScreen.tsx";
import { back } from "./services.ts";

/** Browser's one app screen, on every build; Back closes Browser's own layers and pages before the shell's. */
export const screens: AppScreen[] = [{ id: "browser", title: "Browser", icon: Globe, availability: "everywhere", Screen: BrowserScreen, back }];

/** Browser keeps no surface mounted outside its screen. */
export const surfaces: AppSurface[] = [];
