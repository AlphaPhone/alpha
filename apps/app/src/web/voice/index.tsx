// spec/voice/capture.md, "Story: One voice surface at a time hears me"; spec/voice/conversation.md, "Story: Start talking only when Alpha can listen safely"; spec/voice/dictation.md, "Story: Dictate into the draft I am writing"
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { VoiceIndicator } from "./VoiceIndicator.tsx";

export { ConversationControl, type ConversationControlProps } from "./ConversationControl.tsx";
export { DictationControl, type DictationControlProps } from "./DictationControl.tsx";

/** Voice has no app of its own. */
export const screens: AppScreen[] = [];

/** The voice indicator at the top of every screen. */
export const surfaces: AppSurface[] = [{ id: "voice-indicator", slot: "top", availability: "everywhere", Surface: VoiceIndicator }];
