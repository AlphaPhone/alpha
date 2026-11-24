// spec/workflows/index.md; spec/workflows/place.md, "Story: Move inside Workflows and come back with Back"; spec/workflows/automations.md, "Story: See all my automations even when one source fails"; spec/workflows/lifecycle.md, "Story: Remove a workflow only once its runs have settled, and restore it safely"; spec/workflows/runs.md, "A notice opens exactly the run it names"; spec/workflows/clockDraft.md, "Story: Set an alarm a workflow suggests, from Workflows"; spec/workflows/digestSources.md, "Story: Renew my phone source before its week ends"; spec/workflows/digestSources.md, "Removing a grant Account names needs only Alpha in front, and clears this session's grant only once confirmed"; spec/workflows/authoring.md, "The unsent description is kept for its owner across closing and reopening"
import type { MissedRunNow } from "@elizaos/plugin-workflow/digests";
import { ArrowLeft, Plus } from "lucide-react";
import type { Automations, Row } from "../../../gen/workflows__automations.ts";
import type { Authoring } from "../../../gen/workflows__authoring.ts";
import type { ClockDraft } from "../../../gen/workflows__clockDraft.ts";
import type { Steps } from "../../../gen/workflows__deviceSteps.ts";
import type { Digests } from "../../../gen/workflows__digests.ts";
import type { Sources } from "../../../gen/workflows__digestSources.ts";
import type { Lifecycle } from "../../../gen/workflows__lifecycle.ts";
import type { Place } from "../../../gen/workflows__place.ts";
import type { Runs } from "../../../gen/workflows__runs.ts";
import type { PromptInput, PromptRunLine, Report } from "../../workflows/automations.vibe";
import type { ActivationOutcome, ChangeOutcome, Described, ScheduleNote } from "../../workflows/definitions.vibe";
import type { PlaceSheet } from "../../workflows/place.vibe";
import type { RunOutcome } from "../../workflows/runs.vibe";
import type { PhoneCalendars } from "../../workflows/sources.vibe";
import { Alert, Button, EmptyState, Sheet, SheetContent, ListRow, Switch } from "../components/ui/index.ts";
import { AutomationDetail, type AutomationDetailProps } from "./AutomationDetail.tsx";
import { AutomationList } from "./AutomationList.tsx";
import { ClockDraftDialog, type ClockDraftDialogProps } from "./ClockDraftDialog.tsx";
import { DigestPanel, type DigestPanelProps } from "./DigestPanel.tsx";
import { DraftSheet, type DraftSheetProps } from "./DraftSheet.tsx";
import { LifecycleControls, type LifecycleControlsProps } from "./LifecycleControls.tsx";
import { PhoneStepReview, type PhoneStepReviewProps } from "./PhoneStepReview.tsx";
import { PromptSheet, type PromptSheetProps } from "./PromptSheet.tsx";
import { ReviewDialog } from "./ReviewDialog.tsx";
import { RunPanel, type RunPanelProps } from "./RunPanel.tsx";
import { SourceReview, type SourceReviewProps } from "./SourceReview.tsx";

type DetailAction = "onSwitch" | "onRun" | "onVerb" | "onSnooze" | "onEdit" | "onDelete" | "onEditPrompt";

/** What the owner does with the automation shown, given that row. */
export type AutomationActions = { readonly [K in DetailAction]: (row: Row, ...args: Parameters<AutomationDetailProps[K]>) => void };

/** The events each Workflows machine allows now, as the controls that offer them. */
export interface WorkflowsGates {
  /** A held change may be released. */
  readonly allowAnother: boolean;
  /** A change of the automation shown may be held. */
  readonly changeRow: boolean;
  /** A new or changed prompt may be saved. */
  readonly savePrompt: boolean;
  /** The phone step may be tapped. */
  readonly tapStep: boolean;
  /** An alarm may be drafted for Clock. */
  readonly openClock: boolean;
  /** The reviewed alarm may be handed to Clock. */
  readonly approveClock: boolean;
  readonly runs: RunPanelProps["can"];
  readonly lifecycle: LifecycleControlsProps["can"];
  readonly digests: DigestPanelProps["can"];
  readonly authoring: DraftSheetProps["can"];
  readonly sources: SourceReviewProps["can"];
}

/** What Clock said about the alarm handed to it. */
export type ClockOutcome = "opened" | "unknown" | "failed" | "refused";

