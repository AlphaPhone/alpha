import { AttachmentRefusedError, reviewMailAttachment, type MailAttachment } from './inbox-attachment.ts';
import type { GmailInboxReceipt } from './cloud-protocol.ts';

type Bag = Record<string, unknown>;
export interface InboxOperationRecord {
  version: 1; owner: string; grantId: string; requestId: string; proposal: Bag;
  phase: 'preparing' | 'review' | 'dispatching' | 'observed';
  review: Bag | null; receipt: GmailInboxReceipt | null;
  /** The local draft a send was started from. Local only: it is never part of the proposal the
   * provider sees. A confirmed send clears only copies of this exact draft with the sent content. */
  source?: { draftId: string;
    /** The revision of that draft's saved local copy when Send was reviewed. A saved copy still at this
     * revision after the send, holding other text, is an earlier version of the sent email. */
    savedRevision?: string };
  /** The composer email a send or draft review was made from. Local only. The review can be
   * confirmed only while the composer holds that same email (same local draft, which belongs to
   * one From account) with exactly the reviewed content. */
  composer?: { draftId: string };
}
/** Operations reviewed from the composer. */
export const composerKind = (kind: unknown) => kind === 'send' || kind === 'draft-create' || kind === 'draft-replace';
/** Everything the person reviews in a composer proposal, as one comparable text. */
export const composerContent = (proposal: Bag) => JSON.stringify(['mode','to','cc','bcc','subject','bodyText','attachments','forwardAttachments','replyMessageId'].map(field => proposal[field] ?? null));
export interface ComposerEmail { draftId: string; proposal: Bag }
/** How an unsent composer review relates to the email now in the composer:
 * `bound` same email, same content; `edited` same email, content changed; `other` another email
 * (or a review saved without its email's identity); `absent` no email is open in the composer. */
export type ReviewBinding = 'bound' | 'edited' | 'other' | 'absent';
const composerFields = ['mode','to','cc','bcc','subject','bodyText','attachments','forwardAttachments','replyMessageId'] as const;
/** Structural equality of two JSON values. An absent key equals an undefined one, as in JSON text. */
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    const other: unknown[] = b;
    return a.every((item, index) => sameJson(item ?? null, other[index] ?? null));
  }
  const left = a as Bag, right = b as Bag;
  const keys = (value: Bag) => Object.keys(value).filter(key => value[key] !== undefined);
  const names = keys(left);
  return names.length === keys(right).length && names.every(key => right[key] !== undefined && sameJson(left[key], right[key]));
}
/** Whether two composer proposals hold the same reviewed content. It agrees with comparing
 * composerContent() of each, without building either text: attachment bytes are compared in place,
 * so the comparison can run on every render. */
export function sameComposerContent(a: Bag, b: Bag): boolean {
  return composerFields.every(field => sameJson(a[field] ?? null, b[field] ?? null));
}
export function reviewBinding(record: Pick<InboxOperationRecord, 'proposal' | 'composer'>, current: ComposerEmail | null): ReviewBinding {
  if (!current) return 'absent';
  if (!record.composer || !current.draftId || record.composer.draftId !== current.draftId) return 'other';
  return sameComposerContent(record.proposal, current.proposal) ? 'bound' : 'edited';
}
/** The phase a saved operation takes when the provider answers with receipt state `state`. Once a
 * dispatch was attempted (`dispatching`) or an outcome was recorded (`observed`), a `prepared` answer
 * never returns the operation to a phase that can be confirmed: it is dispatched at most once. */
export function nextOperationPhase(phase: InboxOperationRecord['phase'], state: string, reviewed: boolean): InboxOperationRecord['phase'] {
  if (state !== 'prepared') return 'observed';
  if (phase === 'dispatching' || phase === 'observed') return phase;
  return reviewed ? 'review' : 'preparing';
}
/** Whether Confirm is offered for a saved operation: an undispatched exact review, still bound to
 * the email in the composer (`none` for operations with no composer), under a grant that allows it now. */
