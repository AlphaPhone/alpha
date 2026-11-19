/**
 * Deletion Undo for Agent Calendar events (AP-09, CAL-07). A confirmed delete or decline is held
 * for the Undo window before it is sent, and its event is hidden meanwhile. Undo inside the window
 * sends nothing and the event shows again.
 *
 * One deletion waits at a time: confirming another sends the waiting one first, so the only Undo
 * on screen is the newest one. Leaving the app ends the window and sends a waiting deletion at
 * once. A changed account or agent session drops a waiting deletion without sending it, so a
 * deletion is never sent to a session the owner did not confirm it in. A sent deletion keeps its
 * event hidden until a Calendar read no longer has it; a refused one shows the event again.
 *
 * Model: specs/quint/application/AgentCalendarDeferredDelete.qnt.
 */
type Timers={set(fn:()=>void,ms:number):unknown;clear(handle:unknown):void};
export type CalendarDeleteRequest<E>={
 /** Which feed rows this deletion hides while it waits or is in flight. */
 hides:(event:E)=>boolean;
 /** Sends the reviewed deletion. A rejection shows the event again. */
 send:()=>Promise<void>;
 failed?:(error:unknown)=>void;
};
type Phase='waiting'|'sending'|'sent';
type Entry<E>=CalendarDeleteRequest<E>&{id:number;phase:Phase;timer?:unknown};
const browserTimers:Timers={set:(fn,ms)=>setTimeout(fn,ms),clear:handle=>clearTimeout(handle as ReturnType<typeof setTimeout>)};

type SeriesEvent={id:string;provider:string;connectorAccountId?:string|null;side:string;grantId?:string|null;calendarId:string;externalId:string;recurringEventId?:string|null;startAt:string};
const sameSource=(a:SeriesEvent,b:SeriesEvent)=>a.provider===b.provider&&a.side===b.side&&(a.grantId??'')===(b.grantId??'')&&(a.connectorAccountId??'')===(b.connectorAccountId??'')&&a.calendarId===b.calendarId;
const seriesOf=(event:SeriesEvent)=>event.recurringEventId||event.externalId;
/** The rows a deletion takes away: the event, its whole series, or the series from this occurrence on. */
export function calendarDeletionHides<E extends SeriesEvent>(deleted:E,scope?:'instance'|'this_and_following'|'series'){
 const start=Date.parse(deleted.startAt);
 return (event:E)=>{
  if(!sameSource(event,deleted))return false;
  if(event.externalId===deleted.externalId&&event.id===deleted.id)return true;
  if(scope!=='series'&&scope!=='this_and_following')return false;
  if(seriesOf(event)!==seriesOf(deleted))return false;
  return scope==='series'||Date.parse(event.startAt)>=start;
 };
}

export class DeferredCalendarDeletes<E=unknown>{
 private entries:Entry<E>[]=[];
 private next=1;
 private flights=new Set<Promise<void>>();
 private listeners=new Set<()=>void>();
 constructor(private windowMs:()=>number,private timers:Timers=browserTimers){}
 subscribe(listener:()=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
 private changed(){for(const listener of [...this.listeners])listener();}
 /** Holds a confirmed deletion for the Undo window and returns its Undo. */
 stage(request:CalendarDeleteRequest<E>):{id:number;undo:()=>boolean}{
  for(const entry of this.entries)if(entry.phase==='waiting')this.dispatch(entry);
  const entry:Entry<E>={...request,id:this.next++,phase:'waiting'};
  entry.timer=this.timers.set(()=>{if(entry.phase==='waiting')this.dispatch(entry);this.changed();},Math.max(0,this.windowMs()));
  this.entries.push(entry);this.changed();
  return {id:entry.id,undo:()=>this.undo(entry.id)};
 }
 /** True only while the deletion still waits; then nothing is sent. */
 undo(id:number):boolean{
  const entry=this.entries.find(item=>item.id===id&&item.phase==='waiting');
  if(!entry)return false;
  this.timers.clear(entry.timer);this.entries=this.entries.filter(item=>item!==entry);this.changed();return true;
 }
 /** The owner left the app: the Undo is no longer on screen, so a waiting deletion is sent now. */
 leave(){let sent=false;for(const entry of this.entries)if(entry.phase==='waiting'){this.dispatch(entry);sent=true;}if(sent)this.changed();}
 /** The account or session changed: a waiting deletion is dropped and its event shows again. */
 drop(){const before=this.entries.length;for(const entry of this.entries)if(entry.phase==='waiting')this.timers.clear(entry.timer);this.entries=this.entries.filter(entry=>entry.phase!=='waiting');if(this.entries.length!==before)this.changed();}
 /** A sent deletion stops hiding once a read no longer returns its event. */
 prune(events:readonly E[]|undefined){
  if(!events)return;const before=this.entries.length;
  this.entries=this.entries.filter(entry=>entry.phase!=='sent'||events.some(event=>entry.hides(event)));
  if(this.entries.length!==before)this.changed();
 }
 hidden(event:E):boolean{return this.entries.some(entry=>entry.hides(event));}
 phaseOf(id:number):Phase|'none'{return this.entries.find(entry=>entry.id===id)?.phase??'none';}
 get waiting(){return this.entries.some(entry=>entry.phase==='waiting');}
 /** The send starts now; the adapter's send waits for the Calendar service to be free. */
 private dispatch(entry:Entry<E>){
  this.timers.clear(entry.timer);entry.phase='sending';
  const flight:Promise<void>=Promise.resolve().then(()=>entry.send()).then(()=>{entry.phase='sent';},error=>{
   this.entries=this.entries.filter(item=>item!==entry);try{entry.failed?.(error);}catch{/* A report never stops another send. */}
  }).then(()=>{this.flights.delete(flight);this.changed();});
  this.flights.add(flight);
 }
 /** Settles every send that has started; for tests and the refinement driver. */
 async settled(){while(this.flights.size)await Promise.all([...this.flights]);}
}
