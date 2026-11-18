import { createMailDraftsController, type MailDraftsProvider } from '../../../../.eliza/client-features/plugins/plugin-inbox/src/mailbox/drafts-controller.ts';
import {inboxUnsaved} from './inbox-unsaved';
import { registerPlugin } from '../platform-plugins';
import {DailyApps} from '../daily';
import {reviewMailAttachment} from '../runtime/inbox-attachment';
import type { AlphaMailAttachmentsPlugin } from '../native/alpha-mail-attachments';
import { inboxLocalStore } from '../runtime/inbox-local-store';
import { connectionController } from '../runtime/connection-ui';
const attachmentNative=registerPlugin<Pick<AlphaMailAttachmentsPlugin,'readSelected'>>('AlphaMailAttachments');
/** Local encrypted drafts (@elizaos/plugin-inbox/mailbox) on Alpha's encrypted slots, recovery copy and
 * native file picker. They remain separate from explicitly reviewed provider operations. */
export function inboxDrafts(publish:()=>void,toast:(text:string)=>void, provider?:MailDraftsProvider) {
 const copies=new Set<ReturnType<typeof inboxUnsaved>>();
 const drafts=createMailDraftsController({publish,toast,provider,store:inboxLocalStore,retained:(owner,changed,restore)=>{
  const copy=inboxUnsaved(owner,changed,restore);copies.add(copy);return copy;
 },reviewAttachment:reviewMailAttachment,
  confirm:message=>window.confirm(message),
  identity:()=>({sessionId:connectionController.getCloudClient()?.sessionId,account:connectionController.getSnapshot().cloudAccount??null}),
  attachments:{select:()=>DailyApps.perform({action:'files'}),read:selectionId=>attachmentNative.readSelected({selectionId}),forget:selectionId=>DailyApps.forgetSelected({selectionId})}});
 return Object.assign(drafts,{async flushForAppUpdate(current:()=>boolean){
  const retained=new Set(copies);
  const exact=()=>current()&&(!drafts.hasDraft||drafts.ready)&&[...copies].every(copy=>retained.has(copy));
  if(!exact())throw Error('Email draft is still changing');
  await Promise.all([...retained].map(copy=>copy.flushForAppUpdate(exact)));
  if(!exact())throw Error('Changed');
  for(const copy of retained)if(copy.retired)copies.delete(copy);
 }});
}
