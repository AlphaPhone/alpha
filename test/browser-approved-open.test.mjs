import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBrowserModule} from './fixtures/browser-source.mjs';

// One bundle, so the coordinator binding and the test share the Browser refusal class.
const [{DeviceActions,approvedBrowserOpen},{BrowserOpenRefused}]=await loadBrowserModule(['apps/app/src/runtime/device-actions.ts','apps/app/src/browser/browser-poll.ts']);

const context={view:'home',revision:1,sensitive:false};
const signal=()=>new AbortController().signal;
// One approved Browser open through the real coordinator; `open` stands for the Browser adapter.
function fixture(open){
 let state='pending',entry;
 const id='browser-open',digest='b'.repeat(64),expiresAt=new Date(Date.now()+60000).toISOString();
 const proposal=()=>({id,digest,state,subjectUserId:'owner',requestedBy:'agent',action:'device_action',expiresAt,
  payload:{version:1,action:'device_action',installationId:'device',enrollmentId:'enrollment',operation:{type:'browser_navigate',url:'https://example.com/'}},
  execution:state==='executing'?{attemptId:'attempt-one'}:undefined});
 const request=async(path,body)=>{
  if(body===undefined)return {proposals:[proposal()]};
  if(path.endsWith('/decision'))state='approved';
  if(path.endsWith('/claim'))state='executing';
  return {proposal:proposal(),digest};
 };
 const journal={reserve:async input=>({created:true,entry:entry={...input,phase:'reserved'}}),
  markApplying:async input=>Object.assign(entry,{phase:'applying',attemptId:input.attemptId}),
  finish:async input=>Object.assign(entry,input,{phase:'terminal'}),get:async()=>({entry}),list:async()=>({entries:entry?[entry]:[]})};
 const client=new DeviceActions({ownerId:'owner',agentId:'agent',origin:'https://agent.invalid',sessionId:'session'},
  {installationId:'device',enrollmentId:'enrollment',key:'a'.repeat(64)},'c'.repeat(64),request,journal,
  async()=>{await approvedBrowserOpen(open);return {status:'succeeded',summary:'Created a browser tab for example.com.'};});
 return {id,client,get entry(){return entry}};
}
async function approve(open){
 const f=fixture(open);assert.ok((await f.client.pendingReview(context,signal()))[0].proposal);
 return {result:await f.client.approve(f.id,context,signal()),entry:f.entry};
}

test('an open Browser refused before creating a tab is recorded as not started, with its reason',async()=>{
 const reason='Browser already has 8 tabs open. Close one, then ask again.';
 const {result,entry}=await approve(async()=>{throw new BrowserOpenRefused(reason);});
 assert.equal(result.status,'failed');assert.equal(result.summary,'Not started. Nothing was sent. '+reason);
 assert.equal(entry.status,'failed');assert.equal(entry.result.dispatch,'not_started');
});
test('an open that fails after reaching the tab host keeps an unknown outcome',async()=>{
 const {result,entry}=await approve(async()=>{throw Error('Browser tab changed');});
 assert.equal(result.status,'unknown');assert.equal(entry.status,'unknown');assert.equal(entry.result.dispatch,undefined);
});
test('an open that Browser accepted succeeds',async()=>{
 const {result}=await approve(async()=>()=>{});assert.equal(result.status,'succeeded');
});
