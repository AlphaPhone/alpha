import assert from 'node:assert/strict';
import test from 'node:test';
import { directOwnerAction, emailOwnerRequest, namedNoteOpenRequest, openAfterNoteCreate, referencedNoteOpenRequest, smsOwnerRequest } from '../apps/app/src/ui/device-actions/owner-request.ts';

test('direct messages preserve the exact authored recipient and body and distinguish a draft',()=>{
  assert.deepEqual(smsOwnerRequest('Send a text to Carson saying On my way.'),{send:true,recipient:'carson',body:'On my way.'});
  assert.deepEqual(smsOwnerRequest('Draft a text to Carson'),{send:false,recipient:'carson',body:undefined});
  assert.equal(smsOwnerRequest('Do not send a text to Carson saying On my way.'),undefined);
  assert.deepEqual(emailOwnerRequest('Send an email to crew@example.invalid with subject Shoot plan saying Bring the tripod.'),{recipient:'crew@example.invalid',subject:'Shoot plan',body:'Bring the tripod.'});
});

test('direct deletion and private sharing never substitute a different item',()=>{
  const files={view:'files'};
  assert.equal(directOwnerAction({type:'files_trash',paths:['/Drafts/Old.txt']},'Delete file "/Drafts/Old.txt"',files),true);
  assert.equal(directOwnerAction({type:'files_trash',paths:['/Drafts/Other.txt']},'Delete file "/Drafts/Old.txt"',files),false);
  assert.equal(directOwnerAction({type:'files_share',paths:['/Drafts/Old.txt','/Drafts/Other.txt']},'Share file "/Drafts/Old.txt"',files),false);
  assert.equal(directOwnerAction({type:'files_share',paths:['/Drafts/Old.txt']},'Share file "/Drafts/Old.txt"',files),true);
  assert.equal(directOwnerAction({type:'contact_delete',query:'Carson'},'Delete the contact Carson',{view:'contacts'}),true);
  assert.equal(directOwnerAction({type:'notes_read_selected'},'Share the selected note',{view:'notes'}),true);
});

test('Calendar and reminder updates require a selected target and exact times',()=>{
  const start='2026-11-30T12:00:00Z',end='2026-11-30T12:30:00Z';
  const fields={title:'Shoot',description:'',location:'',start,end,timeZone:'UTC'};
  const selected={view:'calendar',selectedObject:{kind:'calendar-event',id:'event-1'}};
  const calendar={type:'calendar_update',target:{eventId:'event-1'},fields};
  assert.equal(directOwnerAction(calendar,`Reschedule event Shoot from ${start} to ${end}`,selected),true);
  assert.equal(directOwnerAction(calendar,`Reschedule event Shoot from ${start} to ${end}`,{...selected,selectedObject:{id:'event-2'}}),false);
  assert.equal(directOwnerAction(calendar,'Reschedule event Shoot to noon',selected),false);
  const at=Date.parse(start), reminder={type:'reminder_update',target:{reminderId:'reminder-1'},fields:{title:'Charge the Pixel',body:'',schedule:{at,dueAt:at,recurrence:null,alertMinutes:null}}};
  assert.equal(directOwnerAction(reminder,`Update reminder Charge the Pixel at ${start}`,{view:'calendar',selectedObject:{kind:'reminder',id:'reminder-1'}}),true);
  assert.equal(directOwnerAction(reminder,`Update reminder Charge the Pixel at ${end}`,{view:'calendar',selectedObject:{kind:'reminder',id:'reminder-1'}}),false);
  const tomorrow=new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
  tomorrow.setUTCHours(15,0,0,0);
  const next=tomorrow.getTime();
  assert.equal(directOwnerAction({...reminder,fields:{...reminder.fields,schedule:{at:next,dueAt:next,recurrence:null,alertMinutes:null}}},
    'Update reminder Charge the Pixel tomorrow at 3 pm',{view:'calendar',timeZone:'UTC',selectedObject:{kind:'reminder',id:'reminder-1'}}),true);
});

test('named note opening requires an explicit Notes or note reference',()=>{
  assert.equal(namedNoteOpenRequest('In the Notes app, open the note titled Taco Night Groceries.'),'Taco Night Groceries');
  assert.equal(namedNoteOpenRequest('Switch to Notes and show me the note called Groceries.'),'Groceries');
  assert.equal(namedNoteOpenRequest('Open "Ideas in Notes." in Notes.'),'Ideas in Notes.');
  assert.equal(namedNoteOpenRequest('Open the note titled Notes.'),'Notes');
  assert.equal(namedNoteOpenRequest('Open the note titled Most Recent.'),'Most Recent');
  assert.equal(namedNoteOpenRequest('Open “Newest” in Notes.'),'Newest');
  assert.equal(namedNoteOpenRequest('open browser grocery note'),'browser grocery');
  assert.equal(namedNoteOpenRequest('Show me my Browser Grocery note.'),'Browser Grocery');
  assert.equal(namedNoteOpenRequest('Open browser grocery in Notes.'),'browser grocery');
  assert.equal(namedNoteOpenRequest('Can you open the shopping list note, please?'),'shopping list');
  assert.equal(namedNoteOpenRequest('Thank you. Can you open the note titled shopping list?'),'shopping list');
  assert.equal(namedNoteOpenRequest('Can you open up that shopping list in the notes app, please?'),'shopping list');
  assert.equal(namedNoteOpenRequest('Thanks. Don’t open the shopping list note.'),undefined);
  assert.equal(namedNoteOpenRequest('Could you open the trip budget note please?'),'trip budget');
  assert.equal(namedNoteOpenRequest('Open the note titled “Dinner, Please”.'),'Dinner, Please');
  assert.equal(namedNoteOpenRequest('Take me to my travel plans note.'),'travel plans');
  for (const prompt of ['Open Notes.','Open "Calendar".','Open the note you just created.','Read the note titled Groceries.',
    'Show me what I wrote in Notes.','Open a new note.','Open this note.','Delete the note called Groceries.',
    'Open my most recent note.','Open my newest note.','Open the note I just created.','Open the last edited note.','Open a new blank note.',
    'Open the note I last edited.','Open the note I most recently saved.','Open the note I just wrote.']) assert.equal(namedNoteOpenRequest(prompt),undefined);
});

test('note follow-ups and create-and-open keep distinct navigation intent',()=>{
  assert.ok(referencedNoteOpenRequest('Open that note, please.'));
  assert.ok(referencedNoteOpenRequest('Switch to the Notes view and show me the note you just made.'));
  assert.ok(referencedNoteOpenRequest("Yeah. Can you, why didn't you just open the notes view? and switch to that note or open that note?"));
  assert.ok(!referencedNoteOpenRequest('Open that note or open Calendar.'));
  assert.ok(!referencedNoteOpenRequest('Open the last edited note.'));
  assert.ok(!referencedNoteOpenRequest('Read that note.'));
  assert.ok(!referencedNoteOpenRequest('Do not open that note.'));
  assert.ok(openAfterNoteCreate('Make a checklist from it called Taco Night Groceries and open it.'));
  assert.ok(openAfterNoteCreate('Could you write a note called Budget, then show it?'));
  assert.ok(openAfterNoteCreate('Could you write a note called Budget, then show me that note?'));
  assert.ok(!openAfterNoteCreate('Make a note called Budget and open Calendar.'));
  assert.ok(!openAfterNoteCreate('Write a note about how to open Calendar.'));
});
