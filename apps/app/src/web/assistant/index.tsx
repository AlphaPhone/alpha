// spec/assistant/index.md, "Story: Ask my assistant from anywhere"
import { Sparkles } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { AssistantDock } from "./AssistantDock.tsx";
import { AssistantScreen } from "./AssistantScreen.tsx";
import { ContentQuestionReview } from "./ContentQuestionReview.tsx";

/** The assistant's screen: the full conversation. */
export const screens: AppScreen[] = [
  { id: "assistant", title: "Alpha", icon: Sparkles, availability: "everywhere", Screen: AssistantScreen },
];

/** The assistant's always-mounted surfaces: the compact dock and its sheet, and the review of a question another area handed over. */
export const surfaces: AppSurface[] = [
  { id: "assistant-dock", slot: "dock", availability: "everywhere", Surface: AssistantDock },
  { id: "assistant-question-review", slot: "overlay", availability: "everywhere", Surface: ContentQuestionReview },
];
