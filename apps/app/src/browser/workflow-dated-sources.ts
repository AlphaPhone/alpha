import {workflowCalendarRange,readWorkflowCalendar} from './workflow-calendar';
type Bag=Record<string,any>;
/** Yesterday 18:00 until today 09:00 local time, or until now when that is earlier. */
export function workflowDateRange(now=new Date()){
 const begin=new Date(now);begin.setHours(0,0,0,0);const end=new Date(begin);
 begin.setDate(begin.getDate()-1);begin.setHours(18);end.setHours(9);end.setTime(Math.min(end.getTime(),now.getTime()));
 return {begin:begin.getTime(),end:end.getTime()};
}
export function datedRows(rows:Bag[],range:{begin:number;end:number}){
 let undated=0;const items=rows.filter(row=>{const time=row.receivedAt;if(typeof time!=='number'||!Number.isFinite(time)){undated++;return false;}return time>=range.begin&&time<range.end;});
 return {...range,items:structuredClone(items),undated};
}
export async function readDatedWorkflowSource(label:string,api:Bag,calendar:any,signal:AbortSignal,now=new Date()){
 const text=label.toLowerCase().replaceAll('’',"'");
 if(!['overnight inbox',"overnight inbox and today's calendar"].includes(text))return undefined;
 signal.throwIfAborted();const overnightInbox=()=>datedRows({...api.get('inbox'),...JSON.parse(localStorage.getItem('alpha.dev.app.inbox')||'{}')}.mails.filter((row:Bag)=>!row.arch&&!row.del),workflowDateRange(now));
 if(text==='overnight inbox')return {inbox:overnightInbox()};
 const events=await readWorkflowCalendar(calendar,workflowCalendarRange("today's calendar",now)!,signal);signal.throwIfAborted();
 return {calendar:events,inbox:overnightInbox()};
}
