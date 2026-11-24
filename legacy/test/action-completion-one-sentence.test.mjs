// After an approved device action the card is the completion, and its remark is one sentence
// (owner, 2026-11-17): a confirmation, or an honest failure, with no second explanatory or
// disclaimer sentence ("Nothing was changed.", "Final outcome remains pending.", "Check ...").
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const notes=await import('../apps/app/src/ui/notes/notes-action-messages.ts');
const named=await import('../apps/app/src/ui/calendar/named-read-messages.ts');
const reminders=await import('../apps/app/src/ui/reminders/reminder-result-messages.ts');
const {presentDeviceRecordOperation}=await import('../apps/app/src/runtime/device-record-presentation.ts');

// A second sentence starts after ". " / "? " / "! " or a "; " clause; ".581 PM" inside a time is not one.
const oneSentence=(value,label=value)=>{
 assert.equal(typeof value,'string',label);
 assert.match(value,/[.!?]$/,`ends as a sentence: ${label}`);
 assert.doesNotMatch(value,/[.!?;]\s+\S/,`one sentence: ${label}`);
};

test('approved Notes refusals are one sentence each',()=>{
 oneSentence(notes.NOTES_ACTION_FAILED);
 for(const alpha of notes.NOTES_ACTION_REFUSALS.values())oneSentence(alpha);
 oneSentence(notes.notesActionFailureText(new Error('Selected Notes context changed')));
 for(const own of ['Previous notes isn’t ready, so nothing was changed.','Nothing was changed because Notes is not set to On this phone.','There are no earlier notes on this phone, so nothing was changed.'])
  assert.equal(notes.notesActionFailureText(new Error(own)),own,'Alpha’s own refusal passes through');
});

test('named Calendar read receipts are one sentence each',()=>{
 for(const alpha of named.NAMED_CALENDAR_READ_SUMMARIES.values())oneSentence(alpha);
 for(const alpha of Object.values(named.NAMED_CALENDAR_READ_FALLBACK))oneSentence(alpha);
});

test('reminder delivery problems stay one honest sentence',()=>{
 for(const type of ['reminder_create','reminder_update','reminder_snooze','reminder_complete'])
  for(const status of reminders.REMINDER_DELIVERY_PROBLEMS.keys())oneSentence(reminders.reminderDeliveryProblemText(type,status));
});

test('reminder create and update completions are one confirming sentence; due details stay on the card',()=>{
 const zone='America/Los_Angeles',schedule={at:'2026-10-29T05:52:17.581Z',dueAt:'2026-10-29T05:52:17.581Z',alertMinutes:0};
 const created=presentDeviceRecordOperation({type:'reminder_create',fields:{title:'Stretch',body:'',schedule}},zone);
 assert.equal(created.appliedSummary,'Created reminder “Stretch”, due October 28, 2026 at 10:52:17.581 PM PDT (America/Los_Angeles).');
 assert.match(created.description,/Alert October 28, 2026 at 10:52 PM PDT\. Notification delivery may be approximate\./,'the card keeps the alert detail');
 const updated=presentDeviceRecordOperation({type:'reminder_update',fields:{title:'Stretch',body:'',schedule:{...schedule,alertMinutes:null}}},zone);
 assert.equal(updated.appliedSummary,'Updated reminder “Stretch”, due October 28, 2026 at 10:52:17.581 PM PDT (America/Los_Angeles).');
 assert.equal(presentDeviceRecordOperation({type:'reminder_update',fields:{title:'Stretch',body:'Stretch'}},zone).appliedSummary,'Updated reminder “Stretch”.');
 const legacy=presentDeviceRecordOperation({type:'create_reminder',title:'Stretch',dueAt:schedule.dueAt},zone);
 assert.equal(legacy.appliedSummary,'Created reminder “Stretch”, due October 28, 2026 at 10:52:17.581 PM PDT (America/Los_Angeles).');
 for(const presented of [created,updated,legacy]){oneSentence(presented.appliedSummary);assert.doesNotMatch(presented.appliedSummary,/Alert|approximate/);}
});

test('photo library refusals on the approved path are one sentence each',()=>{
 for(const path of ['apps/app/src/prototype/photo-library-adapter.ts','apps/app/src/prototype/camera-adapter.ts']){
  const text=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  for(const [,value] of text.matchAll(/new LibraryAgentRefusal\('([^']+)'\)/g))oneSentence(value);
 }
});

test('Calendar approval card results are one sentence each',async()=>{
 const calendar=await import('../apps/app/src/ui/calendar/calendar-approval-messages.ts');
 for(const map of [calendar.CALENDAR_APPROVAL_INVALIDATED,calendar.CALENDAR_APPROVAL_BLOCKED])for(const alpha of map.values())oneSentence(alpha);
 for(const alpha of Object.values(calendar.CALENDAR_APPROVAL_FALLBACK))oneSentence(alpha);
});
