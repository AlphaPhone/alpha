import test from 'node:test';import assert from 'node:assert/strict';
import {loadBrowserModule} from './fixtures/browser-source.mjs';
const {ViewNavigationClient,executeViewInteraction}=await loadBrowserModule('apps/app/src/runtime/view-navigation.ts');
const {subscribeNativeViewEvents}=await loadBrowserModule('apps/app/src/runtime/native-view-events.ts');
const documentBefore=globalThis.document;globalThis.document=Object.assign(new EventTarget(),{hidden:false});
test.after(()=>{globalThis.document=documentBefore;});
function fixture(){let listener,ended,active=true,state={view:'browser',revision:1,sensitive:false},claimed=false;const requests=[],executed=[];
 const client=new ViewNavigationClient(async(path,body)=>{requests.push([path,body]);if(path.endsWith('claim')){if(claimed)throw Error('Already claimed');claimed=true;return {claimId:'owned-claim'};}return {accepted:true};},()=>active,()=>state,(id,receive,end)=>{listener=receive;ended=end;return {ready:Promise.resolve(),close:end};},async(view,capability,params,signal,current)=>{current();executed.push([view,capability,params]);return {ok:true,data:{dispatched:true,completed:false,requiresReadback:true}};});
 const frame={type:'view:interact',requestId:'owned-request',viewId:'browser',viewType:'gui',installationId:'owned-install',capability:'browser-command',params:{command:{subaction:'back'}}};
 return {client,frame,requests,executed,receive:value=>listener(value),end:()=>ended(),foreign:()=>active=false,change:()=>state={...state,revision:2}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('targeted browser interaction makes one claim/effect/result; duplicate frame cannot repeat it',async()=>{const f=fixture();await f.client.ready();f.receive(f.frame);f.receive(f.frame);await settle();assert.equal(f.executed.length,1);assert.equal(f.requests.length,2);const result=f.requests[1][1];assert.equal(result.clientId,f.client.clientId);assert.equal(result.claimId,'owned-claim');assert.equal(result.installationId,'owned-install');assert.equal(result.success,true);assert.equal(result.result.data.completed,false);f.receive(f.frame);await settle();assert.equal(f.executed.length,1);f.client.dispose();});
test('foreign session never claims a command',async()=>{const f=fixture();f.foreign();f.receive(f.frame);await settle();assert.equal(f.requests.length,0);assert.equal(f.executed.length,0);f.client.dispose();});
// Alpha's real executor behind the real renderer client: `view` is the screen the owner is on.
function alpha(view='browser'){const requests=[],commands=[];let listener;
 const client=new ViewNavigationClient(async(path,body)=>{requests.push([path,body]);return path.endsWith('claim')?{claimId:'owned-claim'}:{accepted:true};},()=>true,()=>({view,revision:1,sensitive:false}),(id,receive,end)=>{listener=receive;return {ready:Promise.resolve(),close:end};},
  (target,capability,params,signal,current)=>executeViewInteraction(target,capability,params,{active:view==='browser',command:async(command,selection)=>{commands.push([command,selection]);return {ok:true,data:{dispatched:true,completed:false,requiresReadback:true}};}},signal,current));
 const send=async(frame)=>{listener({type:'view:interact',requestId:'request-'+requests.length,viewId:'browser',viewType:'gui',installationId:'owned-install',capability:'browser-command',params:{command:{subaction:'reload'}},...frame});await settle();return requests.at(-1)[1];};
 return {client,requests,commands,send};
}
test('a history command sent while the owner is off Browser is claimed and refused at once, by type',async()=>{
 const f=alpha('home');await f.client.ready();const result=await f.send({});
 assert.deepEqual(f.requests.map(([path])=>path.split('/').at(-1)),['interact-claim','interact-result']);assert.equal(f.commands.length,0);
 assert.equal(result.claimId,'owned-claim');assert.equal(result.success,true);assert.equal(result.result.ok,false);assert.equal(result.result.code,'UNAVAILABLE');assert.match(result.result.message,/Open Browser first/);f.client.dispose();
});
test('a page-text read is refused as unsupported and names the owner\'s reviewed alternative',async()=>{
 for(const view of ['browser','home']){const f=alpha(view);await f.client.ready();const result=await f.send({capability:'get-text',params:{nativeOnly:true}});
  assert.equal(f.commands.length,0);assert.equal(result.claimId,'owned-claim');assert.equal(result.success,false);assert.match(result.error,/^UNSUPPORTED: /);assert.match(result.error,/Ask about page/);assert.equal(result.result,undefined);f.client.dispose();}
});
test('commands for a view or capability this phone does not offer are refused by type, never left unknown',async()=>{
 const f=alpha();await f.client.ready();
 for(const frame of [{viewId:'notes'},{capability:'click'}]){const result=await f.send(frame);assert.equal(result.success,false);assert.match(result.error,/^UNSUPPORTED: /);}
 assert.equal(f.commands.length,0);f.client.dispose();
});
test('a history command reaches Browser with the tab the turn observed',async()=>{
 const f=alpha(),selection={id:'session:tab',revision:'2'};await f.client.ready();const result=await f.send({params:{command:{subaction:'back'},selection}});
 assert.deepEqual(f.commands,[[{subaction:'back'},selection]]);assert.equal(result.success,true);assert.equal(result.result.ok,true);f.client.dispose();
});
test('view change after claim refuses execution and reports failed outcome, without retry',async()=>{const f=fixture();f.receive(f.frame);f.change();await settle();assert.equal(f.executed.length,0);assert.equal(f.requests.at(-1)[1].success,false);f.client.dispose();});
test('native event port filters subscription/client identity and retires without replay',async()=>{let callback;const commands=[],frames=[];const port={async addListener(name,fn){assert.equal(name,'alphaViewEvent');callback=fn;return {async remove(){}};},async subscribeViewEvents(input){commands.push(input);return {subscriptionId:input.subscriptionId};},async unsubscribeViewEvents(input){commands.push(input);}};const channel=subscribeNativeViewEvents(port,'owner','client',v=>frames.push(v),()=>{});await channel.ready;const id=commands[0].subscriptionId,event=clientId=>({type:'agent_event',stream:'view-interact',payload:{clientId,frame:{requestId:'one'}}});callback({type:'event',subscriptionId:'foreign',event:event('client')});callback({type:'event',subscriptionId:id,event:event('foreign')});assert.equal(frames.length,0);callback({type:'event',subscriptionId:id,event:event('client')});assert.equal(frames.length,1);channel.close();callback({type:'event',subscriptionId:id,event:event('client')});assert.equal(frames.length,1);});

test('failed command feed recovers on connection use, retires old frames, and never repeats a claim/effect',async()=>{
 const feeds=[],requests=[],effects=[];let claimed=false;
 const client=new ViewNavigationClient(async(path,body)=>{requests.push([path,body]);if(path.endsWith('claim')){if(claimed)throw Error('Claim already consumed');claimed=true;return {claimId:'one-claim'};}return {accepted:true};},()=>true,()=>({view:'browser',revision:1,sensitive:false}),(id,receive,ended)=>{const feed={receive,ended,closed:0};feeds.push(feed);return {ready:feeds.length===1?Promise.reject(Error('Subscription unavailable')):Promise.resolve(),close(){feed.closed++;ended();}};},async(...args)=>{effects.push(args);return {dispatched:true};});
 await settle();assert.equal(client.interactionAvailable(),false);assert.equal(client.metadata({view:'browser',revision:1,sensitive:false}).viewDelivery,'completed-action');
 client.connectRenderer();await client.ready();await settle();assert.equal(feeds.length,2);assert.equal(client.interactionAvailable(),true);
 const frame={type:'view:interact',requestId:'one-request',viewId:'browser',viewType:'gui',installationId:'one-install',capability:'browser-command',params:{command:{subaction:'back'}}};
 feeds[0].receive(frame);await settle();assert.equal(requests.length,0);
 feeds[1].receive(frame);await settle();assert.equal(effects.length,1);assert.equal(requests.length,2);
 feeds[1].ended();assert.equal(client.interactionAvailable(),false);client.connectRenderer();await client.ready();await settle();
 feeds[2].receive(frame);await settle();assert.equal(effects.length,1);assert.equal(requests.filter(([path])=>path.endsWith('claim')).length,2);client.dispose();
});
test('background disconnect cancels current authority and foreground recreates an empty feed without replay',async()=>{
 const feeds=[],effects=[];let current=true,executingSignal;
 const client=new ViewNavigationClient(async()=>({claimId:'owned'}),()=>current,()=>({view:'browser',revision:1,sensitive:false}),(id,receive,ended)=>{const feed={receive,ended};feeds.push(feed);return {ready:Promise.resolve(),close:ended};},async(view,capability,params,signal)=>{effects.push(params);executingSignal=signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('retired')),{once:true}));});
 await client.ready();await settle();feeds[0].receive({type:'view:interact',requestId:'pending',viewId:'browser',viewType:'gui',installationId:'one-install',capability:'browser-command',params:{command:{subaction:'back'}}});await settle();
 document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));assert.equal(executingSignal.aborted,true);assert.equal(client.interactionAvailable(),false);await settle();
 document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));await client.ready();await settle();assert.equal(feeds.length,2);assert.equal(effects.length,1);
 current=false;feeds[1].ended();client.connectRenderer();assert.equal(feeds.length,2);client.dispose();
});
test("'Ask before Alpha acts' refuses an agent browser command after claiming it",async()=>{
 for(const review of [async()=>true,async()=>{throw Error('Device settings need recovery.');}]){
  const requests=[],executed=[];let listener;
  const client=new ViewNavigationClient(async(path,body)=>{requests.push([path,body]);return path.endsWith('claim')?{claimId:'owned-claim'}:{accepted:true};},()=>true,()=>({view:'browser',revision:1,sensitive:false}),(id,receive,end)=>{listener=receive;return {ready:Promise.resolve(),close:end};},async(...args)=>{executed.push(args);return {dispatched:true};},review);
  await client.ready();await settle();
  listener({type:'view:interact',requestId:'review-request',viewId:'browser',viewType:'gui',installationId:'owned-install',capability:'browser-command',params:{command:{subaction:'back'}}});await settle();
  assert.equal(executed.length,0);assert.equal(requests.length,2);const result=requests[1][1];
  assert.equal(result.claimId,'owned-claim');assert.equal(result.success,false);assert.match(result.error,/^review-required:/);client.dispose();
 }
});
test('review off still runs the agent browser command',async()=>{
 const requests=[],executed=[];let listener;
 const client=new ViewNavigationClient(async(path,body)=>{requests.push([path,body]);return path.endsWith('claim')?{claimId:'owned-claim'}:{accepted:true};},()=>true,()=>({view:'browser',revision:1,sensitive:false}),(id,receive,end)=>{listener=receive;return {ready:Promise.resolve(),close:end};},async(...args)=>{executed.push(args);return {dispatched:true};},async()=>false);
 await client.ready();await settle();
 listener({type:'view:interact',requestId:'allowed-request',viewId:'browser',viewType:'gui',installationId:'owned-install',capability:'browser-command',params:{command:{subaction:'back'}}});await settle();
 assert.equal(executed.length,1);assert.equal(requests[1][1].success,true);client.dispose();
});
