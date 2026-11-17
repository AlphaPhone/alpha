/**
 * When a native voice origin (a listener wake, a system assistant gesture or a protected Power
 * press) may open the microphone: the invocation controller binds this renderer's session to the
 * native listener, consumes an invocation only while the screen can act on it, and starts one
 * voice turn. What counts as blocking is Alpha's presentation policy: a hidden document, an open
 * Alpha dialog ({@link SENSE_MODAL_SELECTOR}), a connection prompt or an active voice turn.
 *
 * Copied from elizaOS `plugins/plugin-native-system/src/sense.ts` at the pinned revision and owned
 * here. The native bridge, its plugin interface, the invocation parsers, the start rule
 * (`listenerStartsVoice`), the voice entry policy and the bridge timeout stay in the staged
 * module and are read through `@elizaos/capacitor-system/sense`.
 */
import {
  ASSISTANT_INVOCATION_VOICE_ENTRY,
  listenerStartsVoice,
  parseAssistantInvocation,
  SENSE_BRIDGE_TIMEOUT_MS,
  SENSE_INVOCATION_EVENT,
  type SenseInvocationHost,
  type SensePlugin,
  type SenseVoiceEntryPolicy,
  parseInvocationUnlocked,
} from "@elizaos/capacitor-system/sense";

/** An open Alpha dialog blocks voice from starting under it. */
const SENSE_MODAL_SELECTOR =
  'dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"]';

/** The native session key is an in-memory digest, not an authentication credential. */
async function invocationSessionKey(authority: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(authority),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

// All instances in this renderer share the bridge completion order. In particular,
// an old in-flight bind must finish before a replacement posts its new binding.
// Native methods resolve only after applying their mutation; no dispatch FIFO is assumed.
let invocationOperation = Promise.resolve();
let activeInvocationBinding: string | null = null;
let nextInvocationGeneration = 0;
function serializeInvocation<T>(run: () => Promise<T>): Promise<T> {
  const bounded = async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        run(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Sense bridge did not complete")),
            SENSE_BRIDGE_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  const result = invocationOperation.then(bounded, bounded);
  invocationOperation = result.then(
    () => {},
    () => {},
  );
  return result;
}

/** Bind before consuming. Cold-start, changed-owner and stale async results cannot open the mic. */
export function createSenseInvocationController(
  native: Pick<
    SensePlugin,
    | "bindInvocationSession"
    | "takeInvocation"
    | "discardProtectedPowerInvocation"
    | "claimProtectedPowerLaunch"
    | "discardProtectedPowerLaunch"
  >,
  host: SenseInvocationHost,
  policy: SenseVoiceEntryPolicy = ASSISTANT_INVOCATION_VOICE_ENTRY,
) {
  // In chat-only mode an external event must not bind, consume, or start voice.
  // Stopping a previously enabled wake listener is a separate native host action.
  if (!policy.externalInvocation) return { check() {}, dispose() {} };
  const bindingId = crypto.randomUUID();
  const generation = ++nextInvocationGeneration;
  activeInvocationBinding = bindingId;
  let digestAuthority: string | null | undefined;
  let digestKey: string | null = null;
  let disposed = false,
    checking = false,
    dirty = false,
    initialized = false,
    bound: string | null = null;
  let coldLaunchAttempted = false;
  const current = (authority: string | null) =>
    !disposed &&
    activeInvocationBinding === bindingId &&
    host.authority() === authority;
  const check = async () => {
    if (disposed) return;
    if (checking) {
      dirty = true;
      return;
    }
    checking = true;
    try {
      const authority = host.authority();
      const key =
        authority === digestAuthority
          ? digestKey
          : authority === null
            ? null
            : await invocationSessionKey(authority);
      if (!current(authority)) return;
      digestAuthority = authority;
      digestKey = key;
      if (!initialized || bound !== key) {
        await serializeInvocation(async () => {
          if (current(authority))
            await native.bindInvocationSession({
              generation,
              bindingId,
              sessionKey: key,
            });
        });
        if (!current(authority)) return;
        bound = key;
        initialized = true;
      }
      const initialRestore = host.initialRestorePending?.() === true;
      const blocked =
        document.hidden ||
        host.voiceActive() ||
        !!document.querySelector(SENSE_MODAL_SELECTOR);
      if (blocked || (!initialRestore && (key === null || !host.ready()))) {
        coldLaunchAttempted = true;
        await serializeInvocation(async () => {
          if (current(authority))
            await native.discardProtectedPowerLaunch?.({
              generation,
              bindingId,
              sessionKey: key,
            });
        });
      }
      if (key === null) return;
      if (
        document.hidden ||
        !host.ready() ||
        host.voiceActive() ||
        document.querySelector(SENSE_MODAL_SELECTOR)
      ) {
        await serializeInvocation(async () => {
          if (current(authority))
            await native.discardProtectedPowerInvocation?.({
              generation,
              bindingId,
              sessionKey: key,
            });
        });
        return;
      }
      const accountRef = host.powerAccountRef?.() ?? null;
      const receipt = await serializeInvocation(async () => {
        if (!current(authority)) return undefined;
        if (!initialRestore && !coldLaunchAttempted && host.powerAccountRef) {
          coldLaunchAttempted = true;
          const launch =
            accountRef === null
              ? undefined
              : await native.claimProtectedPowerLaunch?.({
                  generation,
                  bindingId,
                  sessionKey: key,
                  accountRef,
                });
          if (parseAssistantInvocation(launch) === "power") return launch;
        }
        return current(authority)
          ? native.takeInvocation({ generation, bindingId, sessionKey: key })
          : undefined;
      });
      if (
        !current(authority) ||
        !host.ready() ||
        host.voiceActive() ||
        (host.powerAccountRef && host.powerAccountRef() !== accountRef)
      )
        return;
      if (
        listenerStartsVoice({
          invocation: parseAssistantInvocation(receipt),
          unlocked: parseInvocationUnlocked(receipt),
          hidden: document.hidden,
          dialogOpen: !!document.querySelector(SENSE_MODAL_SELECTOR),
          connectionOpen: !host.ready(),
          voiceActive: host.voiceActive(),
        })
      )
        host.startVoice();
    } catch {
      /* Unavailable bridge, owner or crypto support cannot authorize capture. */
    } finally {
      checking = false;
      if (dirty && !disposed) {
        dirty = false;
        void check();
      }
    }
  };
  const changed = () => {
    void check();
  };
  const events = [SENSE_INVOCATION_EVENT, ...(host.events ?? [])];
  for (const event of events) window.addEventListener(event, changed);
  document.addEventListener("visibilitychange", changed);
  const unsubscribe = host.subscribe?.(changed);
  let attempts = 0;
  const initial = setInterval(() => {
    changed();
    if (++attempts >= 50) clearInterval(initial);
  }, 100);
  changed();
  return {
    check: changed,
    dispose() {
      disposed = true;
      if (activeInvocationBinding === bindingId) activeInvocationBinding = null;
      clearInterval(initial);
      unsubscribe?.();
      for (const event of events) window.removeEventListener(event, changed);
      document.removeEventListener("visibilitychange", changed);
      void serializeInvocation(async () => {
        await native.discardProtectedPowerLaunch?.({
          generation,
          bindingId,
          sessionKey: bound,
        });
        await native.bindInvocationSession({
          generation,
          bindingId,
          sessionKey: null,
        });
      }).catch(() => {});
    },
  };
}
