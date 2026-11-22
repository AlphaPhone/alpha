// spec/voice/dictation.md, "Story: Dictate into the draft I am writing"; spec/voice/dictation.md, "A dictation opens for one draft of one account, and opening another draft replaces it"
import { Effect } from "effect";
import { useSyncExternalStore } from "react";
import { useMachine } from "../../../gen/voice__dictation.react.ts";
import { Microphone } from "../../voice/capture.vibe";
import { Dictation, type DictationTarget } from "../../voice/dictation.vibe";
import { DictationButton } from "./DictationButton.tsx";
import { levelStore } from "./levels.ts";
import { readVoice, runVoice, useVoiceRuntime, type VoiceRuntime } from "./runtime.tsx";

export interface DictationControlProps {
  /** The draft the words go into; its area keeps it and sends it. */
  target: DictationTarget;
}

function Connected({ runtime, target }: { runtime: VoiceRuntime; target: DictationTarget }) {
  const { state } = useMachine(runtime);
  const store = levelStore(runtime);
  const levels = useSyncExternalStore(store.subscribe, store.get);
  const dictation = Effect.service(Dictation);
  const ours = readVoice(runtime, Effect.flatMap(dictation, (d) => d.targetId())) === target.id;
  const route = readVoice(runtime, Effect.flatMap(dictation, (d) => d.route()));
  const native = readVoice(runtime, Effect.flatMap(Effect.service(Microphone), (m) => m.native()));
  const use = (work: (d: Dictation.Shape) => Effect.Effect<void>) => () => runVoice(runtime, Effect.flatMap(dictation, work));
  return (
    <DictationButton
      dictation={ours ? state : undefined}
      route={route}
      native={native}
      levels={levels}
      onStart={use((d) => Effect.andThen(ours ? Effect.void : d.into(target), d.start()))}
      onStop={use((d) => d.stop())}
      onRetry={use((d) => d.retry())}
      onDiscard={use((d) => d.discard())}
      onCancel={use((d) => d.cancel())}
      onOpenSettings={() => runVoice(runtime, Effect.flatMap(Effect.service(Microphone), (m) => m.openAppSettings()))}
    />
  );
}

/**
 * The service other areas mount beside a draft: `Dictation.into(target)`, then record, Stop to insert, never send.
 * @model spec/voice/dictation.md
 */
export function DictationControl({ target }: DictationControlProps) {
  const runtime = useVoiceRuntime();
  return runtime === undefined ? null : <Connected runtime={runtime} target={target} />;
}
