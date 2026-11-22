// spec/camera/index.md
import { Effect, Layer, ManagedRuntime } from "effect";
import { layer } from "../../camera/layer.vibe";
import { layer as platform } from "../../platform/layer.vibe";

/** The runtime of every Camera and Photos service and Machine, over the platform's services. */
export const cameraRuntime = ManagedRuntime.make(Layer.provideMerge(layer, platform));

/** Start one of Camera's effects from a control; its failures are its services' own to report. */
export function run(effect: Effect.Effect<unknown, unknown, Layer.Success<typeof layer> | Layer.Success<typeof platform>>): void {
  cameraRuntime.runFork(effect);
}
