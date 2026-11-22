// spec/voice/conversation.md, "Story: Start talking only when Alpha can listen safely"; spec/voice/dictation.md, "Story: Dictate into the draft I am writing"
import { initial as conversationInitial, type Conversation } from "../../../gen/voice__conversation.ts";
import { initial as dictationInitial, type Dictation } from "../../../gen/voice__dictation.ts";

/** A Cloud conversation listening, interruptible, with mute offered. */
export const listening: Conversation = { ...conversationInitial, shown: "Listening", route: "Cloud", duplex: "Interruptible", cloudDisclosed: true, muteOffered: true, starts: 1 };
/** The same conversation speaking a reply, muted. */
export const speakingMuted: Conversation = { ...listening, shown: "Speaking", muted: true };
/** A conversation that takes turns and says so once. */
export const takingTurns: Conversation = { ...listening, shown: "Speaking", route: "Device", duplex: "TakesTurns", notice: "CannotInterrupt" };
/** Voice refused because a call holds the microphone. */
export const refusedForCall: Conversation = { ...conversationInitial, notice: "CallHoldsMicrophone" };
/** Voice closed after a stop that could not be confirmed. */
export const stopUnconfirmed: Conversation = { ...conversationInitial, mediaUnconfirmed: true, notice: "StopUnconfirmed", starts: 1 };

/** A dictation recording into draft 1. */
export const recording: Dictation = { ...dictationInitial, stage: "Recording", target: 1, account: 1, ticket: 2 };
/** A dictation that kept its clip after hearing nothing. */
export const keptClip: Dictation = { ...dictationInitial, stage: "Recorded", target: 1, account: 1, ticket: 2, captures: 1, clipMs: 4000, failure: "NothingHeard" };
/** A dictation whose microphone was refused. */
export const denied: Dictation = { ...dictationInitial, stage: "Ready", target: 1, account: 1, ticket: 2, failure: "MicrophoneDenied" };

/** Level bars of a voice in mid-sentence. */
export const levels: readonly number[] = Array.from({ length: 44 }, (_, index) => 4 + ((index * 7) % 30));
