import test from 'node:test';import assert from 'node:assert/strict';
import {loadBrowserModule} from './fixtures/browser-source.mjs';
const {ViewNavigationClient}=await loadBrowserModule('apps/app/src/runtime/view-navigation.ts');
const before={document:globalThis.document,window:globalThis.window};
globalThis.document=Object.assign(new EventTarget(),{hidden:false});globalThis.window=new EventTarget();
test.after(()=>{globalThis.document=before.document;globalThis.window=before.window;});
// An agent request for a Settings page opens that page through the Settings section allowlist;
// a page outside it is still refused before any claim.
function fixture(subview){
 let state={view:'home',revision:1,sensitive:false};const calls=[],opened=[];
 const client=new ViewNavigationClient(async(path,body)=>{calls.push(path);return path.endsWith('claim')?{claimId:'owned-claim'}:{accepted:true};},()=>true,()=>state);
 const binding={requestId:'owned-handoff',clientId:client.clientId,viewId:'settings',viewType:'gui',installationId:'owned-installation'};
 const results=[{actionName:'VIEWS',success:true,values:{mode:'show',viewId:'settings',viewType:'gui',subview,navigationPrepared:true,completedActionHandoffId:binding.requestId,navigationBinding:binding}}];
 const navigate=async(view,current,patch)=>{current();opened.push({view,patch});state={view,revision:2,sensitive:false};return true;};
 return {client,calls,opened,deliver:()=>client.deliver(results,client.capture(state),navigate)};
}
test('an allowlisted Settings section opens as that page',async()=>{
 const f=fixture('notifications');
 assert.equal((await f.deliver()).status,'delivered');
 assert.deepEqual(f.opened,[{view:'settings',patch:{page:'notifications',settingsCategory:'settings-general'}}]);
 f.client.dispose();
});
for(const subview of ['developer','password-provider','wallet'])test(`Settings page ${subview} is refused before any claim`,async()=>{
 const f=fixture(subview);
 assert.deepEqual(await f.deliver(),{status:'unavailable',parentView:'settings'});
 assert.deepEqual(f.calls,[]);assert.deepEqual(f.opened,[]);
 f.client.dispose();
});
