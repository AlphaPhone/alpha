/** Read-only detail lines for an Agent Calendar event. Inputs are provider feed fields; nothing here writes. */
type DetailEvent={provider?:string;htmlLink?:string|null;conferenceLink?:string|null;recurrence?:string[]|null;recurringEventId?:string|null;attendees?:{responseStatus?:string|null;self?:boolean;organizer?:boolean}[]|null};

/** Only a plain HTTPS address without credentials leaves Alpha. */
export function calendarHttpsLink(value:unknown):URL|null{
 if(typeof value!=='string'||!value)return null;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url:null;}catch{return null;}
}

/** The owner's answer to an invitation, or null when the owner was not invited. The owner's own organized events are
 * never invitations. An imported feed's lowercased PARTSTAT reads the same as Google's wire value. */
export function calendarInvitationAnswer(event:DetailEvent):'needsAction'|'accepted'|'tentative'|'declined'|null{
 const own=event.attendees?.find(guest=>guest.self&&!guest.organizer);if(!own)return null;
 const status=own.responseStatus==='needs-action'?'needsAction':own.responseStatus;
 return status==='needsAction'||status==='accepted'||status==='tentative'||status==='declined'?status:null;
}
/** The owner was invited and has not answered. */
export const calendarInvitationPending=(event:DetailEvent)=>calendarInvitationAnswer(event)==='needsAction';
/** What the detail says about the owner's answer. */
export const CALENDAR_INVITATION_NOTICE={needsAction:'You haven’t answered this invitation.',accepted:'You’re going.',tentative:'You said maybe.',declined:'You declined this invitation.'} as const;

const DAYS:Record<string,string>={MO:'Mon',TU:'Tue',WE:'Wed',TH:'Thu',FR:'Fri',SA:'Sat',SU:'Sun'};
const UNITS:Record<string,[string,string]>={DAILY:['daily','days'],WEEKLY:['weekly','weeks'],MONTHLY:['monthly','months'],YEARLY:['yearly','years']};
/** One plain line for a repeating event. A rule this cannot read still says that the event repeats. */
export function calendarRepeatText(event:DetailEvent):string{
 const rules=Array.isArray(event.recurrence)?event.recurrence.filter(rule=>typeof rule==='string'&&rule.startsWith('RRULE:')):[];
 if(!rules.length)return event.recurringEventId||event.recurrence?.length?'Repeats':'';
 if(rules.length>1)return 'Repeats';
 const parts=Object.fromEntries(rules[0].slice(6).split(';').map(part=>part.split('=') as [string,string]));
 const unit=UNITS[parts.FREQ],interval=parts.INTERVAL===undefined?1:Number(parts.INTERVAL);
 if(!unit||!Number.isInteger(interval)||interval<1)return 'Repeats';
 const days=parts.BYDAY?.split(',')??[];
 if(parts.FREQ==='WEEKLY'&&days.length&&days.every(day=>DAYS[day])){
  if(interval===1&&days.join(',')==='MO,TU,WE,TH,FR')return 'Repeats every weekday';
  return (interval===1?'Repeats weekly':`Repeats every ${interval} weeks`)+' on '+days.map(day=>DAYS[day]).join(', ');
 }
 return interval===1?'Repeats '+unit[0]:`Repeats every ${interval} ${unit[1]}`;
}

/** Links the detail offers. Google's event page is offered only for Google events. */
export function calendarEventLinks(event:DetailEvent){
 const video=calendarHttpsLink(event.conferenceLink),provider=event.provider==='google'?calendarHttpsLink(event.htmlLink):null;
 return {video,videoText:video?video.host+(video.pathname==='/'?'':video.pathname):'',provider};
}
