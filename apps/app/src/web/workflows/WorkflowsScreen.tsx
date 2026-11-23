// spec/workflows/index.md; spec/workflows/automations.md, "Story: See all my automations even when one source fails"; spec/workflows/runs.md, "A notice opens exactly the run it names"; spec/workflows/clockDraft.md, "Story: Set an alarm a workflow suggests, from Workflows"; spec/workflows/digestSources.md, "Story: Renew my phone source before its week ends"; spec/workflows/hostedResults.md, "A tap is captured for a posted notice of the current owner, and consuming it opens exactly that result"
import { parseWorkflowRunDeepLink } from "@elizaos/plugin-workflow/client";
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
import { useMachine as useRuns } from "../../../gen/workflows__runs.react.ts";
import { useMachine as useSteps } from "../../../gen/workflows__deviceSteps.react.ts";
import { useMachine as useClockDraft } from "../../../gen/workflows__clockDraft.react.ts";
import type { Row } from "../../../gen/workflows__automations.ts";
import { Automations, type PromptInput, type PromptRunLine, type Report } from "../../workflows/automations.vibe";
import { WorkflowClockDraft } from "../../workflows/clock-draft.vibe";
import { WorkflowDefinitions, type ChangeOutcome, type Described, type ScheduleNote } from "../../workflows/definitions.vibe";
import { Digests } from "../../workflows/digests.vibe";
import { PhoneSteps, type StepReview } from "../../workflows/notices.vibe";
import { HostedResults } from "../../workflows/results.vibe";
import { WorkflowRuns, type RunOutcome } from "../../workflows/runs.vibe";
import { DigestSourcesService, type ImpactRow, type PhoneCalendars } from "../../workflows/sources.vibe";
import { deviceZone } from "../../workflows/ids.ts";
import { Build } from "../../platform/build.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { Alert, Button, EmptyState, Sheet, SheetContent, ListRow } from "../components/ui/index.ts";
import { AutomationDetail } from "./AutomationDetail.tsx";
import { AutomationList } from "./AutomationList.tsx";
import { DigestPanel } from "./DigestPanel.tsx";
import { DraftSheet } from "./DraftSheet.tsx";
import { LifecycleControls } from "./LifecycleControls.tsx";
import { PhoneStepReview } from "./PhoneStepReview.tsx";
import { PromptSheet } from "./PromptSheet.tsx";
import { ReviewDialog } from "./ReviewDialog.tsx";
import { RunPanel } from "./RunPanel.tsx";
import { type PhoneSourceRow, SourceReview } from "./SourceReview.tsx";
import { phoneSourceWords, revokeWords } from "./words.ts";
import { perform, runtime } from "./connect.ts";

type View = { kind: "list" } | { kind: "automation"; key: string } | { kind: "workflow"; workflowId: string; name: string } | { kind: "digests" };

/** Workflows takes the shell's screen props; its route is a run deep link, `digests`, `digests:<runId>` or `renew:<sourceId>`. */
export type WorkflowsScreenProps = ScreenProps;

/** The phone sources a digest reads, newest first, from the digest catalog. */
function phoneSourcesOf(sources: ReadonlyArray<{ id: string; label: string; expiresAt: string; revoked: boolean; live?: { provider: string } }>): ReadonlyArray<PhoneSourceRow> {
  return sources.filter((s) => s.live?.provider === "native").map((s) => ({ id: s.id, label: s.label, expiresAt: Date.parse(s.expiresAt), revoked: s.revoked }))
    .sort((a, b) => b.expiresAt - a.expiresAt);
}

/**
 * The Workflows app: the list, one automation or workflow with its runs, and the digest panel.
 * @model spec/workflows/automations.md
 * @design design.md
 */
