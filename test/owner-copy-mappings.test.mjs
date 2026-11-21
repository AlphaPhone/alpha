// Alpha words the upstream text and identifiers that reach a Settings, Automations, Calendar, chat
// receipt or own-key screen: the shared notification mirror's history states, the reminder
// contract's delivery codes, the agent's scheduled-task identifiers, Google's attendee replies,
// the shared provider slot's key refusals and the shared named Calendar read's summaries. Each
// table is pinned here against the upstream source it is keyed on, so a new or reworded upstream
// value fails here instead of reaching the owner raw, and an unknown one reads as the screen's
// own fallback.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CapacitorException} from '@capacitor/core';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const vendor=path=>source('vendor/eliza/'+path);
const literals=(text,pattern)=>[...text.matchAll(pattern)].map(m=>m[1]);
const between=(text,start,end)=>{const at=text.indexOf(start);assert.ok(at>=0,start);const stop=text.indexOf(end,at+start.length);assert.ok(stop>at,end);return text.slice(at,stop);};
const rejection=message=>new CapacitorException(message);

// --- Settings > Notifications > History (NotificationMirror.recordEvent) ------------------------
const settings=await import('../apps/app/src/ui/settings/system-settings.ts');
test('every notification history state the shared mirror records reads as Alpha’s word',()=>{
 const mirror=vendor('plugins/plugin-native-notifications/android/src/main/java/ai/eliza/plugins/notifications/NotificationMirror.java');
 const recorded=literals(mirror,/recordEvent\([^;]*?\? "(\w+)" : "\w+"\)/g).concat(literals(mirror,/recordEvent\([^;]*?\? "\w+" : "(\w+)"\)/g));
 assert.deepEqual(recorded.sort(),['Posted','Removed'],'recorded states');
 const PINNED=[['Posted','Arrived'],['Removed','Cleared']];
 assert.deepEqual([...settings.NOTIFICATION_HISTORY_STATES.keys()].sort(),PINNED.map(([state])=>state).sort());
 for(const [state,alpha] of PINNED)assert.equal(settings.notificationHistoryState(state),alpha,state);
 for(const unknown of ['Updated','',null,undefined,42])assert.equal(settings.notificationHistoryState(unknown),'Notification');
 const adapter=source('apps/app/src/prototype/settings-adapter.ts');
 assert.match(adapter,/\$\{notificationHistoryState\(row\.state\)\} · /);
 assert.doesNotMatch(adapter,/\$\{row\.state\}/);
});

