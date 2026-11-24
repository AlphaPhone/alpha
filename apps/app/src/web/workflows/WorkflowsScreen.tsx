// spec/workflows/index.md; spec/workflows/place.md, "Story: Move inside Workflows and come back with Back"; spec/workflows/automations.md, "Story: See all my automations even when one source fails"; spec/workflows/runs.md, "A notice opens exactly the run it names"; spec/workflows/clockDraft.md, "Story: Set an alarm a workflow suggests, from Workflows"; spec/workflows/digestSources.md, "Story: Renew my phone source before its week ends"; spec/workflows/digestSources.md, "Removing a grant Account names needs only Alpha in front, and clears this session's grant only once confirmed"; spec/workflows/authoring.md, "The unsent description is kept for its owner across closing and reopening"; spec/workflows/hostedResults.md, "Background delivery is configured only on Android, by one attempt that a pause retires"; spec/workflows/authoring.md, "The previous version's draft comes in once, only while none is kept, and its slot clears only after the kept draft reads back"
import type { MissedRunNow } from "@elizaos/plugin-workflow/digests";
import { Effect } from "effect";
import { useState } from "react";
import { useMachine as useAutomations } from "../../../gen/workflows__automations.react.ts";
import { useMachine as useAuthoring } from "../../../gen/workflows__authoring.react.ts";
import { useMachine as useDigests } from "../../../gen/workflows__digests.react.ts";
import { useMachine as useResults } from "../../../gen/workflows__hostedResults.react.ts";
import { useMachine as useSources } from "../../../gen/workflows__digestSources.react.ts";
import { useMachine as useLifecycle } from "../../../gen/workflows__lifecycle.react.ts";
import { useMachine as useNotices } from "../../../gen/workflows__notices.react.ts";
import { useMachine as usePlace } from "../../../gen/workflows__place.react.ts";
import { useMachine as useRuns } from "../../../gen/workflows__runs.react.ts";
import { useMachine as useSteps } from "../../../gen/workflows__deviceSteps.react.ts";
import { useMachine as useClockDraft } from "../../../gen/workflows__clockDraft.react.ts";
import type { Row } from "../../../gen/workflows__automations.ts";
import { initial as placeStart } from "../../../gen/workflows__place.ts";
import { Automations, type PromptInput, type PromptRunLine, type Report } from "../../workflows/automations.vibe";
import { WorkflowClockDraft } from "../../workflows/clock-draft.vibe";
import { WorkflowDefinitions, type ActivationNote, type ChangeOutcome, type Described, type ScheduleNote } from "../../workflows/definitions.vibe";
import { Digests } from "../../workflows/digests.vibe";
import { HostedResults } from "../../workflows/results.vibe";
import { PhoneSteps } from "../../workflows/notices.vibe";
import { WorkflowsPlace } from "../../workflows/place.vibe";
import type { AlarmRequest } from "../../workflows/ports.vibe";
import { WorkflowRuns, type RunOutcome } from "../../workflows/runs.vibe";
import { DigestSourcesService, type ImpactRow, type PhoneCalendars, type RevokeOutcome } from "../../workflows/sources.vibe";
import { deviceZone } from "../../workflows/ids.ts";
import type { ScreenProps } from "../app-screen.ts";
import { WorkflowsScreenView, type ClockOutcome } from "./WorkflowsScreenView.tsx";
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
  const results = useResults(runtime);
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
  const [clockOutcome, setClockOutcome] = useState<ClockOutcome | undefined>(undefined);
  const [activation, setActivation] = useState<boolean | undefined>(undefined);
  const [activationNote, setActivationNote] = useState<ActivationNote | undefined>(undefined);
  const [removedRows, setRemovedRows] = useState<ReadonlyArray<Row> | "unavailable" | undefined>(undefined);
  const [activeOutcome, setActiveOutcome] = useState<ChangeOutcome | undefined>(undefined);
  const list = automations.state;
  const held = list?.held.find((h) => h.owner === list.owner);
  const where = place.state ?? placeStart;
  const overlay = where.overlay;
  const runOutput = runs.state === undefined ? undefined : outputs.get(runs.state.selected);
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
  const closeSheet = () => void at((p) => p.close());
  const revoked = (outcome: RevokeOutcome) => {
    setSourceOutcome(revokeWords[outcome]);
    if (outcome === "changed") void perform(DigestSourcesService.use((s) => s.reviewRemoval(sheet.removalGrant ?? ""))).then((rows: ReadonlyArray<ImpactRow>) => at((p) => p.setImpact(rows)));
    else void at((p) => p.setImpact(undefined));
  };

  return (
    <WorkflowsScreenView
      place={where}
      {...(list === undefined ? {} : { list })}
      waiting={notices.state?.waiting ?? []}
      {...(runs.state === undefined ? {} : { runs: runs.state })}
      {...(lifecycle.state === undefined ? {} : { lifecycle: lifecycle.state })}
      {...(steps.state === undefined ? {} : { steps: steps.state })}
      {...(digests.state === undefined ? {} : { digests: digests.state })}
      {...(sources.state === undefined ? {} : { sources: sources.state })}
      {...(authoring.state === undefined ? {} : { authoring: authoring.state })}
      {...(clockDraft.state === undefined ? {} : { clockDraft: clockDraft.state })}
      sheet={sheet}
      can={{
        allowAnother: held !== undefined && automations.can({ type: "allowAnother", id: held.id }),
        changeRow: automations.can({ type: "change", kind: "RunChange", key: where.target, target: false }),
        savePrompt: automations.can({ type: "change", kind: "CreateChange", key: "", target: false }),
        tapStep: steps.can({ type: "tap", approve: true }),
        openClock: clockDraft.can({ type: "openClock", retained: false }),
        approveClock: clockDraft.can({ type: "approve" }),
        runs: {
          review: runs.can({ type: "review" }), confirm: runs.state?.confirming === true, reviewResend: runs.can({ type: "reviewResend" }),
          resend: runs.can({ type: "resend" }), cancel: runs.can({ type: "requestCancel" }), reconcile: runs.state?.custody === "Unknown",
        },
        lifecycle: {
          remove: lifecycle.can({ type: "beginReview", op: "RemoveOp" }), restore: lifecycle.can({ type: "beginReview", op: "RestoreOp" }),
          rename: lifecycle.can({ type: "beginReview", op: "RenameOp" }), reviewResend: lifecycle.can({ type: "reviewResend" }), back: lifecycle.can({ type: "back" }),
        },
        digests: { retry: digests.can({ type: "retry" }), discard: digests.can({ type: "discard" }), change: digests.can({ type: "keep" }) },
        authoring: {
          edit: authoring.can({ type: "edit" }), save: authoring.can({ type: "saveTap" }), resend: authoring.can({ type: "resendTap" }),
          recover: authoring.can({ type: "recover", answered: true }), discard: authoring.can({ type: "discardTap" }),
        },
        sources: {
          startGrant: sources.can({ type: "start", mutation: "review", email: true, calendar: true }), approve: sources.can({ type: "approve" }),
          cancel: sources.can({ type: "cancelRequest" }), consent: sources.state?.consent !== "ConsentAsked" && digests.can({ type: "keep" }),
          revokeConsent: digests.can({ type: "keep" }),
          revokeGrant: overlay === "RemovalOverlay" && namedRemoval ? sources.can({ type: "revokeNamedGrant", confirmed: true }) : sources.can({ type: "revokeGrant", confirmed: true }),
        },
      }}
      onPhone={onPhone}
      zone={deviceZone()}
      {...(runOutput === undefined ? {} : { runOutput })}
      {...(report === undefined ? {} : { report })}
      {...(history === undefined ? {} : { history })}
      {...(removedRows === undefined ? {} : { removedRows })}
      {...(activation === undefined ? {} : { activation })}
      {...(activationNote === undefined ? {} : { activationNote })}
      {...(activeOutcome === undefined ? {} : { activeOutcome })}
      {...(runOutcome === undefined ? {} : { runOutcome })}
      {...(change === undefined ? {} : { change })}
      {...(runNowReview === undefined ? {} : { runNowReview })}
      {...(promptEdit.editing === undefined ? {} : { promptEditing: promptEdit.editing })}
      draftText={draftText}
      textKept={textKept}
      {...(described === undefined ? {} : { described })}
      {...(note === undefined ? {} : { note })}
      {...(clockOutcome === undefined ? {} : { clockOutcome })}
      {...(calendars === undefined ? {} : { calendars })}
      {...(sourceOutcome === undefined ? {} : { sourceOutcome })}
      onBack={() => void at((p) => p.back()).then((taken) => {
        if (taken) return;
        void perform(WorkflowClockDraft.use((c) => c.leave()));
        onClose();
      })}
      onAdd={() => void at((p) => p.open("AddingOverlay"))}
      onCloseSheet={closeSheet}
      onOpenRow={openRow}
      onAllowAnother={() => { if (held !== undefined) void perform(Automations.use((a) => a.allowAnother(held.id))); }}
      onToggleRemoved={() => removedRows !== undefined ? setRemovedRows(undefined)
        : void perform(Automations.use((a) => a.removed())).then((rows) => setRemovedRows(rows ?? "unavailable"))}
      rowActions={{
        onSwitch: (row, on) => act(Automations.use((a) => a.setEnabled(row.key, on))),
        onRun: (row) => act(Automations.use((a) => a.run(row.key))),
        onVerb: (row, verb) => act(Automations.use((a) => a.verb(row.key, verb))),
        onSnooze: (row) => act(Automations.use((a) => a.snooze(row.key))),
        onEdit: (row, instructions, minute, days) => act(Automations.use((a) => a.editSchedule(row.key, instructions, minute, days))),
        onDelete: (row) => act(Automations.use((a) => a.remove(row.key))),
        onEditPrompt: (row) => void perform(Automations.use((a) => Effect.orElseSucceed(a.prompt(row.target), () => undefined))).then((editing) => {
          if (editing === undefined) setReport({ answer: "refused", word: "not-editable" });
          else {
            setPromptEdit({ id: row.target, editing });
            void at((p) => p.open("PromptOverlay"));
          }
        }),
      }}
      onAskActive={(on) => {
        setActiveOutcome(undefined);
        setActivationNote(undefined);
        setActivation(on);
        if (on) void perform(WorkflowDefinitions.use((d) => d.activationNote(where.target))).then(setActivationNote);
      }}
      onConfirmActive={() => {
        const on = activation === true;
        const workflowId = where.target;
        setActivation(undefined);
        void perform(WorkflowDefinitions.use((d) => d.setActive(workflowId, on))).then((outcome) => {
          setActiveOutcome(outcome);
          void perform(Automations.use((a) => a.refresh()));
        });
      }}
      onCancelActive={() => setActivation(undefined)}
      onTapStep={(approve) => void perform(PhoneSteps.use((p) => p.tap(approve)))}
      runActions={{
        onReview: () => void perform(WorkflowRuns.use((r) => r.review())),
        onConfirm: () => void perform(WorkflowRuns.use((r) => r.confirm())).then((o) => { setRunOutcome(o); void at((p) => p.follow()); }),
        onReconcile: () => void perform(WorkflowRuns.use((r) => r.reconcile())).then(setRunOutcome),
        onReviewResend: () => void perform(WorkflowRuns.use((r) => r.reviewResend())),
        onResend: () => void perform(WorkflowRuns.use((r) => r.resend())).then((o) => { setRunOutcome(o); void at((p) => p.follow()); }),
        onCancel: () => void perform(WorkflowRuns.use((r) => r.cancel())),
        onSelect: (runId) => void at((p) => p.selectRun(runId)),
        onRunMissedNow: (runId) => void perform(WorkflowRuns.use((r) => r.runMissedNow(runId))),
      }}
      lifecycleActions={{
        onReview: (op) => void perform(WorkflowDefinitions.use((d) => d.review(op))),
        onConfirm: (name) => void perform(WorkflowDefinitions.use((d) => d.confirm(name))).then(setChange),
        onReviewResend: () => void perform(WorkflowDefinitions.use((d) => d.reviewResend())),
        onResend: () => void perform(WorkflowDefinitions.use((d) => d.resend())).then(setChange),
        onBack: () => void perform(WorkflowDefinitions.use((d) => d.back())),
      }}
      notifications={results.state?.enabled ?? true}
      {...(onPhone ? { background: results.state?.background === "BackgroundOn" || results.state?.background === "Beginning" || results.state?.background === "Configuring" } : {})}
      digestActions={{
        onToggle: (loop, on) => void perform(Digests.use((d) => d.toggle(loop.id, on))),
        onReviewRunNow: (result) => void perform(Digests.use((d) => d.runNowOffer(result.runId))).then((offer) => {
          setRunNowReview(offer);
          if (offer !== undefined) void at((p) => p.open("RunNowOverlay"));
        }),
        onRunNow: (offer) => { closeSheet(); void perform(Digests.use((d) => d.runMissedNow(offer.runId, offer))); },
        onCloseRunNow: closeSheet,
        onRetry: () => void perform(Digests.use((d) => d.retry())),
        onDiscard: () => void perform(Digests.use((d) => d.discard())),
        onOpenResult: (result) => void at((p) => p.show("DigestsView", where.target === result.runId ? "" : result.runId)),
        onNotifications: (on) => void perform(HostedResults.use((h) => h.setNotifications(on))),
        onBackground: (on) => void perform(HostedResults.use((h) => h.background(on))),
      }}
      // spec/workflows/authoring.md: the sheet opens on the draft this phone keeps, the previous version's taken in once.
      onOpenDraft={() => void perform(WorkflowDefinitions.use((d) => Effect.all([d.keptText(), d.restore()]))).then(([text, kept]) => {
        setDraftText(text);
        setTextKept(true);
        if (kept !== undefined) {
          setDescribed({ kind: "draft", spec: kept });
          void perform(WorkflowDefinitions.use((d) => d.scheduleNote(kept))).then(setNote);
        }
        void at((p) => p.open("DraftOverlay"));
      })}
      onOpenPrompt={() => { setPromptEdit({}); void at((p) => p.open("PromptOverlay")); }}
      onOpenDigests={() => void at((p) => p.show("DigestsView", ""))}
      onOpenSources={() => { setSourceOutcome(undefined); void at((p) => p.openSources()); }}
      onOpenClockDraft={() => {
        setClockOutcome(undefined);
        void perform(Effect.andThen(Effect.andThen(WorkflowsPlace.use((p) => p.close()), WorkflowClockDraft.use((c) => c.remember())), WorkflowClockDraft.use((c) => c.open(false))));
      }}
      clockActions={{
        onPrepare: (request: AlarmRequest) => void perform(WorkflowClockDraft.use((c) => c.prepare(request))).then((shown) => { if (!shown) setClockOutcome("refused"); }),
        onApprove: () => void perform(WorkflowClockDraft.use((c) => c.approve())).then(setClockOutcome),
        onCancel: () => void perform(WorkflowClockDraft.use((c) => c.close())),
      }}
      onSavePrompt={(input) => void perform(Automations.use((a) => a.savePrompt(input, promptEdit.id))).then((r) => { setReport(r); if (r.answer === "applied") closeSheet(); })}
      draftActions={{
        onTextChange: (text) => {
          setDraftText(text);
          void perform(WorkflowDefinitions.use((d) => d.keepText(text))).then(setTextKept);
        },
        onDescribe: (text) => void perform(WorkflowDefinitions.use((d) => d.describe(text))).then((result) => {
          setDescribed(result);
          setNote(undefined);
          if (result.kind === "draft") void perform(WorkflowDefinitions.use((d) => d.scheduleNote(result.spec))).then(setNote);
        }),
        onSave: () => void perform(WorkflowDefinitions.use((d) => d.save())).then((outcome) => { setChange(outcome); if (outcome === "saved") setDraftText(""); }),
        onRecover: () => void perform(WorkflowDefinitions.use((d) => d.recover())).then(setChange),
        onResend: () => void perform(WorkflowDefinitions.use((d) => d.resendSave())).then(setChange),
        onDiscard: () => void perform(WorkflowDefinitions.use((d) => d.discard())),
      }}
      sourceActions={{
        onOpenChange: (open) => {
          if (open) return;
          void at((p) => Effect.andThen(p.close(), overlay === "RemovalOverlay" ? p.close() : Effect.void));
        },
        onStartGrant: (email, calendar) => void perform(DigestSourcesService.use((s) => s.startGrant(email, calendar))),
        onApprove: () => void perform(DigestSourcesService.use((s) => s.approveGrant())),
        onCancel: () => void perform(DigestSourcesService.use((s) => s.cancelGrant())),
        onChooseCalendars: () => void perform(DigestSourcesService.use((s) => s.phoneCalendars())).then(setCalendars),
        onAllow: (choice) => void perform(DigestSourcesService.use((s) => s.allowPhoneSource(choice))).then((outcome) => {
          if (outcome === "saved") void at((p) => p.refreshSources());
          setSourceOutcome(phoneSourceWords[outcome]);
        }),
        onRenew: (sourceId) => void at((p) => p.openSources(sourceId)),
        onRevokeConsent: (sourceId) => void perform(DigestSourcesService.use((s) => s.revokeConsent(sourceId))).then(() => at((p) => p.refreshSources())),
        onReviewRevoke: () => void at((p) => p.reviewRemoval()),
        onRevokeGrant: (reviewed) => void perform(DigestSourcesService.use((s) => s.revokeGrant(reviewed))).then(revoked),
        onCloseRevoke: closeSheet,
      }}
    />
  );
}
