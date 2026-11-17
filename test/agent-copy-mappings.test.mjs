// Alpha words what the agent server and the shared run, digest, Notes and device-action code
// answer the Automations, Workflows, digests and chat approval screens with. Each table here pins
// the upstream sentence or identifier, read from the pinned vendor source or the staged client
// copy, to the Alpha sentence shown instead, so a reworded upstream sentence fails here instead of
// reaching the owner raw, and an unknown one reads as the screen's own fallback.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CapacitorException} from '@capacitor/core';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const vendor=path=>source('vendor/eliza/'+path);
const staged=path=>source('.eliza/client-features/'+path);
const literals=(text,pattern)=>[...text.matchAll(pattern)].map(m=>m[1]);
const rejection=message=>new CapacitorException(message);

// --- Automations: scheduled-task Run (plugin-scheduling runner fire reasons) --------------------
const runs=await import('../apps/app/src/ui/workflows/automation-run-messages.ts');
test('every scheduled-task fire result that did not run is worded by Alpha, never by its reason',()=>{
 const runner=vendor('plugins/plugin-scheduling/src/scheduled-task/runner.ts');
 // The reason forms Alpha keys on are still the runner's.
 for(const form of ['reason: `terminal:${task.state.status}`','MISSED_OCCURRENCE_DECISION = "missed_occurrence"',
  'reason: pause.reason ? `global_pause: ${pause.reason}` : "global_pause"','reason: `gate-defer:${gateOutcome.decision.reason}`',
  '`${gateOutcome.gateKind ?? "gate"}: ${gateOutcome.decision.reason}`','kind: "dispatch_deferred"','kind: "dispatch_failed"'])
  assert.ok(runner.includes(form),'runner form: '+form);
 const terminal=literals(runner.slice(runner.indexOf('function isTerminal('),runner.indexOf('function isTerminal(')+300),/status === "(\w+)"/g);
 assert.deepEqual(terminal.sort(),['completed','dismissed','expired','failed','skipped']);
 const PINNED=[
  [{kind:'skipped',reason:'terminal:completed'},'This item is already done, so it did not run again.'],
  [{kind:'skipped',reason:'terminal:dismissed'},'This item was dismissed, so it did not run.'],
  [{kind:'skipped',reason:'terminal:skipped'},'This item was already skipped, so it did not run again.'],
  [{kind:'skipped',reason:'terminal:expired'},'This item has expired, so it did not run.'],
  [{kind:'skipped',reason:'terminal:failed'},'This item already failed, so it did not run again.'],
  [{kind:'skipped',reason:'terminal:archived'},'This item has already ended, so it did not run again.'],
  [{kind:'skipped',reason:'missed_occurrence'},'This item came due while your agent wasn’t running. It was recorded as missed and did not run.'],
  [{kind:'skipped',reason:'global_pause'},'Scheduled items are paused on your agent, so this one did not run.'],
  [{kind:'skipped',reason:'global_pause: vacation'},'Scheduled items are paused on your agent, so this one did not run.'],
  [{kind:'skipped',reason:'gate-defer:quiet hours'},'A condition on this item put it off until later, so it did not run now.'],
  [{kind:'skipped',reason:'gate: unknown gate kind: x'},'A condition on this item didn’t allow it to run, so it was skipped.'],
  [{kind:'skipped',reason:'any: any: no gate allowed'},'A condition on this item didn’t allow it to run, so it was skipped.'],
  [{kind:'skipped',reason:'something new'},'This item was skipped. Read its current status before trying again.'],
  [{kind:'dispatch_failed',error:{message:'dispatch_failed: socket'}},'Your agent couldn’t deliver this item, so it did not run.'],
  [{kind:'dispatch_deferred',reason:'retry:rate_limited'},'Your agent couldn’t deliver this item yet. It will try again later.'],
  [{kind:'surprise'},runs.SCHEDULED_NOT_RUN],
 ];
 for(const [fire,alpha] of PINNED)assert.equal(runs.scheduledFireText(fire),alpha,JSON.stringify(fire));
 assert.equal(runs.scheduledFireText({kind:'dispatch_deferred',reason:'retry:x',nextAttemptAtIso:'2026-11-16T09:10:00.000Z'},()=>'at 9:10 AM'),'Your agent couldn’t deliver this item yet. It will try again at 9:10 AM.');
 // The protocol throws Alpha's sentence, not the reason.
 const protocol=source('apps/app/src/runtime/automations-protocol.ts');
 assert.match(protocol,/throw new AutomationOutcomeError\(scheduledFireText\(fire,/);
 assert.doesNotMatch(protocol,/text\(fire\.reason\)|text\(run\.error\)/);
});

test('every fixed prompt run error the trigger runner records is worded by Alpha',()=>{
 const runtime=vendor('packages/agent/src/triggers/runtime.ts');
 const fixed=[...literals(runtime,/error: "([^"]+)"/g),...literals(runtime,/error:\s*\n\s*"([^"]+)"/g),
  ...literals(runtime,/throw new Error\("([^"]+)"\)/g),...literals(runtime,/\?\? "(workflow execution failed)"/g)];
 const missed=/MISSED_SCHEDULED_OCCURRENCE_TEXT =\s*\n?\s*"([^"]+)"/.exec(vendor('packages/core/src/services/trigger-scheduling.ts'))[1];
 assert.ok(fixed.length>=6,'fixed run errors: '+fixed);
 assert.deepEqual([...runs.PROMPT_RUN_ERRORS.keys()].sort(),[...new Set([...fixed,missed])].sort());
 const PINNED={
  [missed]:'The scheduled time passed while your agent wasn’t running, so this run was skipped. Nothing runs late.',
  'prompt trigger missing instructions':'This prompt has no instructions, so it did not run. Edit it to add them.',
  'message service not available':'Your agent can’t take messages right now, so this prompt did not run.',
  'Prompt automation delivery conversation is unavailable':'The conversation this prompt replies in is no longer available, so it did not run.',
  'workflow trigger missing workflowId':'This automation isn’t linked to a workflow, so it did not run.',
  'workflow subsystem unavailable: the workflow plugin is not enabled on this agent':'Workflows aren’t turned on for this agent, so this automation did not run.',
  'workflow execution failed':'The workflow did not finish. Check its execution history.',
 };
 for(const [upstream,alpha] of Object.entries(PINNED))assert.equal(runs.promptRunErrorText(upstream,'error'),alpha,upstream);
 // Template errors around a detail Alpha never shows.
 for(const template of ['`Trigger reply was not fully delivered: ${','`Trigger reply reached the provider, but local evidence is ${','`Prompt automation ${result.outcome.status}: ${'])
  assert.ok(runtime.includes(template),'runtime template: '+template);
 assert.equal(runs.promptRunErrorText('Trigger reply was not fully delivered: provider 502','error'),'Your agent’s reply wasn’t fully delivered. Check the conversation before running it again.');
 assert.equal(runs.promptRunErrorText('Trigger reply reached the provider, but local evidence is partial; do not retry blindly.','error'),'Your agent’s reply was sent but wasn’t fully recorded. Check the conversation before running it again.');
 assert.equal(runs.promptRunErrorText('Prompt automation failed: model refused','error'),'Your agent stopped before finishing this prompt. Check its execution history.');
 assert.equal(runs.promptRunErrorText('TypeError: x is undefined','error'),runs.PROMPT_RUN_FAILED);
 assert.equal(runs.promptRunErrorText(undefined,'skipped'),runs.PROMPT_RUN_SKIPPED);
});

test('a prompt run history line reads the owner’s time, Alpha’s status word and Alpha’s reason',()=>{
 const routes=vendor('plugins/plugin-workflow/src/lib/automations-types.ts');
 assert.match(routes,/TriggerLastStatus = 'success' \| 'error' \| 'skipped'/);
 const when=stamp=>`[${stamp}]`;
 assert.equal(runs.promptRunHistoryLine({startedAtIso:'2026-11-16T09:00:00.000Z',status:'error',error:'TypeError: boom'},when),`[2026-11-16T09:00:00.000Z] · Failed · ${runs.PROMPT_RUN_FAILED}`);
 assert.equal(runs.promptRunHistoryLine({startedAt:1,status:'success'},when),'[1] · Ran');
 assert.equal(runs.promptRunHistoryLine({status:'skipped',error:'message service not available'},when),'Skipped · Your agent can’t take messages right now, so this prompt did not run.');
 assert.equal(runs.promptRunHistoryLine({status:'weird'},when),'Outcome unknown');
 const adapter=source('apps/app/src/prototype/automations-adapter.ts');
 assert.match(adapter,/promptRunHistoryLine\(value as Bag,automationWhen\)/);
 assert.doesNotMatch(adapter,/\[run\.startedAtIso\|\|run\.startedAt,run\.status,run\.error\]/);
});

// --- Workflow request journal (staged packages/contracts/src/workflow-intents.ts) -------------
const intents=await import('../apps/app/src/ui/workflows/workflow-intent-messages.ts');
test('every workflow request journal refusal is worded by Alpha on Automations and Workflows',()=>{
 const text=staged('packages/contracts/src/workflow-intents.ts');
 const sentences=[...new Set([...literals(text,/new Error\("([^"]+)"\)/g),...literals(text,/super\("([^"]+)"\)/g)])];
 assert.deepEqual([...intents.WORKFLOW_INTENT_REFUSALS.keys()].sort(),sentences.sort());
 const PINNED={
  'Workflow intent belongs to another agent':'This request was saved for a different agent, so it wasn’t sent.',
  'Workflow request history needs recovery':'Alpha’s record of earlier requests needs recovery, so nothing was sent. Reopen Alpha and try again.',
  'Workflow intent save unconfirmed':'Alpha couldn’t confirm it saved this request on the phone. Refresh before trying again.',
  'Workflow request changed. Refresh its receipt before trying again.':'This request changed in another window. Refresh before trying again.',
 };
 for(const [upstream,alpha] of Object.entries(PINNED))assert.equal(intents.workflowIntentText(new Error(upstream)),alpha);
 assert.equal(intents.workflowIntentText(new Error('Saved')),undefined);
 // Automations words the journal's refusals through automationRequestText (pinned in screen-copy-mappings).
 assert.match(source('apps/app/src/prototype/automations-adapter.ts'),/automationRequestText\(error,'Automation request failed\.'\)/);
 assert.match(source('apps/app/src/prototype/workflow-adapter.ts'),/workflowRefusalText\(error\)\?\?workflowIntentText\(error\)\?\?'Unavailable'/);
});

// --- Workflow runs and digests (plugin-workflow) -----------------------------------------------
const presentation=await import('../apps/app/src/ui/workflows/workflow-run-presentation.ts');
const policy=await import('../.eliza/client-features/plugins/plugin-workflow/src/services/hosted-digest-policy.ts');
test('every not-run occurrence sentence the workflow service records is worded by Alpha',()=>{
 const files=['services/phone-workflow-spec.ts','services/embedded-workflow-service.ts','services/hosted-digest.ts'].map(f=>vendor('plugins/plugin-workflow/src/'+f));
 const recorded=files.flatMap(text=>literals(text,/status: '(?:missed|overlap|unavailable)',[\s\S]{0,80}?text: '([^']+)'/g));
 const missed=/MISSED_SCHEDULED_OCCURRENCE_TEXT =\s*\n?\s*"([^"]+)"/.exec(vendor('packages/core/src/services/trigger-scheduling.ts'))[1];
 const digest=[policy.DIGEST_MISSED_TEXT,policy.DIGEST_OVERLAP_TEXT,policy.DIGEST_PAUSED_TEXT.expired,policy.DIGEST_PAUSED_TEXT.revoked,policy.DIGEST_SOURCE_UNAVAILABLE_TEXT];
 // The staged digest policy is the vendor one Alpha reads.
 for(const sentence of digest)assert.ok(vendor('plugins/plugin-workflow/src/services/hosted-digest-policy.ts').includes(sentence),sentence);
 const all=[...new Set([...recorded,missed,...digest])];
 assert.ok(recorded.length>=3,'recorded: '+recorded);
 assert.deepEqual([...presentation.OCCURRENCE_NOT_RUN_TEXT.keys()].sort(),all.sort());
 const PINNED=[
  [policy.DIGEST_MISSED_TEXT,'This digest missed its scheduled time, so it didn’t run. Nothing runs late.'],
  [policy.DIGEST_OVERLAP_TEXT,'The previous digest was still running, so this one didn’t run.'],
  [policy.DIGEST_PAUSED_TEXT.expired,'The source expired, so this schedule is paused until you renew it. No new phone data was read.'],
  [policy.DIGEST_PAUSED_TEXT.revoked,'The source was revoked, so this schedule is paused until you review a new one. No new phone data was read.'],
  [policy.DIGEST_SOURCE_UNAVAILABLE_TEXT,'The source you reviewed was revoked or has expired, so this didn’t run. No new phone data was read.'],
  ['The scheduled time passed while the agent was not running. This occurrence did not run and will not run later.','This occurrence missed its run window and did not run.'],
  [missed,'Your agent wasn’t running at the scheduled time, so this occurrence didn’t run. Nothing runs late.'],
  ['The agent stopped before this scheduled run started. Nothing ran, and it will not run later.','Your agent stopped before this scheduled run began. Nothing ran, and it won’t run later.'],
  ['An earlier run of this workflow was still active. This occurrence did not run.','The previous run of this workflow was still going, so this occurrence didn’t run.'],
 ];
 for(const [upstream,alpha] of PINNED)assert.equal(presentation.occurrenceNotRunText('missed',upstream),alpha,upstream);
 // The clock-change template, read from the spec.
 assert.ok(files[0].includes('`${trigger.localTime} did not occur on ${wall.slice(0, 10)} in ${trigger.timeZone} because the clocks moved forward. This occurrence did not run and will not run later.`'));
 assert.equal(presentation.occurrenceNotRunText('missed','02:30 did not occur on 2026-03-08 in America/New_York because the clocks moved forward. This occurrence did not run and will not run later.'),
  '02:30 didn’t happen on 2026-03-08 in America/New_York because the clocks went forward, so this occurrence didn’t run.');
 assert.equal(presentation.occurrenceNotRunText('overlap','Some newer agent sentence.'),'An earlier run was still going, so this occurrence didn’t run.');
 assert.equal(presentation.occurrenceNotRunText('unavailable',''),'This occurrence’s source can’t be read, so it didn’t run. No phone data was read.');
 assert.equal(presentation.occurrenceNotRunText(undefined,'The brief the workflow wrote.'),undefined);
});