// --- Chat receipt: approved reminder change without its notification (reminder-contract) -------
const reminders=await import('../apps/app/src/ui/reminders/reminder-result-messages.ts');
test('every reminder delivery code the contract accepts reads as Alpha’s receipt sentence',()=>{
 const contract=vendor('plugins/plugin-assistant/src/services/device-actions/reminder-contract.ts');
 const statuses=literals(between(contract,'const statuses = [','];'),/"([\w-]+)"/g);
 assert.deepEqual(statuses.sort(),['cancelled','completed','pending','permission-denied','posted','scheduled','scheduling-failed']);
 const kinds=literals(between(contract,'export function isReminderOperation(','export function validateReminderOperation('),/"(reminder_\w+)"/g);
 assert.deepEqual(kinds.sort(),['reminder_cancel','reminder_complete','reminder_read_selected','reminder_snooze','reminder_update']);
 assert.deepEqual([...reminders.REMINDER_DELIVERY_PROBLEMS.keys()].sort(),['permission-denied','scheduling-failed']);
 const PINNED=[
  ['reminder_create','permission-denied','Reminder saved, but notifications are disabled.'],
  ['reminder_create','scheduling-failed','Reminder saved, but notification scheduling failed.'],
  ['reminder_update','permission-denied','Reminder updated, but notifications are disabled.'],
  ['reminder_update','scheduling-failed','Reminder updated, but notification scheduling failed.'],
  ['reminder_snooze','permission-denied','Reminder snoozed, but notifications are disabled.'],
  ['reminder_snooze','scheduling-failed','Reminder snoozed, but notification scheduling failed.'],
  ['reminder_complete','permission-denied','Reminder completed, but notifications are disabled.'],
  ['reminder_complete','scheduling-failed','Reminder completed, but notification scheduling failed.'],
  ['reminder_read_selected','permission-denied','Reminder read, but notifications are disabled.'],
  ['reminder_other','scheduling-failed','Reminder changed, but notification scheduling failed.'],
 ];
 for(const [kind,status,alpha] of PINNED)assert.equal(reminders.reminderDeliveryProblemText(kind,status),alpha,kind+' '+status);
 assert.equal(reminders.reminderDeliveryProblemText('reminder_snooze','permission-denied'),'Reminder snoozed, but notifications are disabled.','one sentence: no delivery disclaimer');
 // A delivered status is worded by the reviewed change's applied summary, not here.
 for(const status of statuses.filter(s=>!reminders.REMINDER_DELIVERY_PROBLEMS.has(s)))
  assert.equal(reminders.reminderDeliveryProblemText('reminder_update',status),undefined,status);
 const adapter=source('apps/app/src/prototype/agent-adapter.ts');
 assert.doesNotMatch(adapter,/Reminder \$\{reminderResult\.status\}/);
 assert.equal(adapter.match(/reminderDeliveryProblemText\(/g)?.length,2);
});

// --- Automations: agent scheduled-task titles and schedule lines ---------------------------------
const scheduled=await import('../apps/app/src/ui/workflows/scheduled-task-presentation.ts');
const {AutomationsProtocol}=await import('../apps/app/src/runtime/automations-protocol.ts');
test('every scheduled-task kind, owner-visible record, anchor and window has Alpha’s words',()=>{
 const types=vendor('plugins/plugin-scheduling/src/scheduled-task/types.ts');
 const kinds=literals(between(types,'export type ScheduledTaskKind =',';'),/"(\w+)"/g);
 const KINDS=[['reminder','Reminder'],['checkin','Check-in'],['followup','Follow-up'],['approval','Approval request'],['recap','Recap'],['watcher','Watch'],['output','Scheduled update'],['custom','Scheduled task']];
 assert.deepEqual(kinds.sort(),KINDS.map(([k])=>k).sort(),'ScheduledTaskKind');
 assert.deepEqual([...scheduled.SCHEDULED_KIND_TITLES].sort(),[...KINDS].sort());

 // Owner-visible default-pack records: each record's ownerVisible precedes its recordKey.
 const packs=['plugins/plugin-personal-assistant/src/default-packs/daily-rhythm.ts','plugins/plugin-personal-assistant/src/default-packs/morning-brief.ts',
  'plugins/plugin-personal-assistant/src/default-packs/inbox-triage-starter.ts','plugins/plugin-personal-assistant/src/default-packs/followup-starter.ts',
  'plugins/plugin-personal-assistant/src/default-packs/family-coordination.ts','plugins/plugin-personal-assistant/src/default-packs/executive-assistant.ts',
  'plugins/plugin-personal-assistant/src/default-packs/persona-packs.ts','plugins/plugin-personal-assistant/src/default-packs/quiet-user-watcher.ts',
  'plugins/plugin-scheduling/src/scheduled-task/default-pack.ts'];
 const visible=new Set();
 for(const pack of packs)for(const [,flag,key] of vendor(pack).matchAll(/ownerVisible: (true|false),[\s\S]*?recordKey: "([\w-]+)"/g))if(flag==='true')visible.add(key);
 const RECORDS=[['gm','Good morning'],['gn','Good night'],['checkin','Daily check-in'],['checkin-followup','Check-in follow-up'],['weekly-review','Weekly review'],
  ['morning-brief','Morning brief'],['daily-command-brief','Daily brief'],['daily-9am','Daily inbox review'],['followup-child','Follow-up'],
  ['monthly-family-coordination','Monthly family planning'],['morning-checkin','Morning check-in'],['start-now','Start-of-day nudge']];
 assert.deepEqual([...visible].sort(),RECORDS.map(([k])=>k).sort(),'owner-visible records');
 assert.deepEqual([...scheduled.SCHEDULED_RECORD_TITLES].sort(),[...RECORDS].sort());

 const windows=literals(between(vendor('plugins/plugin-scheduling/src/scheduled-task/window-bounds.ts'),'export const OWNER_WINDOW_KEYS',']);'),/"(\w+)"/g);
 const WINDOWS=[['morning','In the morning'],['afternoon','In the afternoon'],['evening','In the evening'],['night','At night'],['morning_or_night','In the morning or at night'],['morning_or_evening','In the morning or evening']];
 assert.deepEqual(windows.sort(),WINDOWS.map(([k])=>k).sort(),'OWNER_WINDOW_KEYS');
 assert.deepEqual([...scheduled.SCHEDULE_WINDOWS].sort(),[...WINDOWS].sort());
 for(const [key,alpha] of WINDOWS)assert.equal(scheduled.windowScheduleText(key),alpha);

 const registry=literals(vendor('plugins/plugin-scheduling/src/anchors/anchor-registry.ts'),/anchorKey: "([\w.]+)"/g);
 const health=literals(between(vendor('plugins/plugin-health/src/connectors/index.ts'),'export const HEALTH_ANCHORS = [','] as const'),/"([\w.]+)"/g);
 const used=packs.flatMap(pack=>literals(vendor(pack),/anchorKey: "([\w.]+)"/g)).concat(literals(vendor('plugins/plugin-health/src/default-packs/wake-up.ts')+vendor('plugins/plugin-health/src/default-packs/sleep-recap.ts'),/anchorKey: "([\w.]+)"/g));
 const anchors=[...new Set([...registry,...health,...used])].sort();
 const ANCHORS=[['bedtime.target','At your bedtime','your bedtime'],['lunch.start','At lunchtime','lunchtime'],['meeting.ended','When a meeting ends','a meeting ends'],
  ['morning.start','When your morning starts','your morning starts'],['nap.start','When your nap starts','your nap starts'],['night.start','When your evening starts','your evening starts'],['wake.confirmed','When you wake up','you wake up'],['wake.observed','When you start waking up','you start waking up']];
 assert.deepEqual(anchors,ANCHORS.map(([k])=>k),'anchors');
 assert.deepEqual([...scheduled.SCHEDULE_ANCHORS.keys()].sort(),ANCHORS.map(([k])=>k));
 for(const [key,at,from] of ANCHORS){
  assert.equal(scheduled.relativeScheduleText(key,0),at);
  assert.equal(scheduled.relativeScheduleText(key,240),`4 hours after ${from}`);
  assert.equal(scheduled.relativeScheduleText(key,-90),`1 hour 30 minutes before ${from}`);
 }
 assert.equal(scheduled.relativeScheduleText('wake.confirmed',1),'1 minute after you wake up');
 // Unknown identifiers read as the row's fallback.
 assert.equal(scheduled.relativeScheduleText('custom.anchor',30),'Relative schedule');
 assert.equal(scheduled.windowScheduleText('morningWindow'),'Scheduled window');
 assert.equal(scheduled.scheduledTaskTitle({kind:'novel',metadata:{recordKey:'novel-pack',slot:'slot.key'}}),'Scheduled task');
 assert.equal(scheduled.scheduledTaskTitle({kind:'watcher',metadata:{recordKey:'waiting-on-watcher'}}),'Watch');
});

test('the Automations list shows Alpha’s title and schedule for agent scheduled items',async()=>{
 const task=(taskId,kind,trigger,metadata)=>({taskId,kind,promptInstructions:'Instructions',trigger,state:{status:'scheduled'},source:'default_pack',ownerVisible:true,...(metadata?{metadata}:{})});
 const tasks=[
  task('a','followup',{kind:'relative_to_anchor',anchorKey:'wake.confirmed',offsetMinutes:30}),
  task('b','watcher',{kind:'during_window',windowKey:'morning'}),
  task('c','recap',{kind:'relative_to_anchor',anchorKey:'bedtime.target',offsetMinutes:-15},{recordKey:'gn',slot:'night.slot'}),
  task('d','novel',{kind:'during_window',windowKey:'novel_window'},{slot:'raw.slot'}),
  task('e','output',{kind:'relative_to_anchor',anchorKey:'novel.anchor',offsetMinutes:5}),
 ];
 const request=async path=>path.startsWith('/api/lifeops/scheduled-tasks')?{tasks}:path==='/api/automations'?{automations:[]}:path==='/api/lifeops/reminders'?{reminders:[]}:{definitions:[]};
 const {rows,issues}=await new AutomationsProtocol(request).list(new AbortController().signal);
 assert.deepEqual(issues,[]);
 const shown=Object.fromEntries(rows.map(row=>[row.id,[row.title,row.schedule]]));
 assert.deepEqual(shown,{
  a:['Follow-up','30 minutes after you wake up'],
  b:['Watch','In the morning'],
  c:['Good night','15 minutes before your bedtime'],
  d:['Scheduled task','Scheduled window'],
  e:['Scheduled update','Relative schedule'],
 });
});

// --- Calendar: agent event attendee replies --------------------------------------------------
const attendees=await import('../apps/app/src/ui/calendar/attendee-response.ts');
test('every Google attendee reply reads as Alpha’s word on an agent Calendar event',()=>{
 const google=literals(between(vendor('plugins/plugin-google-workspace/src/types.ts'),'export type GoogleCalendarAttendeeResponseStatus =',';'),/"(\w+)"/g);
 const PINNED=[['needsAction','Awaiting reply'],['accepted','Going'],['tentative','Maybe'],['declined','Declined']];
 assert.deepEqual(google.sort(),PINNED.map(([k])=>k).sort(),'GoogleCalendarAttendeeResponseStatus');
 for(const [status,alpha] of PINNED)assert.equal(attendees.attendeeResponseLabel({responseStatus:status}),alpha,status);
 // iCalendar PARTSTAT values arrive lowercased from an imported feed.
 assert.match(vendor('plugins/plugin-calendar/src/ics/parser.ts'),/responseStatus: property\.params\.get\("PARTSTAT"\)\?\.\[0\]\?\.toLowerCase\(\) \?\? null/);
 assert.equal(attendees.attendeeResponseLabel({responseStatus:'needs-action'}),'Awaiting reply');
 assert.equal(attendees.attendeeResponseLabel({responseStatus:'delegated'}),'Delegated');
 assert.equal(attendees.attendeeResponseLabel({responseStatus:'in-process'}),'Invited');
 assert.equal(attendees.attendeeResponseLabel({responseStatus:null}),'');
 assert.equal(attendees.attendeeResponseLabel({organizer:true,responseStatus:'accepted'}),'Organizer');
 const adapter=source('apps/app/src/prototype/agent-calendar-adapter.ts');
 assert.match(adapter,/st:attendeeResponseLabel\(guest\)/);
 assert.doesNotMatch(adapter,/guest\.responseStatus\|\|/);
});

// --- Own API keys: the shared provider slot's key check and save refusals ----------------------
const provider=await import('../apps/app/src/ui/settings/provider-key-messages.ts');
test('every provider slot refusal a key save rejects with is worded by Alpha',()=>{
 const slot=vendor('plugins/plugin-native-agent/android/src/main/java/ai/eliza/plugins/agent/runtime/NativeProviderSlot.java');
 const save=between(slot,'public static String providerCheckFailure(','public static void bindDirectProvider(');
 const fixed=[...new Set(literals(save,/return "([^"]+)";/g))].sort();
 const PINNED=[
  ['Cerebras did not accept this key. It was not saved.','Cerebras didn’t accept this key. Nothing was saved.'],
  ['Cerebras is rate-limiting key checks. Try again shortly; the key was not saved.','Cerebras is limiting key checks right now. Nothing was saved; try again in a moment.'],
  ['Cerebras could not confirm this key right now. It was not saved.','Cerebras couldn’t confirm this key right now. Nothing was saved.'],
  ['Cerebras returned an unexpected response. The key was not saved.','Cerebras sent a reply Alpha couldn’t read. Nothing was saved.'],
  ['Cerebras could not be reached to check this key. It was not saved.','Couldn’t reach Cerebras to check this key. Nothing was saved.'],
  ['Enter a valid Cerebras key.','Enter a valid Cerebras key.'],
  ['Choose the supported Cerebras model.','Choose the Cerebras model Alpha supports.'],
  ['Enter a valid Cartesia key or leave voice off.','Enter a valid Voice key, or leave voice off.'],
 ];
 assert.deepEqual(fixed,PINNED.map(([s])=>s).sort(),'fixed slot refusals');
 assert.deepEqual([...provider.PROVIDER_KEY_REFUSALS].sort(),[...PINNED].sort());
 for(const [sentence,alpha] of PINNED){
  assert.equal(provider.providerKeyRefusalText(rejection(sentence)),alpha,sentence);
  // The browser host and test bridges reject with plain errors; the reviewed text still maps.
  assert.equal(provider.providerKeyRefusalText(new Error(sentence)),alpha,sentence);
 }
 // The two composed refusals: the unoffered model (kept as data) and the product's pinned model.
 assert.ok(save.includes('return "This Cerebras key does not offer " + model + ". It was not saved.";'));
 assert.equal(provider.providerKeyRefusalText(rejection('This Cerebras key does not offer qwen-3.8-27b. It was not saved.')),'This Cerebras key can’t use qwen-3.8-27b. Nothing was saved.');
 assert.ok(save.includes('return product + " uses " + NativeProviderAdmission.CEREBRAS_PROVIDER_MODEL + " on Cerebras.";'));
 const model=/CEREBRAS_PROVIDER_MODEL="([^"]+)"/.exec(vendor('plugins/plugin-native-agent/android/src/main/java/ai/eliza/plugins/agent/runtime/NativeProviderAdmission.java'))[1];
 const bridge=source('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java');
 const product=/static final String PRODUCT_NAME="([^"]+)"/.exec(bridge)[1];
 assert.equal(provider.providerKeyRefusalText(rejection(`${product} uses ${model} on Cerebras.`)),undefined,'composed with Alpha’s product name');
});

