import type { ComponentMeta } from "vibestack/stories";
import type { WorkflowsScreenViewProps } from "./WorkflowsScreenView.tsx";
import {
  allowedGates, atAdding, atDraft, atList, atPrompt, atRunNow, atWorkflow, clockDraftClosed, digestPanel, draftReviewed, emptySheet, heldUnknown,
  lifecycleKept, lifecycleOpen, listedEmpty, listedMany, listedWithWorkflow, refusedGates, removedWorkflows, runNowOffer, stepWaiting, unknownRun, withHistory,
} from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<WorkflowsScreenViewProps> = {
  args: {
    place: atList, list: listedWithWorkflow, waiting: [], clockDraft: clockDraftClosed, sheet: emptySheet, can: allowedGates, onPhone: true, zone: "Europe/Paris",
    draftText: "", textKept: true,
    onBack: none, onAdd: none, onCloseSheet: none, onOpenRow: none, onAllowAnother: none, onToggleRemoved: none, onAskActive: none, onConfirmActive: none,
    onCancelActive: none, onTapStep: none, onOpenDraft: none, onOpenPrompt: none, onOpenDigests: none, onOpenSources: none, onOpenClockDraft: none, onSavePrompt: none,
    rowActions: { onSwitch: none, onRun: none, onVerb: none, onSnooze: none, onEdit: none, onDelete: none, onEditPrompt: none },
    runActions: { onReview: none, onConfirm: none, onReconcile: none, onReviewResend: none, onResend: none, onCancel: none, onSelect: none, onRunMissedNow: none },
    lifecycleActions: { onReview: none, onConfirm: none, onReviewResend: none, onResend: none, onBack: none },
    digestActions: { onToggle: none, onReviewRunNow: none, onRunNow: none, onCloseRunNow: none, onRetry: none, onDiscard: none, onOpenResult: none },
    clockActions: { onPrepare: none, onApprove: none, onCancel: none },
    draftActions: { onTextChange: none, onDescribe: none, onSave: none, onRecover: none, onResend: none, onDiscard: none },
    sourceActions: {
      onOpenChange: none, onStartGrant: none, onApprove: none, onCancel: none, onChooseCalendars: none, onAllow: none, onRenew: none, onRevokeConsent: none,
      onReviewRevoke: none, onRevokeGrant: none, onCloseRevoke: none,
    },
  },
  examples: {
    Loading: { list: undefined },
    Empty: { list: listedEmpty, removedRows: [] },
    LongListWithRemoved: { list: listedMany, waiting: ["w1"], removedRows: removedWorkflows },
    SourceFailedHeld: { list: heldUnknown, removedRows: "unavailable" },
    Prompt: { place: atPrompt, history: [{ at: Date.parse("2026-11-22T07:00:00.000Z"), status: "success" }], report: { answer: "unknown", word: "not-confirmed" } },
    Workflow: { place: atWorkflow, runs: withHistory, lifecycle: lifecycleOpen, steps: stepWaiting, runOutput: "Three meetings today; dentist at 4." },
    TurnOnReview: { place: atWorkflow, runs: withHistory, lifecycle: lifecycleOpen, list: { ...listedWithWorkflow, rows: listedWithWorkflow.rows.map((r) => (r.kind === "WorkflowRow" ? { ...r, enabled: false } : r)) }, activation: true },
    AnswerLost: { place: atWorkflow, runs: unknownRun, lifecycle: lifecycleKept, can: refusedGates, runOutcome: "unknown", change: "unknown", activeOutcome: { on: false, outcome: "unknown" } },
    RunNow: { place: atRunNow, digests: digestPanel, runNowReview: runNowOffer },
    AddSheet: { place: atAdding, clockOutcome: "unknown" },
    DraftSheet: { place: atDraft, authoring: draftReviewed, draftText: "Every weekday at 7, read my calendar aloud", described: { kind: "clarify", message: "Workflow needs clarification: which calendar should it read?" } },
  },
};
