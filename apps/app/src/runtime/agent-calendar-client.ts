import {anyAbortSignal} from './abort-signal';
import {createCalendarApi,type CalendarApi} from '../../../../.eliza/client-features/plugins/plugin-calendar/src/api/calendar-api';
import type {AppRecordPort} from './app-record-route-policy';
/** The same canonical methods as ElizaClient, bound to Root's authenticated active-agent port. */
export function agentCalendarClient(port:AppRecordPort,signal:AbortSignal):CalendarApi{
 const assertCurrent=()=>{if(!port.current())throw Error('Calendar owner or agent changed');};
 assertCurrent();signal.throwIfAborted();
 return createCalendarApi(async<T>(path:string,init:RequestInit={})=>{
  assertCurrent();signal.throwIfAborted();
  const method=(init.method??'GET').toUpperCase();if(!['GET','POST','PATCH','DELETE'].includes(method))throw Error('Unsupported app-record method');
  if(init.body!=null&&typeof init.body!=='string')throw Error('Calendar methods require canonical JSON');
  const body=typeof init.body==='string'?JSON.parse(init.body):undefined,bounded=init.signal?anyAbortSignal([signal,init.signal]):signal;
  const result=await port.request(path,method as 'GET'|'POST'|'PATCH'|'DELETE',body,bounded);
  bounded.throwIfAborted();assertCurrent();return result as T;
 });
}
