// States the Workflows components reach, for their stories (`*.meta.tsx`).
import type { MissedRunNow } from "@elizaos/plugin-workflow/digests";
import type { Authoring } from "../../../gen/workflows__authoring.ts";
import { initial as authoringInitial } from "../../../gen/workflows__authoring.ts";
import type { Steps } from "../../../gen/workflows__deviceSteps.ts";
import { initial as stepsInitial } from "../../../gen/workflows__deviceSteps.ts";
import type { ResultRow } from "../../../gen/workflows__digests.ts";
import type { Sources } from "../../../gen/workflows__digestSources.ts";
import { initial as sourcesInitial } from "../../../gen/workflows__digestSources.ts";
import type { HostedResults } from "../../../gen/workflows__hostedResults.ts";
import { initial as resultsInitial } from "../../../gen/workflows__hostedResults.ts";
import type { Lifecycle } from "../../../gen/workflows__lifecycle.ts";
import { initial as lifecycleInitial } from "../../../gen/workflows__lifecycle.ts";
import type { PromptInput } from "../../workflows/automations.vibe";
import type { ImpactRow, PhoneCalendars } from "../../workflows/sources.vibe";
import type { PhoneSourceRow } from "./SourceReview.tsx";
import type { Automations, Row } from "../../../gen/workflows__automations.ts";
import { initial as automationsInitial } from "../../../gen/workflows__automations.ts";
import type { Runs } from "../../../gen/workflows__runs.ts";
import { initial as runsInitial } from "../../../gen/workflows__runs.ts";
import type { Digests } from "../../../gen/workflows__digests.ts";
import { initial as digestsInitial } from "../../../gen/workflows__digests.ts";

const prompt: Row = {
  key: "a1", id: "a1", target: "t1", kind: "PromptRow", enabled: true, status: "active", title: "Plan my day",
  description: "Summarize my calendar and reminders.", schedule: "cron:0 7 * * *|Europe/Paris", system: false,
};
const scheduled: Row = {
  key: "scheduled:s1", id: "s1", target: "s1", kind: "ScheduleRow", enabled: true, status: "snoozed", title: "morning-brief",
  description: "", schedule: "cron:30 8 * * *|UTC|snoozed:2026-11-22T08:40:00.000Z", system: false,
};

const reminder: Row = {
  key: "scheduled:r1", id: "r1", target: "r1", kind: "ReminderRow", enabled: true, status: "scheduled", title: "Call the dentist",
  description: "", schedule: "once:2026-11-22T15:00:00.000Z", system: false,
};

/** Every source listed, a prompt on, a snoozed scheduled item and a reminder the agent keeps. */
export const listed: Automations = {
  ...automationsInitial, owner: "owner", automations: "Listed", schedules: "Listed", routines: "Listed", rows: [prompt, scheduled, reminder],
};

/** One source failed, and a change whose answer was lost is held. */
export const heldUnknown: Automations = {
  ...listed, routines: "RefreshFailed", answer: "AnswerUnknown", minted: 1,
  held: [{ owner: "owner", id: 1, kind: "RunChange", key: "a1", target: false }],
};

/** A typed workflow with a finished run and a missed occurrence, the finished run shown. */
export const withHistory: Runs = {
  ...runsInitial, owner: "owner", workflowId: "w1", version: 1, typed: true,
  shown: { runId: "r2", owner: "owner", workflowId: "w1", finished: true, cancelRequested: false, status: "succeeded", reconciliation: "" }, selected: "r2",
  history: [
    { runId: "r2", occurred: "Ran", finished: true, status: "succeeded", at: "2026-11-22T07:00:00.000Z" },
    { runId: "r1", occurred: "Missed", finished: true, status: "finished", at: "2026-11-21T07:00:00.000Z" },
  ],
};

/** A run request whose answer was lost, waiting to be checked. */
export const unknownRun: Runs = {
  ...withHistory, custody: "Unknown", intent: { owner: "owner", workflowId: "w1", version: 1, submission: "s1" },
};

/** One digest on, a brief, and a missed result offering Run now. */
export const digestPanel: Digests = {
  ...digestsInitial, session: 1, available: true, fullReads: 1, briefSession: 1, brief: "Three meetings today; dentist at 4.",
  loops: [{ id: "d1", name: "Morning brief", template: "morning", localTime: "07:00", zone: "Europe/Paris", enabled: true, active: true, removed: false, sourceRevoked: false, sourceExpired: false }],
  results: [{ runId: "r9", workflowId: "d1", status: "missed", scheduledAt: "2026-11-22T06:00:00.000Z", completedAt: "", text: "", error: "", runNow: true }],
};


/** A saved prompt row, on. */
export const promptRow: Row = prompt;

/** A scheduled item that has ended: only Reopen is offered. */
export const endedItem: Row = { ...scheduled, key: "scheduled:s2", id: "s2", target: "s2", status: "completed", enabled: false, schedule: "cron:30 8 * * *|UTC" };

