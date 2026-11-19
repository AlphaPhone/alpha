/**
 * Calendar's Schedule mode and event search (CAL-17), over the rows Calendar has already read.
 *
 * Schedule lists what is on from today to the end of the read window, one heading per day. Search
 * lists the read window's events whose title, place or notes contain the words typed. Neither
 * reads anything new: both say which dates they cover, so a missing event outside them is not
 * taken for "none". Each event is listed once, on its first day in the list; its own time line
 * says when it ends.
 *
 * View rules (CalendarPresentation.qnt): choosing a view closes an open event and the date picker,
 * and is refused while an event form is open; Schedule always starts today, and closing an event
 * opened from it returns to today; Back closes search after the form, the event and the date picker.
 */
import {formatLongDate,formatMonthDay,formatTime} from './locale-time';
type Bag=Record<string,any>;
const DAY=86400000;
export type CalendarListMode='day'|'schedule';
const midnight=(now:number,off:number)=>{const d=new Date(now);return new Date(d.getFullYear(),d.getMonth(),d.getDate()+off).getTime();};
const dayOf=(now:number,at:number)=>{const d=new Date(at),today=new Date(now);return Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/DAY);};
const fold=(value:unknown)=>String(value??'').normalize('NFKC').toLocaleLowerCase();
/** The interval a row covers. All-day rows cover whole civil days by their day offsets. */
export function calendarRowSpan(row:Bag,now:number):{begin:number;end:number}|null{
 if(row.allDay){const first=Number(row.off),last=Number(row.allDayEndOff??row.off+1);if(!Number.isFinite(first)||!Number.isFinite(last))return null;return{begin:midnight(now,first),end:midnight(now,Math.max(last,first+1))};}
 if(row.calendarIntervalData&&Number.isFinite(row.calendarIntervalData.begin)&&Number.isFinite(row.calendarIntervalData.end))return{begin:row.calendarIntervalData.begin,end:row.calendarIntervalData.end};
 const start=midnight(now,Number(row.off))+Number(row.t)*3600000;
 return Number.isFinite(start)?{begin:start,end:start+Math.max(0,Number(row.d)||0)*3600000}:null;
}
/** Words typed into search match the title, place or notes, in any case. */
export function calendarRowMatches(row:Bag,query:string){
 const words=fold(query).split(/\s+/).filter(Boolean);
 if(!words.length)return true;
 const text=[row.title,row.where,row.notes].map(fold).join('\n');
 return words.every(word=>text.includes(word));
}
function timeText(row:Bag,span:{begin:number;end:number},now:number){
 if(row.allDay){const days=Math.round((span.end-span.begin)/DAY);return days>1?`All day · until ${formatMonthDay(new Date(span.end-1))}`:'All day';}
 const start=new Date(span.begin),end=new Date(span.end);
 const sameDay=dayOf(now,span.begin)===dayOf(now,Math.max(span.begin,span.end-1));
 return `${formatTime(start)} – ${sameDay?'':formatMonthDay(end)+' '}${formatTime(end)}`;
}
export type CalendarListGroup={key:string;label:string;items:{key:string;title:string;time:string;where:string;open:()=>void}[]};
/**
 * The listed days. `from`/`to` bound the instants listed (to is exclusive); an event still on at
 * `from` is listed on that day.
 */
