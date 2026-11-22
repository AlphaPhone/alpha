// Agent Calendar event detail lines (CAL-07, CAL-09): join link, repeat line, invitation notice, guest
// and the Google Calendar link, from synthetic feed rows only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calendarEventLinks,calendarHttpsLink,calendarInvitationPending,calendarRepeatText} from '../apps/app/src/prototype/calendar-event-detail.ts';

test('only plain HTTPS links leave Alpha',()=>{
  assert.equal(calendarHttpsLink('https://meet.google.com/abc-defg-hij')?.href,'https://meet.google.com/abc-defg-hij');
  for(const value of ['http://meet.example/abc','javascript:alert(1)','https://user:pass@example.com/','not a url','',null,undefined,42])assert.equal(calendarHttpsLink(value),null,String(value));
});

test('the join line and Google link come from the feed, and Google’s page only for Google events',()=>{
  const google=calendarEventLinks({provider:'google',conferenceLink:'https://meet.google.com/abc-defg-hij',htmlLink:'https://www.google.com/calendar/event?eid=x'});
  assert.equal(google.videoText,'meet.google.com/abc-defg-hij');
  assert.equal(google.video?.href,'https://meet.google.com/abc-defg-hij');
  assert.equal(google.provider?.href,'https://www.google.com/calendar/event?eid=x');
  const local=calendarEventLinks({provider:'eliza',conferenceLink:null,htmlLink:'https://example.com/event'});
  assert.equal(local.video,null);assert.equal(local.videoText,'');assert.equal(local.provider,null);
  assert.equal(calendarEventLinks({provider:'google',htmlLink:'http://www.google.com/calendar/event?eid=x'}).provider,null);
});

test('a repeating event says how it repeats; an unreadable rule still says it repeats',()=>{
  const cases=[
    [['RRULE:FREQ=DAILY'],'Repeats daily'],
    [['RRULE:FREQ=DAILY;INTERVAL=3'],'Repeats every 3 days'],
    [['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'],'Repeats every weekday'],
    [['RRULE:FREQ=WEEKLY;BYDAY=MO,WE'],'Repeats weekly on Mon, Wed'],
    [['RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=FR'],'Repeats every 2 weeks on Fri'],
    [['RRULE:FREQ=WEEKLY'],'Repeats weekly'],
    [['RRULE:FREQ=MONTHLY;BYMONTHDAY=1'],'Repeats monthly'],
    [['RRULE:FREQ=YEARLY'],'Repeats yearly'],
    [['RRULE:FREQ=HOURLY'],'Repeats'],
    [['RRULE:FREQ=DAILY;INTERVAL=0'],'Repeats'],
    [['EXDATE:20261110T090000Z'],'Repeats'],
    [['RRULE:FREQ=DAILY','RRULE:FREQ=WEEKLY'],'Repeats'],
  ];
  for(const [recurrence,text] of cases)assert.equal(calendarRepeatText({recurrence}),text,recurrence.join(' '));
  assert.equal(calendarRepeatText({recurringEventId:'series-1'}),'Repeats','an occurrence of a series');
  assert.equal(calendarRepeatText({recurrence:null}),'');
  assert.equal(calendarRepeatText({}),'');
});

test('an unanswered invitation is the owner’s own needsAction row, never an event the owner organizes',()=>{
  assert.equal(calendarInvitationPending({attendees:[{self:true,organizer:false,responseStatus:'needsAction'}]}),true);
  assert.equal(calendarInvitationPending({attendees:[{self:true,organizer:false,responseStatus:'accepted'}]}),false);
  assert.equal(calendarInvitationPending({attendees:[{self:true,organizer:true,responseStatus:'needsAction'}]}),false);
  assert.equal(calendarInvitationPending({attendees:[{self:false,organizer:false,responseStatus:'needsAction'}]}),false);
  assert.equal(calendarInvitationPending({attendees:[{self:true,organizer:false,responseStatus:'needs-action'}]}),true,'an imported feed’s PARTSTAT');
  assert.equal(calendarInvitationPending({attendees:null}),false);
});

test('the event detail renders the repeat, invitation, Google notice and Google Calendar link the adapter sets',()=>{
  const template=readFileSync('apps/app/src/prototype/template.html','utf8'),adapter=readFileSync('apps/app/src/prototype/agent-calendar-adapter.ts','utf8');
  for(const key of ['repeatText','inviteNotice','providerNotice','openProvider','hasVideo','join']){
    assert.match(template,new RegExp(`\\{\\{calendar\\.ev\\.${key}\\}\\}`),key+' is rendered');
    assert.match(adapter,new RegExp(`out\\.ev\\.${key}=`),key+' is set for Agent Calendar events');
  }
  assert.match(template,/aria-label="Open in Google Calendar" onClick="\{\{calendar\.ev\.openProvider\}\}"/);
  assert.doesNotMatch(adapter,/providerNotice='Open in Google'/,'the managed Google notice says what to do there');
});

test('an unanswered invitation can be declined from its notice, and the event form says Alpha sends no alert',()=>{
  const template=readFileSync('apps/app/src/prototype/template.html','utf8'),adapter=readFileSync('apps/app/src/prototype/agent-calendar-adapter.ts','utf8');
  // Decline reuses the reviewed, Undo-able delete; only for an invitee, never for a managed Google calendar (del is null there).
  assert.ok(adapter.includes("out.ev.inviteDecline=out.ev.inviteNotice&&out.ev.singleDelete&&!out.ev.readOnly&&cancellationModeForEditorEvent(e)==='decline_invitation'?out.ev.del:null"));
  assert.ok(adapter.indexOf('out.ev.inviteDecline=')>adapter.indexOf('if(managed){out.ev.del=null;'),'set after the managed Google rule removes delete');
  assert.ok(template.includes('aria-label="Decline this invitation" disabled="{{calendar.ev.busy}}" onClick="{{calendar.ev.inviteDecline}}"'));
  assert.ok(adapter.includes("out.f.alerts=null;out.f.alertNote='Alpha won’t alert you about this event.';"));
  assert.ok(template.includes('{{calendar.f.alertNote}}'));
});
