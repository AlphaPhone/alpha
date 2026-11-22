// spec/browser/session.md, "Story: Browse in tabs"
import { Globe } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { BrowserScreen } from "./BrowserScreen.tsx";

/** Browser's one app screen, on every build. */
export const screens: AppScreen[] = [{ id: "browser", title: "Browser", icon: Globe, availability: "everywhere", Screen: BrowserScreen }];

/** Browser keeps no surface mounted outside its screen. */
export const surfaces: AppSurface[] = [];
