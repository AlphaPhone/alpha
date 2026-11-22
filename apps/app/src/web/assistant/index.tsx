// spec/assistant/index.md, "Story: Ask my assistant from anywhere"
import { Sparkles } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { AssistantDock } from "./AssistantDock.tsx";
import { AssistantScreen } from "./AssistantScreen.tsx";

/** The assistant's screen: the full conversation. */
export const screens: AppScreen[] = [
  { id: "assistant", title: "Alpha", icon: Sparkles, availability: "everywhere", Screen: AssistantScreen },
];

/** The assistant's always-mounted surface: the compact dock and its sheet. */
export const surfaces: AppSurface[] = [
  { id: "assistant-dock", slot: "dock", availability: "everywhere", Surface: AssistantDock },
];
