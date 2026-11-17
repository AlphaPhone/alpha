import { Layer } from "effect";
import { reminders } from "./sample/sample.vibe";
import { shell } from "./shell/shell.vibe";

/**
 * The machines that live from launch to exit, in one root runtime: every machine kept in a store, so its opening runs
 * at launch, and every machine whose state another area follows. A machine follows only machines of a row above it.
 */
export const resident = Layer.provideMerge(Layer.mergeAll(reminders), Layer.mergeAll(shell));
