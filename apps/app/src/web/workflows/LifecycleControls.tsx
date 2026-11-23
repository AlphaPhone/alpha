// spec/workflows/lifecycle.md, "Story: Remove a workflow only once its runs have settled, and restore it safely"
import { useState } from "react";
import type { LifeOp, Lifecycle } from "../../../gen/workflows__lifecycle.ts";
import type { ChangeOutcome } from "../../workflows/definitions.vibe";
import { Button, Input, Label } from "../components/ui/index.ts";
import { ReviewDialog } from "./ReviewDialog.tsx";

/** Remove, restore and rename for the open workflow, and the change kept for it. */
export interface LifecycleControlsProps {
  lifecycle: Lifecycle;
  /** The workflow's current name, for a rename. */
  name: string;
  can: { readonly remove: boolean; readonly restore: boolean; readonly rename: boolean; readonly reviewResend: boolean; readonly back: boolean };
  outcome?: ChangeOutcome;
  onReview: (op: LifeOp) => void;
  onConfirm: (name?: string) => void;
  onReviewResend: () => void;
  onResend: () => void;
  onBack: () => void;
}

const outcomeText: Partial<Record<ChangeOutcome, string>> = {
  refused: "This change wasn’t applied. Refresh the workflow and review its version and runs.",
  unknown: "Your agent didn’t confirm this change yet. Refresh before trying again.",
  cancelling: "The run whose outcome was unknown was asked to stop. Review the removal again.",
};

/**
 * Remove, restore and rename, each reviewed and kept until its receipt; a kept change is offered again only after review.
 * @model spec/workflows/lifecycle.md
 * @design design.md
 */
export function LifecycleControls({ lifecycle, name, can, outcome, onReview, onConfirm, onReviewResend, onResend, onBack }: LifecycleControlsProps) {
  const [draftName, setDraftName] = useState(name);
  const op = lifecycle.reviewOp;
  const reviewTitle = op === "RemoveOp" ? `Remove ${name}?` : op === "RestoreOp" ? `Restore ${name}?` : "Rename";
  return (
    <section aria-label="Workflow changes" className="flex flex-col gap-2 px-4">
      <div className="flex flex-wrap gap-2">
        {!lifecycle.removed && <Button size="lg" variant="outline" disabled={!can.rename} onClick={() => onReview("RenameOp")}>Rename</Button>}
        {!lifecycle.removed && <Button size="lg" variant="ghost" disabled={!can.remove} onClick={() => onReview("RemoveOp")}>Remove</Button>}
        {lifecycle.removed && <Button size="lg" disabled={!can.restore} onClick={() => onReview("RestoreOp")}>Restore</Button>}
        {lifecycle.offer && <Button size="lg" variant="outline" disabled={!can.reviewResend} onClick={onReviewResend}>Send change again</Button>}
      </div>
      {lifecycle.ongoing && !lifecycle.removed && <p className="text-sm text-muted-foreground">A run is going. Remove waits until it finishes.</p>}
      {outcome !== undefined && outcomeText[outcome] !== undefined && <p role="status" className="text-sm">{outcomeText[outcome]}</p>}
      <ReviewDialog open={lifecycle.reviewing} title={reviewTitle} confirm={op === "RemoveOp" ? "Remove" : op === "RestoreOp" ? "Restore" : "Save"}
        destructive={op === "RemoveOp"} disabled={op === "RenameOp" && draftName.trim() === ""} onCancel={onBack}
        onConfirm={() => onConfirm(op === "RenameOp" ? draftName.trim() : undefined)}>
        {lifecycle.unknownReview && <p>A run of this workflow ended with an unknown outcome. It is asked to stop first.</p>}
        {op === "RestoreOp" && <p>It comes back turned off.</p>}
        {op === "RenameOp" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="workflow-name">Name</Label>
            <Input id="workflow-name" value={draftName} maxLength={200} onChange={(e) => setDraftName(e.target.value)} />
          </div>
        )}
      </ReviewDialog>
      <ReviewDialog open={lifecycle.resendReview} title="Send this change again?" confirm="Send again" onCancel={onBack} onConfirm={onResend}>
        <p>An earlier copy may still apply. Your agent applies it at most once.</p>
      </ReviewDialog>
    </section>
  );
}
