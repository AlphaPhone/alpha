// Alpha words every plain sentence the staged upstream client modules (.eliza/client-features)
// throw at a screen: the reviewed mail context, the Inbox operation journal and its checks, the
// shared attachment review and Files selection, the scan draft store, the calendar API client and
// the subscription entitlement verifier, and the identifiers the problem log and the address book
// carry (crash exit reasons, screen failure kinds, contact phone and email types). Each row pins the upstream sentence, read from the staged source, to the
// Alpha sentence shown instead; an unknown sentence reads as the screen's fallback.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const staged=path=>readFileSync(new URL('../.eliza/client-features/'+path,import.meta.url),'utf8');
const thrown=(text,pattern=/(?:Error|AttachmentRefusedError)\(\s*\n?\s*"([^"]+)"/g)=>[...text.matchAll(pattern)].map(m=>m[1]);

const {MAIL_CONTEXT_REFUSALS,MAIL_CONTEXT_FALLBACK,mailContextErrorText}=await import('../apps/app/src/ui/mailbox/mail-context-messages.ts');
const {reviewMailContext,validateMailContext}=await import('../apps/app/src/runtime/reviewed-mail-context.ts');
test('every reviewed mail-context refusal is thrown in Alpha’s words',async()=>{
 const sentences=thrown(staged('plugins/plugin-inbox/src/mailbox/mail-context.ts'));
 assert.equal(sentences.length,3);
 assert.deepEqual([...MAIL_CONTEXT_REFUSALS.keys()].sort(),[...sentences].sort());
 const PINNED={
  'Select a current message and connected agent':'Open a current email and connect your agent first.',
  'This complete message exceeds the agent context limit. Nothing was sent.':'This email is too long to send to your agent in full. Nothing was sent.',
  'Message or destination changed. Review again; nothing was sent.':'The email or your agent changed. Review it again; nothing was sent.',
 };
 for(const [upstream,alpha] of Object.entries(PINNED))assert.equal(mailContextErrorText(new Error(upstream)),alpha);
 assert.equal(mailContextErrorText(new Error('Something new')),MAIL_CONTEXT_FALLBACK);
 // The runtime wrapper Alpha's screens call throws the Alpha sentence.
 await assert.rejects(reviewMailContext({},{}),{message:PINNED['Select a current message and connected agent']});
 const source={accountId:'a',messageId:'m',revision:'r'},destination={sessionId:'s',agentId:'g'};
 const review=await reviewMailContext(source,destination);
 await assert.rejects(validateMailContext(review,{...source,revision:'changed'},destination),{message:PINNED['Message or destination changed. Review again; nothing was sent.']});
});

