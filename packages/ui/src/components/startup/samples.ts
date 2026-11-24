import { createElement, type ReactNode } from "react";
import type { StartupAccessRowState } from "./StartupAccessPanel.tsx";
import type { StartupAccess, StartupAccessAction, StartupAccessWord } from "./vocabulary.ts";

/** What stands in for Home, which the home area draws. */
export const sampleHome: ReactNode = createElement(
  "div",
  { className: "flex flex-col gap-3 p-6" },
  createElement("h1", { className: "font-display text-4xl font-light" }, "Tuesday 17"),
  createElement("button", { type: "button", className: "h-12 w-32 rounded-tile bg-secondary text-base font-medium" }, "Notes"),
);

/** What stands in for Ask Alpha's conversation, which the assistant area draws. */
export const sampleChat: ReactNode = createElement("p", { className: "px-4 text-base" }, "What can I do for you?");

/** Shows a row where it lives, in the access checklist. */
export const inGroup = (story: () => ReactNode) => createElement("ol", null, story());

/** Sizes a page to the viewport, as the app shell does. */
export const fullHeight = (story: () => ReactNode) => createElement("div", { className: "flex h-dvh flex-col" }, story());

export const phoneAccesses: StartupAccess[] = ["Notifications", "Microphone", "Camera", "Location", "Calendar", "Photos", "Files"];

/** The rows of a walkthrough: what the phone said of each access, and the one action the step being asked offers. */
export const accessRows = (
  words: Partial<Record<StartupAccess, StartupAccessWord>>,
  act?: { access: StartupAccess; action: StartupAccessAction; busy?: boolean },
  accesses = phoneAccesses,
): StartupAccessRowState[] =>
  accesses.map((access) => ({ access, word: words[access] ?? "AskFirst", ...(act?.access === access ? { action: act.action, busy: act.busy } : {}) }));