export function WorkflowsScreen({ route, onClose }: WorkflowsScreenProps) {
  const automations = useAutomations(runtime);
  const runs = useRuns(runtime);
  const lifecycle = useLifecycle(runtime);
  const authoring = useAuthoring(runtime);
  const steps = useSteps(runtime);
  const digests = useDigests(runtime);
  const sources = useSources(runtime);
  const notices = useNotices(runtime);
  const clockDraft = useClockDraft(runtime);
  const [onPhone] = useState(() => runtime.runSync(Effect.map(Effect.service(Build), (build) => build.info.variant !== "browser")));
  const linked = route === undefined ? undefined : parseWorkflowRunDeepLink(route);
  const [opened, setOpened] = useState<string | undefined>(() => (route?.startsWith("digests:") ? route.slice("digests:".length) : undefined));
  const [renewing, setRenewing] = useState<string | undefined>(() => (route?.startsWith("renew:") ? route.slice("renew:".length) : undefined));
  const [reviewingSources, setReviewingSources] = useState(() => route?.startsWith("renew:") === true);
  const [calendars, setCalendars] = useState<PhoneCalendars | undefined>(undefined);
  const [phoneSources, setPhoneSources] = useState<ReadonlyArray<PhoneSourceRow>>([]);
  const [impact, setImpact] = useState<ReadonlyArray<ImpactRow> | undefined>(undefined);
  const [sourceOutcome, setSourceOutcome] = useState<string | undefined>(undefined);
  const [runNowReview, setRunNowReview] = useState<MissedRunNow | undefined>(undefined);
  const openSources = (renews?: string) => {
    setReviewingSources(true);
    setRenewing(renews);
    setSourceOutcome(undefined);
    void perform(Effect.andThen(Effect.andThen(DigestSourcesService.use((s) => s.bind()), Digests.use((d) => d.poll(true))), Digests.use((d) => d.catalog())))
      .then((c) => setPhoneSources(phoneSourcesOf(c.sources)));
  };
  const [view, setView] = useState<View>(() => {
    void perform(Automations.use((a) => a.refresh()));
    void perform(WorkflowClockDraft.use((c) => c.enter()));
    if (route?.startsWith("renew:") === true) {
      void perform(Effect.andThen(Effect.andThen(DigestSourcesService.use((s) => s.bind()), Digests.use((d) => d.poll(true))), Digests.use((d) => d.catalog())))
        .then((c) => setPhoneSources(phoneSourcesOf(c.sources)));
      return { kind: "list" };
    }
    if (route === "digests" || route?.startsWith("digests:") === true) {
      void perform(Digests.use((d) => d.open()));
      const runId = route.startsWith("digests:") ? route.slice("digests:".length) : "";
      if (runId !== "") void perform(HostedResults.use((h) => h.shown([runId])));
      return { kind: "digests" };
    }
    if (linked === undefined || route === undefined) return { kind: "list" };
    void perform(WorkflowRuns.use((r) => Effect.orElseSucceed(r.openRoute(route), () => "")));
    void perform(WorkflowDefinitions.use((d) => d.open(linked.workflowId)));
    return { kind: "workflow", workflowId: linked.workflowId, name: "" };
  });
  const [adding, setAdding] = useState(false);
  const [prompt, setPrompt] = useState<{ open: boolean; editing?: PromptInput; id?: string }>({ open: false });
  const [drafting, setDrafting] = useState(false);
  const [report, setReport] = useState<Report | undefined>(undefined);
  const [history, setHistory] = useState<ReadonlyArray<PromptRunLine> | undefined>(undefined);
  const [runOutcome, setRunOutcome] = useState<RunOutcome | undefined>(undefined);
  const [change, setChange] = useState<ChangeOutcome | undefined>(undefined);
  const [described, setDescribed] = useState<Described | undefined>(undefined);
  const [note, setNote] = useState<ScheduleNote | undefined>(undefined);
  const [step, setStep] = useState<StepReview | undefined>(undefined);
  const [clockOutcome, setClockOutcome] = useState<"opened" | "unknown" | "failed" | "refused" | undefined>(undefined);
  const list = automations.state;
  const held = list?.held.find((h) => h.owner === list.owner);
  const canChangeRow = (key: string) => automations.can({ type: "change", kind: "RunChange", key, target: false });

  const act = (program: Parameters<typeof perform<Report>>[0]) => void perform(program).then(setReport);
  const openRow = (row: Row) => {
    setReport(undefined);
    if (row.kind === "WorkflowRow") {
      setView({ kind: "workflow", workflowId: row.target, name: row.title });
      void perform(WorkflowRuns.use((r) => r.openWorkflow(row.target)));
      void perform(WorkflowDefinitions.use((d) => d.open(row.target)));
      return;
    }
    setView({ kind: "automation", key: row.key });
    setHistory(undefined);
    if (row.kind === "PromptRow") void perform(Automations.use((a) => Effect.orElseSucceed(a.promptRuns(row.target), () => [] as ReadonlyArray<PromptRunLine>))).then(setHistory);
  };
  const selectRun = (runId: string) => {
    if (runs.can({ type: "selectRun", runId })) void runs.send({ type: "selectRun", runId });
    const workflowId = runs.state?.workflowId ?? "";
    void perform(PhoneSteps.use((p) => p.review(runId, workflowId))).then(setStep);
    void perform(WorkflowRuns.use((r) => r.follow()));
  };
  const back = () => {
    if (view.kind !== "list") return setView({ kind: "list" });
    void perform(WorkflowClockDraft.use((c) => c.leave()));
    onClose();
  };
  const openClockDraft = () => {
    setAdding(false);
    setClockOutcome(undefined);
    void perform(Effect.andThen(WorkflowClockDraft.use((c) => c.remember()), WorkflowClockDraft.use((c) => Effect.andThen(c.open(false), (shown) => (shown ? c.prepare() : Effect.succeed(false))))));
  };
  const row = view.kind === "automation" ? list?.rows.find((r) => r.key === view.key) : undefined;

  return (
    <main aria-label="Workflows" className="flex h-full flex-col gap-4 overflow-y-auto pb-8">
      <header className="flex items-center justify-between px-4 pt-4">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={back}><ArrowLeft aria-hidden /></Button>
        <h1 className="font-serif text-3xl">{view.kind === "digests" ? "Scheduled digests" : "Workflows"}</h1>
        <Button variant="ghost" size="icon" aria-label="Add to Workflows" onClick={() => setAdding(true)}><Plus aria-hidden /></Button>
      </header>

      {view.kind === "list" && list !== undefined && (
        <AutomationList list={list} waiting={notices.state?.waiting ?? []} canAllowAnother={held !== undefined && automations.can({ type: "allowAnother", id: held.id })}
          onOpen={openRow} onAllowAnother={() => { if (held !== undefined) void perform(Automations.use((a) => a.allowAnother(held.id))); }} />
      )}

      {view.kind === "automation" && row === undefined && list !== undefined && <EmptyState title="This item is no longer listed" />}

      {view.kind === "automation" && row !== undefined && (
        <AutomationDetail row={row} canChange={canChangeRow(row.key)} report={report} {...(history === undefined ? {} : { history })}
          onSwitch={(on) => act(Automations.use((a) => a.setEnabled(row.key, on)))}
          onRun={() => act(Automations.use((a) => a.run(row.key)))}
          onVerb={(verb) => act(Automations.use((a) => a.verb(row.key, verb)))}
          onSnooze={() => act(Automations.use((a) => a.snooze(row.key)))}
          onEdit={(instructions, minute) => act(Automations.use((a) => a.editSchedule(row.key, instructions, minute)))}
          onDelete={() => act(Automations.use((a) => a.remove(row.key)))}
          onEditPrompt={() => void perform(Automations.use((a) => Effect.orElseSucceed(a.prompt(row.target), () => undefined))).then((editing) => {
            if (editing === undefined) setReport({ answer: "refused", word: "not-editable" });
            else setPrompt({ open: true, id: row.target, editing });
          })} />
      )}

      {view.kind === "workflow" && runs.state !== undefined && (
        <>
          {steps.state !== undefined && (
            <PhoneStepReview steps={steps.state} {...(step === undefined ? {} : { review: step })} canTap={steps.can({ type: "tap", approve: true })}
              onTap={(approve) => void perform(PhoneSteps.use((p) => p.tap(approve)))} />
          )}
          <RunPanel runs={runs.state} {...(runOutcome === undefined ? {} : { outcome: runOutcome })}
            can={{
              review: runs.can({ type: "review" }), confirm: runs.state.confirming, reviewResend: runs.can({ type: "reviewResend" }),
              resend: runs.can({ type: "resend" }), cancel: runs.can({ type: "requestCancel" }), reconcile: runs.state.custody === "Unknown",
            }}
            onReview={() => void perform(WorkflowRuns.use((r) => r.review()))}
            onConfirm={() => void perform(WorkflowRuns.use((r) => r.confirm())).then((o) => { setRunOutcome(o); void perform(WorkflowRuns.use((r) => r.follow())); })}
            onReconcile={() => void perform(WorkflowRuns.use((r) => r.reconcile())).then(setRunOutcome)}
            onReviewResend={() => void perform(WorkflowRuns.use((r) => r.reviewResend()))}
            onResend={() => void perform(WorkflowRuns.use((r) => r.resend())).then(setRunOutcome)}
            onCancel={() => void perform(WorkflowRuns.use((r) => r.cancel()))}
            onSelect={selectRun}
            onRunMissedNow={(runId) => void perform(WorkflowRuns.use((r) => r.runMissedNow(runId)))} />
          {lifecycle.state !== undefined && (
            <LifecycleControls lifecycle={lifecycle.state} name={view.name} {...(change === undefined ? {} : { outcome: change })}
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

      {view.kind === "digests" && digests.state !== undefined && (
        <DigestPanel digests={digests.state} deviceZone={deviceZone()} {...(opened === undefined ? {} : { opened })} {...(runNowReview === undefined ? {} : { runNowReview })}
          can={{ retry: digests.can({ type: "retry" }), discard: digests.can({ type: "discard" }), change: digests.can({ type: "keep" }) }}
          onToggle={(loop, on) => void perform(Digests.use((d) => d.toggle(loop.id, on)))}
          onReviewRunNow={(result) => void perform(Digests.use((d) => d.runNowOffer(result.runId))).then(setRunNowReview)}
          onRunNow={(offer) => { setRunNowReview(undefined); void perform(Digests.use((d) => d.runMissedNow(offer.runId, offer))); }}
          onCloseRunNow={() => setRunNowReview(undefined)}
          onRetry={() => void perform(Digests.use((d) => d.retry()))}
          onDiscard={() => void perform(Digests.use((d) => d.discard()))}
          onOpenResult={(result) => {
            setOpened(opened === result.runId ? undefined : result.runId);
            void perform(HostedResults.use((h) => h.shown([result.runId])));
          }} />
      )}

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent side="bottom" title="Add to Workflows">
          <ul className="flex flex-col pb-4">
            <li><ListRow title="Workflow" onClick={() => { setAdding(false); setDrafting(true); }} /></li>
            <li><ListRow title="Prompt" onClick={() => { setAdding(false); setPrompt({ open: true }); }} /></li>
            <li><ListRow title="Scheduled digest" onClick={() => { setAdding(false); setView({ kind: "digests" }); void perform(Digests.use((d) => d.open())); }} /></li>
            <li><ListRow title="Digest sources" onClick={() => { setAdding(false); openSources(); }} /></li>
            {clockDraft.can({ type: "openClock", retained: false }) && <li><ListRow title="Alarm in Clock" onClick={openClockDraft} /></li>}
          </ul>
        </SheetContent>
      </Sheet>

      {clockDraft.state !== undefined && (
        <ReviewDialog open={clockDraft.state.review} title="Set this alarm in Clock?" confirm="Open Clock" disabled={!clockDraft.can({ type: "approve" })}
          onConfirm={() => void perform(WorkflowClockDraft.use((c) => c.approve())).then(setClockOutcome)}
          onCancel={() => void perform(WorkflowClockDraft.use((c) => c.close()))}>
          <p className="text-sm text-muted-foreground">Clock opens with the alarm you reviewed. Clock only tells Alpha that it opened.</p>
        </ReviewDialog>
      )}
      {clockOutcome === "opened" && <Alert variant="ok" role="status" className="mx-4">Clock opened.</Alert>}
      {clockOutcome === "unknown" && <Alert variant="warn" role="status" className="mx-4">Clock didn’t confirm it opened. Check Clock before trying again.</Alert>}
      {clockOutcome === "failed" && <Alert variant="warn" role="status" className="mx-4">Nothing was handed to Clock.</Alert>}

      {prompt.open && (
        <PromptSheet open={prompt.open} canSave={automations.can({ type: "change", kind: "CreateChange", key: "", target: false })} {...(prompt.editing === undefined ? {} : { editing: prompt.editing })} {...(report === undefined ? {} : { report })}
          onOpenChange={(open) => setPrompt(open ? prompt : { open: false })}
          onSave={(input) => void perform(Automations.use((a) => a.savePrompt(input, prompt.id))).then((r) => { setReport(r); if (r.answer === "applied") setPrompt({ open: false }); })} />
      )}

      {authoring.state !== undefined && (
        <DraftSheet open={drafting} authoring={authoring.state} {...(described === undefined ? {} : { described })} {...(note === undefined ? {} : { note })} {...(change === undefined ? {} : { outcome: change })}
          can={{
            edit: authoring.can({ type: "edit" }), save: authoring.can({ type: "saveTap" }), resend: authoring.can({ type: "resendTap" }),
            recover: authoring.can({ type: "recover", answered: true }), discard: authoring.can({ type: "discardTap" }),
          }}
          onOpenChange={setDrafting}
          onDescribe={(text) => void perform(WorkflowDefinitions.use((d) => d.describe(text))).then((result) => {
            setDescribed(result);
            setNote(undefined);
            if (result.kind === "draft") void perform(WorkflowDefinitions.use((d) => d.scheduleNote(result.spec))).then(setNote);
          })}
          onSave={() => void perform(WorkflowDefinitions.use((d) => d.save())).then(setChange)}
          onRecover={() => void perform(WorkflowDefinitions.use((d) => d.recover())).then(setChange)}
          onResend={() => void perform(WorkflowDefinitions.use((d) => d.resendSave())).then(setChange)}
          onDiscard={() => void perform(WorkflowDefinitions.use((d) => d.discard()))} />
      )}

      {sources.state !== undefined && (
        <SourceReview open={reviewingSources} sources={sources.state} onPhone={onPhone} phoneSources={phoneSources}
          {...(calendars === undefined ? {} : { calendars })} {...(renewing === undefined ? {} : { renewing })}
          {...(impact === undefined ? {} : { impact })} {...(sourceOutcome === undefined ? {} : { outcome: sourceOutcome })}
          can={{
            startGrant: sources.can({ type: "start", mutation: "review", email: true, calendar: true }), approve: sources.can({ type: "approve" }),
            cancel: sources.can({ type: "cancelRequest" }), consent: sources.state.consent !== "ConsentAsked" && digests.can({ type: "keep" }),
            revokeConsent: digests.can({ type: "keep" }), revokeGrant: sources.can({ type: "revokeGrant", confirmed: true }),
          }}
          onOpenChange={(open) => { setReviewingSources(open); if (!open) { setRenewing(undefined); setImpact(undefined); } }}
          onStartGrant={(email, calendar) => void perform(DigestSourcesService.use((s) => s.startGrant(email, calendar)))}
          onApprove={() => void perform(DigestSourcesService.use((s) => s.approveGrant()))}
          onCancel={() => void perform(DigestSourcesService.use((s) => s.cancelGrant()))}
          onChooseCalendars={() => void perform(DigestSourcesService.use((s) => s.phoneCalendars())).then(setCalendars)}
          onAllow={(choice) => void perform(DigestSourcesService.use((s) => s.allowPhoneSource(choice))).then((outcome) => {
            if (outcome === "saved") openSources();
            setSourceOutcome(phoneSourceWords[outcome]);
          })}
          onRenew={(sourceId) => setRenewing(sourceId)}
          onRevokeConsent={(sourceId) => void perform(DigestSourcesService.use((s) => s.revokeConsent(sourceId))).then(() => openSources())}
          onReviewRevoke={() => void perform(DigestSourcesService.use((s) => s.revokeImpact())).then(setImpact)}
          onRevokeGrant={(reviewed) => void perform(DigestSourcesService.use((s) => s.revokeGrant(reviewed))).then((outcome) => {
            setSourceOutcome(revokeWords[outcome]);
            if (outcome === "changed") void perform(DigestSourcesService.use((s) => s.revokeImpact())).then(setImpact);
            else setImpact(undefined);
          })}
          onCloseRevoke={() => setImpact(undefined)} />
      )}
    </main>
  );
}
