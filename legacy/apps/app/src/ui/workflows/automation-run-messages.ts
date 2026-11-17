/**
 * What the owner reads when an automation is run from the Automations screen and the agent
 * reports that it did not run, and how a prompt's execution history reads.
 *
 * The agent answers in its own diagnostic words: the scheduled-task runner's fire `reason`
 * (`plugins/plugin-scheduling/src/scheduled-task/runner.ts`, such as `global_pause: …`,
 * `terminal:<status>` or `<gate>: <reason>`) and the trigger runner's run `error`
 * (`packages/agent/src/triggers/runtime.ts`, with `MISSED_SCHEDULED_OCCURRENCE_TEXT` from
 * `packages/core/src/services/trigger-scheduling.ts`). Each known reason or sentence has its own
 * Alpha sentence here; anything else reads as this screen's fallback, never as the agent's text.
 */

/** A scheduled item the owner asked to run that did not run, with no more specific reason. */
export const SCHEDULED_NOT_RUN =
  "This item did not run. Read its current status before trying again.";

/** What the runner's `terminal:<status>` reason means for each settled status. */
const TERMINAL: Readonly<Record<string, string>> = {
  completed: "This item is already done, so it did not run again.",
  dismissed: "This item was dismissed, so it did not run.",
  skipped: "This item was already skipped, so it did not run again.",
  expired: "This item has expired, so it did not run.",
  failed: "This item already failed, so it did not run again.",
};

/** The runner's fixed skip reasons (`MISSED_OCCURRENCE_DECISION`, `global_pause`). */
const SKIP_REASONS: ReadonlyMap<string, string> = new Map([
  [
    "missed_occurrence",
    "This item came due while your agent wasn’t running. It was recorded as missed and did not run.",
  ],
  [
    "global_pause",
    "Scheduled items are paused on your agent, so this one did not run.",
  ],
]);

const GATE_DEFERRED =
  "A condition on this item put it off until later, so it did not run now.";
const GATE_DENIED =
  "A condition on this item didn’t allow it to run, so it was skipped.";
const SKIPPED = "This item was skipped. Read its current status before trying again.";
const DISPATCH_FAILED = "Your agent couldn’t deliver this item, so it did not run.";

/**
 * Alpha's sentence for one scheduled-task fire result that is not `fired`. `formatWhen` words
 * the retry instant of a deferred delivery in the owner's own time.
 */
export function scheduledFireText(
  fire: { kind?: unknown; reason?: unknown; nextAttemptAtIso?: unknown },
  formatWhen: (iso: string) => string = () => "",
): string {
  const reason = typeof fire.reason === "string" ? fire.reason.trim() : "";
  if (fire.kind === "dispatch_deferred") {
    const at =
      typeof fire.nextAttemptAtIso === "string" &&
      Number.isFinite(Date.parse(fire.nextAttemptAtIso))
        ? formatWhen(fire.nextAttemptAtIso)
        : "";
    return at
      ? `Your agent couldn’t deliver this item yet. It will try again ${at}.`
      : "Your agent couldn’t deliver this item yet. It will try again later.";
  }
  if (fire.kind === "dispatch_failed") return DISPATCH_FAILED;
  if (fire.kind !== "skipped" || !reason) return SCHEDULED_NOT_RUN;
  if (reason.startsWith("terminal:")) {
    const status = reason.slice("terminal:".length);
    return Object.hasOwn(TERMINAL, status)
      ? TERMINAL[status]
      : "This item has already ended, so it did not run again.";
  }
  if (reason === "global_pause" || reason.startsWith("global_pause:"))
    return SKIP_REASONS.get("global_pause")!;
  const fixed = SKIP_REASONS.get(reason);
  if (fixed) return fixed;
  if (reason.startsWith("gate-defer:")) return GATE_DEFERRED;
  // A gate denial is recorded as "<gate kind>: <the gate's reason>".
  if (/^[\w.-]+: \S/.test(reason)) return GATE_DENIED;
  return SKIPPED;
}

