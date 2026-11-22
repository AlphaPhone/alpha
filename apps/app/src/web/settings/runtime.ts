// spec/settings/index.md, "Story: Find a setting in a few taps"
import { Effect, Layer, ManagedRuntime } from "effect";
import { layer as platform } from "../../platform/layer.vibe";
import { layer as settings } from "../../settings/layer.vibe";
import { layer as shell } from "../../shell/layer.vibe";
import { layer as voice } from "../../voice/layer.vibe";

/** Settings' services and Machines over the platform, Voice and the shell's activity. */
export const runtime = ManagedRuntime.make(Layer.provide(settings, Layer.provideMerge(Layer.mergeAll(voice, shell), platform)));

/** The services a Settings control may use. */
export type SettingsServices = ManagedRuntime.ManagedRuntime.Success<typeof runtime>;

/** Run one Settings effect for a control; it cannot fail, so nothing is awaited. */
export function perform<A>(program: Effect.Effect<A, never, SettingsServices>): Promise<A> {
  return runtime.runPromise(program);
}
