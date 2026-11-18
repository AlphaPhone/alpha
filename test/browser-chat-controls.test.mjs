// Reviewed Browser controls from chat (search, tabs, find in page, page history) on the installed
// Browser adapter over a recorded native tab host, and their direct-or-reviewed policy on the real
// coordinator. Evidence class: host test; no device, WebView, agent or model run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {browserAdapterHost} from '../specs/quint/refinement/application/browser-adapter-host.mjs';
import {policyFixture} from './fixtures/device-action-policy.mjs';
import {selectDeviceCapabilities} from '../apps/app/src/runtime/phone-context.ts';

const signal=()=>new AbortController().signal;
const refused=pattern=>error=>error.name==='BrowserOpenRefused'&&pattern.test(error.message);
async function browser(run,{native=true}={}){
 const host=await browserAdapterHost({native,instant:['bookmarks','browsingState','saveBrowsingState','present','close','cancelReading','addListener','readingSupport','create','navigate','command','find','clearFind','findNext']});
 const sent=name=>host.calls.filter(call=>call.name===name).map(call=>call.input);
 const type=async address=>{host.rendered().onAddrKey({key:'Enter',preventDefault(){},target:{value:address}});await host.sync();return host.state().cur;};
 let sequence=0;
 const page=async(id,url,title,more={})=>{host.emit('stateChanged',{id,sequence:++sequence,navigation:'n'+sequence,url,title,committed:true,loading:false,canBack:false,canForward:false,error:'',...more});await host.sync();};
 // One tab per [address, title]; the last one is showing. `priv` opens it as a private tab.
 const open=async(address,title,{priv=false,fresh=true,...more}={})=>{if(fresh){priv?host.rendered().openPrivate():host.rendered().newTab();await host.sync();}const id=await type(address);await page(id,address,title,more);return id;};
 const asked=[];
 // `pick` answers the in-card question: an index, or null for "Not now".
 const control=async(operation,{pick=null,observed}={})=>{const present=await host.component.browserControl(operation,{signal:signal(),observed,choose:async choice=>{asked.push(choice);return pick;}});await host.sync();return async()=>{present();await host.sync();};};
 try{host.shellState.view='home';await host.sync();await run({host,sent,type,page,open,control,asked});}finally{await host.teardown();}
}

