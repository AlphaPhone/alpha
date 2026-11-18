import { Capacitor } from '@capacitor/core';
import { raceAbort } from '../lib/abort';
import type { AlphaNotificationsPlugin } from '../native/alpha-notifications';
import { registerPlugin } from '../platform-plugins';

/**
 * Workflow device protocol this renderer registers: 2 adds foreground presentation, 3 adds the
 * selected-reminders read (served by the reminder list every presentation-capable build has).
 */
export async function workflowDeviceProtocol(signal: AbortSignal): Promise<1 | 3> {
  return (await workflowPresentationProtocol(signal)) === 2 ? 3 : 1;
}
/**
 * Registers with `protocol`, and once more at protocol 2 when an agent that predates the
 * selected-reminders read refuses protocol 3 (its device routes answer a rejected request with
 * HTTP 409). Any other failure (sign-in, network, server, or an error carrying no HTTP status) is not retried, so a transient fault
 * never downgrades the enrollment. Registration is idempotent for the same device.
 */
export async function registerWorkflowDevice<T>(protocol: 1 | 2 | 3, register: (protocol: 1 | 2 | 3) => Promise<T>, signal: AbortSignal): Promise<{ registered: T; workflowProtocol: 1 | 2 | 3 }> {
  try { return { registered: await register(protocol), workflowProtocol: protocol }; }
  catch (error) {
    signal.throwIfAborted();
    const status = error && typeof error === 'object' ? Reflect.get(error, 'status') : undefined;
    if (protocol !== 3 || status !== 409) throw error;
    return { registered: await register(2), workflowProtocol: 2 };
  }
}
/** Probe installed bridge code, not permissions or model readiness. Older APKs, whose bridge lacks
 * the method, remain protocol 1. A stalled bridge is probed once more; if it still stalls this call answers 1
 * without remembering it, so the next connect probes again. A protocol 2 answer is kept for the process.
 */
export async function workflowPresentationProtocol(signal: AbortSignal): Promise<1 | 2> {
  signal.throwIfAborted();
  if (!Capacitor.isNativePlatform() || presentationReady) return 2;
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await probePresentation(signal);
    if (result === 'stalled') continue;
    if (result === 2) presentationReady = true;
    return result;
  }
  return 1;
}
let presentationReady = false;
async function probePresentation(signal: AbortSignal): Promise<1 | 2 | 'stalled'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Both bridges declare the same probe; AlphaNotifications' type describes the pair.
    const probes = Promise.all(['AlphaNotifications', 'AlphaVoiceCloud'].map(name =>
      registerPlugin<Pick<AlphaNotificationsPlugin, 'workflowPresentationCapabilities'>>(name).workflowPresentationCapabilities()));
    const result = await raceAbort(Promise.race([
      probes,
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 2000); }),
    ]), signal);
    signal.throwIfAborted();
    if (result === null) return 'stalled';
    return result.every(value => value?.protocol === 2) ? 2 : 1;
  } catch { signal.throwIfAborted(); return 1; }
  finally { clearTimeout(timer); }
}
