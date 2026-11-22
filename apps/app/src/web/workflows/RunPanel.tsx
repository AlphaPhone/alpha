// spec/workflows/runs.md, "Story: Open a workflow and see its runs"; spec/workflows/runs.md, "Story: Run the version I reviewed exactly once"; spec/workflows/runs.md, "Story: Stop a run I started"; spec/workflows/runs.md, "Story: Run a missed occurrence when I choose"
import { CheckCircle2, CircleDashed, CircleSlash, Loader2, XCircle } from "lucide-react";
import type { Entry, Runs } from "../../../gen/workflows__runs.ts";
import { runWord, type RunWord } from "../../../gen/workflows__vocabulary.ts";
import type { RunOutcome } from "../../workflows/runs.vibe";
import { Alert, Button, ListRow } from "../components/ui/index.ts";
import { occurredSentences, occurredWords, reconciliationText, runWords, when } from "./words.ts";

export interface RunPanelProps {
  /** The runs Machine's state for the open workflow. */
  runs: Runs;
  /** The events the runs rules allow now. */
  can: { readonly review: boolean; readonly confirm: boolean; readonly reviewResend: boolean; readonly resend: boolean; readonly cancel: boolean; readonly reconcile: boolean };
  /** What the last run request ended as. */
  outcome?: RunOutcome;
  onReview: () => void;
  onConfirm: () => void;
  onReconcile: () => void;
  onReviewResend: () => void;
  onResend: () => void;
  onCancel: () => void;
  onSelect: (runId: string) => void;
  onRunMissedNow: (runId: string) => void;
}

const outcomeText: Partial<Record<RunOutcome, string>> = {
  unknown: "Your agent didn’t confirm this run. Check it before running again.",
  "not-admitted": "Your agent has no record of this run. Review it before sending it again.",
  "version-changed": "This workflow changed before your run was accepted. Review the current steps.",
};

function icon(word: RunWord, entry: Entry) {
  if (entry.occurred !== "Ran") return <CircleSlash aria-hidden className="size-5 text-muted-foreground" />;
  if (word === "RunFinished" || word === "RunCompleted") return <CheckCircle2 aria-hidden className="size-5 text-ok" />;
  if (word === "RunFailed" || word === "RunCancelled") return <XCircle aria-hidden className="size-5 text-destructive" />;
  if (!entry.finished) return <Loader2 aria-hidden className="size-5 animate-spin text-primary motion-reduce:animate-none" />;
  return <CircleDashed aria-hidden className="size-5 text-muted-foreground" />;
}

/**
 * The open workflow's runs, the run shown, and the one reviewed run request kept for it.
 * @model spec/workflows/runs.md
 * @design design.md
 */
export function RunPanel({ runs, can, outcome, onReview, onConfirm, onReconcile, onReviewResend, onResend, onCancel, onSelect, onRunMissedNow }: RunPanelProps) {
  const selected = runs.history.find((e) => e.runId === runs.selected);
  const shown = runs.shown.runId !== "" && runs.shown.runId === runs.selected ? runs.shown : undefined;
  return (
    <section aria-label="Runs" className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 px-4">
        {runs.confirming ? (
          <Button size="lg" disabled={!can.confirm} onClick={onConfirm}>Run this version</Button>
        ) : (
          <Button size="lg" disabled={!can.review} onClick={onReview}>Run</Button>
        )}
        {runs.custody === "Unknown" && <Button size="lg" variant="outline" disabled={!can.reconcile} onClick={onReconcile}>Check run</Button>}
        {runs.custody === "NotAdmitted" && <Button size="lg" variant="outline" disabled={!can.reviewResend} onClick={onReviewResend}>Send again</Button>}
        {runs.custody === "ConfirmingResend" && <Button size="lg" disabled={!can.resend} onClick={onResend}>Send the same run again</Button>}
        {shown !== undefined && !shown.finished && <Button size="lg" variant="ghost" disabled={!can.cancel} onClick={onCancel}>{shown.cancelRequested ? "Stopping…" : "Stop run"}</Button>}
      </div>
      {outcome !== undefined && outcomeText[outcome] !== undefined && <Alert variant="warn" role="status" className="mx-4 text-sm">{outcomeText[outcome]}</Alert>}
      {selected !== undefined && selected.occurred !== "Ran" && (
        <Alert className="mx-4 flex flex-col gap-2 text-sm">
          <span>{occurredSentences[selected.occurred]}</span>
          {selected.occurred === "Missed" && runs.typed && <Button size="lg" variant="outline" onClick={() => onRunMissedNow(selected.runId)}>Run now</Button>}
        </Alert>
      )}
      {shown !== undefined && reconciliationText(shown.reconciliation) && <p role="status" className="px-4 text-sm">{reconciliationText(shown.reconciliation)}</p>}
      <ol aria-label="Run history" className="flex flex-col">
        {runs.history.map((entry) => {
          const word = runWord(entry.status);
          const label = entry.occurred === "Ran" ? runWords[word] : occurredWords[entry.occurred];
          return (
            <li key={entry.runId}>
              <ListRow title={when(Date.parse(entry.at)) || label} detail={label} selected={entry.runId === runs.selected}
                aria-label={`${when(Date.parse(entry.at))}, ${label}`} leading={icon(word, entry)} onClick={() => onSelect(entry.runId)} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
