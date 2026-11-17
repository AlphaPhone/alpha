/**
 * Foreground host for explicit local-first Google Calendar sync on the phone or
 * in the browser.
 *
 * The host keeps the owner's saved opt-in for one exact account, calendar,
 * agent and local source, serializes review/enable/sync/pause through
 * `CalendarSyncController` and reports plain status text. A pass runs only in
 * the foreground: after a local edit (debounced), on return to the foreground
 * and after an owner change. There is no polling and no background work. A
 * changed owner, Google selection or agent cancels the running pass and never
 * reuses the earlier opt-in; a device calendar's own sync opt-in (Android) is
 * withdrawn when a different owner appears.
 *
 * Alpha owns the host and every status sentence it shows; the saved opt-in
 * record, its slot, the target match, the checkpoints and the controller stay
 * upstream. Host specifics (owner, settings storage, the device calendar gate,
 * the local source and its events) are injected. DOM-free.
 */
import {
  CalendarLinkedStore,
  type CalendarLinkStorage,
  type CalendarSyncBinding,
  CalendarSyncController,
  type CalendarSyncControllerOptions,
  type CalendarSyncDestination,
  type CalendarSyncDeviceGate,
  type CalendarSyncLocalSource,
  type CalendarSyncPrepared,
  type CalendarSyncReport,
  type CalendarSyncReview,
  type CalendarSyncSettingsStore,
  type CalendarSyncTarget,
  calendarSyncTargetMatches,
  readCalendarSyncSettings,
} from "@elizaos/plugin-calendar/linked-sync";

interface CalendarSyncHostOptions {
  /**
   * Prepares the exact sync context. `interactive` is true only during an
   * explicit owner review, so a host may ask for a device permission then.
   */
  prepare(
    signal: AbortSignal,
    request: { interactive: boolean },
  ): Promise<CalendarSyncPrepared>;
  settings: CalendarSyncSettingsStore;
  /** The current target; throws an Error that tells the owner what to connect or choose. */
  target(): CalendarSyncTarget;
  /** A stable identity of the owner, Cloud session, selection and agent; "" when unavailable. */
  identity(): string;
  /** True while the host may run sync (visible and in the foreground). */
  foreground(): boolean;
  /** Reads the target's current local source. */
  source(
    target: CalendarSyncTarget,
    current: () => boolean,
  ): Promise<CalendarSyncLocalSource>;
  /** The checkpoint storage the prepared contexts use. */
  storage: CalendarLinkStorage;
  /** The device calendar gate in effect, read at each use; undefined without one. */
  device?: () => CalendarSyncDeviceGate | undefined;
  controller?: CalendarSyncControllerOptions;
  /** Called after this host saved a changed opt-in, for example to tell other views. */
  settingsWritten?(): void;
  /** Status after a review; product hosts may name their own events. */
  reviewMessage?(events: number): string;
  /** Delay after a local edit before a pass, in milliseconds. Defaults to 400. */
  localChangeDelayMs?: number;
}

type CalendarSyncHostSnapshot = {
  status: string;
  running: boolean;
  enabled: boolean;
};

/** Wiring for a foreground host: call these from the host's own events. */
interface CalendarSyncForeground {
  /** The owner, Google selection, Cloud session or agent may have changed. */
  ownerChanged(): void;
  /** A local event or the local source changed. */
  localChanged(): void;
  /** Visibility changed; reads `foreground()`. */
  visibilityChanged(): void;
  /** Another view of the same storage changed the opt-in. */
  settingsChangedElsewhere(): void;
  stop(): void;
}

interface CalendarSyncHost {
  subscribe(listener: () => void): () => void;
  snapshot(): CalendarSyncHostSnapshot;
  /** Re-reads the saved opt-in for the current target. */
  settings(): Promise<void>;
  /** Provider event ids already linked to local events, so a read-only view hides those copies. */
  linkedProviderEvents(): Promise<Set<string>>;
  destination(): CalendarSyncDestination;
  review(): Promise<CalendarSyncReview>;
  enable(review: CalendarSyncReview): Promise<CalendarSyncReport>;
  sync(): Promise<CalendarSyncReport>;
  pause(): Promise<void>;
  cancel(): void;
  /** Runs one pass when the saved opt-in still names the current target. Never throws. */
  resume(): Promise<void>;
  /** Starts foreground scheduling and resumes once. */
  start(): CalendarSyncForeground;
}

