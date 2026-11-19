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
import {occurrenceNotRunText, workflowRunStatusLabel} from '../workflows/workflow-run-presentation';
import {workflowErrorText} from '../workflows/workflow-messages';

/** Owner-facing labels of occurrences recorded without running. */
const DIGEST_NOT_RUN_LABEL: Readonly<Record<DigestNotRunStatus, string>> = {
  missed: 'Missed — not run',
  overlap: 'Skipped — an earlier run was still active',
  unavailable: 'Not run — source unavailable',
};
/** Owner-facing state of one occurrence; an executed run's status is worded like any workflow run. */
export function digestStatusLabel(status: string): string {
  return isDigestNotRunStatus(status) ? DIGEST_NOT_RUN_LABEL[status] : workflowRunStatusLabel(status);
}
/** A digest the agent reports an error Alpha does not recognise for; that text is not shown. */
export const DIGEST_RUN_FAILED =
  'This digest stopped with an error on your agent. Open execution details to see what ran.';

const DIGEST_SETTINGS_UNREADABLE =
  'Your agent could not read this digest’s saved settings, so it did not run. Set up the digest again.';
const PHONE_SOURCE_CHANGED =
  'This phone’s source changed since you reviewed it, so this digest did not run. Review the source again.';
const GOOGLE_SOURCE_UNAVAILABLE =
  'The Google account for this digest is unavailable, so it did not run. Reconnect Google or review the source.';

/**
 * The fixed errors the agent's hosted digest run records as its result `error`: the digest
 * settings and source checks (`plugins/plugin-workflow/src/services/hosted-digest.ts`), the phone
 * and Google source reads (`hosted-native-source.ts`, `hosted-google-source.ts`) and the live
 * grant check of `embedded-workflow-service.ts`. Each one is worded by Alpha here, keyed by the
 * agent's exact text, so the owner still learns why a digest did not run.
 */
export const DIGEST_RUN_ERRORS: ReadonlyMap<string, string> = new Map([
  // embedded-workflow-service.ts (the live grant check before and after each read)
  ['Hosted source grant expired or was revoked', 'This digest’s source expired or was revoked, so it did not run. Renew or review the source.'],
  // hosted-digest.ts
  ['Expected digest object', DIGEST_SETTINGS_UNREADABLE],
  ['Unexpected digest field', DIGEST_SETTINGS_UNREADABLE],
  ['Invalid digest text', DIGEST_SETTINGS_UNREADABLE],
  ['Invalid digest identity', DIGEST_SETTINGS_UNREADABLE],
  ['Invalid digest preset', DIGEST_SETTINGS_UNREADABLE],
  ['Invalid digest schedule or source revision', DIGEST_SETTINGS_UNREADABLE],
  ['Invalid IANA timezone', 'This digest’s time zone is not recognized, so it did not run. Edit its schedule.'],
  ['Digest source not found', 'This digest’s source no longer exists, so it did not run. Review a new source.'],
  ['Digest source integrity changed', 'This digest’s source changed since you reviewed it, so it did not run. Review the source again.'],
  ['Digest occurrence does not match its reviewed local schedule', 'This run did not match the digest’s reviewed schedule, so it did not run.'],
  // hosted-native-source.ts
  ['Invalid native source provider', PHONE_SOURCE_CHANGED],
  ['Invalid native source revision', PHONE_SOURCE_CHANGED],
  ['Native source binding changed', PHONE_SOURCE_CHANGED],
  ['Native source host or owner unavailable', 'Your agent could not reach this phone’s Calendar and reminders, so this digest did not run.'],
  ['Native enrollment service unavailable', 'Your agent’s phone connection is unavailable, so this digest did not run.'],
  ['Native source consent expired or revoked', 'Your consent for this digest to read this phone expired or was revoked. Review the source to turn it back on.'],
  ['Native source model egress unavailable', 'This source does not allow its data to be sent to your agent’s model, so this digest did not run. Review the source.'],
  ['Native source result binding changed', 'This phone answered for a different source or time, so this digest did not run. Run it again.'],
  ['Native source result exceeds reviewed selection', 'This phone returned more than the source you reviewed, so this digest did not run. Review the source again.'],
  ['Native source display scope changed', 'This phone’s time zone or answer size changed since you reviewed the source, so this digest did not run. Review the source again.'],
  ['Invalid native source title', 'An event or reminder title from this phone could not be read, so this digest did not run.'],
  ['Native source returned an unselected calendar', 'This phone returned a calendar you did not select, so this digest did not run. Review the source again.'],
  // hosted-google-source.ts
  ['Selected hosted Google source is unavailable; reconnect or review its owner and read grant', GOOGLE_SOURCE_UNAVAILABLE],
  ['Hosted Google account discovery failed', GOOGLE_SOURCE_UNAVAILABLE],
  ['Hosted Google read timed out', 'Google took too long to answer, so this digest did not run. Try again later.'],
  ['Selected Google input exceeds the reviewed field limit', 'The Google data for this digest is larger than the source you reviewed, so it did not run.'],
  ['Selected Google input exceeds the reviewed transfer limit', 'The Google data for this digest is larger than the source you reviewed, so it did not run.'],
]);

