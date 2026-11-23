// spec/workflows/authoring.md, "Story: Describe a workflow and keep only what this phone can do"; spec/workflows/authoring.md, "Story: Save exactly the draft I reviewed, once"; spec/workflows/authoring.md, "The unsent description is kept for its owner across closing and reopening"
import { WORKFLOW_OPERATION_LABELS } from "@elizaos/plugin-workflow/scope";
import type { Authoring } from "../../../gen/workflows__authoring.ts";
import type { ChangeOutcome, Described, ScheduleNote } from "../../workflows/definitions.vibe";
import { Alert, Button, Sheet, SheetContent, Textarea } from "../components/ui/index.ts";

/** The typed draft sheet: the draft under review and the save kept for it. */
export interface DraftSheetProps {
  open: boolean;
  authoring: Authoring;
  /** The description the owner is typing, kept for this owner across closing and reopening. */
  text: string;
  /** False when the phone could not keep the description; it stays on screen with a warning. */
  textKept: boolean;
  /** The last description's answer. */
  described?: Described;
  /** When the described draft runs, as its review discloses it. */
  note?: ScheduleNote;
  outcome?: ChangeOutcome;
  can: { readonly edit: boolean; readonly save: boolean; readonly resend: boolean; readonly recover: boolean; readonly discard: boolean };
  onOpenChange: (open: boolean) => void;
  onTextChange: (text: string) => void;
  onDescribe: (prompt: string) => void;
  onSave: () => void;
  onRecover: () => void;
  onResend: () => void;
  onDiscard: () => void;
}

/**
 * Describe a phone workflow, review the draft the agent made from this phone's steps, and save exactly that draft once.
 * @model spec/workflows/authoring.md
 * @design design.md
 */
export function DraftSheet({ open, authoring, text, textKept, described, note, outcome, can, onOpenChange, onTextChange, onDescribe, onSave, onRecover, onResend, onDiscard }: DraftSheetProps) {
  const reviewing = authoring.review === authoring.spec && authoring.spec > 0 && authoring.pending === 0;
  const steps = described?.kind === "draft" ? described.spec.steps : [];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="full" title="New workflow">
        <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-5">
          <Textarea aria-label="Describe the workflow" value={text} maxLength={4000} onChange={(e) => onTextChange(e.target.value)} disabled={!can.edit} />
          {!textKept && <Alert variant="warn" role="status" className="text-sm">This phone couldn’t keep your description. Copy it before closing.</Alert>}
          <Button size="lg" variant="outline" disabled={!can.edit || text.trim() === ""} onClick={() => onDescribe(text)}>Draft</Button>
          {described?.kind === "refused" && <Alert variant="warn" role="status">{described.message}</Alert>}
          {described?.kind === "clarify" && <Alert variant="info" role="status">{described.message}</Alert>}
          {described?.kind === "unavailable" && <Alert variant="warn" role="status">A draft isn’t available from your agent right now. Nothing was saved.</Alert>}
          {described?.kind === "draft" && (
            <ol aria-label="Steps" className="flex list-decimal flex-col gap-1 pl-5">
              {steps.map((step, index) => <li key={step.id ?? index}>{WORKFLOW_OPERATION_LABELS[step.operation] ?? "Phone step"}</li>)}
            </ol>
          )}
          {described?.kind === "draft" && note !== undefined && !note.manual && (
            <p className="text-sm text-muted-foreground">Runs only while your phone and agent are on. A run more than {note.missedAfterMinutes} minutes late is recorded as missed and doesn’t run late.</p>
          )}
          {described?.kind === "draft" && note !== undefined && note.clockChange !== "" && <Alert variant="info" role="status" className="text-sm">{note.clockChange}</Alert>}
          {authoring.spec > 0 && !authoring.committed && <p className="text-sm text-muted-foreground">Saved paused. Turn it on when you are ready.</p>}
          {authoring.committed && <Alert variant="ok" role="status">Saved.</Alert>}
          {outcome === "unknown" && <Alert variant="warn" role="status">Your agent didn’t confirm the save. Check it before saving again.</Alert>}
          {outcome === "refused" && <Alert variant="warn" role="status">This workflow changed on your agent before the save. Nothing was saved.</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button size="lg" disabled={!can.save} onClick={onSave}>{reviewing ? "Save this draft" : "Review and save"}</Button>
            {authoring.pending !== 0 && !authoring.busy && <Button size="lg" variant="outline" disabled={!can.recover} onClick={onRecover}>Check save</Button>}
            {authoring.unreceipted && <Button size="lg" variant="outline" disabled={!can.resend} onClick={onResend}>{authoring.resendReview ? "Send the same save again" : "Save again"}</Button>}
            {authoring.draft && authoring.spec > 0 && <Button size="lg" variant="ghost" disabled={!can.discard} onClick={onDiscard}>{authoring.discardAsk ? "Discard draft?" : "Discard"}</Button>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