export function calendarListGroups(rows:readonly Bag[],now:number,from:number,to:number,query:string|null,open:(row:Bag,off:number)=>void):CalendarListGroup[]{
 const listed:{row:Bag;span:{begin:number;end:number};off:number}[]=[];
 for(const row of rows){
  const span=calendarRowSpan(row,now);
  if(!span||span.end<=from||span.begin>=to)continue;
  if(query!==null&&!calendarRowMatches(row,query))continue;
  listed.push({row,span,off:dayOf(now,Math.max(span.begin,from))});
 }
 listed.sort((a,b)=>a.off-b.off||Number(!!b.row.allDay)-Number(!!a.row.allDay)||a.span.begin-b.span.begin||String(a.row.title).localeCompare(String(b.row.title)));
 const groups=new Map<number,CalendarListGroup>();
 for(const {row,span,off} of listed){
  let group=groups.get(off);
  if(!group){const date=new Date(midnight(now,off));group={key:String(off),label:off===0?`Today · ${formatLongDate(date)}`:off===1?`Tomorrow · ${formatLongDate(date)}`:formatLongDate(date),items:[]};groups.set(off,group);}
  group.items.push({key:String(row.id),title:String(row.title||'Event'),time:timeText(row,span,now),where:String(row.where||''),open:()=>open(row,off)});
 }
 return [...groups.values()];
}
/** Template values for the list modes. `window` is the range Calendar read; `ready` says that read completed. */
export function presentCalendarList(state:Bag,api:Bag,rows:readonly Bag[],window:{timeMin:string;timeMax:string},ready:boolean,statusText:string){
 const now=Number(api.now),mode:CalendarListMode=state.calendarMode==='schedule'?'schedule':'day';
 const search=typeof state.calendarSearch==='string'?state.calendarSearch:null;
 const start=Date.parse(window.timeMin),end=Date.parse(window.timeMax),today=midnight(now,0);
 const from=search!==null?start:Math.max(start,today);
 const openRow=(row:Bag,off:number)=>api.set({open:row.id,openDay:off});
 const groups=Number.isFinite(from)&&Number.isFinite(end)?calendarListGroups(rows,now,from,end,search===null||!search.trim()?null:search,openRow):[];
 const searching=search!==null,listMode=searching||mode==='schedule';
 const covered=Number.isFinite(from)&&Number.isFinite(end)&&end>from?`${formatMonthDay(new Date(from),true)} – ${formatMonthDay(new Date(end-1),true)}`:'';
 // A list is only empty when the read behind it completed; otherwise it says why.
 const emptyText=!ready?statusText||'Loading':searching&&search!.trim()?'No matching events':searching?'No events':'No upcoming events';
 const blocked=()=>{if(state.form){api.toast('Finish current event');return true;}return false;};
 const choose=(next:CalendarListMode)=>{if(blocked())return;api.set({calendarMode:next,month:null,open:null,openDay:null,...(next==='schedule'?{day:0}:{})});};
 return{
  scheduleAvailable:true,scheduleMode:mode==='schedule',listMode,searching,
  listGroups:groups,listEmpty:!groups.length,listEmptyText:emptyText,
  listRange:covered?(searching?`Searching ${covered}`:`Through ${formatMonthDay(new Date(end-1),true)}`):'',
  listLabel:searching?'Search results':'Schedule',
  calendarViews:[{label:'Day',pressed:mode==='day',pick:()=>choose('day')},{label:'Schedule',pressed:mode==='schedule',pick:()=>choose('schedule')}],
  searchText:search??'',
  openSearch:()=>{if(blocked())return;api.set({calendarSearch:'',month:null,open:null,openDay:null});},
  onSearch:(event:Event)=>api.set({calendarSearch:String((event.target as HTMLInputElement|null)?.value??'')}),
  closeSearch:()=>api.set({calendarSearch:null,...(mode==='schedule'?{day:0}:{})}),
 };
}
/** Back closes search after the form, the open event and the date picker; an event closed in Schedule returns to today. */
export function installCalendarListBack(views:Bag){
 const back=views.calendar.back;
 views.calendar.back=function(this:unknown,state:Bag,api:Bag){
  const schedule=state.calendarMode==='schedule',closesScheduleEvent=schedule&&!!state.open&&!state.form,searching=typeof state.calendarSearch==='string';
  const handled=back?back.call(this,state,api):false;
  if(handled){if(closesScheduleEvent)api.set({day:0});return true;}
  if(searching){api.set({calendarSearch:null,...(schedule?{day:0}:{})});return true;}
  return false;
 };
 views.calendar.persist=Array.from(new Set([...(views.calendar.persist??[]),'calendarMode']));
}
