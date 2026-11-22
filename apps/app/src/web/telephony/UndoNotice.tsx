// spec/telephony/undo.md, "A deletion is queued once for its window, and Undo is offered only until the window ends"
import { useEffect } from "react";
import { useMachine } from "../../../gen/telephony__undo.react.ts";
import { initial, type Undo } from "../../../gen/telephony__undo.ts";
import { ContactsView } from "../../telephony/contacts.vibe";
import { MessagesView } from "../../telephony/messages.vibe";
import { DeletionUndo } from "../../telephony/undo.vibe";
import { VoicemailView } from "../../telephony/voicemail.vibe";
import { Button } from "../components/ui/index.ts";
import { runtime, type TelephonyRuntime } from "./runtime.ts";

const WORDS = { MessageDeletion: "Message deleted", VoicemailDeletion: "Voicemail deleted", ContactDeletion: "Contact deleted" } as const;

export interface UndoNoticeViewProps {
  /** The deletions waiting in their window. */
  undo: Undo;
  /** Undo one while its window lasts. */
  onUndo: (token: string) => void;
}

/**
 * The newest deletion still in its window, with Undo; or that Undo came too late.
 * @model spec/telephony/undo.md
 * @design design.md
 */
export function UndoNoticeView({ undo, onUndo }: UndoNoticeViewProps) {
  const latest = undo.queued.at(-1);
  if (!latest) return undo.tooLate ? <p role="status" className="rounded-md bg-card px-4 py-2 text-sm">Undo was too late. The deletion already went ahead.</p> : null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-md bg-card px-4 py-2 text-card-foreground shadow-md">
      <span className="flex-1 text-sm">{WORDS[latest.kind]}</span>
      <Button variant="ghost" size="sm" onClick={() => onUndo(latest.token)}>Undo</Button>
    </div>
  );
}

export interface UndoNoticeProps {
  /** The runtime the notice runs on. */
  runtime?: TelephonyRuntime;
}

/**
 * The notices surface for telephony deletions; an undone deletion reads its list again.
 * @model spec/telephony/undo.md
 */
export function UndoNotice({ runtime: on = runtime }: UndoNoticeProps) {
  const { state = initial } = useMachine(on);
  useEffect(() => {
    const ticking = on.runFork(DeletionUndo.use((u) => u.run()));
    return () => ticking.interruptUnsafe();
  }, [on]);
  return (
    <UndoNoticeView
      undo={state}
      onUndo={async (token) => {
        const kind = state.queued.find((q) => q.token === token)?.kind;
        if (!(await on.runPromise(DeletionUndo.use((u) => u.undo(token))))) return;
        if (kind === "MessageDeletion") on.runFork(MessagesView.use((v) => v.refresh(false)));
        else if (kind === "VoicemailDeletion") on.runFork(VoicemailView.use((v) => v.refresh()));
        else on.runFork(ContactsView.use((v) => v.read("", true)));
      }}
    />
  );
}
