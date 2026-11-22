// spec/workflows/deviceSteps.md, "Story: Approve a phone step only as I reviewed it"
import { Smartphone } from "lucide-react";
import type { Steps } from "../../../gen/workflows__deviceSteps.ts";
import type { StepReview } from "../../workflows/notices.vibe";
import { Alert, Button, Card, CardTitle } from "../components/ui/index.ts";

export interface PhoneStepReviewProps {
  steps: Steps;
  /** The step's approval as the agent recorded it; its title and summary are the workflow author's own words. */
  review?: StepReview;
  /** Whether a tap is allowed now. */
  canTap: boolean;
  onTap: (approve: boolean) => void;
}

const statusText: Partial<Record<Steps["status"], string>> = {
  AnchorMoved: "The Calendar day this step reads moved. Review it again.",
  StepRefused: "This step changed or ended. Nothing was done.",
  StepNotStarted: "Your agent didn’t accept this approval. Nothing was done.",
  StepDeniedStatus: "Denied.",
  StepApplied: "Done.",
  StepUnknown: "This step may not have finished. Check the run before trying again.",
  StepUnsynced: "Done on this phone. Your agent will be told when it can be reached.",
};

const stepTitles: Record<string, string> = {
  "read selected reminders": "Read reminders", "read selected notes": "Read selected notes", "read calendar range": "Read calendars",
  "create note": "Save a note", "post notification": "Post notification", "speak text": "Read aloud",
};

/**
 * A phone step waiting on the open run: approve or deny with two taps of the same choice.
 * @model spec/workflows/deviceSteps.md
 * @design design.md
 */
export function PhoneStepReview({ steps, review, canTap, onTap }: PhoneStepReviewProps) {
  const message = statusText[steps.status];
  if (!steps.shown && message === undefined) return null;
  return (
    <Card className="mx-4 flex flex-col gap-3 p-4">
      <CardTitle className="flex items-center gap-2"><Smartphone aria-hidden className="size-5 text-primary" />{stepTitles[review?.approval.operation ?? ""] ?? "Phone step"}</CardTitle>
      {review !== undefined && steps.shown && (
        <>
          <p>{review.approval.title}</p>
          {review.approval.summary && <p className="text-sm text-muted-foreground">{review.approval.summary}</p>}
          <div className="flex gap-2">
            <Button size="lg" variant={steps.choice === "ApproveChoice" ? "primary" : "outline"} disabled={!canTap} onClick={() => onTap(true)}>
              {steps.choice === "ApproveChoice" ? "Tap again to approve" : "Approve"}
            </Button>
            <Button size="lg" variant={steps.choice === "DenyChoice" ? "destructive" : "ghost"} disabled={!canTap} onClick={() => onTap(false)}>
              {steps.choice === "DenyChoice" ? "Tap again to deny" : "Deny"}
            </Button>
          </div>
        </>
      )}
      {message !== undefined && <Alert role="status" className="text-sm">{message}</Alert>}
    </Card>
  );
}