const {MAIL_OPERATION_REFUSALS,MailReviewNotice,mailOperationRefusal,mailOperationText}=await import('../apps/app/src/ui/mailbox/mail-operation-messages.ts');
test('every Inbox journal, read-state, retained-draft and attachment check refusal is worded by Alpha',()=>{
 const files=['operation-journal.ts','read-state.ts','retained-draft.ts','attachments.ts'].map(n=>staged('plugins/plugin-inbox/src/mailbox/'+n));
 const fixed=files.flatMap(text=>thrown(text,/(?:new Error|AttachmentRefusedError)\(\s*"([^"]+)"/g));
 for(const sentence of fixed)assert.ok(mailOperationRefusal(sentence),'journal sentence: '+sentence);
 // Template sentences: every field the journal compares, and the attachment limits.
 const journal=files[0];
 const fields=[...journal.slice(journal.indexOf('for (const field of ['),journal.indexOf('Server changed the requested')).matchAll(/"(\w+)"/g)].map(m=>m[1]);
 assert.ok(fields.length>=9,'fields: '+fields);
 for(const field of fields)assert.match(mailOperationRefusal(`Server changed the requested ${field}`)??'',/^Gmail changed the .+ you reviewed\. Nothing was sent\.$/,field);
 assert.equal(mailOperationRefusal('Attachments exceed 5 MiB in total.'),'Attachments are over 5 MiB in total.');
 assert.equal(mailOperationRefusal('Attach at most 10 files.'),'Attach at most 10 files.');
 const PINNED=[
  ['Review the saved operation before starting another.','Review the saved email action before starting another.'],
  ['Server changed the reviewed recipients','Gmail changed the recipients you reviewed. Nothing was sent.'],
  ['This server cannot review more than one attachment','This account can review only one attachment per email. Nothing was sent.'],
  ['Attachments exceed the reviewed total limit','The attachments are larger than the reviewed total. Nothing was sent.'],
  ['No attempted operation to discard','There’s no unsent review to discard.'],
 ];
 for(const [upstream,alpha] of PINNED)assert.equal(mailOperationText(new Error(upstream),'F'),alpha);
 for(const key of MAIL_OPERATION_REFUSALS.keys())assert.ok(files.some(text=>text.includes(JSON.stringify(key)))||/review was|review is for/.test(key),'still upstream: '+key);
 assert.equal(mailOperationText(new Error('Some new journal text'),'Mail operation unavailable'),'Mail operation unavailable');
 // Alpha's own review notices keep their guidance; every one the controller throws is a notice.
 const conflict='Gmail draft changed outside this app. The saved content will not overwrite it. Open Gmail to inspect the conflict.';
 assert.equal(mailOperationText(new MailReviewNotice(conflict),'Mail operation unavailable'),conflict);
 const controller=readFileSync(new URL('../apps/app/src/ui/mailbox/review-controller.ts',import.meta.url),'utf8');
 assert.doesNotMatch(controller,/throw new Error\(/,'review-controller throws its own sentences as MailReviewNotice');
 assert.match(controller,/throw new MailReviewNotice\(\s*"Gmail draft changed outside this app\./);
});

const {classifyGmailFailure}=await import('../apps/app/src/ui/mailbox/failures.ts');
test('a Gmail request Cloud refuses is worded by Alpha, never by Cloud’s reason text',()=>{
 for(const status of [400,413]){
  const failure=Object.assign(new Error(`Cloud http (${status})`),{name:'CloudProtocolError',code:'http',status,data:{error:'Some upstream server sentence'}});
  assert.deepEqual(classifyGmailFailure(failure,'operation',true),{kind:'rejected',message:'Gmail refused this change. Check the review and try again.'});
  assert.deepEqual(classifyGmailFailure(failure,'read',true),{kind:'rejected',message:'Gmail refused this request.'});
 }
});

const {CLOUD_INBOX_REFUSALS,cloudInboxRefusal}=await import('../apps/app/src/ui/mailbox/failures.ts');
test('every refusal Cloud’s Inbox routes send with HTTP 400 or 413 keeps its reason in Alpha’s words',()=>{
 const cloud=[
  'vendor/eliza/packages/cloud/api/v1/eliza/google/gmail/inbox-v1/route.ts',
  ...['inbox-managed.ts','inbox-operation-routes.ts','inbox-receipts.ts','inbox-provider.ts']
   .map(n=>'vendor/eliza/packages/cloud/shared/src/lib/services/agent-google-connector/'+n),
 ].map(path=>readFileSync(new URL('../'+path,import.meta.url),'utf8'));
 const constructed=cloud.reduce((n,text)=>n+(text.match(/new\s+InboxContractError\(/g)??[]).length,0);
 const refusals=cloud.flatMap(text=>[...text.matchAll(/new\s+InboxContractError\(\s*(\d+)\s*,\s*([`"])((?:(?!\2).)+)\2\s*(?:,\s*"(\w+)")?\s*,?\s*\)/gs)]
  .map(m=>({status:Number(m[1]),text:m[3].replace('${outgoingAttachmentCount}','10'),code:m[4]})));
 // Every refusal is read, so a new or reworded one cannot slip past as the generic sentence.
 assert.equal(refusals.length,constructed);
 const worded=new Set();
 for(const {status,text,code} of refusals){
  if(status!==400&&status!==413)continue;
  const failure=Object.assign(new Error(`Cloud http (${status})`),{name:'CloudProtocolError',code:'http',status,data:{error:text,...(code?{code}:{})}});
  const alpha=cloudInboxRefusal({error:text});
  assert.ok(alpha,'Cloud refusal has an Alpha sentence: '+text);
  assert.notEqual(alpha,text,text);
  for(const context of ['read','operation'])assert.deepEqual(classifyGmailFailure(failure,context,true),{kind:'rejected',message:alpha},text);
  worded.add(text);
 }
 assert.ok(worded.size>=40,'refusals read: '+worded.size);
 // Every key is still a sentence Cloud sends.
 for(const key of CLOUD_INBOX_REFUSALS.keys())assert.ok(worded.has(key),'still sent by Cloud: '+key);
 const PINNED=[
  ['At most 50 recipients are supported','Send to at most 50 recipients in all.'],
  ['At least one recipient is required to send','Add at least one recipient before sending.'],
  ['Use an unambiguous email address without a display name','Enter each recipient as a plain email address, without a name.'],
  ['Attachment names must be unique','Two attachments have the same name. Rename one to attach both.'],
  ['Attachments exceed 5 MiB in total','Attachments are over 5 MiB in total.'],
  ['Attachment exceeds 5 MiB','An attachment is larger than 5 MiB.'],
  ['At most 10 attachments are supported','Attach at most 10 files.'],
  ['Thread exceeds the explicit 2000-message support limit','This conversation has more than 2,000 messages. Open it in Gmail.'],
 ];
 for(const [text,alpha] of PINNED)assert.equal(cloudInboxRefusal({error:text}),alpha,text);
 assert.equal(cloudInboxRefusal({error:'Some upstream server sentence'}),undefined);
 assert.equal(cloudInboxRefusal({error:'constructor'}),undefined);
 assert.equal(cloudInboxRefusal(null),undefined);
});

const {attachmentRefusalText,rethrowAttachmentRefusal}=await import('../apps/app/src/ui/mailbox/drafts-controller.ts');
test('shared attachment review rejections carry the composer-safe refusal',async()=>{
 const sentences=thrown(staged('plugins/plugin-files/src/browser/attachment.ts'));
 assert.equal(sentences.length,3);
 for(const sentence of sentences){
  const reason=Object.assign(new Error(sentence),{name:'AttachmentRefusedError'});
  const text=attachmentRefusalText(reason);
  assert.notEqual(text,sentence);assert.ok(text.length>10,sentence);
  await assert.rejects(Promise.reject(reason).catch(rethrowAttachmentRefusal),{message:text});
 }
 // Use in email and the note source review reach the shared review (and Use in email its selection
 // read) only through that refusal, so no staged sentence reaches either dialog.
 for(const file of ['apps/app/src/prototype/file-email-review.ts','apps/app/src/prototype/note-source-adapter.ts']){
  const text=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  const reviews=text.match(/reviewMailAttachment\([^)]*\)(\.catch\(rethrowAttachmentRefusal\))?/g)||[];
  assert.ok(reviews.length>0,file);
  for(const call of reviews)assert.match(call,/\.catch\(rethrowAttachmentRefusal\)$/,file);
 }
 const review=readFileSync(new URL('../apps/app/src/prototype/file-email-review.ts',import.meta.url),'utf8');
 assert.equal((review.match(/options\.read\(\)/g)||[]).length,1);
 assert.match(review,/options\.read\(\)\.catch\(rethrowAttachmentRefusal\)/);
});

const {SCAN_DRAFT_REFUSALS,scanDraftErrorText}=await import('../apps/app/src/ui/documents/scan-pdf-messages.ts');
test('every scan draft store refusal is worded by Alpha',()=>{
 const text=staged('plugins/plugin-files/src/documents/scan-draft.ts');
 const sentences=[...text.matchAll(/Error\(\s*"([^"]+)",?\s*\)/g)].map(m=>m[1]);
 assert.ok(sentences.length>=9,'scan draft sentences: '+sentences.length);
 for(const sentence of sentences){assert.ok(SCAN_DRAFT_REFUSALS.has(sentence),sentence);assert.equal(scanDraftErrorText(new Error(sentence),'F'),SCAN_DRAFT_REFUSALS.get(sentence));}
 assert.equal(scanDraftErrorText(new Error('Close another scan tab and try again.'),'F'),'Close the scan open in another tab, then try again.');
 assert.equal(scanDraftErrorText(new DOMException('QuotaExceededError: storage full','QuotaExceededError'),'Draft not saved'),'Draft not saved');
 assert.equal(scanDraftErrorText(new Error('A document holds up to 20 pages.'),'F'),'A document holds up to 20 pages.');
});

const {CALENDAR_API_REFUSALS}=await import('../apps/app/src/ui/calendar/calendar-api-messages.ts');
test('every calendar API client refusal is worded by Alpha',()=>{
 const text=staged('plugins/plugin-calendar/src/api/calendar-api.ts');
 const sentences=[...text.matchAll(/throw new Error\(\s*"([^"]+)"/g)].map(m=>m[1]);
 assert.equal(sentences.length,6);
 assert.deepEqual([...CALENDAR_API_REFUSALS.keys()].sort(),[...sentences].sort());
 assert.equal(CALENDAR_API_REFUSALS.get('Calendar event deletion requires an explicit cancellationMode.'),'Choose how to cancel this event before deleting it. Nothing was deleted.');
 const adapter=readFileSync(new URL('../apps/app/src/prototype/agent-calendar-adapter.ts',import.meta.url),'utf8');
 assert.match(adapter,/calendarErrorText\(error:unknown,fallback="Couldn’t update"\)/);
 assert.match(adapter,/refusalText\([^;]*CALENDAR_API_REFUSALS,fallback\)/);
});

const {ENTITLEMENT_ERROR_TEXT,entitlementErrorText}=await import('../apps/app/src/ui/cloud/subscription-presentation.ts');
test('every entitlement verifier code has Alpha’s status and its own text is never shown',()=>{
 const text=staged('packages/cloud/sdk/src/subscription-entitlement.ts');
 const union=text.slice(text.indexOf('export type EntitlementErrorCode'),text.indexOf('export class EntitlementError'));
 const codes=[...union.matchAll(/"([a-z-]+)"/g)].map(m=>m[1]);
 assert.ok(codes.length>=9);
 assert.deepEqual(Object.keys(ENTITLEMENT_ERROR_TEXT).sort(),[...codes].sort());
 for(const code of codes)assert.ok(!entitlementErrorText(code).startsWith('Subscription entitlement'),code);
 assert.equal(entitlementErrorText('account-mismatch'),'Account mismatch');
 assert.equal(entitlementErrorText('new-code'),'Plan couldn’t be checked');
 const binding=staged('packages/auth/src/auth/cloud-resident-binding.ts');
 assert.ok(binding.includes('"Cloud account changed. Sign in again."'));
 const ui=readFileSync(new URL('../apps/app/src/runtime/connection-ui.tsx',import.meta.url),'utf8');
 assert.match(ui,/if \(error\.code === 'account-changed'\) return ACCOUNT_CHANGED;/);
 assert.match(ui,/if \(error instanceof EntitlementError\) return entitlementErrorText\(error\.code\);/);
});

const {AttachmentNotice}=await import('../apps/app/src/ui/mailbox/drafts-controller.ts');
test('selected-file read failures carry the composer-safe refusal',async()=>{
 // BrowserFiles.selected()/attachment(), reached through BrowserMailAttachments.readSelected.
 const files=staged('plugins/plugin-files/src/browser/files.ts');
 const attachment=files.slice(files.indexOf('async attachment('),files.indexOf('async forgetSelected('));
 const selected=files.slice(files.indexOf('private async selected('),files.indexOf('async readSelected('));
 const sentences=[...new Set(thrown(selected+attachment,/Error\(\s*\n?\s*(?:input\.purpose === "chat"\s*\?\s*"[^"]+"\s*:\s*)?"([^"]+)"/g))].filter(s=>s!=='Unknown attachment purpose.');
 const PINNED={
  'Select this file again.':'The selected file is no longer available. Select it again.',
  'Choose a file up to 5 MiB.':'This file is larger than 5 MiB. Choose a file up to 5 MiB.',
 };
 assert.deepEqual(sentences.sort(),Object.keys(PINNED).sort());
 for(const [upstream,alpha] of Object.entries(PINNED))
  await assert.rejects(Promise.reject(new Error(upstream)).catch(rethrowAttachmentRefusal),{message:alpha});
 // The review readSelected runs (plugin-files reviewMailAttachment) reaches the dialog the same way.
 for(const sentence of thrown(staged('plugins/plugin-files/src/browser/attachment.ts')))assert.notEqual(attachmentRefusalText(new Error(sentence)),sentence);
 await assert.rejects(Promise.reject(new Error('Something new from Files')).catch(rethrowAttachmentRefusal),{message:'Attachment unavailable'});
 // Alpha's own selection check reads as written.
 const message='Selected file changed. Select it again.';
 await assert.rejects(Promise.reject(new AttachmentNotice(message)).catch(rethrowAttachmentRefusal),{message});
 const adapter=readFileSync(new URL('../apps/app/src/prototype/selection-adapter.ts',import.meta.url),'utf8');
 assert.match(adapter,/throw new AttachmentNotice\('Selected file changed\. Select it again\.'\)/);
});

const {EXIT_REASON_TITLES,EXIT_FALLBACK,SCREEN_FAILURE_TITLES,SCREEN_FAILURE_FALLBACK,describeNativeCrashEntry}=await import('../apps/app/src/ui/settings/crash-entry.ts');
const {CRASH_EXIT_REASONS,RENDERER_FAILURE_KINDS}=await import('../.eliza/client-features/plugins/plugin-native-system/src/crash-log.ts');
test('every problem-log exit reason and screen failure kind has its own Alpha title, never the identifier',()=>{
 // The identifiers Android's exit reasons become in the shared CrashLog.java.
 const java=readFileSync(new URL('../vendor/eliza/plugins/plugin-native-system/android/src/main/java/ai/eliza/plugins/system/crash/CrashLog.java',import.meta.url),'utf8');
 const native=[...java.matchAll(/case ApplicationExitInfo\.REASON_\w+: return (?:status == 0 \? null : )?"([^"]+)";/g)].map(m=>m[1]);
 assert.deepEqual([...native].sort(),[...CRASH_EXIT_REASONS].sort(),'CrashLog.java and CRASH_EXIT_REASONS');
 const PINNED_EXIT={
  crash:'Alpha stopped after a crash','native-crash':'Alpha stopped after a crash in native code',anr:'Alpha stopped because it wasn’t responding',
  'low-memory':'Android stopped Alpha to free up memory',signaled:'Android stopped Alpha with a system signal',
  'initialization-failure':'Alpha stopped because it couldn’t start','excessive-resource-usage':'Android stopped Alpha for using too many resources',
  'dependency-died':'Alpha stopped because a part it depends on stopped',freezer:'Android stopped Alpha while it was frozen in the background',
  other:'Android stopped Alpha for another reason',unknown:'Alpha stopped for an unknown reason','exit-self':'Alpha closed itself after an error',
 };
 assert.deepEqual(Object.keys(EXIT_REASON_TITLES).sort(),[...CRASH_EXIT_REASONS].sort());
 for(const reason of CRASH_EXIT_REASONS){
  const {title}=describeNativeCrashEntry({source:'exit',reason});
  assert.equal(title,PINNED_EXIT[reason],reason);assert.ok(!title.includes(':')&&!(reason.includes('-')&&title.includes(reason)),reason);
 }
 assert.equal(new Set(Object.values(EXIT_REASON_TITLES)).size,CRASH_EXIT_REASONS.length,'each reason reads differently');
 assert.equal(describeNativeCrashEntry({source:'exit',reason:'something-new'}).title,EXIT_FALLBACK);
 assert.equal(describeNativeCrashEntry({source:'exit',reason:'toString'}).title,EXIT_FALLBACK);
 const PINNED_SCREEN={render:'A screen couldn’t be shown',startup:'Alpha’s screens couldn’t start',uncaught:'A screen ran into an error'};
 assert.deepEqual(Object.keys(SCREEN_FAILURE_TITLES).sort(),[...RENDERER_FAILURE_KINDS].sort());
 for(const kind of RENDERER_FAILURE_KINDS)assert.equal(describeNativeCrashEntry({source:'renderer',kind,errorClass:'TypeError'}).title,PINNED_SCREEN[kind],kind);
 assert.equal(describeNativeCrashEntry({source:'renderer',kind:'other'}).title,SCREEN_FAILURE_FALLBACK);
});

const telephonyMessages=await import('../apps/app/src/ui/telephony/telephony-messages.ts');
const {CONTACT_PHONE_TYPES,CONTACT_EMAIL_TYPES}=await import('../.eliza/client-features/packages/contracts/src/native-address-book.ts');
test('every contact phone and email type has Alpha’s label, never the address book identifier',()=>{
 const {CONTACT_PHONE_TYPE_LABELS,CONTACT_EMAIL_TYPE_LABELS,contactPhoneLabel,contactPhoneFieldLabel,contactPhoneRemoveLabel,contactEmailLabel,contactEmailFieldLabel,contactEmailRemoveLabel}=telephonyMessages;
 const PHONE={home:['Home','Remove home number'],mobile:['Mobile','Remove mobile number'],work:['Work','Remove work number'],
  fax_work:['Work fax','Remove work fax number'],fax_home:['Home fax','Remove home fax number'],pager:['Pager','Remove pager number'],
  other:['Other','Remove other number'],callback:['Callback','Remove callback number'],car:['Car','Remove car number'],
  company_main:['Company main line','Remove company main line number'],isdn:['ISDN','Remove ISDN number'],main:['Main','Remove main number'],
  other_fax:['Other fax','Remove other fax number'],radio:['Radio','Remove radio number'],telex:['Telex','Remove telex number'],
  tty_tdd:['TTY/TDD','Remove TTY/TDD number'],work_mobile:['Work mobile','Remove work mobile number'],work_pager:['Work pager','Remove work pager number'],
  assistant:['Assistant','Remove assistant number'],mms:['MMS','Remove MMS number']};
 assert.deepEqual(Object.keys(CONTACT_PHONE_TYPE_LABELS).sort(),[...CONTACT_PHONE_TYPES].sort());
 for(const type of CONTACT_PHONE_TYPES){
  assert.deepEqual([contactPhoneLabel(type),contactPhoneRemoveLabel(type)],PHONE[type],type);
  assert.ok(!contactPhoneLabel(type).includes('_'),type);
  assert.equal(contactPhoneFieldLabel(type),`${PHONE[type][0]} phone`,type);
 }
 const EMAIL={home:['Home','Home email','Remove home email'],work:['Work','Work email','Remove work email'],other:['Other','Other email','Remove other email'],mobile:['Mobile','Mobile email','Remove mobile email']};
 assert.deepEqual(Object.keys(CONTACT_EMAIL_TYPE_LABELS).sort(),[...CONTACT_EMAIL_TYPES].sort());
 for(const type of CONTACT_EMAIL_TYPES)assert.deepEqual([contactEmailLabel(type),contactEmailFieldLabel(type),contactEmailRemoveLabel(type)],EMAIL[type],type);
 // A type the owner named shows the owner's label; an unknown identifier reads as Alpha's generic label.
 assert.deepEqual([contactPhoneLabel('custom:Boat'),contactPhoneRemoveLabel('custom:Boat')],['Boat','Remove Boat number']);
 assert.deepEqual([contactEmailLabel('custom:School'),contactEmailFieldLabel('custom:School'),contactEmailRemoveLabel('custom:School')],['School','School email','Remove School email']);
 assert.deepEqual([contactPhoneLabel('satellite_phone'),contactPhoneRemoveLabel('satellite_phone')],['Phone','Remove phone number']);
 assert.deepEqual([contactPhoneFieldLabel('custom:Boat'),contactPhoneFieldLabel('satellite_phone')],['Boat phone','Phone']);
 assert.deepEqual([contactEmailLabel('toString'),contactEmailFieldLabel('toString'),contactEmailRemoveLabel('toString')],['Email','Email','Remove email']);
 const adapter=readFileSync(new URL('../apps/app/src/prototype/contacts-adapter.ts',import.meta.url),'utf8');
 assert.doesNotMatch(adapter,/TYPE_LABEL|replace\(\/_\/g/,'Contacts never derives a label from the identifier');
});
