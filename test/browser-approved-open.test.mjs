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
 assert.equal(result.status,'failed');assert.equal(result.summary,'Not started: '+reason.replace(/[.!]\s*$/,'')+'.');
 assert.equal(entry.status,'failed');assert.equal(entry.result.dispatch,'not_started');
});
test('an open that fails after reaching the tab host keeps an unknown outcome',async()=>{
 const {result,entry}=await approve(async()=>{throw Error('Browser tab changed');});
 assert.equal(result.status,'unknown');assert.equal(entry.status,'unknown');assert.equal(entry.result.dispatch,undefined);
});
test('an open that Browser accepted succeeds',async()=>{
 const {result}=await approve(async()=>()=>{});assert.equal(result.status,'succeeded');
});

// The installed Browser adapter itself, over a recorded native tab host.
import {browserAdapterHost} from '../specs/quint/refinement/application/browser-adapter-host.mjs';
async function browser(run){
 const host=await browserAdapterHost({instant:['bookmarks','browsingState','saveBrowsingState','present','close','cancelReading','addListener','readingSupport','create','navigate','command']});
 const loads=()=>host.calls.filter(call=>call.name==='navigate').map(call=>[call.input.id,call.input.url]);
 const type=async address=>{host.rendered().onAddrKey({key:'Enter',preventDefault(){},target:{value:address}});await host.sync();return host.state().cur;};
 const approved=async address=>{const present=await host.component.browserNavigateApproved(address,signal(),true);await host.sync();return present;};
 try{host.shellState.view='home';await host.sync();await run({host,loads,type,approved});}finally{await host.teardown();}
}
test('approved opens load into the untouched New tab and then the agent\'s own tab',async()=>{
 await browser(async({host,loads,approved})=>{
  const blank=host.state().cur;
  await approved('https://example.com/');await approved('https://example.org/');
  assert.deepEqual(loads(),[[blank,'https://example.com/'],[blank,'https://example.org/']]);assert.equal(host.state().tabs.length,1);
 });
});
test('an approved open never replaces a page the owner opened, including one typed into the agent\'s tab',async()=>{
 await browser(async({host,loads,type,approved})=>{
  const mine=await type('https://owner.example/');
  const present=await approved('https://example.com/');
  assert.equal(host.state().tabs.length,2);const agent=loads().at(-1)[0];assert.notEqual(agent,mine);assert.equal(host.state().cur,mine,'the open does not select its tab before it is presented');
  host.shellState.view='browser';present();await host.sync();assert.equal(host.state().cur,agent);
  await type('https://owner.example/second');
  await approved('https://example.org/');
  assert.equal(host.state().tabs.length,3);assert.ok(![mine,agent].includes(loads().at(-1)[0]));
  assert.deepEqual(loads().filter(([id])=>id===mine),[[mine,'https://owner.example/']]);
 });
});
test('with every tab in use an approved open is refused before any tab is created',async()=>{
 await browser(async({host,loads,type,approved})=>{
  await type('https://owner.example/1');
  for(let tab=2;tab<=8;tab++){host.rendered().newTab();await host.sync();await type('https://owner.example/'+tab);}
  assert.equal(host.state().tabs.length,8);const before=host.calls.length,opened=loads();
  await assert.rejects(approved('https://example.com/'),error=>error.name==='BrowserOpenRefused'&&/8 tabs open/.test(error.message));
  assert.equal(host.calls.length,before,'no native call was made');assert.deepEqual(loads(),opened);assert.equal(host.state().tabs.length,8);
 });
});
