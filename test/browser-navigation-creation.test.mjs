import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';import vm from 'node:vm';
const source=readFileSync('apps/app/src/prototype/browser-adapter.ts','utf8');
const region=stripTypeScriptTypes(source.slice(source.indexOf('  async function navigate('),source.indexOf('  async function command(')),{mode:'strip'});
const load=async path=>import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(readFileSync(path,'utf8'),{mode:'strip'})).toString('base64'));
const {classifyAddress}=await load('apps/app/src/browser/address-input.ts'),{tabLimitReached,MAX_SAVED_TABS}=await load('apps/app/src/browser/browsing-session.ts');
function harness(){let release;const pending=new Promise(resolve=>release=resolve),state={cur:'owned',tabs:[{id:'owned'},{id:'other'}],editing:true,tabsOpen:true,menu:true},navigations=[],patches=[],closed=[];const created=new Map([['owned',pending]]);
 const context={URL,Error,classifyAddress,tabLimitReached,TAB_LIMIT_MESSAGE:'Close a tab before opening another.',savedPages:0,session:"owned-session",disposed:false,state:()=>state,isPrivate:()=>false,newTabId:()=> 'owned',restored:new Map(),metadata:new Map(),created,documentRevisions:new Map(),restoreAttempts:new Map(),ensure:()=>pending,shell:{vset(_key,patch){patches.push(patch);Object.assign(state,patch);}},Browser:{async navigate(input){navigations.push(input);},async close(input){closed.push(input);}},refresh(){},report(){}};
 const reports=[];context.report=error=>reports.push(error.message);const navigate=vm.runInNewContext(region+';navigate',context);return {state,created,navigations,patches,closed,reports,release,navigate};}
test('closing a tab while native creation is pending cannot resurrect or navigate it',async()=>{const h=harness(),task=h.navigate('https://example.com');h.state.tabs=[{id:'other'}];h.state.cur='other';h.created.delete('owned');h.release();await task;assert.equal(h.navigations.length,0);assert.equal(h.patches.length,0);});
test('switching while creation is pending keeps the new tab’s editor and switcher state',async()=>{const h=harness(),task=h.navigate('https://example.com');h.state.cur='other';h.release();await task;assert.equal(h.navigations.length,0);assert.equal(h.state.editing,true);assert.equal(h.state.tabsOpen,true);});
test('unchanged tab still navigates once and exits its own address editor',async()=>{const h=harness(),task=h.navigate('https://example.com');h.release();await task;assert.equal(h.navigations.length,1);assert.equal(h.state.editing,false);});

test('cancelled approved new-tab creation closes its orphan and never navigates',async()=>{const h=harness(),abort=new AbortController();const task=h.navigate('https://example.com',true,abort.signal);abort.abort();h.release();await assert.rejects(task);assert.equal(h.navigations.length,0);assert.equal(h.closed.length,1);assert.equal(h.created.size,0);});

const full=()=>Array.from({length:MAX_SAVED_TABS},(_,index)=>({id:index?'t'+index:'owned'}));
test('a new tab is refused at the tab limit before any native tab is created',async()=>{const h=harness();h.state.tabs=full();h.release();
 await assert.rejects(h.navigate('https://example.com',true,new AbortController().signal),/Close a tab/);
 await h.navigate('https://example.com',true);assert.deepEqual(h.reports,['Close a tab before opening another.']);
 assert.equal(h.state.tabs.length,MAX_SAVED_TABS);assert.equal(h.navigations.length,0);assert.equal(h.closed.length,0);});
test('a tab limit reached while the native tab was being created closes that tab',async()=>{const h=harness(),task=h.navigate('https://example.com',true,new AbortController().signal);h.state.tabs=full();h.release();
 await assert.rejects(task,/Close a tab/);assert.equal(h.closed.length,1);assert.equal(h.created.has('owned'),false);assert.equal(h.state.tabs.length,MAX_SAVED_TABS);assert.equal(h.navigations.length,0);});
test('the address bar searches text that is not an address and never searches an approved destination',async()=>{const h=harness();h.release();
 await h.navigate('define:serendipity');assert.equal(h.navigations.at(-1).url,'https://www.google.com/search?q=define%3Aserendipity');assert.deepEqual(h.reports,[]);
 await assert.rejects(h.navigate('define:serendipity',true,new AbortController().signal),/Invalid approved browser destination/);assert.equal(h.navigations.length,1);});