/**
 * A Calendar sync refusal Alpha words itself: Alpha's sync runtime and its device Calendar bridge
 * raise it with owner-facing text, which the status line shows as written.
 */
export class CalendarSyncNotice extends Error {
  override name = "CalendarSyncNotice";
}

const RETRY_REVIEW = "Something changed during sync. Review sync again.";
const GOOGLE_INVALID =
  "Google returned a Calendar event this phone could not use. Nothing was applied.";
const REQUEST_INVALID =
  "This Calendar change could not be sent safely. Nothing was applied.";

/**
 * The shared Calendar sync (controller, Google port, reader and checkpoint store) raises its
 * refusals as plain errors. Alpha words each one, keyed by the reviewed message text.
 */
const SHARED_FAILURES: ReadonlyMap<string, string> = new Map([
  // google-reader.ts
  ["Choose a currently listed Google calendar.", "Choose a Google calendar that is still listed."],
  // google-sync-port.ts
  ["Calendar sync returned an invalid response. Nothing was applied.", "Calendar sync sent a reply this phone could not use. Nothing was applied."],
  ["Review the selected Google account and calendar.", "Review the selected Google account and calendar."],
  ["An exact Calendar event reference is required.", REQUEST_INVALID],
  ["A stable Calendar operation key is required.", REQUEST_INVALID],
  ["An exact Google event revision is required.", REQUEST_INVALID],
  ["Unsupported Calendar operation.", REQUEST_INVALID],
  ["Google returned an incomplete Calendar event. Nothing was applied.", GOOGLE_INVALID],
  ["Google returned invalid all-day dates.", GOOGLE_INVALID],
  ["Google returned an event without its timezone.", GOOGLE_INVALID],
  ["Google returned invalid attendees.", GOOGLE_INVALID],
  ["Google returned invalid recurrence.", GOOGLE_INVALID],
  ["Google returned an invalid event state.", GOOGLE_INVALID],
  ["This Google calendar does not support safe sync.", "This Google calendar cannot be synced safely. Choose another calendar."],
  ["Google account and calendar names could not be verified. Review the connection before syncing.", "The Google account and calendar names could not be verified. Review the connection before syncing."],
  ["Calendar sync protocol is unavailable. Nothing was applied.", "Calendar sync is unavailable on this server. Nothing was applied."],
  ["Review Google Calendar sync access in Settings.", "Allow Google Calendar sync in Settings first."],
  ["Google returned a different Calendar event. Nothing was applied.", "Google answered with a different event. Nothing was applied."],
  ["Google stored a different Calendar event than requested. Check the event before retrying.", "Google saved a different event than requested. Check the event before retrying."],
  ["Google create privacy could not be confirmed. Check the event before retrying.", "Google did not confirm the new event's privacy. Check the event before retrying."],
  ["Refresh this Google event before updating.", "This Google event changed. Sync again before updating it."],
  ["Refresh this Google event before deleting.", "This Google event changed. Sync again before deleting it."],
  ["Google deletion could not be confirmed.", "Google did not confirm the deletion. Check the event before retrying."],
  // linked-store.ts
  ["Calendar sync checkpoints changed or need recovery. Existing data is retained.", "Calendar sync records need recovery. Existing events are kept."],
  // sync-controller.ts
  ["Calendar sync supports up to 2,000 linked local events. Nothing changed.", "Calendar sync links at most 2,000 local events. Nothing changed."],
  ["Your local calendar changed. Review sync again.", "Your calendar changed. Review sync again."],
  ["The selected account or calendar changed. Review sync again.", "The selected account or calendar changed. Review sync again."],
  ["The event list changed. Review sync again.", RETRY_REVIEW],
  ["An event changed. Review sync again.", RETRY_REVIEW],
  ["Calendar sync link limit reached. No new events were linked.", "Calendar sync reached its link limit. No new events were linked."],
  ["A local event changed before sync. Retry to review its current state.", "An event changed before sync. Sync again to review it."],
  ["Calendar sync is already running.", "Calendar sync is already running."],
  // This host
  ["Review the Calendar sync destination again.", "Review the Calendar sync destination again."],
  ["Calendar account changed. Review sync again.", "Calendar account changed. Review sync again."],
  // sync-host.ts calendarSyncSettingsSlot (the device opt-in record)
  ["Calendar sync settings changed. Review them again.", "Calendar sync settings changed. Review them again."],
]);

