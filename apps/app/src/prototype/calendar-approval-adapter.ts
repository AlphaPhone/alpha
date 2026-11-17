import {connectionController} from '../runtime/connection-ui';
import {alphaClient} from '../runtime/alpha-client';
import {calendarReviewText,inboxChoiceText,calendarApprovalStatus,type CalendarApproval,type CalendarApprovalResolution} from '../runtime/calendar-approval';
import {reviewCalendarApproval} from './calendar-approval-review';
import {calendarApprovalTarget,type CalendarApprovalLabels} from './calendar-approval-fields';
import {calendarApprovalCardText} from '../ui/calendar/calendar-approval-messages';
import {CALENDAR_INVALIDATED_EVENT} from '../runtime/app-record-completion';
type Shell=Record<string,any>;
type CalendarReview=ReturnType<typeof calendarReviewText>;
/** Parses of the agent messages on screen, by message id. A message whose text has not changed keeps
 * its parse (the same object, which callers must not change), so a render parses only new or edited
 * messages. `retain` forgets the ids that are no longer in the conversation. */
export function createCalendarReviewParses(parseText:(text:string)=>CalendarReview=calendarReviewText){
 const known=new Map<string,{text:string;parsed:CalendarReview}>();
 return {
  parse(id:string,text:string):CalendarReview{
   const hit=known.get(id);if(hit&&hit.text===text)return hit.parsed;
   const parsed=parseText(text);known.set(id,{text,parsed});return parsed;
  },
  retain(ids:Iterable<string>){const keep=new Set(ids);for(const id of [...known.keys()])if(!keep.has(id))known.delete(id);},
  get size(){return known.size;},
 };
}
/** Presentation only: stored messages, model context and copied source text remain unchanged. */
export function installCalendarApprovalAdapter(Component:Shell){
 const p=Component.prototype,render=p.renderVals,unmount=p.componentWillUnmount;
 const states=new WeakMap<object,{abort?:AbortController;statuses:Map<string,string>;results:Map<string,CalendarApprovalResolution>}>();
 const state=(shell:Shell)=>{let value=states.get(shell);if(!value){value={statuses:new Map(),results:new Map()};states.set(shell,value);}return value;};
 const binding=()=>{const snapshot=connectionController.getSnapshot();return JSON.stringify([snapshot.session,snapshot.history?.conversationId]);};
 // The loaded Calendar window verifies the reviewed event when it holds it. An event outside that window,
 // or a window that another source left incomplete, is verified by one read of the event's own calendar
 // at its start; a failed read leaves the target unverified, and the review can still be declined.
 const target=async(shell:Shell,row:CalendarApproval,signal:AbortSignal):Promise<CalendarApprovalLabels>=>{
  const port=connectionController.getAppRecordClient?.(),calendar=shell.agentCalendar,model=calendar?.state;
  if(!port?.current()||!model)return {};
  const p=row.payload,loaded=model.savedAt===null&&(model.status==='ready'||model.status==='partial')&&model.ownerKey===JSON.stringify([new URL(port.identity.origin).origin,port.identity.ownerId,port.identity.agentId]);
  const labels=loaded?calendarApprovalTarget(p,model.calendars,model.status==='ready'?model.feed?.events??[]:[]):{};
  if(row.action==='schedule_event'||labels.targetVerified||typeof p.expectedEventStartAtMs!=='number')return labels;
  const read=await calendar.readSourceAt({grantId:typeof p.grantId==='string'?p.grantId:undefined,calendarId:String(p.calendarId)},p.expectedEventStartAtMs,signal).catch(()=>null);
  signal.throwIfAborted();
  return read?calendarApprovalTarget(p,read.calendars,read.events):labels;
 };
 async function review(shell:Shell,id:string){
  const value=state(shell),snapshot=connectionController.getSnapshot();
  if(value.abort||!shell.live||document.hidden||snapshot.open||snapshot.busy||shell.S().typing)return;
  if(String(shell.S().draft||'').trim()){shell.toast('Send or clear draft first');return;}
  // A decision must not replace or become part of an unfinished message edit.
  if(shell.messageEditTarget){shell.toast('Finish editing first');return;}
  const observed=alphaClient.getState().context;if(observed.sensitive){shell.toast('Close private content');return;}
  const key=binding(),context=JSON.stringify(observed),controller=value.abort=new AbortController();
  const current=()=>{controller.signal.throwIfAborted();const now=connectionController.getSnapshot();if(!shell.live||document.hidden||binding()!==key||now.open||now.busy||shell.S().typing||shell.messageEditTarget||JSON.stringify(alphaClient.getState().context)!==context||String(shell.S().draft||'').trim())throw Error('The agent, conversation or draft changed. Review the request again.');};
  const retire=()=>{try{current();}catch{controller.abort();}},hidden=()=>{if(document.hidden)controller.abort();},suspend=()=>controller.abort();
  const unsubscribe=connectionController.subscribe?.(retire),unobserve=alphaClient.subscribe?.(retire);
  document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',suspend);window.addEventListener('alpha:device-state',suspend);
  let dispatched=false;const targets=new WeakMap<CalendarApproval,CalendarApprovalLabels>();
  try{
   const result=await reviewCalendarApproval(async signal=>{const row=await connectionController.readCalendarApproval(id,signal);if(row)targets.set(row,await target(shell,row,signal));return row;},controller.signal,current,row=>{value.statuses.set(key+id,calendarApprovalStatus(row));if(shell.live)shell.setState({});},row=>targets.get(row)??{});
   if(!result)return;current();value.results.delete(key+id);value.statuses.set(key+id,'Checking…');shell.setState({});
   dispatched=true;const outcome=await connectionController.resolveCalendarApproval(result.request,result.decision,controller.signal);current();
   value.results.set(key+id,outcome);value.statuses.set(key+id,outcome.text);shell.setState({});shell.toast(outcome.text);
   // The decision travels outside chat, so no reply carries its receipt: Calendar and Home read the change here.
   const session=connectionController.getSnapshot().session;if(outcome.kind==='succeeded'&&session)window.dispatchEvent(new CustomEvent(CALENDAR_INVALIDATED_EVENT,{detail:{sessionId:session.sessionId}}));
  }catch(error){let admitted=false;try{current();admitted=true;}catch{/* Retired observations publish nothing to the replacement context. */}if(admitted){const message=dispatched?'Change not confirmed':error instanceof Error?error.message:'Unavailable';value.statuses.set(key+id,message);shell.setState({});shell.toast(message);}}
  finally{unsubscribe?.();unobserve?.();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',suspend);window.removeEventListener('alpha:device-state',suspend);if(value.abort===controller)value.abort=undefined;controller.abort();}
 }
 const parses=new WeakMap<object,ReturnType<typeof createCalendarReviewParses>>();
 p.renderVals=function(){
  const out=render.call(this),value=state(this),key=binding();
  let parse=parses.get(this);if(!parse){parse=createCalendarReviewParses();parses.set(this,parse);}
  const cache=parse;cache.retain((out.msgs||[]).map((message:Shell)=>String(message.id)));
  out.msgs=(out.msgs||[]).map((message:Shell)=>{
   if(!message.isAgent)return message;
   const source=String(message.text||'');
   // A verified device receipt may already replace the original review prose.
   // Keep that projection and never interpret its summary as Calendar commands.
   if(typeof message.displayText==='string'&&message.displayText!==source)return {...message,messageActionsLabel:message.messageActionsLabel?'Message actions: '+message.displayText:message.messageActionsLabel};
   // Order: the Calendar projection, then inbox choices (prose only); maps-adapter.ts (installMapsChatAdapter) runs after this.
   const parsed=cache.parse(String(message.id),source),displayText=inboxChoiceText(parsed.ids.length?calendarApprovalCardText(parsed.displayText):parsed.displayText);
   return {...message,displayText,hasCalendarText:message.hasCalendarText!==false&&!!displayText,messageActionsLabel:message.messageActionsLabel?'Message actions: '+(displayText||'Calendar request'):message.messageActionsLabel,calendarReviews:parsed.ids.map(id=>({id,status:value.statuses.get(key+id)||'',canOpen:value.results.get(key+id)?.kind==='succeeded',open:()=>void review(this,id),openCalendar:()=>{if(this.live&&!document.hidden&&binding()===key)this.openView('calendar');}}))};
  });return out;
 };
 p.componentWillUnmount=function(){states.get(this)?.abort?.abort();states.delete(this);parses.delete(this);return unmount?.call(this);};
}
