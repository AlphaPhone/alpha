// spec/voice/conversation.md, "Story: Start talking only when Alpha can listen safely"; spec/voice/dictation.md, "Story: Dictate into the draft I am writing"
import { Effect, type Layer, type ManagedRuntime } from "effect";
import { createContext, useContext, type ReactNode } from "react";
import type { layer } from "../../voice/layer.vibe";

/** A runtime that provides the voice layer, which the shell builds once over the platform layers. */
export type VoiceRuntime = ManagedRuntime.ManagedRuntime<Layer.Success<typeof layer>, unknown>;

const Context = createContext<VoiceRuntime | undefined>(undefined);

export interface VoiceRuntimeProviderProps {
  readonly runtime: VoiceRuntime;
  readonly children: ReactNode;
}

/** Gives every voice component below it the shell's runtime. */
export function VoiceRuntimeProvider({ runtime, children }: VoiceRuntimeProviderProps) {
  return <Context.Provider value={runtime}>{children}</Context.Provider>;
}

/** The voice runtime the shell provided, or undefined outside a provider. */
export function useVoiceRuntime(): VoiceRuntime | undefined {
  return useContext(Context);
}

/** Run one effect of a voice service in the background, such as `Effect.flatMap(Effect.service(VoiceConversation), (c) => c.stop())`. */
export function runVoice<A>(runtime: VoiceRuntime, program: Effect.Effect<A, unknown, Layer.Success<typeof layer>>) {
  runtime.runFork(program);
}

/** Read one value of a voice service now, such as the draft dictation is open for. */
export function readVoice<A>(runtime: VoiceRuntime, program: Effect.Effect<A, never, Layer.Success<typeof layer>>): A {
  return runtime.runSync(program);
}
