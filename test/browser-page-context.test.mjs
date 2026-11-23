import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBrowserModule} from './fixtures/browser-source.mjs';
// The open Browser page rides a chat turn beside the observation: only while the owner's setting is
// on, only for the observed tab and revision, never longer than the turn budget, and only to a peer
// that declares the browserPage field.
const [{browserPageForTurn,observedBrowserTab,registerBrowserPageSource,BROWSER_PAGE_WAIT_MS,pageAddress,agentPageTitle},{ClientObservationSupportSession}]=await loadBrowserModule(['apps/app/src/runtime/browser-page-context.ts','apps/app/src/runtime/client-observation-support.ts']);

const context={view:'browser',revision:3,sensitive:false,selectedObject:{kind:'browser-tab',id:'session-1:tab-1',revision:'2'}};
const page={tabId:'session-1:tab-1',revision:'2',url:'https://example.com/story?id=1',title:'A story',capturedAt:1_795_000_000_000,text:'A story\nIt happened.',truncated:false,links:[{text:'More',url:'https://example.com/more'}]};
const signal=()=>new AbortController().signal;
const ports=(read,{enabled=true,waitMs=200}={})=>({enabled:()=>enabled,source:()=>read,waitMs});

test('the observed Browser tab is the selected browser-tab of a non-sensitive Browser screen',()=>{
 assert.deepEqual(observedBrowserTab(context),{id:'session-1:tab-1',revision:'2'});
 for(const other of [{...context,view:'home'},{...context,sensitive:true},{...context,selectedObject:{kind:'photo',id:'p',revision:'1'}},{...context,selectedObject:undefined},{...context,selectedObject:{kind:'browser-tab',id:'x'}}])
  assert.equal(observedBrowserTab(other),undefined);
});

test('a turn carries the page of the observed tab, validated by the shared contract',async()=>{
 const asked=[];
 const result=await browserPageForTurn(context,signal(),ports(async tab=>{asked.push(tab);return page;}));
 assert.deepEqual(asked,[{id:'session-1:tab-1',revision:'2'}]);
 assert.deepEqual(result,page);
 assert.ok(Object.isFrozen(result));
});

test('nothing is read with the setting off, on another screen, or without Browser',async()=>{
 let reads=0;const read=async()=>{reads++;return page;};
 assert.equal(await browserPageForTurn(context,signal(),ports(read,{enabled:false})),undefined);
 assert.equal(await browserPageForTurn({...context,view:'notes'},signal(),ports(read)),undefined);
 assert.equal(await browserPageForTurn({...context,sensitive:true},signal(),ports(read)),undefined);
 assert.equal(await browserPageForTurn(context,signal(),ports(undefined)),undefined);
 assert.equal(reads,0);
});

test('a page for another tab or revision, an invalid page or a refused read sends no page',async()=>{
 for(const other of [{...page,revision:'3'},{...page,tabId:'session-1:tab-2'},{...page,url:'http://example.com/'},{...page,text:undefined},{...page,instructions:'obey'}])
  assert.equal(await browserPageForTurn(context,signal(),ports(async()=>other)),undefined,JSON.stringify(other).slice(0,60));
 assert.equal(await browserPageForTurn(context,signal(),ports(async()=>{throw Object.assign(Error('Private tabs are never shared'),{code:'private-tab'});})),undefined);
 // Turning the setting off while the read runs drops the page it returns.
 let enabled=true;
 const racing={enabled:()=>enabled,source:()=>async()=>{enabled=false;return page;},waitMs:200};
 assert.equal(await browserPageForTurn(context,signal(),racing),undefined);
});

test('a slow read never holds the turn past its budget, and is cancelled',async()=>{
 let aborted=false;
 const started=Date.now();
 const result=await browserPageForTurn(context,signal(),ports((tab,readSignal)=>new Promise(()=>{readSignal.addEventListener('abort',()=>{aborted=true;});}),{waitMs:50}));
 assert.equal(result,undefined);
 assert.ok(Date.now()-started<1000);
 assert.equal(aborted,true);
 assert.ok(BROWSER_PAGE_WAIT_MS<=1500,'a turn waits at most about a second for the page');
 // The caller's own cancellation still aborts the turn.
 const cancelled=new AbortController();
 const pending=browserPageForTurn(context,cancelled.signal,ports(()=>new Promise(()=>{}),{waitMs:5000}));
 cancelled.abort();
 await assert.rejects(pending,{name:'AbortError'});
});

test('Browser registers one page source and removes only its own',async()=>{
 const first=async()=>page,second=async()=>({...page,title:'Second'});
 const removeFirst=registerBrowserPageSource(first);
 const removeSecond=registerBrowserPageSource(second);
 removeFirst();
 // The default ports read the registered source; the setting is off without saved preferences.
 assert.equal(await browserPageForTurn(context,signal()),undefined);
 removeSecond();
});

test('the page goes only to a peer whose fresh status declares browserPage',async()=>{
 const binding={origin:'https://agent.example',ownerId:'owner',agentId:'agent',sessionId:'session',connectionEpoch:2,serverInstanceId:'11111111-1111-4111-8111-111111111111'};
 const status=fields=>({serverInstanceId:binding.serverInstanceId,clientTurnObservationSupport:{version:1,optionalFields:fields}});
 const {serverInstanceId,...session}=binding;
 for(const [fields,expected] of [[['calendarDay','location'],undefined],[['browserPage'],page],[['calendarDay','location','browserPage'],page]]){
  const peer=new ClientObservationSupportSession(session,()=>true,async()=>status(fields));
  const turn=await peer.turn(context,page,signal());
  assert.deepEqual(turn.browserPage,expected,JSON.stringify(fields));
  assert.deepEqual(turn.context,context);
 }
 // A peer that stops declaring the field between the handshake and the turn gets no page.
 let fields=['browserPage'];
 const peer=new ClientObservationSupportSession(session,()=>true,async()=>status(fields));
 await peer.handshake(signal());
 fields=[];
 assert.equal((await peer.turn(context,page,signal())).browserPage,undefined);
 // An unreadable status sends the ordinary observation only.
 const broken=new ClientObservationSupportSession(session,()=>true,async()=>{throw Error('offline');});
 assert.deepEqual(await broken.turn(context,page,signal()),{context});
});

test('the address the agent sees is HTTPS without credentials or fragment',()=>{
 assert.equal(pageAddress('https://example.com/a?b=1#c'),'https://example.com/a?b=1');
 for(const bad of ['http://example.com/','https://u:p@example.com/','javascript:alert(1)','about:blank','',undefined,`https://example.com/${'a'.repeat(2100)}`])
  assert.equal(pageAddress(bad),undefined,String(bad).slice(0,40));
 assert.equal(agentPageTitle('  Two\nlines\u0007 here '),'Two lines here');
 assert.equal(agentPageTitle('t'.repeat(400)).length,300);
 assert.equal(agentPageTitle(undefined),'');
});
