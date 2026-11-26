// spec/app/voice/index.md, "What the owner says is shown as it is heard"; spec/app/voice/index.md, "What the owner said shows at once as their message, with Alpha's working dots under it, until the conversation records it"
import { AssistantTurnNote } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { useMemo, useSyncExternalStore } from "react";
import type { Machine } from "../../gen/app__voice.effect.vibe";
import { useMachine } from "../../gen/app__voice.react.ts";
import { showsWhatWasSaid } from "../../gen/app__voice.ts";
import { VoiceWords } from "./voice.vibe";

const bubble = "max-w-4/5 self-end rounded-tile rounded-br-box bg-alpha px-4 py-2.75 text-base leading-normal text-alpha-foreground wrap-anywhere";

/**
 * Only this transcript tail reads the words of Talk's current turn. They have no message actions or history ID.
 * While the owner speaks: what is heard so far. Once the turn ends: what was said, as the owner's message, with the
 * working dots under it, as the Sunday demo build drew a sent voice turn (v119 template.html:4721-4726), until the
 * recorded message and reply take their place.
 */
export function VoiceInterim({ runtime }: { runtime: ManagedRuntime.ManagedRuntime<Machine | VoiceWords, unknown> }) {
  const { state } = useMachine(runtime);
  const memory = useMemo(() => runtime.runSync(VoiceWords).memory, [runtime]);
  const interim = useSyncExternalStore(memory.subscribeInterim, memory.interimSnapshot);
  const said = useSyncExternalStore(memory.subscribeSaid, memory.saidSnapshot);
  if (state !== undefined && said !== undefined && said.text !== "" && showsWhatWasSaid(state, said.session, said.turn)) {
    return (
      <>
        <div data-alpha-voice-said="" className={bubble}>{said.text}</div>
        <AssistantTurnNote status="sending" />
      </>
    );
  }
  if (interim === undefined || state?.phase !== "Listening" || state.mic !== "On" || state.muted
    || interim.session !== state.session || interim.turn !== state.turn) return null;
  return (
    <div
      data-alpha-voice-interim=""
      role="group"
      aria-label="Heard so far, not sent"
      aria-live="off"
      className={bubble}
    >
      {interim.text}
    </div>
  );
}