test('every workflow run status, event type and approval state reads as an Alpha word',()=>{
 const types=vendor('plugins/plugin-workflow/src/types/index.ts');
 const union=types.slice(types.indexOf('export type WorkflowExecutionStatus ='),types.indexOf(';',types.indexOf('export type WorkflowExecutionStatus =')));
 const statuses=literals(union,/'([\w-]+)'/g);
 assert.ok(statuses.length>=10,'statuses: '+statuses);
 for(const status of statuses){const label=presentation.workflowRunStatusLabel(status);assert.notEqual(label,status);assert.notEqual(label,'Status unknown',status);}
 assert.equal(presentation.workflowRunStatusLabel('waiting-approval'),'Waiting for approval');
 assert.equal(presentation.workflowRunStatusLabel('finished'),'Finished');
 assert.equal(presentation.workflowRunStatusLabel('completed'),'Completed');
 assert.equal(presentation.workflowRunStatusLabel('error'),'Failed');
 assert.equal(presentation.workflowRunStatusLabel('constructor'),'Status unknown');
 const events=[...new Set(literals([...['services/embedded-workflow-service.ts','services/smithers-runtime.ts','services/workflow-approval-receipts.ts','routes/workflow-routes.ts'].map(f=>vendor('plugins/plugin-workflow/src/'+f))].join('\n'),/'((?:Run|Node|Approval|Timer)[A-Z][A-Za-z]*)'/g))];
 assert.ok(events.length>=5,'events: '+events);
 for(const type of events)assert.notEqual(presentation.workflowEventLabel(type),'Step update',type);
 assert.equal(presentation.workflowEventLabel('ApprovalRequested'),'Approval requested');
 assert.equal(presentation.workflowEventLabel('execution_started'),'Step update');
 assert.equal(presentation.workflowApprovalStatusLabel('approved'),'Approved');
 assert.equal(presentation.workflowApprovalStatusLabel('denied'),'Denied');
 assert.equal(presentation.workflowApprovalStatusLabel('expired'),'Closed');
 assert.equal(presentation.workflowReconciliationText('outcome-unknown'),'Your agent couldn’t tell how this run ended.');
 assert.equal(presentation.workflowReconciliationText('worker-running'),'Your agent is checking whether this run is still going.');
 assert.equal(presentation.workflowRunErrorText({status:'failed'}),'This run stopped with an error on your agent.');
 assert.equal(presentation.workflowRunErrorText({status:'cancelled'}),'This run was cancelled before it finished.');
 assert.match(presentation.workflowRunErrorText({status:'running',reconciliation:{state:'outcome-unknown'}}),/^Your agent lost track of this run/);
 // Phone steps: the coordinator titles each step by its operation type with spaces.
 const coordinator=source('apps/app/src/ui/device-actions/client-coordinator.ts');
 assert.match(coordinator,/title: op\.type\.replaceAll\("_", " "\)/);
 const scope=coordinator.slice(coordinator.indexOf('async pendingForWorkflow('),coordinator.indexOf('reviewScope: `${scope}'));
 const ops=literals(scope,/op\.type === "(\w+)"/g);
 assert.equal(ops.length,6,'phone step operations: '+ops);
 for(const op of ops)assert.notEqual(presentation.workflowPhoneStepTitle(op.replaceAll('_',' ')),'Phone step',op);
 assert.equal(presentation.workflowPhoneStepTitle('speak text'),'Read aloud');
 // The run detail never shows the engine's text.
 const adapter=source('apps/app/src/prototype/workflow-adapter.ts');
 for(const raw of ["fix:receipt.error||''","receipt.reconciliation.message","k:e.type",":a.status,","return run.status;","proposal.title==='post notification'?'Post notification':proposal.title"])
  assert.ok(!adapter.includes(raw),'raw run text: '+raw);
});

