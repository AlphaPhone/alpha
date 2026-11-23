// spec/voice/dictation.md, "Story: Dictate into the draft I am writing"; spec/voice/dictation.md, "A dictation opens for one draft of one account, and opening another draft replaces it"
import { Effect } from "effect";
import { useMachine } from "../../../gen/voice__dictation.react.ts";
import { useMachine as useCapture } from "../../../gen/voice__capture.react.ts";
import { deniedSettingsOffered, initial as micInitial } from "../../../gen/voice__capture.ts";
import { Microphone } from "../../voice/capture.vibe";
import { Dictation, type DictationTarget } from "../../voice/dictation.vibe";
import { DictationButton } from "./DictationButton.tsx";
import { act, useServiceStream } from "../shell/services.ts";
import { runtime } from "./runtime.ts";

const noLevels: readonly number[] = [];

/** The draft a mounted dictation control fills. */
export interface DictationControlProps {
  /** The draft the words go into; its area keeps it and sends it. */
  target: DictationTarget;
}

/**
 * The service other areas mount beside a draft: `Dictation.into(target)`, then record, Stop to insert, never send.
 * @model spec/voice/dictation.md
 */
export function DictationControl({ target }: DictationControlProps) {
  const { state } = useMachine(runtime);
  const { state: mic = micInitial } = useCapture(runtime);
  const levels = useServiceStream("voice.levels", Effect.map(Effect.service(Dictation), (d) => d.levels()), noLevels, { resets: true });
  const dictation = Effect.service(Dictation);
  const ours = runtime.runSync(Effect.flatMap(dictation, (d) => d.targetId())) === target.id;
  const route = runtime.runSync(Effect.flatMap(dictation, (d) => d.route()));
  const native = runtime.runSync(Effect.flatMap(Effect.service(Microphone), (m) => m.native()));
  const use = (work: (d: Dictation.Shape) => Effect.Effect<void>) => () => { act(Effect.flatMap(dictation, work)); };
  return (
    <DictationButton
      dictation={ours ? state : undefined}
      route={route}
      native={native}
      levels={levels}
      microphoneDenied={deniedSettingsOffered(true, mic)}
      onStart={use((d) => Effect.andThen(ours ? Effect.void : d.into(target), d.start()))}
      onStop={use((d) => d.stop())}
      onRetry={use((d) => d.retry())}
      onDiscard={use((d) => d.discard())}
      onCancel={use((d) => d.cancel())}
      onOpenSettings={() => { act(Effect.flatMap(Effect.service(Microphone), (m) => m.openAppSettings())); }}
    />
  );
}