test('a search opens the phone\'s own search address for the words, in a tab the owner is not using',async()=>{
 await browser(async({host,sent,open,control})=>{
  const mine=await open('https://owner.example/','Owner page',{fresh:false});
  const present=await control({type:'browser_search',query:'weather in Paris & Lyon'});
  const load=sent('navigate').at(-1);assert.equal(load.url,'https://www.google.com/search?q=weather+in+Paris+%26+Lyon');assert.notEqual(load.id,mine);
  assert.equal(host.state().cur,mine,'the search is not shown before it is presented');
  await present();assert.equal(host.state().cur,load.id);assert.equal(host.viewOpens.at(-1)[0],'browser');
 });
});
test('a new tab is added and shown empty; a private one only when asked; a full Browser refuses first',async()=>{
 await browser(async({host,type,control})=>{
  const first=host.state().cur,before=host.calls.length;
  await (await control({type:'browser_tab_new'}))();
  assert.equal(host.state().tabs.length,2);assert.notEqual(host.state().cur,first);assert.equal(host.state().editing,true);assert.ok(!host.state().tabs.at(-1).priv);
  await (await control({type:'browser_tab_new',private:true}))();
  assert.equal(host.state().tabs.at(-1).priv,true);assert.equal(host.state().cur,host.state().tabs.at(-1).id);
  assert.equal(host.calls.length,before,'an empty tab makes no native call');
  while(host.state().tabs.length<8){host.rendered().newTab();await host.sync();}
  const rows=host.state().tabs.length;await assert.rejects(control({type:'browser_tab_new'}),refused(/8 tabs open/));assert.equal(host.state().tabs.length,rows);
 });
});
// The owner's v609 turns: "open example.com in the browser", then "open wikipedia.org in a new tab",
// then "switch to the example.com tab" and "find the word domain on this page". An address opened in
// a new tab (browser_navigate newTab) keeps the agent's earlier page in its own tab.
test('an address opened in a new tab keeps the earlier page, so switching back and finding in it work',async()=>{
 await browser(async({host,sent,page,control})=>{
  const approved=async(address,newTab)=>{const present=await host.component.browserNavigateApproved(address,signal(),true,newTab);await host.sync();const id=sent('navigate').at(-1).id;present?.();await host.sync();return id;};
  const example=await approved('https://example.com/',false);await page(example,'https://example.com/','Example Domain');
  const wiki=await approved('https://wikipedia.org/',true);await page(wiki,'https://wikipedia.org/','Wikipedia');
  assert.notEqual(wiki,example,'the new tab is not the agent\'s earlier tab');
  assert.deepEqual(host.state().tabs.map(tab=>tab.id),[example,wiki]);assert.equal(host.state().cur,wiki);
  await (await control({type:'browser_tab_switch',target:'example'}))();assert.equal(host.state().cur,example);
  await (await control({type:'browser_find',text:'domain'}))();assert.equal(host.state().findTab,example);
  await new Promise(resolve=>setTimeout(resolve,200));
  assert.deepEqual(sent('find').map(input=>[input.id,input.query]),[[example,'domain']]);
  // Without newTab an open still reuses the agent's own tab rather than adding one.
  const reused=await approved('https://example.org/',false);assert.equal(reused,wiki);assert.equal(host.state().tabs.length,2);
 });
});
test('switching finds one tab by a word of its title or its site and shows it after the receipt',async()=>{
 await browser(async({host,open,control,asked})=>{
  const news=await open('https://news.example/today','Morning news',{fresh:false}),docs=await open('https://docs.example.org/guide','Field guide');
  const present=await control({type:'browser_tab_switch',target:'NEWS'});
  assert.equal(host.state().cur,docs,'the tab changes only when the action is presented');
  await present();assert.equal(host.state().cur,news);assert.equal(host.viewOpens.at(-1)[0],'browser');
  await (await control({type:'browser_tab_switch',target:'docs.example.org'}))();assert.equal(host.state().cur,docs);
  assert.deepEqual(asked,[]);
  await assert.rejects(control({type:'browser_tab_switch',target:'field guide'}),refused(/already showing/));
  await assert.rejects(control({type:'browser_tab_switch',target:'recipes'}),refused(/No open tab matches “recipes”/));
  assert.equal(host.state().cur,docs);
 });
});
test('several matching tabs are listed for the owner to pick; picking none does nothing',async()=>{
 await browser(async({host,open,control,asked})=>{
  const one=await open('https://shop.example/shoes','Shoes — Shop',{fresh:false}),two=await open('https://shop.example/hats','Hats — Shop');
  const other=await open('https://owner.example/','Owner page');
  assert.equal(host.component.browserTabNeedsChoice('shop'),true);assert.equal(host.component.browserTabNeedsChoice('owner'),false);assert.equal(host.component.browserTabNeedsChoice('recipes'),false);
  await (await control({type:'browser_tab_switch',target:'shop'},{pick:1}))();
  assert.equal(host.state().cur,two);
  assert.deepEqual(asked,[{verb:'Switch to',options:[{title:'Shoes — Shop',host:'shop.example',priv:false},{title:'Hats — Shop',host:'shop.example',priv:false}]}]);
  await assert.rejects(control({type:'browser_tab_close',target:'shop'}),refused(/none was chosen/));
  assert.deepEqual(host.state().tabs.map(tab=>tab.id),[one,two,other]);assert.equal(asked.at(-1).verb,'Close');
  // A title that is exactly the words wins over titles that only contain them.
  await (await control({type:'browser_tab_switch',target:'owner page'}))();assert.equal(host.state().cur,other);assert.equal(asked.length,2);
 });
});
test('closing a named tab closes that tab; closing without a name closes the showing tab when presented',async()=>{
 await browser(async({host,sent,open,control})=>{
  const news=await open('https://news.example/','Morning news',{fresh:false}),docs=await open('https://docs.example.org/','Field guide');
  await (await control({type:'browser_tab_close',target:'news'}))();
  assert.deepEqual(host.state().tabs.map(tab=>tab.id),[docs]);assert.deepEqual(sent('close').map(input=>input.id),[news]);
  const present=await control({type:'browser_tab_close'});
  assert.deepEqual(host.state().tabs.map(tab=>tab.id),[docs],'the showing tab stays until the action is presented');
  await present();assert.deepEqual(sent('close').map(input=>input.id),[news,docs]);
  assert.equal(host.state().tabs.length,1);assert.notEqual(host.state().cur,docs,'Browser is left with a New tab');
 });
});
test('a private tab is never matched, listed or closed for a request made outside a private tab',async()=>{
 await browser(async({host,open,control,asked})=>{
  const bank=await open('https://bank.example/','Bank account',{fresh:false}),secret=await open('https://bank.example/private','Bank statement',{priv:true});
  // From Home with the private tab showing in Browser.
  await assert.rejects(control({type:'browser_tab_switch',target:'statement'}),refused(/No open tab matches/));
  await assert.rejects(control({type:'browser_tab_close',target:'statement'}),refused(/No open tab matches/));
  await assert.rejects(control({type:'browser_tab_close'}),refused(/private/));
  await (await control({type:'browser_tab_switch',target:'bank'}))();assert.equal(host.state().cur,bank);assert.deepEqual(asked,[]);
  // From Browser on a normal tab the private tab is still invisible.
  host.shellState.view='browser';await host.sync();
  await assert.rejects(control({type:'browser_tab_switch',target:'statement'}),refused(/No open tab matches/));
  assert.equal(host.state().tabs.length,2);
  // From the private tab itself, both tabs may be named.
  host.rendered().tabCards.find(card=>card.id===secret).pick();await host.sync();
  await (await control({type:'browser_tab_close',target:'bank'},{pick:0}))();
  assert.deepEqual(asked.at(-1).options.map(option=>option.priv),[false,true]);assert.deepEqual(host.state().tabs.map(tab=>tab.id),[secret]);
 });
});
test('find in page searches the showing page on the native Browser only',async()=>{
 await browser(async({host,sent,open,control})=>{
  await assert.rejects(control({type:'browser_find',text:'harbour'}),refused(/Load a page/));
  const tab=await open('https://docs.example.org/','Field guide',{fresh:false});
  await assert.rejects(control({type:'browser_find',text:'x'.repeat(201)}),refused(/200 characters/));
  const present=await control({type:'browser_find',text:'harbour'});
  assert.equal(host.state().finding,true);assert.equal(host.state().findTab,tab);assert.equal(host.state().findQuery,'harbour');
  await new Promise(resolve=>setTimeout(resolve,200));
  assert.deepEqual(sent('find').map(input=>[input.id,input.query]),[[tab,'harbour']]);
  await present();assert.equal(host.viewOpens.at(-1)[0],'browser');assert.equal(host.rendered().finding,true);
 });
 await browser(async({host,sent,open,control})=>{
  await open('https://docs.example.org/','Field guide',{fresh:false});
  await assert.rejects(control({type:'browser_find',text:'harbour'}),refused(/cannot find text/));
  assert.equal(host.state().finding,false);assert.deepEqual(sent('find'),[]);
 },{native:false});
});
test('page history acts on the showing tab once presented, and refuses what the page cannot do',async()=>{
 await browser(async({host,sent,open,page,control})=>{
  await assert.rejects(control({type:'browser_history',action:'reload'}),refused(/No page is open/));
  const tab=await open('https://example.com/second','Second',{fresh:false,canBack:true});
  await assert.rejects(control({type:'browser_history',action:'forward'}),refused(/no next page/));
  await assert.rejects(control({type:'browser_history',action:'stop'}),refused(/not loading/));
  const present=await control({type:'browser_history',action:'back'});
  assert.deepEqual(sent('command'),[],'nothing is dispatched before the action is presented');
  await present();assert.deepEqual(sent('command').map(input=>[input.id,input.command]),[[tab,'back']]);assert.equal(host.viewOpens.at(-1)[0],'browser');
  await page(tab,'https://example.com/first','First',{canForward:true});
  await assert.rejects(control({type:'browser_history',action:'back'}),refused(/no previous page/));
  await (await control({type:'browser_history',action:'reload'}))();await (await control({type:'browser_history',action:'forward'}))();
  await page(tab,'https://example.com/second','Second',{canBack:true,loading:true});
  await (await control({type:'browser_history',action:'stop'}))();
  assert.deepEqual(sent('command').map(input=>input.command),['back','reload','forward','stop']);
  // A page that changed between the check and the presentation is left alone.
  const late=await control({type:'browser_history',action:'reload'});await page(tab,'https://example.com/third','Third');await late();
  assert.equal(sent('command').length,4);
 });
});
test('page history refuses when the tab the request was made from is no longer the page shown',async()=>{
 await browser(async({host,sent,open,page,control})=>{
  const tab=await open('https://example.com/','Example',{fresh:false,canBack:true});
  const observe=()=>{const {id,revision}=host.component.browserSelection();return {id,revision};},observed=observe();
  await (await control({type:'browser_history',action:'back'},{observed}))();assert.equal(sent('command').length,1);
  await page(tab,'https://example.com/redirected','Elsewhere',{canBack:true});
  await assert.rejects(control({type:'browser_history',action:'back'},{observed}),refused(/page changed after the request/));
  await (await control({type:'browser_history',action:'back'},{observed:observe()}))();assert.equal(sent('command').length,2);
 });
});

