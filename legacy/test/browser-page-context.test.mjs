import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBrowserModule} from './fixtures/browser-source.mjs';
// The open Browser page rides a chat turn beside the observation: only while the owner's setting is
// on, only for the observed tab and revision, never longer than the turn budget, and only to a peer
// that declares the browserPage field.
const [{browserPageForTurn,observedBrowserTab,registerBrowserPageSource,BROWSER_PAGE_WAIT_MS,BROWSER_PAGE_FRESH_WAIT_MS,BROWSER_PAGE_CACHE_MAX_AGE_MS,BrowserPageCache,pageAddress,agentPageTitle},{ClientObservationSupportSession}]=await loadBrowserModule(['apps/app/src/runtime/browser-page-context.ts','apps/app/src/runtime/client-observation-support.ts']);

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

// Browser captures the page ahead of the turn, so a send rarely waits on a read.
test('a turn takes a kept capture of the same tab and revision when no fresher read lands in time',async()=>{
 let reads=0,release;
 const slow=()=>{reads++;return new Promise(resolve=>{release=()=>resolve({...page,title:'Fresher'});});};
 const cache=new BrowserPageCache(async()=>{reads++;return page;});
 assert.equal(await cache.refresh({id:'session-1:tab-1',revision:'2'}),page);
 assert.deepEqual(cache.cached({id:'session-1:tab-1',revision:'2'}),page);
 assert.equal(cache.cached({id:'session-1:tab-1',revision:'3'}),undefined,'another revision is another page');
 // A slow fresh read: the turn returns the kept capture after the short wait, not the full budget.
 const kept=new BrowserPageCache(slow);kept.entry={key:'session-1:tab-1\n2',page,at:Date.now()};
 const started=Date.now();
 assert.deepEqual(await kept.forTurn({id:'session-1:tab-1',revision:'2'},signal(),40),page);
 assert.ok(Date.now()-started<BROWSER_PAGE_WAIT_MS);
 // The read keeps running and its result replaces the capture for the next turn.
 release();await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(kept.cached({id:'session-1:tab-1',revision:'2'}).title,'Fresher');
 // A fresh read that lands in time wins.
 const quick=new BrowserPageCache(async()=>({...page,title:'Now'}));quick.entry={key:'session-1:tab-1\n2',page,at:Date.now()};
 assert.equal((await quick.forTurn({id:'session-1:tab-1',revision:'2'},signal())).title,'Now');
 assert.ok(BROWSER_PAGE_FRESH_WAIT_MS<=300);
});

test('captures of one page share one read, and an old or foreign capture is never used',async()=>{
 let reads=0;const cache=new BrowserPageCache(()=>{reads++;return new Promise(resolve=>setTimeout(()=>resolve(page),20));});
 const tab={id:'session-1:tab-1',revision:'2'};
 await Promise.all([cache.refresh(tab),cache.refresh(tab),cache.forTurn(tab,signal())]);
 assert.equal(reads,1);
 // A read for a different page is not kept under this tab.
 const wrong=new BrowserPageCache(async()=>({...page,revision:'9'}));await wrong.refresh(tab);assert.equal(wrong.cached(tab),undefined);
 // Too old, or cleared: not used.
 let now=0;const aged=new BrowserPageCache(async()=>page,()=>now);await aged.refresh(tab);now=BROWSER_PAGE_CACHE_MAX_AGE_MS+1;assert.equal(aged.cached(tab),undefined);
 const cleared=new BrowserPageCache(async()=>page);await cleared.refresh(tab);cleared.clear();assert.equal(cleared.cached(tab),undefined);
 // A failed read keeps nothing and is not an error for the turn.
 const failing=new BrowserPageCache(async()=>{throw Error('Browser page changed');});assert.equal(await failing.forTurn(tab,signal()),undefined);
});

test('the status a turn compares can be read beside its other reads, with the same result',async()=>{
 const binding={origin:'https://agent.example',ownerId:'owner',agentId:'agent',sessionId:'session',connectionEpoch:2,serverInstanceId:'11111111-1111-4111-8111-111111111111'};
 const {serverInstanceId,...session}=binding;
 let calls=0;const status=async()=>{calls++;return {serverInstanceId,clientTurnObservationSupport:{version:1,optionalFields:['browserPage']}};};
 const peer=new ClientObservationSupportSession(session,()=>true,status);
 await peer.handshake(signal());calls=0;
 const fresh=peer.freshStatus(signal());
 assert.deepEqual((await peer.turn(context,page,signal(),fresh)).browserPage,page);
 assert.equal(calls,1,'the early read is the turn\'s only status read');
 // An early read showing the field withdrawn sends no page.
 const withdrawn=new ClientObservationSupportSession(session,()=>true,async()=>({serverInstanceId,clientTurnObservationSupport:{version:1,optionalFields:['browserPage']}}));
 await withdrawn.handshake(signal());
 assert.equal((await withdrawn.turn(context,page,signal(),Promise.resolve({serverInstanceId,clientTurnObservationSupport:{version:1,optionalFields:[]}}))).browserPage,undefined);
 // A failed early read sends the ordinary observation.
 const offline=new ClientObservationSupportSession(session,()=>true,status);await offline.handshake(signal());
 const failed=Promise.reject(Error('offline'));failed.catch(()=>{});
 assert.deepEqual(await offline.turn(context,page,signal(),failed),{context});
});