/** The Workflows machines' states, the answers the screen last read, and every owner action. */
export interface WorkflowsScreenViewProps {
  /** Where the owner is inside Workflows, and the one overlay open. */
  place: Place;
  /** The automations list, once read. */
  list?: Automations;
  /** The workflows waiting for the owner's approval. */
  waiting: ReadonlyArray<string>;
  /** The open workflow's runs. */
  runs?: Runs;
  /** The open workflow's remove, restore and rename. */
  lifecycle?: Lifecycle;
  /** The phone step the selected run waits on. */
  steps?: Steps;
  digests?: Digests;
  /** The digest sources: the Cloud grant and the phone's consent. */
  sources?: Sources;
  /** The described workflow draft. */
  authoring?: Authoring;
  /** The alarm a workflow suggests, drafted for Clock. */
  clockDraft?: ClockDraft;
  /** What the open sheets show. */
  sheet: PlaceSheet;
  can: WorkflowsGates;
  /** Whether this build can ask the phone for consent. */
  onPhone: boolean;
  /** The phone's time zone. */
  zone: string;
  /** The selected run's own output. */
  runOutput?: string;
  /** What the last change of the automation shown reported. */
  report?: Report;
  /** The shown prompt's run history. */
  history?: ReadonlyArray<PromptRunLine>;
  /** The removed workflows, while listed, or why they could not be read. */
  removedRows?: ReadonlyArray<Row> | "unavailable";
  /** The on or off the owner is reviewing for the open workflow. */
  activation?: boolean;
  /** What the agent said about the last on or off. */
  activeOutcome?: ActivationOutcome;
  runOutcome?: RunOutcome;
  /** What the last workflow change ended as. */
  change?: ChangeOutcome;
  /** The agent's Run now offer under review. */
  runNowReview?: MissedRunNow;
  /** The prompt being changed, or none for a new one. */
  promptEditing?: PromptInput;
  /** The description the owner is typing. */
  draftText: string;
  /** False when the phone could not keep the description. */
  textKept: boolean;
  described?: Described;
  note?: ScheduleNote;
  clockOutcome?: ClockOutcome;
  /** The phone's calendars, once listed. */
  calendars?: PhoneCalendars;
  /** What the last phone-source save or Google removal said. */
  sourceOutcome?: string;
  /** Back inside Workflows, or out of it. */
  onBack: () => void;
  onAdd: () => void;
  /** Closes the overlay open. */
  onCloseSheet: () => void;
  onOpenRow: (row: Row) => void;
  onAllowAnother: () => void;
  /** Lists the removed workflows, or hides them. */
  onToggleRemoved: () => void;
  rowActions: AutomationActions;
  /** Asks to turn the open workflow on or off. */
  onAskActive: (on: boolean) => void;
  onConfirmActive: () => void;
  onCancelActive: () => void;
  onTapStep: PhoneStepReviewProps["onTap"];
  runActions: Pick<RunPanelProps, "onReview" | "onConfirm" | "onReconcile" | "onReviewResend" | "onResend" | "onCancel" | "onSelect" | "onRunMissedNow">;
  lifecycleActions: Pick<LifecycleControlsProps, "onReview" | "onConfirm" | "onReviewResend" | "onResend" | "onBack">;
  digestActions: Pick<DigestPanelProps, "onToggle" | "onReviewRunNow" | "onRunNow" | "onCloseRunNow" | "onRetry" | "onDiscard" | "onOpenResult">;
  onOpenDraft: () => void;
  onOpenPrompt: () => void;
  onOpenDigests: () => void;
  onOpenSources: () => void;
  onOpenClockDraft: () => void;
  clockActions: Pick<ClockDraftDialogProps, "onPrepare" | "onApprove" | "onCancel">;
  onSavePrompt: PromptSheetProps["onSave"];
  draftActions: Pick<DraftSheetProps, "onTextChange" | "onDescribe" | "onSave" | "onRecover" | "onResend" | "onDiscard">;
  sourceActions: Pick<SourceReviewProps, "onOpenChange" | "onStartGrant" | "onApprove" | "onCancel" | "onChooseCalendars" | "onAllow" | "onRenew" | "onRevokeConsent" | "onReviewRevoke" | "onRevokeGrant" | "onCloseRevoke">;
}

/**
 * The Workflows app as its machines leave it: the list, one automation or workflow with its runs, and the digest panel, with one sheet or review over them.
 * @model spec/workflows/place.md
 * @design design.md
 */