export function reviewConfirmable(record: Pick<InboxOperationRecord, 'phase' | 'receipt'> | null | undefined, binding: ReviewBinding | 'none', allowed: boolean): boolean {
  return !!record && allowed && (binding === 'bound' || binding === 'none') && record.phase === 'review' && record.receipt?.state === 'prepared';
}
export const grantRefusal = 'Gmail does not allow this change for the selected account now, so nothing was sent or changed. Reconnect Gmail, then review it again, or cancel this review.';
export const reviewBindingRefusal: Record<Exclude<ReviewBinding, 'bound'>, string> = {
  edited: 'This email was edited after this review, so the review was discarded. Nothing was sent. Review the current email before sending.',
  other: 'This review was made for a different email than the one now in the composer, so it was discarded. Nothing was sent. Review the current email before sending.',
  absent: 'This review is for an email that is not open in the composer, so it cannot be confirmed. Nothing was sent. Open that email and choose Send to review it again, or cancel this review.',
};
export interface InboxOperationDependencies {
  owner: string; grantId: string; active(): boolean;
  /** Whether the selected account's current capabilities allow this kind of operation. When given,
   * confirm() refuses a review whose grant no longer allows it, before anything is dispatched. */
  allows?(kind: string): boolean;
  store: { read<T>(key: string): Promise<T | null>; compareExchange(key: string, expected: unknown, value: unknown): Promise<{status: string}> };
  client: {
    gmailPrepareOperation(grant: string, request: string, proposal: Bag, signal: AbortSignal): Promise<{receipt: GmailInboxReceipt; review: Bag}>;
    gmailDispatchOperation(grant: string, request: string, digest: string, proposal: Bag, signal: AbortSignal): Promise<GmailInboxReceipt>;
    gmailOperation(grant: string, request: string, signal: AbortSignal): Promise<GmailInboxReceipt>;
  };
}
/** Outgoing attachment limits shared by the composer and the operation check. Servers without the
 * multi-attachment policy publish maximumOutgoing 1. */
export const outgoingAttachmentLimits = { maximumFiles: 10, maximumTotalBytes: 5 * 1024 * 1024 } as const;
export function attachmentBytes(file: { dataBase64: string }): number {
  const padding = file.dataBase64.endsWith('==') ? 2 : file.dataBase64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(file.dataBase64.length * 3 / 4) - padding);
}
/** Validates an outgoing list: count, duplicate names and the combined byte cap. */
export function checkOutgoingAttachments(files: readonly { name: string; dataBase64: string }[], policy: { maximumOutgoing: number; maximumTotalBytes: number } = { maximumOutgoing: outgoingAttachmentLimits.maximumFiles, maximumTotalBytes: outgoingAttachmentLimits.maximumTotalBytes }): void {
  const maximum = Math.min(policy.maximumOutgoing, outgoingAttachmentLimits.maximumFiles);
  if (files.length > maximum) throw new Error(maximum === 1 ? 'This account accepts one attachment per email.' : `Attach at most ${maximum} files.`);
  if (new Set(files.map(file => file.name.toLowerCase())).size !== files.length) throw new Error('Two attachments have the same name.');
  const total = files.reduce((sum, file) => sum + attachmentBytes(file), 0);
  if (total > Math.min(policy.maximumTotalBytes, outgoingAttachmentLimits.maximumTotalBytes)) throw new Error(`Attachments exceed ${Math.round(Math.min(policy.maximumTotalBytes, outgoingAttachmentLimits.maximumTotalBytes) / 1048576)} MiB in total.`);
}
export interface OpaqueMailAttachment { name: string; mimeType: string; dataBase64: string; size: number; sha256: string; opaque: true }
/** Byte-copy review for a save of any type: the name and encoding are checked and the bytes hashed.
 * Content is never decoded, previewed or handed to a viewer. A failed check is an AttachmentRefusedError. */
export async function reviewOpaqueAttachment(file: { name: string; mimeType: string; dataBase64: string }): Promise<OpaqueMailAttachment> {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: reject control characters in untrusted names.
  if (!file || typeof file.name !== 'string' || !file.name.trim() || file.name.length > 120 || /[\\/\x00-\x1f\x7f]/.test(file.name) || file.name === '.' || file.name === '..'
    || typeof file.dataBase64 !== 'string' || file.dataBase64.length > 7 * 1024 * 1024) throw new AttachmentRefusedError('Invalid attachment name or encoding');
  let raw: string;
  try { raw = atob(file.dataBase64); } catch { throw new AttachmentRefusedError('Invalid attachment name or encoding'); }
  if (btoa(raw) !== file.dataBase64) throw new AttachmentRefusedError('Invalid attachment name or encoding');
  if (raw.length > 5 * 1024 * 1024) throw new AttachmentRefusedError('Attachment exceeds 5 MiB');
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  const mimeType = typeof file.mimeType === 'string' && /^[a-z0-9][a-z0-9!#$&^_.+-]{0,63}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,63}$/i.test(file.mimeType) ? file.mimeType.toLowerCase() : 'application/octet-stream';
  return { name: file.name, mimeType, dataBase64: file.dataBase64, size: bytes.length, sha256, opaque: true };
}
const digest = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const item of Object.values(value)) freeze(item); }
  return value;
}
/** A send the saved receipt says succeeded, with the local draft it came from: the state in which local
 * copies of that draft are removed. */