const DEVICE_REPLY_INVALID =
  "The device Calendar returned an event this phone could not use.";

/**
 * Alpha's own sync runtime raises some refusals as plain errors: the browser calendar source and
 * its linked-sync port, the sync field mapping (guests, repeats, skipped dates), the deletion
 * journal and series records, the checkpoint storage and the device Calendar bridge's checks of
 * its replies. Each names a local reason the owner must still see (never the Google calendar), so
 * Alpha words each one here, keyed by the text its module throws.
 */
const LOCAL_FAILURES: ReadonlyMap<string, string> = new Map([
  // browser/calendar-store.ts
  ["The local calendar needs recovery.", "The local calendar needs recovery before syncing."],
  // browser/json-domain-document.ts
  ["Browser history needs recovery", "Saved data in this browser needs recovery before syncing."],
  // browser/calendar-linked-local.ts
  ["This local event needs recovery before syncing.", "This local event needs recovery before syncing."],
  ["The all-day event dates need review.", "An all-day event's dates need review before syncing."],
  ["Deletion pending", "A deletion is pending for this event. Sync again after it finishes or is undone."],
  ["Unsupported event", "Google sent an event this phone cannot save locally. Nothing was applied."],
  ["Review whole all-day dates before syncing.", "Review whole all-day dates before syncing."],
  ["Missing time zone", "Google sent a timed event without its time zone. Nothing was applied."],
  ["The local event changed before sync could apply.", "The local event changed before sync could apply."],
  ["The local event or owner changed before deletion.", "The local event or owner changed before deletion."],
  // browser/calendar-sync-fields.ts
  ["Email needed", "A guest needs an email address before syncing."],
  ["Duplicate guest", "A guest is listed twice. Review the guest list before syncing."],
  ["Review the Google guest list before syncing.", "Review the Google guest list before syncing."],
  ["Google returned duplicate attendees.", "Google listed the same guest twice. Review the guest list before syncing."],
  ["Sync series", "One changed occurrence of a repeating event cannot be synced on its own."],
  ["Unsupported repeat", "This repeat rule cannot be synced."],
  ["Review the excluded occurrence dates.", "Review the skipped occurrence dates before syncing."],
  ["Multiple recurrence rules need review. Nothing changed.", "Multiple repeat rules need review. Nothing changed."],
  ["This Google repeat rule cannot be represented locally.", "This Google repeat rule cannot be kept on this phone."],
  ["This Google exclusion date needs review.", "A skipped date from Google needs review."],
  ["This Google exclusion date is invalid.", "A skipped date from Google is not valid."],
  ["Repeat rule missing", "Google sent skipped dates without a repeat rule."],
  // browser/calendar-deletions.ts (staging a synced deletion)
  ["This event already has a pending deletion.", "This event already has a pending deletion."],
  ["Deletion identity already used.", "This deletion was already recorded. Check pending deletions."],
  ["Pending deletion history requires review.", "Pending deletion history needs review."],
  // browser/calendar-records.ts
  ["Calendar series changed.", "The repeating event changed. Sync again to review it."],
  // runtime/calendar-linked-storage.ts
  ["Invalid Calendar sync checkpoint slot", "Calendar sync records could not be opened."],
  ["Calendar sync checkpoint limit reached", "Calendar sync reached its storage limit. The latest sync record was not saved."],
  // runtime/native-calendar-sync.ts (checks of the device Calendar bridge's replies)
  ["Device Calendar sync requires Android", "Device Calendar sync is available only on Android."],
  ["Invalid device Calendar response", "The device Calendar returned a reply this phone could not use."],
  ["Device Calendar event list needs review", "The device Calendar event list needs review."],
  ["Invalid device Calendar identity", "The device Calendar returned an event list this phone could not use."],
  ["Device Calendar destination changed", "The device Calendar destination changed. Review sync again."],
  ["Invalid device Calendar event", DEVICE_REPLY_INVALID],
  ["Invalid device Calendar guest", DEVICE_REPLY_INVALID],
  ["Invalid device Calendar recurrence", DEVICE_REPLY_INVALID],
  ["Invalid native Calendar recovery receipt", "The device Calendar returned a recovery receipt this phone could not use."],
  ["Calendar deletion readback changed", "The device Calendar still shows the deleted event. Check it before retrying."],
]);

/**
 * Plain status text for a failed or stopped operation. Only a `CalendarSyncNotice` is shown as
 * written; every other known refusal is shown in Alpha's words, and only an unknown error falls
 * back to the generic sentence.
 */
