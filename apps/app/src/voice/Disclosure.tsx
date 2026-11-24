// spec/app/voice/index.md, "Before audio first leaves the phone, the owner is shown what is sent and where, and decides"
import { ConfirmDialog } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine as VoiceMachine } from "../../gen/app__voice.effect.vibe";
import { useMachine } from "../../gen/app__voice.react.ts";
import { untimed } from "../runtime/reactor.vibe";

export interface DisclosureProps {
  runtime: ManagedRuntime.ManagedRuntime<VoiceMachine, unknown>;
}

/** What a conversation about to leave the phone sends and to whom, asked once for the account. @model spec/app/voice/index.md */
export function Disclosure({ runtime }: DisclosureProps) {
  const { can, send } = useMachine(runtime);
  const agree = { type: "answerDisclosure", agree: true, now: untimed } as const;
  const decline = { type: "answerDisclosure", agree: false, now: untimed } as const;
  return (
    <ConfirmDialog
      open={can(agree)}
      title="Send your voice to Alpha Cloud?"
      confirmLabel="Allow"
      cancelLabel="Don't allow"
      onConfirm={() => void send(agree)}
      onCancel={() => { if (can(decline)) void send(decline); }}
    />
  );
}
