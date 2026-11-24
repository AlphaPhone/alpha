import type {Page} from '@playwright/test';
import {installNativeNavigationFixture} from './native-navigation-protocol.ts';

export async function installResidentAgentPlugin(page: Page) {
  await page.addInitScript(installNativeNavigationFixture);
  await page.addInitScript(defineResidentAgentPlugin);
}

function defineResidentAgentPlugin() {
  (window as any).createResidentAgentPlugin = (options: {owner: () => string; agentId: string; unexpected?: string[]; providerStatus?: {provider: 'elizacloud'|'cerebras'; configured: boolean; selected?: boolean; model?: string; voiceConfigured?: boolean}}) => {
    const listeners = new Map<string, {eventName: string; callback: (value: unknown) => void}>();
    const state = {googleAgentAccess: {gmailChanges: false, calendarEdits: false}, subscriptions: [] as string[], unsubscribed: [] as string[], unexpected: options.unexpected ?? [] as string[]};
    const protocol = (window as any).createNativeNavigationFixture(options.owner, options.agentId, state);
    let nextCallback = 0;
    return {
      state,
      methods(names: string[]) {
        return [
          ...[...names, 'subscribeViewEvents', 'unsubscribeViewEvents', ...(!names.includes('setGoogleAgentAccess') ? ['setGoogleAgentAccess'] : []), ...(options.providerStatus && !names.includes('providerStatus') ? ['providerStatus'] : [])].map(name => ({name, rtype: 'promise'})),
          {name: 'addListener', rtype: 'callback'},
          {name: 'removeListener', rtype: 'callback'},
        ];
      },
      nativeCallback(plugin: string, method: string, input: any, callback: (value: unknown) => void) {
        if (plugin === 'Agent' && method === 'addListener') {
          const callbackId = 'agent-listener-' + ++nextCallback;
          listeners.set(callbackId, {eventName: input?.eventName, callback});
          return callbackId;
        }
        if (plugin === 'Agent' && method === 'removeListener') { listeners.delete(input?.callbackId); return ''; }
        state.unexpected.push(plugin + '.' + method);
        throw Error('Unexpected native callback operation');
      },
      answer(method: string, input: any): unknown {
        if (method === 'providerStatus' && options.providerStatus) return {...options.providerStatus};
        if (method === 'setGoogleAgentAccess') {
          if (typeof input?.gmailChanges !== 'boolean' || typeof input?.calendarEdits !== 'boolean') throw Error('Invalid Google access.');
          state.googleAgentAccess = {gmailChanges: input.gmailChanges, calendarEdits: input.calendarEdits};
          return {};
        }
        if (method === 'subscribeViewEvents') {
          if (typeof input?.subscriptionId !== 'string' || input?.ownerId !== options.owner() || typeof input?.clientId !== 'string') {
            state.unexpected.push('Agent.subscribeViewEvents');
            throw Error('Invalid view event subscription');
          }
          state.subscriptions.push(input.subscriptionId);
          return {subscriptionId: input.subscriptionId};
        }
        if (method === 'unsubscribeViewEvents') { state.unsubscribed.push(input?.subscriptionId); return {}; }
        if (method !== 'request') return undefined;
        const headers = input.headers ?? {};
        if (input.path === '/api/client-devices/register' && headers['X-Eliza-Device-Id']) protocol.register(headers);
        let body: unknown;
        try { body = input.body ? JSON.parse(input.body) : undefined; } catch { body = input.body; }
        const result = protocol.request(input.method ?? 'GET', input.path, body, headers, input.ownerId);
        return result && {status: result.status, body: JSON.stringify(result.data)};
      },
      emitViewEvent(value: unknown) {
        for (const listener of listeners.values()) if (listener.eventName === 'alphaViewEvent') listener.callback(value);
      },
    };
  };
}
