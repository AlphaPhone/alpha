// Alpha words the text that reached Calendar approvals, the chat attachment picker, Photos
// reviews, Automations, the Calendar availability chooser, call choices, Inbox account labels,
// the Calendar sync settings and note read-aloud from shared upstream code. Each test reads the
// upstream sentences or identifiers from their source (the agent's plugins in vendor/eliza, the
// staged client modules in .eliza/client-features, the shared native plugins) and pins the
// Alpha sentence shown instead; an unknown one reads as the screen's own fallback.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CapacitorException} from '@capacitor/core';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const vendor=path=>source('vendor/eliza/'+path);
const staged=path=>source('.eliza/client-features/'+path);
const rejection=message=>new CapacitorException(message);

// --- Calendar approvals: the agent's outcome and queued reason sentences --------------------------
const {CALENDAR_APPROVAL_INVALIDATED,CALENDAR_APPROVAL_BLOCKED,CALENDAR_APPROVAL_FALLBACK,calendarApprovalOutcomeText,calendarApprovalReasonTitle,calendarApprovalRequestText}=await import('../apps/app/src/ui/calendar/calendar-approval-messages.ts');
const {parseCalendarApprovalResolution}=await import('../apps/app/src/runtime/calendar-approval.ts');
const RESOLVE=vendor('plugins/plugin-calendar/src/mutations/resolve.ts');
const id='11111111-2222-4333-8444-555555555555';