const sentFromDraft = (record: InboxOperationRecord) => record.phase === 'observed' && record.proposal.kind === 'send' && record.receipt?.state === 'succeeded' && !!record.source;
/** The provider's receipt reports the same succeeded send, with the same provider message, as the saved one. */
const sameSend = (saved: GmailInboxReceipt, receipt: GmailInboxReceipt) => receipt.requestId === saved.requestId && receipt.kind === saved.kind && receipt.reviewDigest === saved.reviewDigest
  && receipt.state === 'succeeded' && typeof receipt.providerResult?.messageId === 'string' && !!receipt.providerResult.messageId && receipt.providerResult.messageId === saved.providerResult?.messageId;
/** One durable selected-account intent. No recovery path dispatches an effect. */
export class InboxOperation {
  private record: InboxOperationRecord | null = null;
  private busy = false;
  /** A confirmed send loaded from storage whose receipt the provider has not reported again in this
   * session. Its source draft is left out of snapshots, so cleanup keeps every local copy. */
  private unconfirmedSource = false;
  private controller = new AbortController();
  private shared: { record: InboxOperationRecord; unconfirmed: boolean; value: InboxOperationRecord } | null = null;
  constructor(private readonly deps: InboxOperationDependencies) {}
  static readonly confirmable = reviewConfirmable;
  static readonly grantRefusal = grantRefusal;
  /** A read-only copy of the saved record. The same frozen object is returned until the record
   * changes, so rendering copies a record (and its attachments) once per change, not once per read. */
  snapshot(): InboxOperationRecord | null {
    if (!this.record) { this.shared = null; return null; }
    if (this.shared?.record === this.record && this.shared.unconfirmed === this.unconfirmedSource) return this.shared.value;
    const value = copy(this.record); if (this.unconfirmedSource) delete value.source;
    this.shared = { record: this.record, unconfirmed: this.unconfirmedSource, value: freeze(value) };
    return value;
  }
  stop() { this.controller.abort(); }
  private check() { if (!this.deps.active() || this.controller.signal.aborted) throw new DOMException('Inbox account changed','AbortError'); }
  private async key() { return InboxOperation.storeKey(this.deps.owner,this.deps.grantId); }
  private static async storeKey(owner: string, grantId: string) { return `inbox-operation:v1:${await digest(JSON.stringify([owner,grantId]))}`; }
  /**
   * Removes the saved record for one owner and grant when it is an undispatched review ('preparing' or
   * 'review'). It is independent of any live InboxOperation, so a withdrawn grant is honoured even when
   * the account is rebound or reset meanwhile. A dispatching or observed record is never touched: its
   * receipt stays. A write that races it is re-read a few times. Returns whether a record was removed.
   */
  static async discardUnsent(store: InboxOperationDependencies['store'], owner: string, grantId: string): Promise<boolean> {
    const key = await InboxOperation.storeKey(owner, grantId);
    for (let attempt = 0; attempt < 4; attempt++) {
      const value = await store.read<InboxOperationRecord>(key);
      if (!value || (value.phase !== 'preparing' && value.phase !== 'review')) return false;
      if ((await store.compareExchange(key, value, null)).status === 'saved') return true;
    }
    throw new Error('The unsent review kept changing and was not discarded. Reload its receipt before continuing.');
  }
  private async exclusive<T>(run:()=>Promise<T>) { if(this.busy)throw new Error('An Inbox operation is already pending');this.busy=true;try{this.check();return await run();}finally{this.busy=false;} }
  private async save(next: InboxOperationRecord | null) {
    this.check();const result=await this.deps.store.compareExchange(await this.key(),this.record,next);this.check();
    if(result.status!=='saved')throw new Error('Inbox operation changed. Reload its receipt before continuing.');this.record=next;if(!next)this.unconfirmedSource=false;
  }
  async load() { return this.exclusive(async()=>{
    const value=await this.deps.store.read<InboxOperationRecord>(await this.key());this.check();
    if(value && (value.version!==1||value.owner!==this.deps.owner||value.grantId!==this.deps.grantId||!value.requestId||!value.proposal||!['preparing','review','dispatching','observed'].includes(value.phase)||(value.source!==undefined&&(!value.source||typeof value.source.draftId!=='string'||!value.source.draftId||(value.source.savedRevision!==undefined&&(typeof value.source.savedRevision!=='string'||!value.source.savedRevision))))||(value.composer!==undefined&&(!value.composer||typeof value.composer.draftId!=='string'||!value.composer.draftId))))throw new Error('Invalid saved Inbox operation');
    this.record=value;this.unconfirmedSource=false;
    // Cleanup that resumes after a reload acts on a receipt saved earlier. Local copies are removed only
    // when the provider still reports that send; no receipt read, a failed read or a different answer
    // keeps them, and the receipt says the local draft stays on this device.
    if(value&&sentFromDraft(value))this.unconfirmedSource=!await this.providerAgrees(value);
    return this.snapshot();
  }); }
  private async providerAgrees(record: InboxOperationRecord) {
    if(typeof this.deps.client.gmailOperation!=='function'||!record.receipt)return false;
    try{const receipt=await this.deps.client.gmailOperation(record.grantId,record.requestId,this.controller.signal);this.check();return sameSend(record.receipt,receipt);}
    catch{this.check();return false;}
  }
  async prepare(proposal: Bag, source?: { draftId: string; savedRevision?: string }) { return this.exclusive(async()=>{
    if(this.record)throw new Error('Review the saved operation before starting another.');
    const clean=copy(proposal);if(new TextEncoder().encode(JSON.stringify(clean)).length>7.5*1024*1024)throw new Error('Message exceeds the supported review size');
    await this.save({version:1,owner:this.deps.owner,grantId:this.deps.grantId,requestId:crypto.randomUUID(),proposal:clean,phase:'preparing',review:null,receipt:null,...(source&&proposal.kind==='send'&&typeof source.draftId==='string'&&source.draftId?{source:{draftId:source.draftId,...(typeof source.savedRevision==='string'&&source.savedRevision?{savedRevision:source.savedRevision}:{})}}:{}),...(source&&composerKind(proposal.kind)&&typeof source.draftId==='string'&&source.draftId?{composer:{draftId:source.draftId}}:{})});
    await this.reviewCurrent();return this.snapshot();
  }); }
  /** Explicit review recovery is an idempotent prepare, never provider dispatch. */
  async reloadReview() { return this.exclusive(async()=>{if(!this.record||this.record.phase!=='preparing')throw new Error('Review recovery is unavailable');await this.reviewCurrent();return this.snapshot();}); }
  private async reviewCurrent() {
    const record=this.record!;
    const result=await this.deps.client.gmailPrepareOperation(record.grantId,record.requestId,record.proposal,this.controller.signal);this.check();
    if(result.receipt.requestId!==record.requestId||result.receipt.kind!==record.proposal.kind||result.receipt.reviewDigest!==await digest(JSON.stringify(result.review)))throw new Error('Server review does not match its receipt');
    const review=result.review;
    for(const field of ['kind','mode','subject','bodyText','replyMessageId','draftId','expectedDigest','messageId','expectedHistoryId']) if(record.proposal[field]!==undefined&&JSON.stringify(record.proposal[field])!==JSON.stringify(review[field]))throw new Error('Server changed the requested '+field);
    for(const field of ['to','cc','bcc'])if(record.proposal[field]!==undefined&&JSON.stringify(record.proposal[field])!==JSON.stringify(review[field]))throw new Error('Server changed the reviewed recipients');
    if(typeof review.from!=='string'||!review.from)throw new Error('Unsupported sender');
    const attachments=record.proposal.attachments||[];if(!Array.isArray(attachments))throw new Error('Unsupported attachments');
    checkOutgoingAttachments(attachments as MailAttachment[]);
    if(attachments.length>1&&!Array.isArray(review.attachments))throw new Error('This server cannot review more than one attachment');
    const checked=await Promise.all(attachments.map(async file=>{const {text,...metadata}=await reviewMailAttachment(file as MailAttachment);return metadata;}));
    if(JSON.stringify(checked)!==JSON.stringify(review.attachments||[]))throw new Error('Server changed the reviewed attachments');
    // Forwarded source attachments stay bound to the selected message and its historyId.
    const forward=record.proposal.forwardAttachments as {messageId?:unknown;historyId?:unknown;partIds?:unknown}|undefined;
    if(forward!==undefined){
     if(record.proposal.mode!=='forward'||!forward||typeof forward.messageId!=='string'||typeof forward.historyId!=='string'||!Array.isArray(forward.partIds)||!forward.partIds.length||forward.partIds.length>outgoingAttachmentLimits.maximumFiles||forward.partIds.some(id=>typeof id!=='string'))throw new Error('Unsupported forwarded attachments');
     const reviewed=review.forwardedAttachments;
     if(!Array.isArray(reviewed)||JSON.stringify(reviewed.map((row:Bag)=>row?.partId))!==JSON.stringify(forward.partIds)||review.forwardSource==null||JSON.stringify(review.forwardSource)!==JSON.stringify({messageId:forward.messageId,historyId:forward.historyId})||reviewed.some((row:Bag)=>typeof row.name!=='string'||typeof row.size!=='number'||typeof row.sha256!=='string'||!/^[a-f0-9]{64}$/.test(row.sha256)))throw new Error('Server changed the forwarded attachments');
     const total=checked.reduce((sum,file)=>sum+file.size,0)+reviewed.reduce((sum:number,row:Bag)=>sum+(row.size as number),0);
     if(total>outgoingAttachmentLimits.maximumTotalBytes||checked.length+reviewed.length>outgoingAttachmentLimits.maximumFiles)throw new Error('Attachments exceed the reviewed total limit');
    }else if(review.forwardedAttachments!==undefined&&JSON.stringify(review.forwardedAttachments)!=='[]')throw new Error('Server added forwarded attachments');
    await this.save({...record,review:copy(review),receipt:copy(result.receipt),phase:result.receipt.state==='prepared'?'review':'observed'});
  }
  /** `current` is the email in the composer at the moment of the tap (null when none is open).
   * When it is given, a send or draft review is dispatched only for that same email with exactly
   * the reviewed content; the check and the durable `dispatching` write have no await between
   * the caller's read of the composer and this comparison. */
  async confirm(current?: ComposerEmail | null) { return this.exclusive(async()=>{
    const record=this.record;if(!record||record.phase!=='review'||!record.review||record.receipt?.state!=='prepared')throw new Error('A fresh exact review is required');
    if(current!==undefined&&composerKind(record.proposal.kind)){const binding=reviewBinding(record,current);if(binding!=='bound')throw new Error(reviewBindingRefusal[binding]);}
    if(this.deps.allows&&!this.deps.allows(String(record.proposal.kind)))throw new Error(grantRefusal);
    // Durable before the single network attempt. A lost write reply cannot cause dispatch.
    await this.save({...record,phase:'dispatching'});this.check();
    const receipt=await this.deps.client.gmailDispatchOperation(record.grantId,record.requestId,record.receipt.reviewDigest,record.proposal,this.controller.signal);this.check();
    await this.observe(receipt);return this.snapshot();
  }); }
  private async observe(receipt: GmailInboxReceipt) {
    const record=this.record!;if(receipt.requestId!==record.requestId||receipt.kind!==record.proposal.kind||(record.receipt&&receipt.reviewDigest!==record.receipt.reviewDigest))throw new Error('Gmail answered for a different request, so nothing was confirmed. Check the saved receipt before trying again; do not send this message again.');
    // A prepared response after an attempted dispatch remains uncertain locally; never re-enable Send.
    // An observed outcome also keeps its saved receipt: a later `prepared` answer does not replace it.
    const regressed=receipt.state==='prepared'&&record.phase==='observed'&&!!record.receipt;
    await this.save({...record,receipt:regressed?record.receipt:copy(receipt),phase:nextOperationPhase(record.phase,receipt.state,!!record.review)});
  }
  async refresh() { return this.exclusive(async()=>{if(!this.record)throw new Error('No saved operation');
    const prior=this.record.receipt,receipt=await this.deps.client.gmailOperation(this.record.grantId,this.record.requestId,this.controller.signal);this.check();
    await this.observe(receipt);
    // A held cleanup proceeds once the provider, asked again, reports the same send as the saved receipt.
    if(this.unconfirmedSource&&prior&&sameSend(prior,receipt))this.unconfirmedSource=false;
    return this.snapshot();}); }
  async clear() { return this.exclusive(async()=>{
    if(!this.record)return;
    if(!['review','preparing'].includes(this.record.phase)&&!['succeeded','rejected'].includes(this.record.receipt?.state||''))throw new Error('Outcome is unresolved. Check the existing receipt; do not repeat this message.');
    await this.save(null);
  }); }
}