/** A prompt read back for changing: a daily schedule in Paris. */
export const editingPrompt: PromptInput = {
  title: "Plan my day", instructions: "Summarize my calendar and reminders.", kind: "cron", at: 0, cron: "0 7 * * *", eventKind: "",
  original: { at: 0, enabled: true, timezone: "Europe/Paris" },
};

/** A phone step shown and waiting for the owner's first tap. */
export const stepWaiting: Steps = { ...stepsInitial, shown: true, shownIssue: 1, reviewedDigest: 1, reviewedAnchor: 1, status: "StepWaiting" };

/** The owner tapped Approve once; a second tap decides. */
export const stepApproveOnce: Steps = { ...stepWaiting, choice: "ApproveChoice" };

/** Approved, but the agent's receipt has not come back. */
export const stepUnsynced: Steps = { ...stepsInitial, proposal: "StepExecuting", journal: "JournalApplied", effects: 1, status: "StepUnsynced" };

/** The Calendar anchor moved while the owner looked. */
export const stepAnchorMoved: Steps = { ...stepsInitial, status: "AnchorMoved", reviewedAnchor: 2, anchor: 2 };

/** An open workflow with settled runs. */
export const lifecycleOpen: Lifecycle = { ...lifecycleInitial, owner: "owner", workflowId: "w1", version: 1, opened: true, seen: true };

/** A removed workflow whose triggers are cleaned up: Restore is offered. */
export const lifecycleRemoved: Lifecycle = { ...lifecycleOpen, removed: true, cleaned: true };

/** A kept removal whose answer was lost, offered again after review. */
export const lifecycleKept: Lifecycle = {
  ...lifecycleOpen, stage: "LifeIdle", offer: true, sends: 1,
  intent: { owner: "owner", workflowId: "w1", op: "RemoveOp", fromVersion: 1, mutation: "m1" },
};

/** A described draft under review. */
export const draftReviewed: Authoring = { ...authoringInitial, spec: 1, review: 1 };

/** A save kept on the phone whose receipt never came. */
export const draftKept: Authoring = { ...draftReviewed, pending: 1, pendingSpec: 1, minted: 1, saves: 1, unreceipted: true };

/** Storage that could not be written: the draft is locked. */
export const draftStorageFailed: Authoring = { ...draftReviewed, storageFailed: true };

/** A Cloud read grant in review. */
export const grantReviewing: Sources = { ...sourcesInitial, session: 1, now: 1, authorization: "Reviewing", mutation: "m1", calendar: true, requestExpiresAt: 600001 };

/** A Cloud read grant in force and the phone's consent given. */
export const grantGranted: Sources = {
  ...grantReviewing, authorization: "Granted", grantExpiresAt: 604800001, consent: "ConsentApproved", consentExpiresAt: 604800001, consentCalendar: true, consentReminders: true,
};

/** The phone's calendars as the source review lists them. */
export const phoneCalendars: PhoneCalendars = {
  status: "ready",
  calendars: [{ id: "1", name: "Personal", account: "owner@example.com", revision: "r1" }, { id: "2", name: "Work", account: "owner@example.com", revision: "r2" }],
};

/** A saved phone source with a week left. */
export const phoneSources: ReadonlyArray<PhoneSourceRow> = [{ id: "src1", label: "This phone", expiresAt: Date.parse("2026-11-29T06:00:00.000Z"), revoked: false }];

/** What removing Google access would stop. */
export const googleImpact: ReadonlyArray<ImpactRow> = [{ kind: "source", id: "g1", label: "Work mail" }, { kind: "digest", id: "d2", label: "Evening brief" }];

/** A finished digest result with its text. */
export const finishedResult: ResultRow = {
  runId: "r8", workflowId: "d1", status: "finished", scheduledAt: "2026-11-21T06:00:00.000Z", completedAt: "2026-11-21T06:01:00.000Z",
  text: "Two meetings and a dentist reminder.", error: "", runNow: false,
};

/** The agent's Run now offer for the missed morning digest. */
export const runNowOffer: MissedRunNow = {
  runId: "r9", sourceId: "src1", sourceRevision: "rev1", sourceLabel: "This phone", scheduledAt: "2026-11-22T06:00:00.000Z", mutationId: "missed-run-now-r9",
};

/** A posted result notice the owner tapped. */
export const resultTapped: HostedResults = {
  ...resultsInitial, owner: "owner", pending: "r9", token: 1, issued: 1,
  notices: [{ key: "r9", owner: "owner", workflowId: "d1", digest: 1, phase: "ResultPosted", posts: 1, dispatches: 0 }],
};

/** The owner is reviewing a question about the tapped result. */
export const resultQuestion: HostedResults = { ...resultTapped, asks: true, question: "QuestionReview" };
