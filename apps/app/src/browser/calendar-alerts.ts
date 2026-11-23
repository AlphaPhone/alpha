import {calendarInstant} from './calendar-time';
import {DAY_MS,deviceTimeZone} from '../lib/civil-date';
import {CALENDAR_ALERT_MINUTES,calendarRange,type CalendarRecord} from './calendar-records';
type CalendarAlert={id:string;eventId:string;revision:string;receipt:string;title:string;text:string;at:number};
/** Catch up foreground alerts from the last day; future notices stay invisible. */
export function calendarAlerts(events:CalendarRecord[],dismissed:Record<string,number>,now=Date.now()):CalendarAlert[]{
 const rows=calendarRange(events,{begin:now-2*DAY_MS,end:now+2*DAY_MS}).events;
 return rows.filter(row=>row.alert!=null&&CALENDAR_ALERT_MINUTES.includes(row.alert)).flatMap(row=>{const start=row.allDay?calendarInstant(new Date(row.begin).toISOString().slice(0,10)+'T00:00:00',row.timeZone||deviceTimeZone(),Number.NaN,'forward'):row.begin,at=start-row.alert!*60000;if(at>now||at<=now-DAY_MS)return [];const receipt=encodeURIComponent(JSON.stringify([row.id,start,row.alert]));return dismissed[receipt]!==undefined?[]:[{id:'calendar:'+row.id,eventId:row.id,receipt,revision:receipt+':'+row.revision,title:row.title,text:row.body||'',at}];}).sort((a,b)=>b.at-a.at);
}