test('every Calendar approval outcome is keyed on its kind and code, never shown as the agent wrote it',()=>{
 const reasons=Object.fromEntries([...RESOLVE.slice(RESOLVE.indexOf('const OWNER_REASONS'),RESOLVE.indexOf('};',RESOLVE.indexOf('const OWNER_REASONS'))).matchAll(/(CALENDAR_[A-Z_]+):\s*"([^"]+)"/g)].map(m=>[m[1],m[2]]));
 assert.ok(Object.keys(reasons).length>=6,Object.keys(reasons).join());
 assert.deepEqual([...CALENDAR_APPROVAL_INVALIDATED.keys()].sort(),Object.keys(reasons).sort());
 const PINNED={
  CALENDAR_MANAGED_TARGET_CHANGED:'Nothing changed in Calendar: the event changed after you reviewed it.',
  CALENDAR_SYNC_PRECONDITION:'Nothing changed in Calendar: the event changed after you reviewed it.',
  CALENDAR_MANAGED_ACCOUNT_CHANGED:'Nothing changed in Calendar: the Calendar account changed.',
  CALENDAR_MANAGED_EDITOR_REQUIRED:'Nothing changed in Calendar. Review this event in Calendar instead.',
  CALENDAR_SYNC_REVIEW_REQUIRED:'Nothing changed in Calendar. Review this event in Calendar instead.',
  CALENDAR_MANAGED_WRITE_UNAVAILABLE:'Nothing changed in Calendar: Alpha couldn’t confirm it may edit this calendar.',
 };
 for(const [code,reason] of Object.entries(reasons)){
  const upstream=`Calendar change was not made. ${reason}`;
  const shown=parseCalendarApprovalResolution({requestId:id,decision:'approve',kind:'invalidated',text:upstream,failure:{code,retryable:false,acceptance:'not_accepted'}},id,'approve').text;
  assert.equal(shown,PINNED[code],code);assert.notEqual(shown,upstream);
 }
 // The blocked codes and every fixed upstream sentence.
 const blocked=[...RESOLVE.matchAll(/code: "(CALENDAR_REVIEW_[A-Z_]+)"/g)].map(m=>m[1]);
 assert.deepEqual([...CALENDAR_APPROVAL_BLOCKED.keys()].sort(),[...new Set(blocked)].sort());
 const fixed=[...RESOLVE.slice(RESOLVE.indexOf('export function calendarApprovalOutcome'),RESOLVE.indexOf('export async function resolveCalendarApproval')).matchAll(/text: "([^"]+)"/g)].map(m=>m[1]);
 assert.equal(fixed.length,4,fixed.join(' | '));
 const replies=[
  [{kind:'rejected',decision:'reject'},'Declined. Nothing changed in Calendar.'],
  [{kind:'retryable',failure:{code:'ANY',retryable:true,acceptance:'not_accepted'}},'Nothing changed in Calendar. You can try again.'],
  [{kind:'blocked',failure:{code:'CALENDAR_REVIEW_IN_PROGRESS',retryable:false,acceptance:'unknown'}},'This Calendar change is still being made. Check Calendar again shortly.'],
  [{kind:'blocked',failure:{code:'CALENDAR_REVIEW_UNCONFIRMED',retryable:false,acceptance:'unknown'}},'Calendar change is not confirmed. Check its saved status before trying again.'],
 ];
 for(const text of fixed)for(const [reply,alpha] of replies){
  const shown=parseCalendarApprovalResolution({requestId:id,decision:'approve',text,...reply},id,reply.decision??'approve').text;
  assert.equal(shown,alpha);assert.ok(!fixed.includes(shown),shown);
 }
 // An unknown code or a newer kind sentence reads as Alpha's sentence for the kind.
 assert.equal(calendarApprovalOutcomeText('invalidated',{code:'CALENDAR_NEW_REASON'},'Calendar change was not made. A new reason.'),CALENDAR_APPROVAL_FALLBACK.invalidated);
 assert.equal(calendarApprovalOutcomeText('blocked',{code:'CALENDAR_NEW'},'Something new.'),CALENDAR_APPROVAL_FALLBACK.blocked);
});

test('a completed Calendar change reads its operation, title and duplicate flag as data in Alpha’s sentence',()=>{
 assert.match(RESOLVE,/\$\{result\.duplicateSuppressed \? "Already completed" : "Completed"\} Calendar \$\{result\.receipt\.operation\.replaceAll\("_", " "\)\}: \$\{result\.receipt\.eventSnapshot\?\.title \?\? "the reviewed event"\}\./);
 const done=(text,payload)=>parseCalendarApprovalResolution({requestId:id,decision:'approve',kind:'succeeded',text},id,'approve',payload).text;
 assert.equal(done('Completed Calendar schedule event: Lunch.'),'Added “Lunch” to Calendar.');
 assert.equal(done('Already completed Calendar schedule event: Lunch.'),'Already added “Lunch” to Calendar.');
 assert.equal(done('Completed Calendar modify event: the reviewed event.'),'Changed this event in Calendar.');
 assert.equal(done('Completed Calendar cancel event: Standup.',{cancellationMode:'organizer_cancel'}),'Cancelled “Standup”.');
 assert.equal(done('Completed Calendar cancel event: Standup.',{cancellationMode:'decline_invitation'}),'Declined “Standup”.');
 assert.equal(done('Already completed Calendar cancel event: Standup.',{cancellationMode:'remove_private_copy'}),'Already removed “Standup” from your calendar.');
 assert.equal(done('Completed Calendar cancel event: Standup.'),'Cancelled or declined “Standup”.');
 for(const text of ['Some newer completed sentence.',undefined])assert.equal(done(text),CALENDAR_APPROVAL_FALLBACK.succeeded);
});

test('a queued Calendar change is described in Alpha’s words; only the event title is read from its reason',()=>{
 const approval=vendor('plugins/plugin-calendar/src/actions/mutation-approval.ts');
 // The reviewed templates the title is read from.
 for(const fragment of ['`Create "${approvalSafeLabel(payload.title)}" at ${','`Create "${approvalSafeLabel(payload.title)}" as an all-day event from ${','`Modify "${approvalSafeLabel(args.targetEvent.title)}" from ${','`Modify every occurrence of the recurring series "${approvalSafeLabel(args.targetEvent.title)}" (not only ${','`Modify "${approvalSafeLabel(args.targetEvent.title)}" on ${','`${verb} "${approvalSafeLabel(args.targetEvent.title)}" from ${','`${verb} every occurrence of the recurring series "${approvalSafeLabel(args.targetEvent.title)}" (not only ${','`${verb} "${approvalSafeLabel(args.targetEvent.title)}" on ${','forward by splitting the recurring series. Later per-occurrence exceptions will reset','forward by truncating the recurring series; every later occurrence and exception will be removed','); every occurrence and exception will be removed','"Decline the invitation for"'])
  assert.ok(approval.includes(fragment),fragment);
 const at='2026-11-10T18:00:00.000Z';
 const CASES=[
  ['schedule_event',{title:'Lunch',notifyAttendees:true},`Create "Lunch" at ${at} on calendar "primary" with a 15-minute travel buffer, and notify attendees.`,'Lunch','Add “Lunch” to Calendar.'],
  ['schedule_event',{title:'Trip'},`Create "Trip" as an all-day event from 2026-11-10 through 2026-11-12 (exclusive) on calendar "primary", without sending attendee notifications.`,'Trip','Add “Trip” to Calendar.'],
  ['modify_event',{recurrenceScope:'this_and_following',notifyAttendees:true},`Modify "Standup" from ${at} forward by splitting the recurring series. Later per-occurrence exceptions will reset, and attendees may receive both split update notifications.`,'Standup','Change “Standup” from this occurrence on. The repeating event is split, and changes made to single later occurrences are reset. Guests may get two update emails.'],
  ['modify_event',{recurrenceScope:'series'},`Modify every occurrence of the recurring series "Standup" (not only ${at}) without sending attendee notifications.`,'Standup','Change every occurrence of “Standup”, not only the one shown.'],
  ['modify_event',{recurrenceScope:'instance'},`Modify "Standup" on ${at} and notify attendees.`,'Standup','Change only this occurrence of “Standup”.'],
  ['modify_event',{},`Modify "Lunch" on ${at} without sending attendee notifications.`,'Lunch','Change “Lunch”.'],
  ['cancel_event',{cancellationMode:'organizer_cancel',recurrenceScope:'this_and_following'},`Cancel "Standup" from ${at} forward by truncating the recurring series; every later occurrence and exception will be removed, and attendees will be notified.`,'Standup','Cancel “Standup” from this occurrence on. Every later occurrence and its changes are removed.'],
  ['cancel_event',{cancellationMode:'decline_invitation',recurrenceScope:'series'},`Decline the invitation for every occurrence of the recurring series "Standup" (not only ${at}); every occurrence and exception will be removed.`,'Standup','Decline every occurrence of “Standup”. Every occurrence and its changes are removed.'],
  ['cancel_event',{cancellationMode:'remove_private_copy'},`Decline the invitation for "Party" on ${at} without sending attendee notifications.`,'Party','Remove “Party” from your calendar.'],
  ['cancel_event',{cancellationMode:'organizer_cancel'},`Cancel "Say "hi" at noon" on ${at} without sending attendee notifications.`,'Say "hi" at noon','Cancel “Say "hi" at noon”.'],
 ];
 for(const [action,payload,reason,title,alpha] of CASES){
  assert.equal(calendarApprovalReasonTitle(reason),title,reason);
  const shown=calendarApprovalRequestText(action,payload,reason);
  assert.equal(shown,alpha,reason);
  assert.doesNotMatch(shown,/attendee|recurring series|exclusive|\d{4}-\d{2}-\d{2}T/,reason);
 }
 // A reason that is not a reviewed template: Alpha's line from the payload and the matched event.
 assert.equal(calendarApprovalReasonTitle('Remove the disposable event.'),'');
 assert.equal(calendarApprovalRequestText('cancel_event',{cancellationMode:'organizer_cancel'},'Remove the disposable event.'),'Cancel this event.');
 assert.equal(calendarApprovalRequestText('modify_event',{},'A newer reason.','Matched title'),'Change “Matched title”.');
 // The card shows Alpha's line, never the reason.
 const fields=source('apps/app/src/prototype/calendar-approval-fields.ts');
 assert.match(fields,/reason:calendarApprovalRequestText\(row\.action,p,row\.reason,/);
 assert.doesNotMatch(fields,/reason:reasonText|row\.reason\.replace/);
});

// --- Chat attachment picker and Photos reviews: AlphaPhotosPlugin / PermittedPhotosPlugin / AlphaMediaReview ---
// Alpha's Photos bridge and review dialog are forked from the shared PhotosPlugin and
// PermittedMediaReview; PermittedPhotosPlugin stays shared.
const ALPHA='android/app/src/main/java/ai/alphacompute/alphaphone/';
const {PHOTOS_MESSAGES,photosErrorText}=await import('../apps/app/src/ui/photos/photos-messages.ts');
const MEDIA='plugins/plugin-native-media/android/src/main/java/ai/eliza/plugins/media/';
test('the attachment picker words a Photos bridge rejection through Alpha’s Photos table',()=>{
 const picker=source('apps/app/src/prototype/attachment-picker.ts');
 assert.match(picker,/this\.error=this\.tab==='photos'\?photosErrorText\(error,'Photos could not load\. Try again\.'\)/);
 assert.match(picker,/this\.error=photosErrorText\(error,'The selection could not be read\. Try again\.'\)/);
 assert.doesNotMatch(picker,/this\.error=error instanceof Error\?error\.message:'The selection could not be read/);
 const permitted=vendor(MEDIA+'PermittedPhotosPlugin.java'),photos=source(ALPHA+'AlphaPhotosPlugin.java');
 const PINNED=[
  ['Unlock and reopen Photos before reading the library.','Unlock the phone, then reopen Photos.',permitted],
  ['Photo library changed or is unavailable. Refresh Photos and check its access.','Photos changed or isn’t available. Refresh Photos and check its access.',permitted],
  ['This saved media is no longer available','This photo or video is no longer available.',photos],
  ['Saved media could not be loaded','Saved photos and videos couldn’t be loaded.',photos],
  ['Photo library closed','Photos closed. Open it again to continue.',photos],
 ];
 for(const [upstream,alpha,java] of PINNED){
  assert.ok(java.includes(JSON.stringify(upstream)),'still upstream: '+upstream);
  assert.equal(photosErrorText(rejection(upstream),'F'),alpha);
 }
 assert.equal(photosErrorText(rejection('A newer native sentence'),'Photos could not load. Try again.'),'Photos could not load. Try again.');
 assert.equal(photosErrorText(new Error('This photo changed. Select it again.'),'F'),'This photo changed. Select it again.');
});

test('every AlphaMediaReview refusal reaches Photos in Alpha’s words',()=>{
 const java=source(ALPHA+'AlphaMediaReview.java');
 const limits=/REVIEWED = (\d+);[\s\S]*REVIEWED_BATCH = (\d+);/.exec(vendor(MEDIA+'PhotoLibraryAccess.java')).slice(1);
 const sentences=new Set([
  ...[...java.matchAll(/reject\(\s*"([^"]+)"/g)].map(m=>m[1]).filter(s=>!s.startsWith('Android could not show')&&s!=='Select 1–'),
  ...[...java.matchAll(/cancel\(\s*request,\s*"([^"]+)"/g)].map(m=>m[1]),
  ...limits.map(max=>`Select 1–${max} distinct permitted items.`),
 ]);
 assert.match(java,/call\.reject\("Select 1–" \+ max \+ " distinct permitted items\."\)/);
 assert.ok(sentences.size>=14,[...sentences].join(' | '));
 for(const sentence of sentences){assert.ok(PHOTOS_MESSAGES.has(sentence),'review sentence: '+sentence);assert.notEqual(PHOTOS_MESSAGES.get(sentence),sentence);}
 const PINNED=[
  ['Photo change cancelled. No change was dispatched.','Photo change cancelled. Nothing changed.'],
  ['Return to Photos to review this change.','Go back to Photos to review this change. Nothing changed.'],
  ['Photo review expired.','The photo review timed out. Nothing changed.'],
  ['Selected media changed or is unavailable. Refresh Photos.','A selected item changed or isn’t available. Refresh Photos. Nothing changed.'],
  ['Finish the current photo review first.','Finish the open photo review first.'],
 ];
 for(const [upstream,alpha] of PINNED)assert.equal(photosErrorText(rejection(upstream),'F'),alpha);
 // The device library review keeps its code's short line for a sentence Alpha has no words for.
 const adapter=source('apps/app/src/prototype/photo-library-adapter.ts');
 assert.match(adapter,/status = refusalText\(failure, PHOTOS_MESSAGES, code === 'LIBRARY_DECLINED' \? 'Nothing changed\.' : code === 'LIBRARY_STALE' \? 'Item changed' : 'Failed', \{ ownErrors: false \}\);/);
});

// --- Automations: status identifiers and refused requests ------------------------------------------
const {AUTOMATION_STATUS_LABELS,UNKNOWN_STATUS,automationStatusLabel}=await import('../apps/app/src/ui/workflows/automation-status-labels.ts');
test('every automation, scheduled task, routine and reminder status reads as an Alpha word',()=>{
 const union=(text,name)=>{const m=new RegExp(`export type ${name}\\s*=([^;]+);`).exec(text);assert.ok(m,name);return [...m[1].matchAll(/["']([\w-]+)["']/g)].map(m=>m[1]);};
 const automation=union(vendor('plugins/plugin-workflow/src/lib/automations-types.ts'),'AutomationStatus');
 const scheduling=vendor('plugins/plugin-scheduling/src/scheduled-task/types.ts');
 const scheduled=[...union(scheduling,'TerminalState'),...union(scheduling,'ScheduledTaskStatus')];
 const definitions=[.../LIFEOPS_DEFINITION_STATUSES = \[([^\]]+)\]/.exec(vendor('packages/contracts/src/lifeops/scheduling.ts'))[1].matchAll(/"([\w-]+)"/g)].map(m=>m[1]);
 const delivery=[...source('apps/app/src/ui/utils/reminder-presentation.ts').matchAll(/return "([\w-]+)"/g)].map(m=>m[1]);
 const occurrence=/\["snoozed", "completed", "skipped", "expired", "muted"\]/.test(source('apps/app/src/ui/utils/reminder-presentation.ts'))?['snoozed','completed','skipped','expired','muted']:[];
 const device=[.../status: ("pending"[^;]+);/.exec(source('apps/app/src/daily.ts'))[1].matchAll(/"([\w-]+)"/g)].map(m=>m[1]);
 const all=[...automation,...scheduled,...definitions,...delivery,...occurrence,...device];
 assert.ok(automation.length>=5&&scheduled.length>=8&&definitions.length>=4&&device.length>=7&&occurrence.length===5,all.join());
 for(const status of all)assert.ok(AUTOMATION_STATUS_LABELS.has(status),'status: '+status);
 const PINNED=[['scheduled','Scheduled'],['fired','Sent'],['acknowledged','Acknowledged'],['completed','Completed'],['dismissed','Dismissed'],['expired','Expired'],['archived','Archived'],['posted','Shown'],['scheduling-failed','Couldn’t schedule'],['permission-denied','Notifications not allowed'],['blocked','Delivery blocked']];
 for(const [status,alpha] of PINNED)assert.equal(automationStatusLabel({kind:'prompt',status,enabled:true}),alpha);
 assert.equal(automationStatusLabel({kind:'schedule',status:'failed_retryable',enabled:true}),UNKNOWN_STATUS);
 assert.equal(automationStatusLabel({kind:'schedule',status:'snoozed',enabled:true}),'');
 assert.equal(automationStatusLabel({kind:'prompt',status:'',enabled:false}),'Inactive');
 const adapter=source('apps/app/src/prototype/automations-adapter.ts');
 assert.match(adapter,/const rowStatus=automationStatusLabel;/);
 assert.doesNotMatch(adapter,/row\.status\.charAt\(0\)\.toUpperCase\(\)/);
});

const {WorkflowHttpError}=await import('@elizaos/contracts/workflow-client');
const {AUTOMATION_HTTP_REFUSALS,AUTOMATION_REQUEST_FAILED,automationRequestText,WORKFLOW_INTENT_REFUSALS}=await import('../apps/app/src/ui/workflows/workflow-messages.ts');
test('a refused Automations request is worded by its status, never by the shared client’s sentence',()=>{
 const upstream=/super\(\s*"([^"]+)",?\s*\);\s*this\.status = status;/.exec(staged('packages/contracts/src/workflow-client.ts'))[1];
 assert.match(upstream,/^Workflow request unavailable/);
 const adapter=source('apps/app/src/prototype/automations-adapter.ts');
 // Every status the adapter treats as a refusal has its own sentence.
 const rejected=/rejected=\(\[([\d,]+)\]\.includes\(status\)\|\|status===(\d+)/.exec(adapter).slice(1).join(',').split(',').map(Number);
 for(const status of rejected){const text=automationRequestText(new WorkflowHttpError(status,{error:'Agent text'}),'F');assert.equal(text,AUTOMATION_HTTP_REFUSALS.get(status),String(status));assert.notEqual(text,upstream);}
 assert.equal(automationRequestText(new WorkflowHttpError(404,undefined),'F'),'This item is no longer on the agent. Refresh to see the current list.');
 assert.equal(automationRequestText(new WorkflowHttpError(409,undefined),'F'),'This item changed on the agent. Refresh and review it again.');
 assert.equal(automationRequestText(new WorkflowHttpError(502,undefined),'F'),AUTOMATION_REQUEST_FAILED);
 const [journal,alpha]=[...WORKFLOW_INTENT_REFUSALS][0];
 assert.equal(automationRequestText(new Error(journal),'F'),alpha);
 assert.equal(automationRequestText(new Error('Prompt state was not confirmed.'),'F'),'Prompt state was not confirmed.');
 assert.equal(automationRequestText('not an error','Automation request failed.'),'Automation request failed.');
 assert.match(adapter,/message=dispatched&&!rejected&&!known\?'Unknown':automationRequestText\(error,'Automation request failed\.'\);/);
});

// --- Staged fallback labels: calendars, contacts and Gmail accounts --------------------------------
test('a calendar listed without a name or account shows Alpha’s labels in the availability chooser',async()=>{
 const review=staged('plugins/plugin-calendar/src/client/availability-review.ts');
 const [name,account]=[/name: label\(row\.name, "([^"]+)"\)/.exec(review)[1],/account: label\(row\.account, "([^"]+)"\)/.exec(review)[1]];
 assert.deepEqual([name,account],['Unnamed calendar','This phone']);
 const {parseAvailabilitySources}=await import('../apps/app/src/runtime/calendar-availability.ts');
 const {availabilitySourceLabels,UNNAMED_CALENDAR,NO_CALENDAR_ACCOUNT}=await import('../apps/app/src/ui/calendar/availability-review.ts');
 const revision='a'.repeat(64),listed=[{id:'a',name:'  ',account:'',sourceRevision:revision},{id:'b',name:'Work',account:'ada@example.invalid',sourceRevision:revision},{id:'c',name:'Unnamed calendar',sourceRevision:revision}];
 const shown=availabilitySourceLabels(parseAvailabilitySources(listed),listed);
 assert.deepEqual(shown.map(s=>[s.id,s.name,s.account]),[['a',UNNAMED_CALENDAR,NO_CALENDAR_ACCOUNT],['b','Work','ada@example.invalid'],['c','Unnamed calendar',NO_CALENDAR_ACCOUNT]]);
 assert.notEqual(UNNAMED_CALENDAR,name);assert.notEqual(NO_CALENDAR_ACCOUNT,account);
 assert.match(source('apps/app/src/ui/calendar/availability-review.ts'),/const sources = availabilitySourceLabels\(\s*parseAvailabilitySources\(listed\.calendars\),\s*listed\.calendars,\s*\);/);
});

test('a contact without a name is labelled by Alpha in call choices, read from its own row',async()=>{
 assert.match(staged('packages/contracts/src/phone-dial.ts'),/displayName: row\.displayName\.trim\(\) \|\| "Unnamed contact"/);
 const {contactCallOptions}=await import('../apps/app/src/runtime/telephony-executor.ts');
 const {UNNAMED_CONTACT}=await import('../apps/app/src/ui/telephony/telephony-messages.ts');
 const rows=[{id:'1',displayName:'Ada',phoneNumbers:['+15550000001']},{id:'2',displayName:'  ',phoneNumbers:['bad']},{id:'3',displayName:' ',phoneNumbers:['+15550000003','+15550000004']},{id:'4',displayName:' Grace ',phoneNumbers:['+15550000005']}];
 const options=contactCallOptions(rows,number=>/^\+\d+$/.test(number)?number:null);
 assert.deepEqual(options.map(o=>[o.id,o.name,o.number]),[['1','Ada','+15550000001'],['3',UNNAMED_CONTACT,'+15550000003'],['3',UNNAMED_CONTACT,'+15550000004'],['4','Grace','+15550000005']]);
 // Contacts and call choices share Alpha's one label.
 assert.match(source('apps/app/src/prototype/contacts-adapter.ts'),/const name=row\.name\|\|UNNAMED_CONTACT;/);
});

test('a Google connection without an email or name shows Alpha’s account label',async()=>{
 const shared=/this\.optionalString\(identity\.name\) \?\?\s*"([^"]+)"/.exec(staged('plugins/plugin-inbox/src/mailbox/managed-gmail-client.ts'))[1];
 const {SHARED_UNNAMED_GOOGLE_ACCOUNT,UNNAMED_GOOGLE_ACCOUNT,withGmailAccountLabel}=await import('../apps/app/src/ui/mailbox/grants.ts');
 assert.equal(SHARED_UNNAMED_GOOGLE_ACCOUNT,shared);assert.notEqual(UNNAMED_GOOGLE_ACCOUNT,shared);
 assert.equal(withGmailAccountLabel({connectionId:'c',label:shared}).label,UNNAMED_GOOGLE_ACCOUNT);
 assert.equal(withGmailAccountLabel({connectionId:'c',label:'ada@example.invalid'}).label,'ada@example.invalid');
 assert.match(source('apps/app/src/runtime/cloud-protocol.ts'),/return \(await this\.gmail\.gmailAccounts\(signal\)\)\.map\(withGmailAccountLabel\);/);
 const inbox=source('apps/app/src/prototype/inbox-cloud-adapter.ts');
 assert.match(inbox,/accounts=value\.accounts\.map\(withGmailAccountLabel\);/);
 assert.match(inbox,/account:withGmailAccountLabel\(value\.account\)/);
});

// --- Calendar sync settings: a failed pause --------------------------------------------------------
test('a failed Calendar sync pause is worded by Alpha’s sync table, never shown raw',async()=>{
 const host=staged('plugins/plugin-calendar/src/linked-sync/sync-host.ts');
 const {calendarSyncFailureMessage}=await import('../apps/app/src/ui/calendar/sync-host.ts');
 const sentences=[...host.matchAll(/throw Error\(\s*"([^"]+)",?\s*\)/g)].map(m=>m[1]);
 for(const sentence of ['Calendar sync settings changed. Review them again.','Calendar sync settings need recovery. Saved events are retained.'])assert.ok(sentences.includes(sentence),sentence);
 for(const sentence of sentences)assert.notEqual(calendarSyncFailureMessage(new Error(sentence),'FALLBACK'),'FALLBACK',sentence);
 assert.equal(calendarSyncFailureMessage(new Error('Calendar sync settings need recovery. Saved events are retained.'),'F'),'Calendar sync settings need recovery. Saved events are kept.');
 assert.equal(calendarSyncFailureMessage(new Error('A newer storage refusal'),'Couldn’t pause sync. Try again.'),'Couldn’t pause sync. Try again.');
 const settings=source('apps/app/src/runtime/calendar-sync-settings.ts');
 assert.match(settings,/say\(calendarSyncFailureMessage\(error, "Couldn’t pause sync\. Try again\."\)\)/);
 assert.doesNotMatch(settings,/"Couldn’t pause"\)/);
});

// --- Note read-aloud over Cloud: the staged chunk planner ------------------------------------------
test('the Cloud speech chunk planner’s refusals read in Alpha’s words',async()=>{
 const chunks=staged('packages/voice/src/cloud-speech-chunks.ts');
 const {SPEECH_BRIDGE_REFUSALS,speechFailureReason}=await import('../apps/app/src/ui/voice/speech-bridge-messages.ts');
 const thrown=[...chunks.matchAll(/throw new (\w+Error)\("([^"]+)"\)/g)].map(m=>[m[1],m[2]]);
 assert.equal(thrown.length,2);
 const PINNED={'Cloud speech requires text.':'There’s no text to read aloud.','A word is too long for Cloud speech.':'This text has a word too long to read aloud.'};
 for(const [type,sentence] of thrown){
  assert.ok(SPEECH_BRIDGE_REFUSALS.has(sentence),sentence);
  assert.equal(speechFailureReason(new globalThis[type](sentence)),PINNED[sentence]);
 }
});