function calendarSyncFailureMessage(error: unknown): string {
  const e = error as { status?: number; name?: string; message?: unknown };
  if (e?.status === 404)
    return "Calendar sync is not available on this server yet. Check linked events before retrying.";
  if (e?.name === "AbortError")
    return "Sync paused or the selected account changed. Check linked events before retrying.";
  const message = typeof e?.message === "string" ? e.message : "";
  if (error instanceof CalendarSyncNotice && message) return message;
  const known = SHARED_FAILURES.get(message) ?? LOCAL_FAILURES.get(message);
  if (known) return known;
  // Intl rejects an unknown event time zone with an engine-worded RangeError.
  if (e?.name === "RangeError" && /time ?zone/i.test(message))
    return "An event's time zone is not recognized. Review the event before syncing.";
  return "Sync stopped. Check the selected Google calendar before retrying.";
}

/** Plain status text for a finished pass. Any conflict, unconfirmed or refused change asks for review. */
function calendarSyncReportMessage(result: CalendarSyncReport): string {
  const warnings = result.conflicted + result.quarantined + result.dirty;
  return warnings
    ? `Sync needs review: ${result.conflicted} conflicts, ${result.quarantined} unconfirmed changes, ${result.dirty} refused changes.`
    : `Synced: ${result.pushed} sent to Google, ${result.pulled} received, ${result.clean} unchanged.${result.paused ? ` ${result.paused} links paused.` : ""}`;
}

