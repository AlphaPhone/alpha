import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { registerPlugin } from './platform-plugins';
import {
  ANDROID_LOCAL_AGENT_IPC_BASE, BrowserConsumerApp,
  createBrowserConsumerHost, initializeBrowserConsumer,
  createNativeCloudSessionPort, createNativeCloudResidentPreparation,
  createAndroidNativeAgentTransport, getAuthStatusSnapshot,
  isMobileLocalAgentIpcUrl, parseResidentPlanAdmission,
  isEntitlementSignInFailure,
  type NativeCloudSessionHost,
} from '../../../.eliza/browser-consumer/index.js';
import '../../../.eliza/browser-consumer/styles.js';
import product from '../../../config/alpha-product.json' with { type: 'json' };
import { productionCloud } from './runtime/cloud-deployment.generated';
import { bindResidentCloudProvider, clearLocalProviderIfCurrent, clearLocalProvider, LocalCloudProviderStopUnconfirmed } from './runtime/local-agent';
import { RootErrorBoundary, installGlobalErrorRecovery } from './runtime/error-boundary';

// This is native registration/configuration only. Keys and authenticated owner
// enrollment stay in the same AlphaCloudSignIn/Agent native owners.
const signIn = registerPlugin<NativeCloudSessionHost['signIn']>('AlphaCloudSignIn');
type AgentPort = {
  start(input: { requestId: string }): Promise<unknown>;
  cancelStart(input: { requestId: string }): Promise<unknown>;
  stop(): Promise<unknown>;
  getStatus(): Promise<{ state?: string; reason?: string }>;
  request(input: Record<string, unknown>): Promise<{ status: number; body?: string }>;
  requestStream(input: Record<string, unknown>): Promise<{ streamId: string }>;
  cancelStream(input: { streamId: string }): Promise<unknown>;
  addListener(name: string, callback: (value: any) => void): Promise<{ remove(): void | Promise<void> }>;
};
const agent = registerPlugin<AgentPort>('Agent');
const cloud: NativeCloudSessionHost = { environment: 'production', signIn, copy: { serviceName: productionCloud.name, productName: product.identity.appName } };
const admissionSlot = 'alpha.connection.plan-admission.v1';
const prepare = (notice: (message: string | null) => void) => createNativeCloudResidentPreparation(cloud, {
  issuer: productionCloud.api, audience: productionCloud.entitlementAudience,
  readAdmission() {
    try { return parseResidentPlanAdmission(JSON.parse(localStorage.getItem(admissionSlot) || 'null'), value => value === 'production'); }
    catch { return null; }
  },
  writeAdmission(value) { try { if (value) localStorage.setItem(admissionSlot, JSON.stringify(value)); else localStorage.removeItem(admissionSlot); } catch { /* A failed cache write never grants offline admission. */ } },
  bindProvider: (id) => bindResidentCloudProvider(id),
  clearProviderIfCurrent: clearLocalProviderIfCurrent,
  clearProvider: async (_signal, reason) => { await clearLocalProvider(reason === 'unbound'); },
  isFatalBindError: error => error instanceof LocalCloudProviderStopUnconfirmed,
  isSignInRejected: isEntitlementSignInFailure,
  isUnreachable: error => {
    const value = error as { code?: unknown; status?: unknown } | null;
    return value?.code === 'offline' || typeof value?.status === 'number' && [408, 429].includes(value.status) || typeof value?.status === 'number' && value.status >= 500;
  },
});

async function start(signal?: AbortSignal): Promise<boolean> {
  signal?.throwIfAborted();
  const requestId = crypto.randomUUID();
  const cancel = () => { void agent.cancelStart({ requestId }).catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    await agent.start({ requestId });
    signal?.throwIfAborted();
    return true;
  } finally { signal?.removeEventListener('abort', cancel); }
}

function createHost(notice: (message: string | null) => void) {
  const admit = prepare(notice);
  const transport = createAndroidNativeAgentTransport({
    clientAllocatedStreamId: true,
    responseByteLimit: 2 * 1024 * 1024,
    request: input => agent.request({ ...input, body: input.body ?? undefined }),
    async requestStream(input) {
      try { return await agent.requestStream({ ...input, body: input.body ?? undefined }); }
      catch (cause) { throw Object.assign(new Error('The on-device agent did not accept this message.', { cause }), { notDispatched: true }); }
    },
    cancelStream: input => agent.cancelStream(input),
    async addListener(name, listener) {
      const type = { agentStreamResponse: 'response', agentStreamChunk: 'chunk', agentStreamComplete: 'complete' }[name];
      return agent.addListener('alphaAgentStream', value => {
        if (value?.event?.type === type) listener({ ...value.event, streamId: value.streamId });
      });
    },
  });
  return createBrowserConsumerHost({
    mobileProduct: product,
    apiBase: ANDROID_LOCAL_AGENT_IPC_BASE,
    cloudApiBase: productionCloud.api,
    nativeCloudSession: createNativeCloudSessionPort(cloud),
    transport: (url, purpose) => purpose !== 'cloud' && isMobileLocalAgentIpcUrl(url) ? transport : null,
    agentCapabilities: {
      requestOwnerIdForUrl: url => {
        if (!isMobileLocalAgentIpcUrl(url)) return undefined;
        const auth = getAuthStatusSnapshot();
        return auth.phase === 'authenticated' && auth.identity.kind === 'owner' ? auth.identity.id : undefined;
      },
      isInProcessAgentBase: isMobileLocalAgentIpcUrl,
      isTerminalBootError: () => false,
      lifecycleForUrl: async url => url && isMobileLocalAgentIpcUrl(url) ? { stop: () => agent.stop(), getStatus: () => agent.getStatus() } : null,
    },
    prepareNativeRuntimeForUrl: async (url, signal) => {
      if (!isMobileLocalAgentIpcUrl(url)) return;
      const result = await admit(signal);
      notice(result.applied.binding === 'unknown' ? 'The saved AI connection could not be confirmed. Check its status before reconnecting.' : result.admission.reason === 'offline' ? 'Cloud is unavailable. Local apps remain available.' : null);
    },
    requestAndroidLocalAgentStartForUrl: async (url, signal) => !!url && isMobileLocalAgentIpcUrl(url) ? start(signal) : false,
    getAndroidLocalAgentBootStateForUrl: async url => {
      if (!url || !isMobileLocalAgentIpcUrl(url)) return { state: 'unknown' };
      const status = await agent.getStatus();
      return { state: ['booting', 'listening', 'restarting', 'dead'].includes(status.state || '') ? status.state as 'booting' | 'listening' | 'restarting' | 'dead' : 'unknown', ...(status.reason ? { reason: status.reason } : {}) };
    },
  });
}

function NativeApplication() {
  const [notice, setNotice] = useState<string | null>(null);
  const [host] = useState(() => createHost(setNotice));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void initializeBrowserConsumer(host).then(() => { if (active) setReady(true); }, () => { if (active) setError(true); });
    return () => { active = false; };
  }, [host]);
  if (!ready) return <main role={error ? 'alert' : 'status'}>{error ? 'The application could not initialize. Reopen it to try again.' : 'Opening application…'}</main>;
  return <BrowserConsumerApp host={host}>{notice && <div role="status">{notice}</div>}</BrowserConsumerApp>;
}

export function mountNativeApplication() {
  installGlobalErrorRecovery();
  createRoot(document.getElementById('root')!).render(<RootErrorBoundary><NativeApplication /></RootErrorBoundary>);
}
