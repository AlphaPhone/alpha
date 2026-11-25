// spec/app/voice/index.md, "What the owner says is shown as it is heard"
import type { ManagedRuntime } from "effect";
import { useMemo, useSyncExternalStore } from "react";
import type { Machine } from "../../gen/app__voice.effect.vibe";
import { useMachine } from "../../gen/app__voice.react.ts";
import { VoiceWords } from "./voice.vibe";

/** Only this transcript tail reads interim words. They have no message actions or history ID. */
export function VoiceInterim({ runtime }: { runtime: ManagedRuntime.ManagedRuntime<Machine | VoiceWords, unknown> }) {
  const { state } = useMachine(runtime);
  const memory = useMemo(() => runtime.runSync(VoiceWords).memory, [runtime]);
  const interim = useSyncExternalStore(memory.subscribeInterim, memory.interimSnapshot);
  if (interim === undefined || state?.phase !== "Listening" || state.mic !== "On" || state.muted
    || interim.session !== state.session || interim.turn !== state.turn) return null;
  return (
    <div
      data-alpha-voice-interim=""
      role="group"
      aria-label="Heard so far, not sent"
      aria-live="off"
      className="max-w-4/5 self-end rounded-tile rounded-br-box bg-alpha px-4 py-2.75 text-base leading-normal text-alpha-foreground wrap-anywhere"
    >
      {interim.text}
    </div>
  );
}