// The coordinator: which bound controls may run without a card.
function bound(operation,requestMessageId='request'){
 const actions=policyFixture([['control',requestMessageId,undefined,operation.type]]);Object.assign(actions.proposals.get('control').proposal.operation,operation);
 const run=(text,allowed=async()=>true)=>actions.performRequested('request',{},signal(),allowed,undefined,{messageId:'request',text,current:()=>{}});
 return {actions,run};
}
const direct=[
 [{type:'browser_search',query:'weather in Paris'},'Alpha, search the web for weather in Paris'],
 [{type:'browser_tab_new'},'open a new tab'],
 [{type:'browser_tab_switch',target:'news'},'switch to the news tab'],
 [{type:'browser_find',text:'harbour'},'find harbour on this page'],
 [{type:'browser_history',action:'back'},'go back'],
];
for(const [operation,text] of direct)test(`a ${operation.type} bound to the owner's message runs without a card only when Alpha need not ask first`,async()=>{
 const off=bound(operation);assert.equal((await off.run(text)).length,1);assert.deepEqual(off.actions.calls,['control']);
 const on=bound(operation);assert.deepEqual(await on.run(text,async()=>false),[]);assert.deepEqual(on.actions.calls,[],'with "Ask before Alpha acts" on, the card is the only way to run it');
 const unbound=bound(operation,null);assert.deepEqual(await unbound.run(text),[]);assert.deepEqual(unbound.actions.calls,[]);
 const older=bound(operation,'an-earlier-message');assert.deepEqual(await older.run(text),[]);assert.deepEqual(older.actions.calls,[]);
});
test('a bound switch whose words match several tabs is left for its card, where the owner picks',async()=>{
 const f=bound({type:'browser_tab_switch',target:'shop'});f.actions.options.browserTabNeedsChoice=target=>target==='shop';
 assert.deepEqual(await f.run('switch to the shop tab'),[]);assert.deepEqual(f.actions.calls,[]);assert.ok(f.actions.proposals.has('control'),'the proposal keeps its review card');
});
test('closing a tab is never run without its card',async()=>{
 const f=bound({type:'browser_tab_close',target:'news'});assert.deepEqual(await f.run('close the news tab'),[]);assert.deepEqual(f.actions.calls,[]);
});
test('a bound search runs without a card only when the whole message asked for those words',async()=>{
 for(const text of ['I wonder about weather in Paris','Do not search for weather in Paris','search the web for weather in Paris and open example.com',undefined]){
  const f=bound({type:'browser_search',query:'weather in Paris'});assert.deepEqual(await f.run(text),[],String(text));assert.deepEqual(f.actions.calls,[]);
 }
 const f=bound({type:'browser_search',query:'weather in Paris'});await f.run('Search for Weather in Paris please');assert.deepEqual(f.actions.calls,['control']);
 assert.deepEqual(await f.run('Search for Weather in Paris please'),[],'one message runs one search');
});