/** Alpha's sentence for the error a digest run recorded: its own sentence when known, else {@link DIGEST_RUN_FAILED}. */
export function digestRunErrorText(error: string): string {
  return DIGEST_RUN_ERRORS.get(error.trim()) ?? DIGEST_RUN_FAILED;
}
/**
 * The final summary, never typed-step source payloads or execution metadata. The text the agent
 * records for an occurrence it did not run reads in Alpha's words; a brief is the agent's own.
 */
export function digestSummaryText(
  result: Pick<DigestResult, 'runId' | 'output' | 'error'> & { status?: string }
): string {
  if (result.error) return digestRunErrorText(result.error);
  const output = result.output;
  const record =
    output && typeof output === 'object' && !Array.isArray(output)
      ? (output as Record<string, unknown>)
      : undefined;
  const notRun = isDigestNotRunStatus(result.status)
    ? result.status
    : isDigestNotRunStatus(record?.status)
      ? record.status
      : undefined;
  if (notRun)
    return occurrenceNotRunText(notRun, typeof output === 'string' ? output : record?.text)!;
  if (typeof output === 'string') return occurrenceNotRunText(undefined, output) ?? output;
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

/**
 * The staged digest client's `HostedSourceRejected` (the source's access changed before the
 * agent saved it), in Alpha's words.
 */
export const HOSTED_SOURCE_REJECTED_TEXT =
  'Your access to this source changed before it was saved. Refresh your accounts and review the source again.';

/** Alpha's own refusals while the digest panel lists the phone's calendars. */
export const DIGEST_CALENDAR_PERMISSION_DENIED = 'Calendar permission was not granted.';
export const DIGEST_CALENDARS_UNAVAILABLE = 'Calendar sources unavailable.';
/**
 * What the digest panel shows when listing the phone's calendars fails: Alpha's own refusal as
 * it is, the phone Calendar plugin's reviewed refusals in Alpha's words, anything else as
 * {@link DIGEST_CALENDARS_UNAVAILABLE}.
 */
export function digestCalendarErrorText(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message === DIGEST_CALENDAR_PERMISSION_DENIED || message === DIGEST_CALENDARS_UNAVAILABLE)
    return message;
  return workflowErrorText(error, DIGEST_CALENDARS_UNAVAILABLE, DIGEST_CALENDARS_UNAVAILABLE);
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
/**
 * The time zones a schedule may use, as a pick list instead of typed IANA names. The chosen and device
 * zones are always offered first, and UTC is kept where the runtime leaves it out of its list.
 */
export function digestZoneChoices(
  chosen: string,
  deviceZone: string,
  supported: readonly string[] = (() => { try { return Intl.supportedValuesOf('timeZone'); } catch { return []; } })()
): string[] {
  const valid = (zone: string) => { try { new Intl.DateTimeFormat('en', {timeZone: zone}).format(0); return true; } catch { return false; } };
  return [...new Set([chosen, deviceZone, ...supported, 'UTC'].filter(zone => !!zone && valid(zone)))];
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
