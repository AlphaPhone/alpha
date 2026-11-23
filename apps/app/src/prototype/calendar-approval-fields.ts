import type {CalendarApproval} from '../runtime/calendar-approval.ts';
import {localePreferences} from './locale-time.ts';
import {calendarApprovalRequestText} from '../ui/calendar/calendar-approval-messages.ts';
export type CalendarApprovalLabels={calendar?:string;account?:string;event?:string;eventStartsAt?:number;eventEndsAt?:number;eventAllDay?:boolean;targetVerified?:true};
type Field={label:string;value:string};
type Bag=Record<string,any>;
/** The reviewed calendar and, for a change or cancellation, its current event, from one read of the
 * owner's sources and events. The target is verified only when exactly one source and one event match
 * the request, the event still starts when the request says, and it still has the provider version
 * the request was made against. */
export function calendarApprovalTarget(payload:Record<string,unknown>,calendars:readonly Bag[],events:readonly Bag[]):CalendarApprovalLabels{
 const p=payload,matches=(value:Bag)=>value.calendarId===p.calendarId&&value.side==='owner'&&String(value.grantId??'')===String(p.grantId??'')&&(!p.expectedProvider||value.provider===p.expectedProvider);
 const sources=calendars.filter(matches);if(sources.length!==1)return {};
 const found=events.filter(event=>matches(event)&&(event.externalId===p.eventId||event.id===p.eventId)&&(p.expectedEventStartAtMs==null||Date.parse(event.startAt)===p.expectedEventStartAtMs));
 const event=found.length===1?found[0]:undefined,start=Date.parse(event?.startAt??''),end=Date.parse(event?.endAt??''),etag=event?.metadata?.etag;
 const unchanged=p.expectedProviderVersion==null||typeof etag==='string'&&etag.trim()===p.expectedProviderVersion;
 return {calendar:sources[0].summary||undefined,account:sources[0].accountEmail||undefined,event:event?.title,eventStartsAt:start,eventEndsAt:end,eventAllDay:event?.isAllDay===true,...(event&&unchanged&&Number.isFinite(start)&&Number.isFinite(end)&&end>start?{targetVerified:true as const}:{})};
}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown):value is string=>typeof value==='string';
const instant=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&Number.isFinite(new Date(value).getTime());
const localTime=(value:number)=>{const date=new Date(value),preferences=localePreferences();return new Intl.DateTimeFormat(preferences.locale,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',...(date.getSeconds()?{second:'2-digit' as const}:{}),hourCycle:preferences.hourCycle,timeZoneName:'short'}).format(date);};
const dateText=(value:string)=>{const date=new Date(value+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw Error('Invalid date');return new Intl.DateTimeFormat(localePreferences().locale,{timeZone:'UTC',year:'numeric',month:'long',day:'numeric'}).format(date);};
const DAY_NAMES:Record<string,string>={MO:'Monday',TU:'Tuesday',WE:'Wednesday',TH:'Thursday',FR:'Friday',SA:'Saturday',SU:'Sunday'};
const UNITS:Record<string,string>={DAILY:'day',WEEKLY:'week',MONTHLY:'month',YEARLY:'year'};
/** One repeat rule in plain words, or null when it has a part these words would leave out. */
const repeatSentence=(rule:string):string|null=>{
 const parts=new Map<string,string>();
 for(const part of rule.replace(/^RRULE:/i,'').split(';')){const at=part.indexOf('='),key=part.slice(0,at).toUpperCase();if(at<1||parts.has(key)||!['FREQ','INTERVAL','BYDAY','COUNT','UNTIL'].includes(key))return null;parts.set(key,part.slice(at+1).toUpperCase());}
 const unit=UNITS[parts.get('FREQ')??''],interval=parts.get('INTERVAL')??'1',days=parts.get('BYDAY')?.split(',')??[],count=parts.get('COUNT'),until=/^(\d{4})(\d{2})(\d{2})(?:T\d{6}Z?)?$/.exec(parts.get('UNTIL')??'');
 if(!unit||!/^[1-9]\d{0,2}$/.test(interval)||days.some(day=>!DAY_NAMES[day])||new Set(days).size!==days.length||days.length&&unit!=='week'||count!==undefined&&!/^[1-9]\d{0,3}$/.test(count)||parts.has('UNTIL')&&!until||count!==undefined&&until)return null;
 const weekdays=days.length===5&&['MO','TU','WE','TH','FR'].every(day=>days.includes(day));
 const every=weekdays&&interval==='1'?'Every weekday':(interval==='1'?`Every ${unit}`:`Every ${interval} ${unit}s`)+(days.length?' on '+new Intl.ListFormat('en',{type:'conjunction'}).format(days.map(day=>DAY_NAMES[day])):'');
 return every+(count?`, ${count} time${count==='1'?'':'s'}`:'')+(until?', until '+dateText(`${until[1]}-${until[2]}-${until[3]}`):'');
};
const repeatText=(rules:unknown)=>{
 if(!Array.isArray(rules)||rules.some(rule=>typeof rule!=='string'))throw Error('Invalid repeat');
 if(!rules.length)return 'Does not repeat';
 // A rule with a part outside these words is shown in full, so nothing the approval would apply is hidden.
 const words:Record<string,string>={FREQ:'Frequency',DAILY:'Daily',WEEKLY:'Weekly',MONTHLY:'Monthly',YEARLY:'Yearly',INTERVAL:'Every',BYDAY:'Days',COUNT:'Occurrences',UNTIL:'Until',MO:'Mon',TU:'Tue',WE:'Wed',TH:'Thu',FR:'Fri',SA:'Sat',SU:'Sun'};
 return (rules as string[]).map(rule=>repeatSentence(rule)??rule.replace(/^RRULE:/,'').split(';').map(part=>part.split('=').map(value=>value.split(',').map(word=>words[word]??word).join(', ')).join(': ')).join(' · ')).join('\n');
};
/** Only effect fields are shown. Provider versions and request IDs remain authority, not prose. */
export function calendarApprovalFields(row:CalendarApproval,labels:CalendarApprovalLabels={}){
 const p=row.payload,fields:Field[]=[],add=(label:string,value:string)=>fields.push({label,value});
 // An invitation answer (elizaOS/eliza#39947) is a modify_event that carries only invitationResponse.
 const response=row.action==='modify_event'&&p.invitationResponse!=null?p.invitationResponse:undefined;
 const heading=row.action==='schedule_event'?'Add event':response==='accepted'?'Accept invitation':response==='tentative'?'Answer maybe':row.action==='modify_event'?'Change event':p.cancellationMode==='decline_invitation'?'Decline invitation':p.cancellationMode==='remove_private_copy'?'Remove event from your calendar':'Cancel event';
 let complete=true;
 add('Calendar',labels.calendar??(p.calendarId==='primary'?'Primary calendar':String(p.calendarId)));
 if(labels.account)add('Account',labels.account);
 const common=['action','side','grantId','calendarId','notifyAttendees','editorRequestSha256'];
 const allowed=row.action==='schedule_event'?[...common,'title','startsAtMs','endsAtMs','attendees','location','description','timeZone','allDay','durationMinutes','windowPreset','recurrence','sourceNote','travelBuffer']:row.action==='modify_event'?[...common,'eventId','expectedProvider','expectedProviderVersion','expectedEventUpdatedAt','expectedEventStartAtMs','seriesMaster','recurrenceScope','patch','invitationResponse']:[...common,'eventId','expectedProvider','expectedProviderVersion','expectedEventUpdatedAt','expectedEventStartAtMs','seriesMaster','recurrenceScope','cancellationMode'];
 if(Object.keys(p).some(key=>!allowed.includes(key)))complete=false;
 try{
  if(row.action!=='schedule_event'&&(!text(p.eventId)||!p.eventId))throw Error('Event unavailable');
  if(row.action!=='schedule_event'){
   if(labels.targetVerified!==true||!labels.event?.trim()||!instant(labels.eventStartsAt)||!instant(labels.eventEndsAt)||labels.eventEndsAt<=labels.eventStartsAt)throw Error('Current event details unavailable');
   if(p.expectedEventStartAtMs!=null&&p.expectedEventStartAtMs!==labels.eventStartsAt)throw Error('The reviewed occurrence is unavailable');
   add('Event',labels.event);
   if(labels.eventAllDay){const start=new Date(labels.eventStartsAt).toISOString().slice(0,10),end=new Date(labels.eventEndsAt-86400000).toISOString().slice(0,10);add('Current dates',dateText(start)+(start===end?'':' – '+dateText(end)));add('Current time','All day');}
   else{add('Current start',localTime(labels.eventStartsAt));add('Current end',localTime(labels.eventEndsAt));}
  }
  const value=row.action==='modify_event'?p.patch:p;
  if(!object(value))throw Error('Details unavailable');
  if(row.action==='modify_event'&&Object.keys(value).some(key=>!['title','startsAtMs','endsAtMs','attendees','location','description','timeZone','recurrence','allDay'].includes(key)))complete=false;
  if(response!==undefined){
   if(response!=='accepted'&&response!=='tentative')throw Error('Invalid answer');
   if(Object.values(value).some(value=>value!=null))throw Error('An answer changes nothing else');
   add('Answer',response==='accepted'?'Going':'Maybe');
  }else if(row.action!=='cancel_event'){
   if(['title','startsAtMs','endsAtMs','attendees','location','description'].some(key=>!(key in value)))throw Error('Incomplete event details');
   if(row.action==='modify_event'&&!Object.values(value).some(value=>value!=null))throw Error('No changes');
   if(row.action==='schedule_event'&&(!text(value.title)||!value.title.trim()))throw Error('Title unavailable');
   if(value.title!=null){if(!text(value.title))throw Error('Invalid title');add('Title',value.title||'No title');}
   if(value.allDay){
    if(!object(value.allDay)||!text(value.allDay.startDate)||!text(value.allDay.endDateExclusive))throw Error('Invalid all-day dates');
    const start=dateText(value.allDay.startDate),end=new Date(value.allDay.endDateExclusive+'T12:00:00Z');dateText(value.allDay.endDateExclusive);end.setUTCDate(end.getUTCDate()-1);if(end.getTime()<Date.parse(value.allDay.startDate+'T12:00:00Z'))throw Error('Invalid all-day range');
    add('Date',start+(end.toISOString().slice(0,10)===value.allDay.startDate?'':' – '+dateText(end.toISOString().slice(0,10))));add('Time','All day');
   }else{
    if(row.action==='schedule_event'&&(!instant(value.startsAtMs)||!instant(value.endsAtMs)||value.endsAtMs<=value.startsAtMs))throw Error('Time unavailable');
    if(value.startsAtMs!=null){if(!instant(value.startsAtMs))throw Error('Invalid start');add('Starts',localTime(value.startsAtMs));}
    if(value.endsAtMs!=null){if(!instant(value.endsAtMs))throw Error('Invalid end');add('Ends',localTime(value.endsAtMs));}
    if(instant(value.startsAtMs)&&instant(value.endsAtMs)&&value.endsAtMs<=value.startsAtMs)throw Error('Invalid time range');
   }
   if(value.timeZone!=null){if(!text(value.timeZone))throw Error('Invalid time zone');new Intl.DateTimeFormat(undefined,{timeZone:value.timeZone});add('Event time zone',value.timeZone);}
   for(const [key,label,empty] of [['location','Location','No location'],['description','Notes','No notes']] as const)if(value[key]!=null){if(!text(value[key]))throw Error('Invalid text');add(label,value[key]||empty);}
   if(row.action==='schedule_event'&&!Array.isArray(value.attendees))throw Error('Guests unavailable');
   if(value.attendees!=null){if(!Array.isArray(value.attendees))throw Error('Guests unavailable');add('Guests',value.attendees.length?value.attendees.map(person=>{if(text(person))return person;if(!object(person)||!text(person.email)||person.optional!==undefined&&typeof person.optional!=='boolean')throw Error('Invalid guest');return `${text(person.displayName)&&person.displayName?person.displayName+' · ':''}${person.email}${person.optional?' (optional)':''}`;}).join('\n'):'No guests');}
   if(value.recurrence!=null)add('Repeat',repeatText(value.recurrence));
  }else{if(p.cancellationMode!=null&&!['organizer_cancel','decline_invitation','remove_private_copy'].includes(String(p.cancellationMode)))throw Error('Invalid cancellation');}
  if(p.recurrenceScope!=null){const scopes:Record<string,string>={instance:'This occurrence',this_and_following:'This and following',series:'Entire series'};if(!text(p.recurrenceScope)||!scopes[p.recurrenceScope])throw Error('Invalid scope');add('Applies to',scopes[p.recurrenceScope]);}
  if(p.notifyAttendees!==undefined&&typeof p.notifyAttendees!=='boolean')throw Error('Notifications unavailable');
  if(row.action==='cancel_event'&&typeof p.notifyAttendees!=='boolean')throw Error('Notifications unavailable');
  add('Notify guests',p.notifyAttendees===true?'Yes':'No');
  if(object(p.travelBuffer)){const buffer=p.travelBuffer;if(typeof buffer.bufferMinutes!=='number'||!Number.isFinite(buffer.bufferMinutes)||!text(buffer.method))throw Error('Invalid travel buffer');add('Travel buffer',`${buffer.bufferMinutes} minutes · ${buffer.method}`);if(text(buffer.originAddress))add('Travel from',buffer.originAddress);if(text(buffer.destinationAddress))add('Travel to',buffer.destinationAddress);}
 }catch{complete=false;}
 return {heading,reason:calendarApprovalRequestText(row.action,p,row.reason,labels.targetVerified===true?labels.event:undefined),fields,complete,note:complete?'Dates and times are shown in this phone’s time zone.':'Current event details could not be verified. Decline this request or open Calendar and review the event before trying again.'};
}
