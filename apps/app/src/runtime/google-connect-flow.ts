import {connectionController} from './connection-ui';
import {createGoogleAccounts,notifyGoogleAccountsChanged} from './google-accounts';
import {googleConnectReturnUrl,onGoogleConnectReturn,openConnectionBrowser} from './native-connection';

/**
 * Connecting Google for Inbox and Calendar (docs/flow-redesign-2026-11, specs/quint/services/GoogleAccounts.qnt).
 *
 * One consent asks for everything Alpha uses: Gmail read, send, drafts and mailbox changes, and
 * Calendar read and write. Google opens in a Custom Tab; when this phone verifies the App Link,
 * Cloud returns to https://eliza.app/alphaphone/google/return and Android brings Alpha forward,
 * closing the tab. Either way Alpha re-reads the grant from Cloud as soon as it is back in front,
 * and tells Inbox, Calendar and Settings to refresh. Nothing here holds a token.
 */
export type GoogleConnectStatus = 'idle' | 'waiting' | 'denied' | 'failed';
let status: GoogleConnectStatus = 'idle', active: AbortController | null = null;
const listeners = new Set<() => void>();
function set(next: GoogleConnectStatus) { status = next; for (const listener of listeners) listener(); }
/** Longest wait for the owner to come back from Google. A page that never goes to the background
 * (a desktop window beside the consent, multi-window) would otherwise wait for ever. */
export const GOOGLE_CONNECT_WAIT_MS = 10 * 60_000;
/** An attempt and its note belong to the Cloud session that started it; neither outlives that session. */
export function googleConnectOwnerChanged(startedBy: string | undefined, current: string | undefined): boolean { return startedBy !== current; }
let owner: string | undefined, watching = false;
function retire() { active?.abort(); active = null; if (status !== 'idle') set('idle'); }
function watchOwner() {
  if (watching) return;
  watching = true;
  connectionController.subscribe(() => {
    const current = connectionController.getCloudClient()?.sessionId;
    if (!googleConnectOwnerChanged(owner, current)) return;
    owner = current; retire();
  });
}

/** The result of the last attempt, for a one-line note under the Connect button. */
export function googleConnectNote(value: GoogleConnectStatus = status): string {
  return value === 'denied' ? 'Google access wasn’t allowed.' : value === 'failed' ? 'Google didn’t connect. Try again.' : '';
}

function stateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Resolves when Alpha is back in front after having gone to the background (or on abort). */
function backInFront(signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    let left = document.hidden;
    const done = () => { document.removeEventListener('visibilitychange', change); window.removeEventListener('focus', focus); signal.removeEventListener('abort', done); resolve(); };
    const change = () => { if (document.hidden) left = true; else if (left) done(); };
    const focus = () => { if (left && !document.hidden) done(); };
    document.addEventListener('visibilitychange', change); window.addEventListener('focus', focus); signal.addEventListener('abort', done, {once: true});
  });
}

export const googleConnect = {
  getSnapshot: () => status,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  /** Starts Google's consent. Without a Cloud sign-in, opens the Cloud account sheet instead. */
  async start(): Promise<void> {
    const cloud = connectionController.getCloudClient();
    if (!cloud) { connectionController.openCloudAccount(); return; }
    watchOwner();
    if (googleConnectOwnerChanged(owner, cloud.sessionId)) { owner = cloud.sessionId; retire(); }
    if (status === 'waiting') return;
    active?.abort();
    const abort = active = new AbortController();
    set('waiting');
    let unsubscribe = () => {}, timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const state = stateToken();
      const returnUrl = await googleConnectReturnUrl();
      let result: 'connected' | 'denied' | 'failed' | null = null, signalReturn = () => {};
      const appLink = new Promise<void>(resolve => { signalReturn = resolve; });
      unsubscribe = onGoogleConnectReturn(value => { if (value.state === state) { result = value.result; signalReturn(); } });
      const url = await createGoogleAccounts(cloud, () => connectionController.getCloudClient())
        .connect(abort.signal, 'write', 'modify', returnUrl ? `${returnUrl}?state=${state}` : undefined);
      await openConnectionBrowser(url, abort.signal);
      // Back in Alpha, by App Link or by closing the tab. A delivered App Link may trail the resume.
      const expired = new Promise<void>(resolve => { timer = setTimeout(resolve, GOOGLE_CONNECT_WAIT_MS); });
      await Promise.race([appLink, backInFront(abort.signal), expired]);
      if (!result && returnUrl) await Promise.race([appLink, new Promise(resolve => setTimeout(resolve, 400))]);
      abort.signal.throwIfAborted();
      // A return for a session that is no longer signed in is dropped; that session's readers are gone.
      if (googleConnectOwnerChanged(cloud.sessionId, connectionController.getCloudClient()?.sessionId)) { if (active === abort) set('idle'); return; }
      notifyGoogleAccountsChanged();
      set(result === 'denied' ? 'denied' : result === 'failed' ? 'failed' : 'idle');
    } catch (error) {
      if (abort.signal.aborted) { if (active === abort) set('idle'); return; }
      connectionController.rejectCloudSession(cloud.sessionId, error);
      // The failure note is for the session that asked; a session that ended meanwhile shows none.
      if (active === abort) set('failed');
    } finally {
      clearTimeout(timer); unsubscribe(); if (active === abort) active = null;
      // Releases the back-in-front listeners when the App Link or the time limit ended the wait.
      abort.abort();
    }
  },
  cancel() { active?.abort(); },
};
