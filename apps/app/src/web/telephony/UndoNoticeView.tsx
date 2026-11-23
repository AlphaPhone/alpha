// spec/telephony/messages.md, "Delete passes the exact listed row after confirmation, and an unconfirmed delete keeps the row and blocks another"; spec/telephony/voicemail.md, "A delete needs the owner's confirmation of the open voicemail, and a refused delete keeps it"; spec/telephony/contacts.md, "A removal needs the owner's confirmation of the contact read whole, at its version"
import type { UndoView } from "../../telephony/undo.vibe";
import { Button } from "../components/ui/index.ts";

export interface UndoNoticeViewProps {
  /** The deletions waiting in the phone's window, and what the last Undo said. */
  undo: UndoView;
  /** Undo one while its notice offers Undo. */
  onUndo: (key: string) => void;
  /** Dismiss an uncertain outcome; its receipt stays. */
  onDismiss: (key: string) => void;
}

/**
 * The newest deletion still waiting, with Undo while Undo can win, or Dismiss for an uncertain outcome; or what the last Undo said.
 * @design design.md
 */
export function UndoNoticeView({ undo, onUndo, onDismiss }: UndoNoticeViewProps) {
  const latest = undo.notices.at(-1);
  if (!latest) return undo.said ? <p role="status" className="rounded-md bg-card px-4 py-2 text-sm text-card-foreground">{undo.said}</p> : null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-md bg-card px-4 py-2 text-card-foreground shadow-md">
      <span className="flex-1 text-sm">
        <span className="font-medium">{latest.title}</span> {latest.message}
      </span>
      {latest.canUndo && <Button variant="ghost" size="sm" onClick={() => onUndo(latest.key)}>Undo</Button>}
      {latest.uncertain && <Button variant="ghost" size="sm" onClick={() => onDismiss(latest.key)}>Dismiss</Button>}
    </div>
  );
}