test('Browser controls are advertised only where this phone carries them out',()=>{
 const offered=['browser.search.v1','browser.tabs.v1','browser.find.v1','browser.history.v1'];
 const profile={android:true,native:true,camera:false,foregroundReview:false,clockRepeatDays:false,aospImage:false};
 assert.deepEqual(selectDeviceCapabilities(offered,profile).slice(2),['browser.search.v1','browser.tabs.v1','browser.history.v1','browser.find.v1']);
 assert.deepEqual(selectDeviceCapabilities(offered,{...profile,android:false,native:false}).slice(2),['browser.search.v1','browser.tabs.v1','browser.history.v1'],'the web build cannot find in a page');
 assert.deepEqual(selectDeviceCapabilities(['browser.tabs.v1'],profile).slice(2),['browser.tabs.v1'],'only what the agent offers');
 assert.deepEqual(selectDeviceCapabilities([],profile).slice(2),[]);
 // A typed address in a new tab, when the agent offers it, on every build that runs Browser tabs.
 assert.deepEqual(selectDeviceCapabilities([...offered,'browser.open-new-tab.v1'],{...profile,android:false,native:false}).slice(2),['browser.search.v1','browser.tabs.v1','browser.history.v1','browser.open-new-tab.v1']);
 assert.ok(!selectDeviceCapabilities(offered,profile).includes('browser.open-new-tab.v1'),'only when the agent offers it');
});
