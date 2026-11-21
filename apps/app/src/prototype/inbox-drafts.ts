import { createMailDraftsController, type ComposePrefill as SharedComposePrefill, type ForwardSource as SharedForwardSource, type MailDraftsProvider, type SuggestionTarget as SharedSuggestionTarget } from '../ui/mailbox/drafts-controller';
import {inboxUnsaved} from './inbox-unsaved';
import {reviewMailAttachment} from '../runtime/inbox-attachment';
import { inboxLocalStore } from '../runtime/inbox-local-store';
import { connectionController } from '../runtime/connection-ui';
/** Content handed to a new composer: shared from another app or moved to another From account. */
export type ComposePrefill=SharedComposePrefill;
/** Source attachments a forward carries, bound to the selected message and its historyId. */
export type ForwardSource=SharedForwardSource;
/** The destination of a reviewed assistant suggestion, as shown to the user before inserting it. */
export type SuggestionTarget=SharedSuggestionTarget;
/** Local encrypted drafts (../ui/mailbox/drafts-controller) on Alpha's encrypted slots, recovery copy and
 * the shared attachment picker. Provider operations use the separate journal. */
export function inboxDrafts(publish:()=>void,toast:(text:string)=>void, provider:MailDraftsProvider,
 reviewActive:()=>boolean,chooseAttachment:(current:()=>boolean)=>Promise<File|undefined>) {
 const copies=new Set<ReturnType<typeof inboxUnsaved>>();
 const drafts=createMailDraftsController({publish,toast,provider,store:inboxLocalStore,retained:(owner,changed,restore)=>{
  const copy=inboxUnsaved(owner,changed,restore);copies.add(copy);return copy;
 },reviewAttachment:reviewMailAttachment,
  confirm:message=>window.confirm(message),
  identity:()=>({sessionId:connectionController.getCloudClient()?.sessionId,account:connectionController.getSnapshot().cloudAccount??null}),
  reviewActive,chooseAttachment});
 return Object.assign(drafts,{async flushForAppUpdate(current:()=>boolean){
  const retained=new Set(copies);
  const exact=()=>current()&&(!drafts.hasDraft||drafts.ready)&&[...copies].every(copy=>retained.has(copy));
  if(!exact())throw Error('Email draft is still changing');
  await Promise.all([...retained].map(copy=>copy.flushForAppUpdate(exact)));
  if(!exact())throw Error('Changed');
  for(const copy of retained)if(copy.retired)copies.delete(copy);
 }});
}