test('Alpha’s own bridge refusals pass as written and any other native rejection reads as the fallback',()=>{
 const bridge=source('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java');
 const product=/static final String PRODUCT_NAME="([^"]+)"/.exec(bridge)[1];
 const model=/CEREBRAS_PROVIDER_MODEL="([^"]+)"/.exec(vendor('plugins/plugin-native-agent/android/src/main/java/ai/eliza/plugins/agent/runtime/NativeProviderAdmission.java'))[1];
 const path=between(bridge,'@PluginMethod public void configureProvider(','/** Cancels only this request');
 const own=[...new Set([...literals(path,/reject\("([^"]+)"\)/g),...(path.includes('reject(PRODUCT_NAME+" uses "+CEREBRAS_PROVIDER_MODEL+" on Cerebras.")')?[`${product} uses ${model} on Cerebras.`]:[])])].sort();
 // The slot's failure is the only other text this path rejects with.
 assert.deepEqual(literals(path,/reject\((\w+)\)/g),['failure']);
 assert.deepEqual([...provider.ALPHA_PROVIDER_BRIDGE_REFUSALS].filter(s=>!provider.PROVIDER_KEY_REFUSALS.has(s)).sort(),own.filter(s=>!provider.PROVIDER_KEY_REFUSALS.has(s)));
 for(const sentence of own)if(!provider.PROVIDER_KEY_REFUSALS.has(sentence))assert.equal(provider.providerKeyRefusalText(rejection(sentence)),undefined,sentence);
 assert.equal(provider.providerKeyRefusalText(rejection('Cerebras changed its wording.')),provider.PROVIDER_KEY_FALLBACK);
 assert.equal(provider.PROVIDER_KEY_FALLBACK,'Couldn’t check or save this key. Nothing was saved.');
 // Alpha's own plain errors and cancellations are left for the form to show or ignore.
 assert.equal(provider.providerKeyRefusalText(new Error('Keys rejected')),undefined);
 assert.equal(provider.providerKeyRefusalText(new DOMException('Cancelled','AbortError')),undefined);
 const agent=source('apps/app/src/runtime/local-agent.ts');
 assert.match(between(agent,'export async function configureLocalProvider(','/** Publish the saved owner switches'),/const refusal=providerKeyRefusalText\(error\);\s*if\(refusal!==undefined\)throw new Error\(refusal\);\s*throw error;/);
});

// --- Chat receipt: the shared named Calendar read --------------------------------------------
const named=await import('../apps/app/src/ui/calendar/named-read-messages.ts');
test('every named Calendar read summary reads as Alpha’s receipt sentence',()=>{
 const read=vendor('plugins/plugin-calendar/src/client/named-read.ts');
 assert.equal(read,source('.eliza/client-features/plugins/plugin-calendar/src/client/named-read.ts'),'staged copy');
 const failed=literals(read,/fail\(\s*"([^"]+)",?\s*\)/g),succeeded=literals(read,/summary:\s*"([^"]+)"/g);
 const PINNED=[
  ['failed','Choose the exact matching event in Calendar before sharing it. Nothing was shared or changed.','Nothing was shared because the matching event is not open in Calendar.'],
  ['failed','The event was not shared. Its selection, access or review changed; nothing was changed.','The event wasn’t shared because its selection, access or review changed.'],
  ['failed','The selected event does not match the requested name. Nothing was shared or changed.','Nothing was shared because the open event doesn’t match the name you asked about.'],
  ['succeeded','Shared the matching event you chose. Its requested update still requires a separate review.','Shared the event you chose.'],
 ];
 assert.deepEqual(failed.sort(),PINNED.filter(([s])=>s==='failed').map(([,u])=>u).sort(),'fail summaries');
 assert.deepEqual(succeeded,PINNED.filter(([s])=>s==='succeeded').map(([,u])=>u),'success summary');
 assert.deepEqual([...named.NAMED_CALENDAR_READ_SUMMARIES].sort(),PINNED.map(([,u,a])=>[u,a]).sort());
 for(const [status,summary,alpha] of PINNED)assert.equal(named.namedCalendarReadSummary({status,summary}),alpha,summary);
 assert.equal(named.namedCalendarReadSummary({status:'succeeded',summary:'Reworded upstream success.'}),'Shared the event you chose.');
 assert.equal(named.namedCalendarReadSummary({status:'failed',summary:'Reworded upstream failure.'}),'The event wasn’t shared.');
 assert.equal(named.namedCalendarReadSummary({status:'failed'}),'The event wasn’t shared.');
 const adapter=source('apps/app/src/prototype/agent-adapter.ts');
 assert.match(adapter,/const result=await executeNamedCalendarRead\([^;]*\);[\s\S]{0,200}return \{\.\.\.result,summary:namedCalendarReadSummary\(result\)\};/);
 assert.doesNotMatch(adapter,/return executeNamedCalendarRead\(/);
});
