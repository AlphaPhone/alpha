// spec/workflows/index.md; spec/workflows/place.md, "Story: Move inside Workflows and come back with Back"; spec/workflows/automations.md, "Story: See all my automations even when one source fails"; spec/workflows/runs.md, "A notice opens exactly the run it names"; spec/workflows/clockDraft.md, "Story: Set an alarm a workflow suggests, from Workflows"; spec/workflows/digestSources.md, "Story: Renew my phone source before its week ends"; spec/workflows/digestSources.md, "Removing a grant Account names needs only Alpha in front, and clears this session's grant only once confirmed"; spec/workflows/authoring.md, "The unsent description is kept for its owner across closing and reopening"; spec/workflows/authoring.md, "The previous version's draft comes in once, only while none is kept, and its slot clears only after the kept draft reads back"
import type { MissedRunNow } from "@elizaos/plugin-workflow/digests";
import { Effect } from "effect";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { useMachine as useAutomations } from "../../../gen/workflows__automations.react.ts";
import { useMachine as useAuthoring } from "../../../gen/workflows__authoring.react.ts";
import { useMachine as useDigests } from "../../../gen/workflows__digests.react.ts";
import { useMachine as useSources } from "../../../gen/workflows__digestSources.react.ts";
import { useMachine as useLifecycle } from "../../../gen/workflows__lifecycle.react.ts";
import { useMachine as useNotices } from "../../../gen/workflows__notices.react.ts";
import { useMachine as usePlace } from "../../../gen/workflows__place.react.ts";
import { useMachine as useRuns } from "../../../gen/workflows__runs.react.ts";
import { useMachine as useSteps } from "../../../gen/workflows__deviceSteps.react.ts";
import { useMachine as useClockDraft } from "../../../gen/workflows__clockDraft.react.ts";
import type { Row } from "../../../gen/workflows__automations.ts";
import { type Overlay, initial as placeStart } from "../../../gen/workflows__place.ts";
import { Automations, type PromptInput, type PromptRunLine, type Report } from "../../workflows/automations.vibe";
import { WorkflowClockDraft } from "../../workflows/clock-draft.vibe";
import { WorkflowDefinitions, type ChangeOutcome, type Described, type ScheduleNote } from "../../workflows/definitions.vibe";
import { Digests } from "../../workflows/digests.vibe";
import { PhoneSteps } from "../../workflows/notices.vibe";
import { WorkflowsPlace } from "../../workflows/place.vibe";
import type { AlarmRequest } from "../../workflows/ports.vibe";
import { WorkflowRuns, type RunOutcome } from "../../workflows/runs.vibe";
import { DigestSourcesService, type ImpactRow, type PhoneCalendars, type RevokeOutcome } from "../../workflows/sources.vibe";
import { deviceZone } from "../../workflows/ids.ts";
import type { ScreenProps } from "../app-screen.ts";
import { Alert, Button, EmptyState, Sheet, SheetContent, ListRow, Switch } from "../components/ui/index.ts";
import { AutomationDetail } from "./AutomationDetail.tsx";
import { AutomationList } from "./AutomationList.tsx";
import { ClockDraftDialog } from "./ClockDraftDialog.tsx";
import { DigestPanel } from "./DigestPanel.tsx";
import { DraftSheet } from "./DraftSheet.tsx";
import { LifecycleControls } from "./LifecycleControls.tsx";
import { PhoneStepReview } from "./PhoneStepReview.tsx";
import { PromptSheet } from "./PromptSheet.tsx";
import { ReviewDialog } from "./ReviewDialog.tsx";
import { RunPanel } from "./RunPanel.tsx";
import { SourceReview } from "./SourceReview.tsx";
import { phoneSourceWords, revokeWords } from "./words.ts";
import { usePlaceSheet } from "./connect.ts";
import { buildInfo, perform, runtime, useServiceStream } from "../shell/services.ts";

/** Workflows takes the shell's screen props; the place follows the route the shell opens it at (a run deep link, `digests`, `digests:<runId>`, `renew:<sourceId>` or `google-removal/<grantId>`). */
export type WorkflowsScreenProps = ScreenProps;

const at = <A,>(f: (place: WorkflowsPlace.Shape) => Effect.Effect<A>) => perform(WorkflowsPlace.use(f));