export function WorkflowsScreenView({
  place: where, list, waiting, runs, lifecycle, steps, digests, sources, authoring, clockDraft, sheet, can, onPhone, zone, runOutput, report, history, removedRows,
  activation, activeOutcome, runOutcome, change, runNowReview, promptEditing, draftText, textKept, described, note, clockOutcome, calendars, sourceOutcome,
  onBack, onAdd, onCloseSheet, onOpenRow, onAllowAnother, onToggleRemoved, rowActions, onAskActive, onConfirmActive, onCancelActive, onTapStep, runActions,
  lifecycleActions, digestActions, onOpenDraft, onOpenPrompt, onOpenDigests, onOpenSources, onOpenClockDraft, clockActions, onSavePrompt, draftActions, sourceActions,
}: WorkflowsScreenViewProps) {
  const overlay = where.overlay;
  const workflowRow = list?.rows.find((r) => r.kind === "WorkflowRow" && r.target === where.target);
  const workflowName = workflowRow?.title ?? "";
  const row = where.view === "AutomationView" ? list?.rows.find((r) => r.key === where.target) : undefined;
  return (
    <main aria-label="Workflows" className="flex h-full flex-col gap-4 overflow-y-auto pb-8">
      <header className="flex items-center justify-between px-4 pt-4">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}><ArrowLeft aria-hidden /></Button>
        <h1 className="font-display text-3xl">{where.view === "DigestsView" ? "Scheduled digests" : "Workflows"}</h1>
        <Button variant="ghost" size="icon" aria-label="Add to Workflows" onClick={onAdd}><Plus aria-hidden /></Button>
      </header>

      {where.view === "ListView" && list !== undefined && (
        <AutomationList list={list} waiting={waiting} canAllowAnother={can.allowAnother} onOpen={onOpenRow} onAllowAnother={onAllowAnother} />
      )}
      {where.view === "ListView" && list !== undefined && (
        <section aria-label="Removed workflows" className="flex flex-col gap-2 px-4">
          <Button variant="ghost" size="lg" aria-expanded={removedRows !== undefined} onClick={onToggleRemoved}>
            {removedRows === undefined ? "Show removed" : "Hide removed"}
          </Button>
          {removedRows === "unavailable" && <Alert variant="warn" role="status" className="text-sm">Removed workflows couldn’t be read from your agent.</Alert>}
          {removedRows !== undefined && removedRows !== "unavailable" && (removedRows.length === 0
            ? <p className="text-sm text-muted-foreground">No removed workflows.</p>
            : <ul className="flex flex-col">{removedRows.map((removed) => (
              <li key={removed.key}><ListRow title={removed.title || "Workflow"} detail="Removed" onClick={() => onOpenRow(removed)} /></li>
            ))}</ul>)}
        </section>
      )}

      {where.view === "AutomationView" && row === undefined && list !== undefined && <EmptyState title="This item is no longer listed" />}

      {where.view === "AutomationView" && row !== undefined && (
        <AutomationDetail row={row} canChange={can.changeRow} report={report} {...(history === undefined ? {} : { history })}
          onSwitch={(on) => rowActions.onSwitch(row, on)}
          onRun={() => rowActions.onRun(row)}
          onVerb={(verb) => rowActions.onVerb(row, verb)}
          onSnooze={() => rowActions.onSnooze(row)}
          onEdit={(instructions, minute) => rowActions.onEdit(row, instructions, minute)}
          onDelete={() => rowActions.onDelete(row)}
          onEditPrompt={() => rowActions.onEditPrompt(row)} />
      )}

      {where.view === "WorkflowView" && runs !== undefined && (
        <>
          {workflowRow !== undefined && (
            <header className="flex items-center justify-between gap-3 px-4">
              <div className="min-w-0">
                <h2 className="truncate font-display text-2xl">{workflowRow.title}</h2>
                {workflowRow.description !== "" && <p className="text-sm text-muted-foreground">{workflowRow.description}</p>}
              </div>
              <Switch aria-label={workflowRow.enabled ? "Turn off" : "Turn on"} checked={workflowRow.enabled} disabled={activation !== undefined || lifecycle?.opened !== true || lifecycle.workflowId !== where.target} className="min-h-12 min-w-12"
                onCheckedChange={onAskActive} />
            </header>
          )}
          <ReviewDialog open={activation !== undefined} title={activation === true ? `Turn on “${workflowName}”?` : `Turn off “${workflowName}”?`}
            confirm={activation === true ? "Turn on" : "Turn off"} onConfirm={onConfirmActive} onCancel={onCancelActive}>
            <p className="text-sm">{activation === true
              ? "It runs on its schedule from now on, at the version you see. A workflow you run by hand stays off."
              : "It stops running on its schedule until you turn it on again."}</p>
          </ReviewDialog>
          {activeOutcome !== undefined && activeOutcome !== "saved" && (
            <Alert variant="warn" role="status" className="mx-4 text-sm">{activeOutcome === "stale"
              ? "The workflow changed. Review the current version to try again."
              : activeOutcome === "refused" ? "Your agent didn’t make this change. Check the workflow before trying again."
                : "Your agent didn’t confirm this change. Check the workflow before trying again."}</Alert>
          )}
          {steps !== undefined && (
            <PhoneStepReview steps={steps} {...(sheet.step === undefined ? {} : { review: sheet.step })} canTap={can.tapStep} onTap={onTapStep} />
          )}
          <RunPanel runs={runs} {...(runOutcome === undefined ? {} : { outcome: runOutcome })}
            {...(runOutput === undefined ? {} : { output: runOutput })}
            can={can.runs} {...runActions} />
          {lifecycle !== undefined && (
            <LifecycleControls lifecycle={lifecycle} name={workflowName} {...(change === undefined ? {} : { outcome: change })}
              can={can.lifecycle} {...lifecycleActions} />
          )}
        </>
      )}

      {where.view === "DigestsView" && digests !== undefined && (
        <DigestPanel digests={digests} deviceZone={zone} {...(where.target === "" ? {} : { opened: where.target })}
          {...(overlay === "RunNowOverlay" && runNowReview !== undefined ? { runNowReview } : {})}
          can={can.digests} {...digestActions} />
      )}

      <Sheet open={overlay === "AddingOverlay"} onOpenChange={(open) => { if (!open) onCloseSheet(); }}>
        <SheetContent side="bottom" title="Add to Workflows">
          <ul className="flex flex-col pb-4">
            <li><ListRow title="Workflow" onClick={onOpenDraft} /></li>
            <li><ListRow title="Prompt" onClick={onOpenPrompt} /></li>
            <li><ListRow title="Scheduled digest" onClick={onOpenDigests} /></li>
            <li><ListRow title="Digest sources" onClick={onOpenSources} /></li>
            {can.openClock && <li><ListRow title="Alarm in Clock" onClick={onOpenClockDraft} /></li>}
          </ul>
        </SheetContent>
      </Sheet>

      {clockDraft !== undefined && (
        <ClockDraftDialog shown={clockDraft.shown} review={clockDraft.review} canApprove={can.approveClock} {...clockActions} />
      )}
      {clockOutcome === "opened" && <Alert variant="ok" role="status" className="mx-4">Clock opened.</Alert>}
      {clockOutcome === "unknown" && <Alert variant="warn" role="status" className="mx-4">Clock didn’t confirm it opened. Check Clock before trying again.</Alert>}
      {clockOutcome === "failed" && <Alert variant="warn" role="status" className="mx-4">Nothing was handed to Clock.</Alert>}
      {clockOutcome === "refused" && <Alert variant="warn" role="status" className="mx-4">Clock can’t review this alarm. Nothing was handed to Clock.</Alert>}

      {overlay === "PromptOverlay" && (
        <PromptSheet open canSave={can.savePrompt} {...(promptEditing === undefined ? {} : { editing: promptEditing })} {...(report === undefined ? {} : { report })}
          onOpenChange={(open) => { if (!open) onCloseSheet(); }}
          onSave={onSavePrompt} />
      )}

      {authoring !== undefined && (
        <DraftSheet open={overlay === "DraftOverlay"} authoring={authoring} text={draftText} textKept={textKept}
          {...(described === undefined ? {} : { described })} {...(note === undefined ? {} : { note })} {...(change === undefined ? {} : { outcome: change })}
          can={can.authoring}
          onOpenChange={(open) => { if (!open) onCloseSheet(); }}
          {...draftActions} />
      )}

      {sources !== undefined && (
        <SourceReview open={overlay === "SourcesOverlay" || overlay === "RemovalOverlay"} sources={sources} onPhone={onPhone} phoneSources={sheet.phoneSources}
          {...(calendars === undefined ? {} : { calendars })} {...(sheet.renewing === undefined ? {} : { renewing: sheet.renewing })}
          {...(overlay === "RemovalOverlay" && sheet.impact !== undefined ? { impact: sheet.impact } : {})} {...(sourceOutcome === undefined ? {} : { outcome: sourceOutcome })}
          can={can.sources} {...sourceActions} />
      )}
    </main>
  );
}