const digests=await import('../apps/app/src/ui/digests/hosted-digests.ts');
const {HostedSourceRejected}=await import('../.eliza/client-features/plugins/plugin-workflow/src/client/hosted-digests.ts');
test('a digest result, its status and the panel’s source refusals read in Alpha’s words',()=>{
 const base={runId:'run',error:null};
 assert.equal(digests.digestSummaryText({...base,status:'missed',output:{status:'missed',text:policy.DIGEST_MISSED_TEXT}}),'This digest missed its scheduled time, so it didn’t run. Nothing runs late.');
 assert.equal(digests.digestSummaryText({...base,status:'unavailable',output:{status:'unavailable',text:policy.DIGEST_PAUSED_TEXT.expired}}),'The source expired, so this schedule is paused until you renew it. No new phone data was read.');
 assert.equal(digests.digestSummaryText({...base,status:'overlap',output:{status:'overlap',text:'A newer sentence'}}),'An earlier run was still going, so this occurrence didn’t run.');
 assert.equal(digests.digestSummaryText({...base,status:'finished',output:{summary:'Your brief'}}),'Your brief');
 assert.equal(digests.digestSummaryText({...base,status:'failed',error:'Error: worker crashed at line 3',output:null}),digests.DIGEST_RUN_FAILED);
 assert.equal(digests.digestStatusLabel('finished'),'Finished');
 assert.equal(digests.digestStatusLabel('failed'),'Failed');
 assert.equal(digests.digestStatusLabel('missed'),'Missed — not run');
 // HostedSourceRejected's own sentence is the staged client's; the panel shows Alpha's.
 const upstream=new HostedSourceRejected().message;
 assert.equal(upstream,'Source access changed before saving. Refresh accounts and review the source again.');
 assert.notEqual(digests.HOSTED_SOURCE_REJECTED_TEXT,upstream);
 const ui=source('apps/app/src/runtime/hosted-digest-ui.tsx');
 assert.match(ui,/setMessage\(sourceRejected\?HOSTED_SOURCE_REJECTED_TEXT:/);
 assert.match(ui,/setMessage\(digestCalendarErrorText\(error\)\)/);
 assert.doesNotMatch(ui,/setMessage\(\(error as Error\)\.message\)|sourceRejected\?error\.message/);
 // The native Calendar plugin's workflowCalendars refusals (CalendarProviderPlugin.java, inherited by AlphaCalendarPlugin).
 const plugin=source('android/app/src/main/java/ai/alphacompute/alphaphone/CalendarProviderPlugin.java');
 const body=plugin.slice(plugin.indexOf('public void workflowCalendars('),plugin.indexOf('public void readWorkflowRange('));
 const refusals=literals(body,/c\.reject\("([^"]+)"\)/g);
 assert.deepEqual(refusals,['Open Workflows before reading calendar sources','Selected calendar sources could not be read']);
 assert.equal(digests.digestCalendarErrorText(rejection(refusals[0])),'Open Workflows before reading calendar sources.');
 assert.equal(digests.digestCalendarErrorText(rejection(refusals[1])),'The calendars on this phone could not be read. Try again.');
 assert.equal(digests.digestCalendarErrorText(rejection('Some new native sentence')),digests.DIGEST_CALENDARS_UNAVAILABLE);
 assert.equal(digests.digestCalendarErrorText(new Error(digests.DIGEST_CALENDAR_PERMISSION_DENIED)),digests.DIGEST_CALENDAR_PERMISSION_DENIED);
});

// The error a hosted digest run records is the agent's own text; its fixed reasons keep their meaning.
test('every fixed error a hosted digest run records keeps its reason in Alpha’s words',()=>{
 const services='plugins/plugin-workflow/src/services/';
 // Startup wiring and a calendar-list timeout the listing swallows; neither reaches a run's error.
 const NOT_RUN_ERRORS=new Set(['Native source reader already configured','Read timeout']);
 const errors=['hosted-digest.ts','hosted-native-source.ts','hosted-google-source.ts'].flatMap(name=>{
  const text=vendor(services+name);
  const found=literals(text,/new (?:WorkflowApiError|Error)\(\s*'([^']+)'/g);
  assert.equal(found.length,(text.match(/new (?:WorkflowApiError|Error)\(/g)??[]).length,name+': every error is a fixed sentence');
  return found;
 }).filter(text=>!NOT_RUN_ERRORS.has(text));
 const service=vendor(services+'embedded-workflow-service.ts');
 const grant="throw new WorkflowApiError('Hosted source grant expired or was revoked', 409)";
 assert.ok(service.includes(grant),'live grant check: '+grant);
 errors.push('Hosted source grant expired or was revoked');
 assert.ok(vendor(services+'hosted-digest.ts').includes('error: execution.error?.message ?? null'),'a run records the execution error as its result error');
 const keys=new Set(digests.DIGEST_RUN_ERRORS.keys());
 for(const error of errors){
  assert.ok(keys.has(error),'digest run error has an Alpha sentence: '+error);
  const shown=digests.digestSummaryText({runId:'run',status:'failed',output:null,error});
  assert.notEqual(shown,digests.DIGEST_RUN_FAILED,error);
  assert.notEqual(shown,error,error);
 }
 for(const key of keys)assert.ok(errors.includes(key),'still recorded by the agent: '+key);
 assert.equal(digests.digestSummaryText({runId:'run',status:'failed',output:null,error:'Native source consent expired or revoked'}),
  'Your consent for this digest to read this phone expired or was revoked. Review the source to turn it back on.');
 assert.equal(digests.digestSummaryText({runId:'run',status:'failed',output:null,error:'Hosted source grant expired or was revoked'}),
  'This digest’s source expired or was revoked, so it did not run. Renew or review the source.');
 assert.equal(digests.digestSummaryText({runId:'run',status:'failed',output:null,error:'constructor'}),digests.DIGEST_RUN_FAILED);
});

// --- Chat: an approved Notes change (staged plugin-notes) --------------------------------------
const notes=await import('../apps/app/src/ui/notes/notes-action-messages.ts');
test('every shared Notes refusal on the approved change path is worded by Alpha',()=>{
 const client='plugins/plugin-notes/src/client/';
 const store=staged(client+'notes-store.ts');
 // Everything from the current-view check on is reached by an approved change (`target`, `execute`).
 const fromExecute=literals(store.slice(store.indexOf('assertCurrent() {')),/Error\(\s*"([^"]+)",?\s*\)/g);
 const contract=literals(staged(client+'notes-contract.ts'),/Error\("([^"]+)"\)/g).filter(s=>/operation|transfer bound|result/.test(s));
 const documents=literals(staged(client+'notes-document-store.ts'),/Error\("([^"]+)"\)/g).filter(s=>/operation|progress/i.test(s));
 const trash=literals(staged(client+'notes-trash-policy.ts'),/Error\("([^"]+)"\)/g).filter(s=>!/must be|Invalid/.test(s));
 const full=/super\("([^"]+)"\)/.exec(staged(client+'notes-secure-store.ts').slice(staged(client+'notes-secure-store.ts').indexOf('class NotesStorageFull')))[1];
 const sentences=[...new Set([...fromExecute,...contract,...documents,...trash,full])];
 assert.ok(sentences.length>=12,'Notes sentences: '+sentences);
 for(const sentence of sentences){const text=notes.notesActionFailureText(new Error(sentence));assert.notEqual(text,sentence,sentence);assert.notEqual(text,notes.NOTES_ACTION_FAILED,'unmapped: '+sentence);}
 for(const key of notes.NOTES_ACTION_REFUSALS.keys())assert.ok(sentences.includes(key),'not upstream: '+key);
 const PINNED={
  'Selected note revision changed':'That note was edited after you reviewed it. Nothing was changed.',
  'Selected note changed':'That note changed after you reviewed it. Nothing was changed.',
  'Notes changed before the approved operation':'Notes changed before your approved change could run. Nothing was changed.',
  'Selected note is missing':'That note is no longer in Notes. Nothing was changed.',
  'readback mismatch':'Notes couldn’t confirm the saved change. Reopen Notes to check it.',
  'Deletion already recorded':'This deletion is already in Recently deleted. Nothing more was changed.',
  'A note with this identity already exists':'A note with the same identity is already in Notes. Nothing was changed.',
 };
 for(const [upstream,alpha] of Object.entries(PINNED))assert.equal(notes.notesActionFailureText(new Error(upstream)),alpha);
 assert.equal(notes.notesActionFailureText(new Error('Previous notes isn’t ready. Nothing was changed.')),'Previous notes isn’t ready. Nothing was changed.');
 assert.equal(notes.notesActionFailureText(new DOMException('This operation was aborted','AbortError')),notes.NOTES_ACTION_FAILED);
 assert.equal(notes.notesActionFailureText(new Error('Invalid Notes envelope')),notes.NOTES_ACTION_FAILED);
 const adapter=source('apps/app/src/prototype/agent-adapter.ts');
 assert.match(adapter,/:notesActionFailureText\(error\)\};/);
 assert.doesNotMatch(adapter,/'Notes outcome is uncertain\. Review history; do not repeat automatically\.':\(error as Error\)\.message/);
});

