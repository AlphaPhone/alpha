/**
 * Presentation of scheduled digests (resident briefs): the owner-facing occurrence and loop
 * state, the readable summary of a result, the time-zone note of a schedule and the retained
 * brief a Home card shows.
 *
 * The wire types, the result parser, the protocol client, the client-scoped result inbox and the
 * occurrence policy are shared with the agent and stay in the staged upstream workflow client;
 * this module only decides what the owner reads.
 */
import {
  type DigestNotRunStatus,
  digestSourceState,
  isDigestNotRunStatus,
} from '@elizaos/plugin-workflow/services/hosted-digest-policy';
import {
  type DigestLoop,
  type DigestResult,
  type DigestSource,
  digestRan,
} from '@elizaos/plugin-workflow/client/hosted-digests';

/** Owner-facing labels of occurrences recorded without running. */
const DIGEST_NOT_RUN_LABEL: Readonly<Record<DigestNotRunStatus, string>> = {
  missed: 'Missed — not run',
  overlap: 'Skipped — an earlier run was still active',
  unavailable: 'Not run — source unavailable',
};
/** Owner-facing state of one occurrence. Executed runs keep the agent's own status word. */
export function digestStatusLabel(status: string): string {
  return isDigestNotRunStatus(status) ? DIGEST_NOT_RUN_LABEL[status] : status;
}
/** The final summary, never typed-step source payloads or execution metadata. */
export function digestSummaryText(
  result: Pick<DigestResult, 'runId' | 'output' | 'error'>
): string {
  if (result.error) return result.error;
  const output = result.output;
  if (typeof output === 'string') return output;
  if (Array.isArray(output) && output.length === 1) {
    const value = output[0];
    if (
      value &&
      typeof value === 'object' &&
      value.nodeId === 'typed-steps' &&
      value.runId === result.runId &&
      typeof value.text === 'string'
    )
      return value.text;
  }
  if (output && typeof output === 'object' && !Array.isArray(output)) {
    const value = output as Record<string, unknown>;
    if (typeof value.summary === 'string') return value.summary;
    if (typeof value.text === 'string') return value.text;
  }
  return 'No readable summary was returned. Open execution details to inspect this result.';
}

/** Loop state shown to the owner. Only an agent that advertises pausing is described as paused. */
export function digestLoopState(
  loop: DigestLoop,
  sources: DigestSource[],
  now = Date.now(),
  pauses = false
): string {
  if (loop.removed) return 'Removed';
  if (!loop.spec.enabled || !loop.active) return 'Paused';
  const source = sources.find((s) => s.id === loop.spec.sourceId);
  const suffix = pauses ? ' — paused' : ' — renew to resume';
  if (loop.sourceState === 'revoked' || source?.revoked) return `Source revoked${suffix}`;
  if (loop.sourceState === 'expired' || !source || digestSourceState(source, now) === 'expired')
    return `Source expired${suffix}`;
  return 'On';
}

/** Minutes east of UTC for an IANA zone at an instant, or null for an unknown zone. */
function zoneOffsetMinutes(zone: string, at: number): number | null {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(at)
        .map((part) => [part.type, part.value])
    );
    const wall = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    );
    return Math.round((wall - Math.floor(at / 60000) * 60000) / 60000);
  } catch {
    return null;
  }
}
/** A schedule keeps its reviewed time zone. Says so when the device clock is in a different one. */
export function digestZoneNote(
  loop: Pick<DigestLoop, 'spec' | 'removed'>,
  deviceZone: string,
  now = Date.now()
): string {
  if (loop.removed || !loop.spec.enabled || loop.spec.timeZone === deviceZone) return '';
  const reviewed = zoneOffsetMinutes(loop.spec.timeZone, now);
  const device = zoneOffsetMinutes(deviceZone, now);
  if (reviewed === null || device === null || reviewed === device) return '';
  return `Runs at ${loop.spec.localTime} ${loop.spec.timeZone} time, not this device’s current time zone (${deviceZone}). Review the schedule to change it.`;
}

// ---------------------------------------------------------------------------
// Retained brief
// ---------------------------------------------------------------------------

/** The brief a Home card shows: the newest retained result that ran. */
export interface RetainedDigestSummary {
  summary: string;
  ranAt: string;
  agent: string;
  status: string;
}
/** Shorten display text to `max` characters, marking any cut with an ellipsis. */
function clipText(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The newest retained result that actually ran (by completion, then cursor).
 * A missed, overlapping or unavailable occurrence is a record and never
 * replaces the last brief; with only such records there is no brief.
 */
function latestRetainedBrief(
  results: readonly DigestResult[] | null | undefined,
  agent = 'Your agent'
): RetainedDigestSummary | null {
  const latest = (results ?? []).filter(digestRan).reduce<DigestResult | null>((best, row) => {
    if (!best) return row;
    const a = Date.parse(row.completedAt);
    const b = Date.parse(best.completedAt);
    return a > b || (a === b && row.cursor > best.cursor) ? row : best;
  }, null);
  return latest
    ? {
        summary: clipText(digestSummaryText(latest), 2000),
        ranAt: latest.completedAt,
        agent: clipText(agent, 200) || 'Your agent',
        status: latest.status,
      }
    : null;
}

/**
 * Retained brief for the current account and agent. A host binds the scope of
 * its current connection (for example origin, owner and agent); results are
 * accepted only when read under exactly the bound scope, and changing the
 * scope clears the brief, so a late read for a previous account can never
 * reach the current Home. With no bound scope (a host that never binds, or one
 * that unbound with `bind(null)` on disconnect) only unscoped results are
 * accepted: a late read for the account that was just disconnected is ignored.
 */
export class RetainedBriefStore {
  private value: RetainedDigestSummary | null = null;
  private scope: string | null = null;
  private readonly listeners = new Set<() => void>();

  current(): RetainedDigestSummary | null {
    return this.value;
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /** Binds the current connection scope. A different scope clears the brief. */
  bind(scope: string | null): void {
    if (scope === this.scope) return;
    this.scope = scope;
    this.set(null);
  }
  /**
   * Records the newest brief that ran from results read under `scope`, or
   * clears it for `null`. Returns false when the results were read under
   * another scope than the bound one (including a scoped read after the host
   * unbound) and were ignored.
   */
  remember(
    results: readonly DigestResult[] | null,
    options: { agent?: string; scope?: string | null } = {}
  ): boolean {
    const scope = options.scope ?? null;
    if (scope !== this.scope) return false;
    this.set(results ? latestRetainedBrief(results, options.agent) : null);
    return true;
  }
  private set(next: RetainedDigestSummary | null): void {
    if (JSON.stringify(next) === JSON.stringify(this.value)) return;
    this.value = next;
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch {
        // A listener failure never blocks other listeners or the result inbox.
      }
    }
  }
}