/** The prompt run did not finish, with no more specific reason. */
export const PROMPT_RUN_FAILED =
  "The prompt did not finish. Check its execution history.";
/** The prompt run was skipped, with no more specific reason. */
export const PROMPT_RUN_SKIPPED =
  "The prompt did not run. Check its execution history.";

/** The trigger runner's fixed run errors, keyed by their reviewed text. */
export const PROMPT_RUN_ERRORS: ReadonlyMap<string, string> = new Map([
  [
    "The scheduled time passed while the agent was not running. This occurrence did not run, and no backlog is executed.",
    "The scheduled time passed while your agent wasn’t running, so this run was skipped. Nothing runs late.",
  ],
  [
    "prompt trigger missing instructions",
    "This prompt has no instructions, so it did not run. Edit it to add them.",
  ],
  [
    "message service not available",
    "Your agent can’t take messages right now, so this prompt did not run.",
  ],
  [
    "Prompt automation delivery conversation is unavailable",
    "The conversation this prompt replies in is no longer available, so it did not run.",
  ],
  [
    "workflow trigger missing workflowId",
    "This automation isn’t linked to a workflow, so it did not run.",
  ],
  [
    "workflow subsystem unavailable: the workflow plugin is not enabled on this agent",
    "Workflows aren’t turned on for this agent, so this automation did not run.",
  ],
  [
    "workflow execution failed",
    "The workflow did not finish. Check its execution history.",
  ],
]);

/** Run errors the trigger runner builds around a detail Alpha never shows. */
const PROMPT_RUN_ERROR_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  [
    "Trigger reply was not fully delivered: ",
    "Your agent’s reply wasn’t fully delivered. Check the conversation before running it again.",
  ],
  [
    "Trigger reply reached the provider, but local evidence is ",
    "Your agent’s reply was sent but wasn’t fully recorded. Check the conversation before running it again.",
  ],
  [
    "Prompt automation ",
    "Your agent stopped before finishing this prompt. Check its execution history.",
  ],
];

/** Alpha's sentence for a prompt run that did not succeed, from its `error` and `status`. */
export function promptRunErrorText(error: unknown, status: unknown): string {
  const text = typeof error === "string" ? error.trim() : "";
  const fixed = PROMPT_RUN_ERRORS.get(text);
  if (fixed) return fixed;
  const prefixed = PROMPT_RUN_ERROR_PREFIXES.find(([prefix]) =>
    text.startsWith(prefix),
  );
  if (prefixed) return prefixed[1];
  return status === "skipped" ? PROMPT_RUN_SKIPPED : PROMPT_RUN_FAILED;
}

/** Each run status the trigger runner records (`TriggerLastStatus`). */
const PROMPT_RUN_STATUS: Readonly<Record<string, string>> = {
  success: "Ran",
  error: "Failed",
  skipped: "Skipped",
};

/**
 * One line of a prompt's execution history: when it started (worded by `formatWhen` in the
 * owner's own time), how it ended and, for a run that did not succeed, Alpha's reason.
 */
export function promptRunHistoryLine(
  run: { startedAtIso?: unknown; startedAt?: unknown; status?: unknown; error?: unknown },
  formatWhen: (stamp: string | number) => string,
): string {
  const stamp =
    typeof run.startedAtIso === "string" && run.startedAtIso
      ? run.startedAtIso
      : typeof run.startedAt === "string" || typeof run.startedAt === "number"
        ? run.startedAt
        : "";
  const when = stamp === "" ? "" : formatWhen(stamp);
  const status =
    typeof run.status === "string" && Object.hasOwn(PROMPT_RUN_STATUS, run.status)
      ? PROMPT_RUN_STATUS[run.status]
      : "Outcome unknown";
  const reason =
    run.status !== "success" && (run.error || run.status === "error")
      ? promptRunErrorText(run.error, run.status)
      : "";
  return [when, status, reason].filter(Boolean).join(" · ");
}