/**
 * The Workflows app: the list, one automation or workflow with its runs, and the digest panel, with one sheet or review over them.
 * @model spec/workflows/place.md
 * @design design.md
 */
export function WorkflowsScreen({ onClose }: WorkflowsScreenProps) {
  const automations = useAutomations(runtime);
  const runs = useRuns(runtime);
  const lifecycle = useLifecycle(runtime);
  const authoring = useAuthoring(runtime);
  const steps = useSteps(runtime);
  const digests = useDigests(runtime);
  const sources = useSources(runtime);
  const notices = useNotices(runtime);
  const clockDraft = useClockDraft(runtime);
  const place = usePlace(runtime);
  const sheet = usePlaceSheet();
  const outputs = useServiceStream("workflows.outputs", WorkflowRuns.use((r) => Effect.succeed(r.outputs)), new Map<string, string>());
  const [onPhone] = useState(() => {
    void perform(Automations.use((a) => a.refresh()));
    void perform(WorkflowClockDraft.use((c) => c.enter()));
    return buildInfo().variant !== "browser";
  });
  const [calendars, setCalendars] = useState<PhoneCalendars | undefined>(undefined);
  const [sourceOutcome, setSourceOutcome] = useState<string | undefined>(undefined);
  const [runNowReview, setRunNowReview] = useState<MissedRunNow | undefined>(undefined);
  const [promptEdit, setPromptEdit] = useState<{ editing?: PromptInput; id?: string }>({});
  const [report, setReport] = useState<Report | undefined>(undefined);
  const [history, setHistory] = useState<ReadonlyArray<PromptRunLine> | undefined>(undefined);
  const [runOutcome, setRunOutcome] = useState<RunOutcome | undefined>(undefined);
  const [change, setChange] = useState<ChangeOutcome | undefined>(undefined);
  const [described, setDescribed] = useState<Described | undefined>(undefined);
  const [note, setNote] = useState<ScheduleNote | undefined>(undefined);
  const [draftText, setDraftText] = useState("");
  const [textKept, setTextKept] = useState(true);
  const [clockOutcome, setClockOutcome] = useState<"opened" | "unknown" | "failed" | "refused" | undefined>(undefined);
  const [activation, setActivation] = useState<boolean | undefined>(undefined);
  const [removedRows, setRemovedRows] = useState<ReadonlyArray<Row> | "unavailable" | undefined>(undefined);
  const [activeOutcome, setActiveOutcome] = useState<ChangeOutcome | undefined>(undefined);
  const list = automations.state;
  const held = list?.held.find((h) => h.owner === list.owner);
  const where = place.state ?? placeStart;
  const overlay: Overlay = where.overlay;
  const canChangeRow = (key: string) => automations.can({ type: "change", kind: "RunChange", key, target: false });
  const runOutput = runs.state === undefined ? undefined : outputs.get(runs.state.selected);
  const workflowRow = list?.rows.find((r) => r.kind === "WorkflowRow" && r.target === where.target);
  const workflowName = workflowRow?.title ?? "";
  const row = where.view === "AutomationView" ? list?.rows.find((r) => r.key === where.target) : undefined;
  const namedRemoval = sheet.removalGrant !== undefined;

  const act = (program: Parameters<typeof perform<Report>>[0]) => void perform(program).then(setReport);
  const openRow = (picked: Row) => {
    setReport(undefined);
    if (picked.kind === "WorkflowRow") {
      void at((p) => p.show("WorkflowView", picked.target));
      return;
    }
    void at((p) => p.show("AutomationView", picked.key));
    setHistory(undefined);
    if (picked.kind === "PromptRow") void perform(Automations.use((a) => Effect.orElseSucceed(a.promptRuns(picked.target), () => [] as ReadonlyArray<PromptRunLine>))).then(setHistory);
  };
  const goBack = () => void at((p) => p.back()).then((taken) => {
    if (taken) return;
    void perform(WorkflowClockDraft.use((c) => c.leave()));
    onClose();
  });
  const closeSheet = () => void at((p) => p.close());
  // spec/workflows/authoring.md: the sheet opens on the draft this phone keeps, the previous version's taken in once.
  const openDraft = () => void perform(WorkflowDefinitions.use((d) => Effect.all([d.keptText(), d.restore()]))).then(([text, kept]) => {
    setDraftText(text);
    setTextKept(true);
    if (kept !== undefined) {
      setDescribed({ kind: "draft", spec: kept });
      void perform(WorkflowDefinitions.use((d) => d.scheduleNote(kept))).then(setNote);
    }
    void at((p) => p.open("DraftOverlay"));
  });
  const openClockDraft = () => {
    setClockOutcome(undefined);
    void perform(Effect.andThen(Effect.andThen(WorkflowsPlace.use((p) => p.close()), WorkflowClockDraft.use((c) => c.remember())), WorkflowClockDraft.use((c) => c.open(false))));
  };
  const revoked = (outcome: RevokeOutcome) => {
    setSourceOutcome(revokeWords[outcome]);
    if (outcome === "changed") void perform(DigestSourcesService.use((s) => s.reviewRemoval(sheet.removalGrant ?? ""))).then((rows: ReadonlyArray<ImpactRow>) => at((p) => p.setImpact(rows)));
    else void at((p) => p.setImpact(undefined));
  };

  return (
    <main aria-label="Workflows" className="flex h-full flex-col gap-4 overflow-y-auto pb-8">
      <header className="flex items-center justify-between px-4 pt-4">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={goBack}><ArrowLeft aria-hidden /></Button>
        <h1 className="font-display text-3xl">{where.view === "DigestsView" ? "Scheduled digests" : "Workflows"}</h1>
        <Button variant="ghost" size="icon" aria-label="Add to Workflows" onClick={() => void at((p) => p.open("AddingOverlay"))}><Plus aria-hidden /></Button>
      </header>

      {where.view === "ListView" && list !== undefined && (
        <AutomationList list={list} waiting={notices.state?.waiting ?? []} canAllowAnother={held !== undefined && automations.can({ type: "allowAnother", id: held.id })}
          onOpen={openRow} onAllowAnother={() => { if (held !== undefined) void perform(Automations.use((a) => a.allowAnother(held.id))); }} />
      )}
      {where.view === "ListView" && list !== undefined && (
        // spec/workflows/automations.md: removed workflows are listed apart, only when asked for, and one opens for Restore.
        <section aria-label="Removed workflows" className="flex flex-col gap-2 px-4">
          <Button variant="ghost" size="lg" aria-expanded={removedRows !== undefined}
            onClick={() => removedRows !== undefined ? setRemovedRows(undefined)
              : void perform(Automations.use((a) => a.removed())).then((rows) => setRemovedRows(rows ?? "unavailable"))}>
            {removedRows === undefined ? "Show removed" : "Hide removed"}
          </Button>
          {removedRows === "unavailable" && <Alert variant="warn" role="status" className="text-sm">Removed workflows couldn’t be read from your agent.</Alert>}
          {removedRows !== undefined && removedRows !== "unavailable" && (removedRows.length === 0
            ? <p className="text-sm text-muted-foreground">No removed workflows.</p>
            : <ul className="flex flex-col">{removedRows.map((removed) => (
              <li key={removed.key}><ListRow title={removed.title || "Workflow"} detail="Removed" onClick={() => openRow(removed)} /></li>
            ))}</ul>)}
        </section>
      )}

      {where.view === "AutomationView" && row === undefined && list !== undefined && <EmptyState title="This item is no longer listed" />}

      {where.view === "AutomationView" && row !== undefined && (
        <AutomationDetail row={row} canChange={canChangeRow(row.key)} report={report} {...(history === undefined ? {} : { history })}
          onSwitch={(on) => act(Automations.use((a) => a.setEnabled(row.key, on)))}
          onRun={() => act(Automations.use((a) => a.run(row.key)))}
          onVerb={(verb) => act(Automations.use((a) => a.verb(row.key, verb)))}
          onSnooze={() => act(Automations.use((a) => a.snooze(row.key)))}
          onEdit={(instructions, minute) => act(Automations.use((a) => a.editSchedule(row.key, instructions, minute)))}
          onDelete={() => act(Automations.use((a) => a.remove(row.key)))}
          onEditPrompt={() => void perform(Automations.use((a) => Effect.orElseSucceed(a.prompt(row.target), () => undefined))).then((editing) => {
            if (editing === undefined) setReport({ answer: "refused", word: "not-editable" });
            else {
              setPromptEdit({ id: row.target, editing });
              void at((p) => p.open("PromptOverlay"));
            }
          })} />
      )}

      {where.view === "WorkflowView" && runs.state !== undefined && (
        <>
          {workflowRow !== undefined && (
            // spec/workflows/lifecycle.md: turning a workflow on or off is reviewed first, at its current version.
            <header className="flex items-center justify-between gap-3 px-4">
              <div className="min-w-0">
                <h2 className="truncate font-display text-2xl">{workflowRow.title}</h2>
                {workflowRow.description !== "" && <p className="text-sm text-muted-foreground">{workflowRow.description}</p>}
              </div>
              <Switch aria-label={workflowRow.enabled ? "Turn off" : "Turn on"} checked={workflowRow.enabled} disabled={activation !== undefined} className="min-h-12 min-w-12"
                onCheckedChange={(on) => { setActiveOutcome(undefined); setActivation(on); }} />
            </header>
          )}
          <ReviewDialog open={activation !== undefined} title={activation === true ? `Turn on “${workflowName}”?` : `Turn off “${workflowName}”?`}
            confirm={activation === true ? "Turn on" : "Turn off"}
            onConfirm={() => {
              const on = activation === true;
              const workflowId = where.target;
              setActivation(undefined);
              void perform(WorkflowDefinitions.use((d) => d.setActive(workflowId, on))).then((outcome) => {
                setActiveOutcome(outcome);
                void perform(Automations.use((a) => a.refresh()));
              });
            }}
            onCancel={() => setActivation(undefined)}>
            <p className="text-sm">{activation === true
              ? "It runs on its schedule from now on, at the version you see. A workflow you run by hand stays off."
              : "It stops running on its schedule until you turn it on again."}</p>
          </ReviewDialog>
          {activeOutcome !== undefined && activeOutcome !== "saved" && (
            <Alert variant="warn" role="status" className="mx-4 text-sm">{activeOutcome === "refused"
              ? "Your agent didn’t make this change. A workflow you run by hand can’t be turned on."
              : "Your agent didn’t confirm this change. Check the workflow before trying again."}</Alert>
          )}
          {steps.state !== undefined && (
            <PhoneStepReview steps={steps.state} {...(sheet.step === undefined ? {} : { review: sheet.step })} canTap={steps.can({ type: "tap", approve: true })}
              onTap={(approve) => void perform(PhoneSteps.use((p) => p.tap(approve)))} />
          )}
          <RunPanel runs={runs.state} {...(runOutcome === undefined ? {} : { outcome: runOutcome })}
            {...(runOutput === undefined ? {} : { output: runOutput })}
            can={{
              review: runs.can({ type: "review" }), confirm: runs.state.confirming, reviewResend: runs.can({ type: "reviewResend" }),
              resend: runs.can({ type: "resend" }), cancel: runs.can({ type: "requestCancel" }), reconcile: runs.state.custody === "Unknown",
            }}
            onReview={() => void perform(WorkflowRuns.use((r) => r.review()))}
            onConfirm={() => void perform(WorkflowRuns.use((r) => r.confirm())).then((o) => { setRunOutcome(o); void at((p) => p.follow()); })}
            onReconcile={() => void perform(WorkflowRuns.use((r) => r.reconcile())).then(setRunOutcome)}
            onReviewResend={() => void perform(WorkflowRuns.use((r) => r.reviewResend()))}
            onResend={() => void perform(WorkflowRuns.use((r) => r.resend())).then((o) => { setRunOutcome(o); void at((p) => p.follow()); })}
            onCancel={() => void perform(WorkflowRuns.use((r) => r.cancel()))}
            onSelect={(runId) => void at((p) => p.selectRun(runId))}
            onRunMissedNow={(runId) => void perform(WorkflowRuns.use((r) => r.runMissedNow(runId)))} />
          {lifecycle.state !== undefined && (
            <LifecycleControls lifecycle={lifecycle.state} name={workflowName} {...(change === undefined ? {} : { outcome: change })}
              can={{
                remove: lifecycle.can({ type: "beginReview", op: "RemoveOp" }), restore: lifecycle.can({ type: "beginReview", op: "RestoreOp" }),
                rename: lifecycle.can({ type: "beginReview", op: "RenameOp" }), reviewResend: lifecycle.can({ type: "reviewResend" }), back: lifecycle.can({ type: "back" }),
              }}
              onReview={(op) => void perform(WorkflowDefinitions.use((d) => d.review(op)))}
              onConfirm={(name) => void perform(WorkflowDefinitions.use((d) => d.confirm(name))).then(setChange)}
              onReviewResend={() => void perform(WorkflowDefinitions.use((d) => d.reviewResend()))}
              onResend={() => void perform(WorkflowDefinitions.use((d) => d.resend())).then(setChange)}
              onBack={() => void perform(WorkflowDefinitions.use((d) => d.back()))} />
          )}
        </>
      )}

      {where.view === "DigestsView" && digests.state !== undefined && (
        <DigestPanel digests={digests.state} deviceZone={deviceZone()} {...(where.target === "" ? {} : { opened: where.target })}
          {...(overlay === "RunNowOverlay" && runNowReview !== undefined ? { runNowReview } : {})}
          can={{ retry: digests.can({ type: "retry" }), discard: digests.can({ type: "discard" }), change: digests.can({ type: "keep" }) }}
          onToggle={(loop, on) => void perform(Digests.use((d) => d.toggle(loop.id, on)))}
          onReviewRunNow={(result) => void perform(Digests.use((d) => d.runNowOffer(result.runId))).then((offer) => {
            setRunNowReview(offer);
            if (offer !== undefined) void at((p) => p.open("RunNowOverlay"));
          })}
          onRunNow={(offer) => { closeSheet(); void perform(Digests.use((d) => d.runMissedNow(offer.runId, offer))); }}
          onCloseRunNow={closeSheet}
          onRetry={() => void perform(Digests.use((d) => d.retry()))}
          onDiscard={() => void perform(Digests.use((d) => d.discard()))}
          onOpenResult={(result) => void at((p) => p.show("DigestsView", where.target === result.runId ? "" : result.runId))} />
      )}

      <Sheet open={overlay === "AddingOverlay"} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent side="bottom" title="Add to Workflows">
          <ul className="flex flex-col pb-4">
            <li><ListRow title="Workflow" onClick={openDraft} /></li>
            <li><ListRow title="Prompt" onClick={() => { setPromptEdit({}); void at((p) => p.open("PromptOverlay")); }} /></li>
            <li><ListRow title="Scheduled digest" onClick={() => void at((p) => p.show("DigestsView", ""))} /></li>
            <li><ListRow title="Digest sources" onClick={() => { setSourceOutcome(undefined); void at((p) => p.openSources()); }} /></li>
            {clockDraft.can({ type: "openClock", retained: false }) && <li><ListRow title="Alarm in Clock" onClick={openClockDraft} /></li>}
          </ul>
        </SheetContent>
      </Sheet>

      {clockDraft.state !== undefined && (
        <ClockDraftDialog shown={clockDraft.state.shown} review={clockDraft.state.review} canApprove={clockDraft.can({ type: "approve" })}
          onPrepare={(request: AlarmRequest) => void perform(WorkflowClockDraft.use((c) => c.prepare(request))).then((shown) => { if (!shown) setClockOutcome("refused"); })}
          onApprove={() => void perform(WorkflowClockDraft.use((c) => c.approve())).then(setClockOutcome)}
          onCancel={() => void perform(WorkflowClockDraft.use((c) => c.close()))} />
      )}
      {clockOutcome === "opened" && <Alert variant="ok" role="status" className="mx-4">Clock opened.</Alert>}
      {clockOutcome === "unknown" && <Alert variant="warn" role="status" className="mx-4">Clock didn’t confirm it opened. Check Clock before trying again.</Alert>}
      {clockOutcome === "failed" && <Alert variant="warn" role="status" className="mx-4">Nothing was handed to Clock.</Alert>}
      {clockOutcome === "refused" && <Alert variant="warn" role="status" className="mx-4">Clock can’t review this alarm. Nothing was handed to Clock.</Alert>}

      {overlay === "PromptOverlay" && (
        <PromptSheet open canSave={automations.can({ type: "change", kind: "CreateChange", key: "", target: false })} {...(promptEdit.editing === undefined ? {} : { editing: promptEdit.editing })} {...(report === undefined ? {} : { report })}
          onOpenChange={(open) => { if (!open) closeSheet(); }}
          onSave={(input) => void perform(Automations.use((a) => a.savePrompt(input, promptEdit.id))).then((r) => { setReport(r); if (r.answer === "applied") closeSheet(); })} />
      )}

      {authoring.state !== undefined && (
        <DraftSheet open={overlay === "DraftOverlay"} authoring={authoring.state} text={draftText} textKept={textKept}
          {...(described === undefined ? {} : { described })} {...(note === undefined ? {} : { note })} {...(change === undefined ? {} : { outcome: change })}
          can={{
            edit: authoring.can({ type: "edit" }), save: authoring.can({ type: "saveTap" }), resend: authoring.can({ type: "resendTap" }),
            recover: authoring.can({ type: "recover", answered: true }), discard: authoring.can({ type: "discardTap" }),
          }}
          onOpenChange={(open) => { if (!open) closeSheet(); }}
          onTextChange={(text) => {
            setDraftText(text);
            void perform(WorkflowDefinitions.use((d) => d.keepText(text))).then(setTextKept);
          }}
          onDescribe={(text) => void perform(WorkflowDefinitions.use((d) => d.describe(text))).then((result) => {
            setDescribed(result);
            setNote(undefined);
            if (result.kind === "draft") void perform(WorkflowDefinitions.use((d) => d.scheduleNote(result.spec))).then(setNote);
          })}
          onSave={() => void perform(WorkflowDefinitions.use((d) => d.save())).then((outcome) => { setChange(outcome); if (outcome === "saved") setDraftText(""); })}
          onRecover={() => void perform(WorkflowDefinitions.use((d) => d.recover())).then(setChange)}
          onResend={() => void perform(WorkflowDefinitions.use((d) => d.resendSave())).then(setChange)}
          onDiscard={() => void perform(WorkflowDefinitions.use((d) => d.discard()))} />
      )}

      {sources.state !== undefined && (
        <SourceReview open={overlay === "SourcesOverlay" || overlay === "RemovalOverlay"} sources={sources.state} onPhone={onPhone} phoneSources={sheet.phoneSources}
          {...(calendars === undefined ? {} : { calendars })} {...(sheet.renewing === undefined ? {} : { renewing: sheet.renewing })}
          {...(overlay === "RemovalOverlay" && sheet.impact !== undefined ? { impact: sheet.impact } : {})} {...(sourceOutcome === undefined ? {} : { outcome: sourceOutcome })}
          can={{
            startGrant: sources.can({ type: "start", mutation: "review", email: true, calendar: true }), approve: sources.can({ type: "approve" }),
            cancel: sources.can({ type: "cancelRequest" }), consent: sources.state.consent !== "ConsentAsked" && digests.can({ type: "keep" }),
            revokeConsent: digests.can({ type: "keep" }),
            revokeGrant: overlay === "RemovalOverlay" && namedRemoval ? sources.can({ type: "revokeNamedGrant", confirmed: true }) : sources.can({ type: "revokeGrant", confirmed: true }),
          }}
          onOpenChange={(open) => {
            if (open) return;
            void at((p) => Effect.andThen(p.close(), overlay === "RemovalOverlay" ? p.close() : Effect.void));
          }}
          onStartGrant={(email, calendar) => void perform(DigestSourcesService.use((s) => s.startGrant(email, calendar)))}
          onApprove={() => void perform(DigestSourcesService.use((s) => s.approveGrant()))}
          onCancel={() => void perform(DigestSourcesService.use((s) => s.cancelGrant()))}
          onChooseCalendars={() => void perform(DigestSourcesService.use((s) => s.phoneCalendars())).then(setCalendars)}
          onAllow={(choice) => void perform(DigestSourcesService.use((s) => s.allowPhoneSource(choice))).then((outcome) => {
            if (outcome === "saved") void at((p) => p.refreshSources());
            setSourceOutcome(phoneSourceWords[outcome]);
          })}
          onRenew={(sourceId) => void at((p) => p.openSources(sourceId))}
          onRevokeConsent={(sourceId) => void perform(DigestSourcesService.use((s) => s.revokeConsent(sourceId))).then(() => at((p) => p.refreshSources()))}
          onReviewRevoke={() => void at((p) => p.reviewRemoval())}
          onRevokeGrant={(reviewed) => void perform(DigestSourcesService.use((s) => s.revokeGrant(reviewed))).then(revoked)}
          onCloseRevoke={closeSheet} />
      )}
    </main>
  );
}
