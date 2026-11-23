// spec/voice/capture.md, "Story: One voice surface at a time hears me"; spec/voice/conversation.md, "Story: Start talking only when Alpha can listen safely"; spec/voice/dictation.md, "Story: Dictate into the draft I am writing"
import type { ReactNode } from "react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { VoiceIndicator } from "./VoiceIndicator.tsx";

export { ConversationControl, type ConversationControlProps } from "./ConversationControl.tsx";
export { DictationControl, type DictationControlProps } from "./DictationControl.tsx";

/** Props of the shell's voice wrapper. */
export interface VoiceRuntimeProviderProps {
  readonly runtime?: unknown;
  readonly children: ReactNode;
}

/** Voice components read the app's one runtime themselves; the shell's wrapper renders its children unchanged. */
export function VoiceRuntimeProvider({ children }: VoiceRuntimeProviderProps) {
  return <>{children}</>;
}

/** Voice has no app of its own. */
export const screens: AppScreen[] = [];

/** The voice indicator at the top of every screen. */
export const surfaces: AppSurface[] = [{ id: "voice-indicator", slot: "top", availability: "everywhere", Surface: VoiceIndicator }];
