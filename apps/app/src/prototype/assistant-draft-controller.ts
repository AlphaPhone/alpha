/**
 * Alpha's composer, Calendar and email recovery drafts use Alpha's durable draft controller
 * (ui/state/durable-draft-controller.ts): durable hold/commit/release around
 * each send, conversation and owner fencing by binding, and an unknown dispatch outcome that is
 * never offered for a second send. This name is kept for the existing call sites.
 */
import {DurableDraftController} from '../ui/state/durable-draft-controller.ts';
import type {ConnectionSnapshot} from '../runtime/connection-ui';

export function residentRestartDraftScope(snapshot: Pick<ConnectionSnapshot,'cloudAccount'|'providerStatus'>): string {
  const account = snapshot.cloudAccount;
  const provider = snapshot.providerStatus;
  return JSON.stringify([
    account?.environment, account?.userId, account?.organizationId, account?.credentialId,
    provider?.mode ?? provider?.provider, provider?.selected ? provider.revision : undefined,
  ]);
}
export function residentDraftOwner(snapshot: Pick<ConnectionSnapshot,'kind'|'session'>): string | undefined {
  const session = snapshot.session;
  if (snapshot.kind === 'resident' && session)
    return JSON.stringify([session.origin, session.ownerId, session.agentId]);
}

export class AssistantDraftController<Recovery=unknown> extends DurableDraftController<Recovery> {
  override async open(key:string):Promise<void> {
    await super.open(key);
    // An empty saved slot has no competing text to recover. Keep the current
    // editor through the shared compare-and-exchange path; never auto-resolve
    // an uncertain send, storage error or a nonempty competing draft.
    if(this.binding===key&&this.state.conflict&&!this.state.error&&!this.state.unsettled&&this.state.savedText==='')this.keepCurrent();
  }
}

export {DEFAULT_DURABLE_DRAFT_MESSAGES} from '../ui/state/durable-draft-controller.ts';