// --- Chat approval and action history: Clock review, validators, native journal -----------------
const actions=await import('../apps/app/src/ui/device-actions/device-action-messages.ts');
const clock=await import('../apps/app/src/ui/clock/clock-handoff-presentation.ts');
const {currentClockTimeZone}=await import('../apps/app/src/runtime/clock-contract.ts');
test('an approval or action-history failure never shows a shared sentence',()=>{
 const handoff=staged('plugins/plugin-assistant/src/services/device-actions/clock-handoff.ts');
 const contract=staged('plugins/plugin-assistant/src/services/device-actions/clock-contract.ts');
 const assertZone=handoff.slice(handoff.indexOf('export function assertClockHandoffTimeZone('),handoff.indexOf('export function assertClockHandoffObservation('));
 const zoneChanged=/Error\("([^"]+)"\)/.exec(assertZone)[1];
 const zoneInvalid=[...new Set(literals(contract.slice(contract.indexOf('export function clockTimeZone('),contract.indexOf('export function clockTimeZone(')+700),/Error\("([^"]+)"\)/g))];
 assert.deepEqual(zoneInvalid,['Invalid Clock time zone']);
 assert.ok(handoff.includes('throw Error("Invalid Clock handoff operation")'));
 assert.deepEqual([...clock.CLOCK_REVIEW_REFUSALS.keys()].sort(),[zoneChanged,zoneInvalid[0],'Invalid Clock handoff operation'].sort());
 assert.equal(actions.deviceActionFailureText(new Error(zoneChanged)),'This Clock request used a different time zone. Ask again from this phone.');
 assert.equal(actions.deviceActionFailureText(new Error('Invalid Clock time zone')),clock.CLOCK_ZONE_UNREADABLE);
 assert.equal(actions.deviceActionFailureText(new Error('Invalid Clock handoff operation')),'This Clock request isn’t one Alpha can open. Ask again. Nothing was sent.');
 // The coordinator's own notice for a changed zone is the same sentence.
 const coordinator=source('apps/app/src/ui/device-actions/client-coordinator.ts');
 assert.ok(coordinator.includes(JSON.stringify(clock.CLOCK_ZONE_CHANGED)));
 // The native journal's refusal (ActionJournalPlugin.refusal, not overridden by Alpha).
 const journal=vendor('plugins/plugin-native-action-journal/android/src/main/java/ai/eliza/plugins/actionjournal/ActionJournalPlugin.java');
 const refusal=/protected String refusal\(\) \{ return "([^"]+)"; \}/.exec(journal)[1];
 assert.doesNotMatch(source('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaActionJournalPlugin.java'),/refusal\(\)/);
 assert.equal(actions.deviceActionFailureText(rejection(refusal)),actions.ACTION_JOURNAL_REFUSED);
 assert.equal(actions.deviceActionRefusal(rejection(refusal)),actions.ACTION_JOURNAL_REFUSED);
 assert.equal(actions.deviceActionFailureText(rejection('Some native sentence')),actions.DEVICE_ACTION_FAILED);
 // A shared validator's refusal the coordinator rethrows reads as the review card's notice.
 const validator=actions.sharedValidatorRefusal(new Error('Phone dial capability not negotiated'));
 assert.equal(actions.deviceActionFailureText(validator),actions.DEVICE_ACTION_UNAVAILABLE);
 assert.equal(actions.deviceActionRefusal(validator),actions.DEVICE_ACTION_UNAVAILABLE);
 assert.match(coordinator,/throw sharedValidatorRefusal\(failures\[0\]\);/);
 assert.ok(coordinator.includes('notice: "This action isn\'t available on this phone."'));
 // Alpha's own refusals on the path pass through.
 assert.equal(actions.deviceActionFailureText(new Error('No longer pending')),'No longer pending');
 assert.equal(actions.deviceActionFailureText('nope'),actions.DEVICE_ACTION_FAILED);
 const adapter=source('apps/app/src/prototype/agent-adapter.ts');
 assert.match(adapter,/this\.agentSay\(deviceActionFailureText\(e\)\);/);
 assert.match(source('apps/app/src/runtime/connection-ui.tsx'),/const deviceRefusal = deviceActionRefusal\(error\);\n\s*if \(deviceRefusal\) return deviceRefusal;/);
});

test('the Clock form words a time zone the shared check refuses',()=>{
 assert.throws(()=>clock.buildClockHandoffRequest({action:'set',time:'07:00',label:'',snooze:'10',days:[]},'Not/AZone'),{message:clock.CLOCK_ZONE_UNREADABLE});
 assert.throws(()=>clock.alphaClockTimeZone(()=>{throw Error('Invalid Clock time zone');}),{message:clock.CLOCK_ZONE_UNREADABLE});
 assert.equal(typeof currentClockTimeZone(),'string');
 const original=Intl.DateTimeFormat;
 Intl.DateTimeFormat=function(){return {resolvedOptions:()=>({timeZone:'Not/AZone'})};};
 try{assert.throws(()=>currentClockTimeZone(),{message:clock.CLOCK_ZONE_UNREADABLE});}
 finally{Intl.DateTimeFormat=original;}
});