export function createCalendarSyncHost(
  options: CalendarSyncHostOptions,
): CalendarSyncHost {
  const gate = () => options.device?.();
  const reviewMessage =
    options.reviewMessage ??
    ((events: number) => `Ready to link ${events} local events.`);
  let destination: CalendarSyncDestination = { account: "", calendar: "" };
  let preparedBinding: CalendarSyncBinding | null = null,
    resumeGeneration = 0,
    status = "Sync is off.",
    running = false,
    enabled = false,
    interactive = false;
  const listeners = new Set<() => void>();
  const settledListeners = new Set<() => void>();
  const changed = () => {
    for (const listener of [...listeners]) listener();
  };
  const saved = async () =>
    readCalendarSyncSettings(await options.settings.read());

  const controller = new CalendarSyncController(
    async (signal) => {
      const context = await options.prepare(signal, { interactive });
      preparedBinding = { ...context.binding };
      if (context.destination) destination = { ...context.destination };
      return context;
    },
    {
      read: async (scope) => {
        const value = await saved();
        enabled =
          value?.scope === scope &&
          value.enabled === true &&
          (await (gate()?.enabled() ?? true));
        return enabled;
      },
      write: async (scope, nextEnabled) => {
        const binding = preparedBinding;
        if (!binding)
          throw Error("Review the Calendar sync destination again.");
        await options.settings.edit(() => ({
          version: 1,
          scope,
          binding: { ...binding },
          enabled: nextEnabled,
        }));
        options.settingsWritten?.();
        enabled = nextEnabled;
      },
    },
    options.controller,
  );

  async function work<T>(
    action: () => Promise<T>,
    success: (result: T) => string,
    progress: string,
  ): Promise<T> {
    if (running) throw Error("Calendar sync is already running.");
    running = true;
    status = progress;
    changed();
    try {
      const result = await action();
      status = success(result);
      return result;
    } catch (error) {
      status = calendarSyncFailureMessage(error);
      throw error;
    } finally {
      running = false;
      changed();
      for (const listener of [...settledListeners]) listener();
    }
  }

  const cancelSync = () => {
    // A resume can be waiting for storage before the controller has a signal.
    resumeGeneration++;
    controller.cancel();
  };
  const cancel = () => {
    cancelSync();
    gate()?.cancel();
  };

  const host: CalendarSyncHost = {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot: () => ({ status, running, enabled }),
    async settings() {
      const config = await saved();
      try {
        const target = options.target(),
          binding = config?.binding;
        enabled =
          !!config?.enabled && calendarSyncTargetMatches(binding, target);
        if (enabled && gate()) {
          const key = options.identity();
          const local = await options.source(
            target,
            () => options.foreground() && options.identity() === key,
          );
          enabled =
            local.deviceEnabled === true &&
            local.revision === binding?.localSourceRevision;
          if (!enabled)
            status =
              "Device sync needs a new review. Saved events are retained.";
        }
      } catch {
        enabled = false;
      }
      changed();
    },
    async linkedProviderEvents() {
      const config = await saved();
      if (!config?.enabled) return new Set();
      const target = options.target(),
        binding = config.binding,
        key = options.identity();
      if (!calendarSyncTargetMatches(binding, target)) return new Set();
      const current = () => options.foreground() && options.identity() === key;
      const local = await options.source(target, current);
      if (local.revision !== binding.localSourceRevision) return new Set();
      const store = await CalendarLinkedStore.open(
        binding,
        current,
        options.storage,
        { idempotencyNamespace: options.controller?.idempotencyNamespace },
      );
      return new Set(
        (await store.list())
          .filter(
            (row) =>
              row.providerEventId &&
              (row.state === "clean" || row.state === "dirty"),
          )
          .map((row) => row.providerEventId as string),
      );
    },
    destination: () => ({ ...destination }),
    review: () =>
      work(
        async () => {
          interactive = true;
          try {
            return await controller.review();
          } finally {
            interactive = false;
          }
        },
        (review) => reviewMessage(review.events.length),
        "Reviewing calendar…",
      ),
    async enable(review) {
      await work(
        async () => {
          const device = gate();
          if (!device) {
            await controller.enable(review);
            return;
          }
          if (review.reviewIdentity !== options.identity())
            throw Error("Calendar account changed. Review sync again.");
          await device.enable(
            () =>
              options.foreground() &&
              review.reviewIdentity === options.identity(),
          );
          try {
            // The device opt-in is new; enable only what a fresh review still shows.
            const refreshed = await controller.review();
            await controller.enable(refreshed);
          } catch (error) {
            await device.pause();
            throw error;
          }
        },
        () => "Sync enabled.",
        "Enabling sync…",
      );
      return host.sync();
    },
    sync: () =>
      work(() => controller.sync(), calendarSyncReportMessage, "Syncing…"),
    async pause() {
      cancelSync();
      await gate()?.pause();
      await options.settings.edit((value) =>
        value ? { ...value, enabled: false } : null,
      );
      options.settingsWritten?.();
      enabled = false;
      status = "Sync is off. Saved events and links are retained.";
      changed();
    },
    cancel,
    async resume() {
      if (running || !options.foreground()) return;
      const generation = resumeGeneration;
      const identity = options.identity();
      const current = () =>
        generation === resumeGeneration &&
        options.foreground() &&
        options.identity() === identity;
      try {
        const config = await saved();
        if (!current() || running || !config?.enabled) return;
        if (!calendarSyncTargetMatches(config.binding, options.target()))
          return;
        await host.sync();
      } catch (error) {
        if (!current()) return;
        status = calendarSyncFailureMessage(error);
        changed();
      }
    },
    start() {
      const delay = options.localChangeDelayMs ?? 400;
      let pendingLocalChange = false,
        stopped = false,
        key = options.identity(),
        timer: ReturnType<typeof setTimeout> | undefined;
      const ownerChanged = () => {
        if (stopped) return;
        const next = options.identity();
        if (next === key) return;
        const changedExistingOwner = !!key;
        key = next;
        cancel();
        const device = gate();
        if (device && changedExistingOwner) {
          enabled = false;
          void device.pause().catch(() => {
            status =
              "Device sync pause could not be confirmed. Check pending deletions.";
            changed();
          });
        }
        status = "Sync is off.";
        changed();
        void host.resume();
      };
      const localChanged = () => {
        if (stopped || !enabled || !options.foreground()) return;
        if (running) {
          pendingLocalChange = true;
          return;
        }
        clearTimeout(timer);
        timer = setTimeout(() => void host.resume(), delay);
      };
      const settled = () => {
        if (!pendingLocalChange) return;
        pendingLocalChange = false;
        localChanged();
      };
      settledListeners.add(settled);
      void host.resume();
      return {
        ownerChanged,
        localChanged,
        visibilityChanged() {
          if (stopped) return;
          if (options.foreground()) {
            void host.resume();
            return;
          }
          clearTimeout(timer);
          cancel();
        },
        settingsChangedElsewhere() {
          if (stopped) return;
          cancel();
          status = "Sync settings changed in another view.";
          changed();
        },
        stop() {
          if (stopped) return;
          stopped = true;
          clearTimeout(timer);
          settledListeners.delete(settled);
          cancel();
        },
      };
    },
  };
  return host;
}
