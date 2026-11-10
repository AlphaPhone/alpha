import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {stripTypeScriptTypes} from './support/strip-types.mjs';
import {createSmsSession,smsNothingDispatched} from '../apps/app/src/runtime/image-sms.ts';

// Messages, Contacts, Settings and Google connect: retry, resume and ordering rules. The adapters are
// bundled with their native ports replaced by in-memory fixtures; no Android, Cloud or browser runs.
const tick=()=>new Promise(done=>setImmediate(done));
const read=file=>readFileSync(file,'utf8');
const region=async(file,name)=>{const source=read(file),text=source.slice(source.indexOf(`// ${name}:begin`),source.indexOf(`// ${name}:end`));assert.ok(text.length>100,`${name} region is present`);return import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(text)).toString('base64'));};
/** Bundles one source file with the modules matching `filter` replaced by `fixture(path)` source text. */
async function bundle(entry,filter,fixture){
 const dir=mkdtempSync(join(tmpdir(),'comms-settings-'));
 const result=await build({entryPoints:[resolve(entry)],bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'fixture',setup(builder){builder.onResolve({filter},args=>({path:args.path,namespace:'fixture'}));builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:fixture(args.path)}));}}]});
 const filename=join(dir,'module.mjs');writeFileSync(filename,result.outputFiles[0].text);
 return {module:await import(pathToFileURL(filename)),dispose:()=>rmSync(dir,{recursive:true,force:true})};
}

test('only a cancelled or denied send record counts as nothing dispatched',()=>{
 assert.deepEqual(['cancelled','denied','failed','unknown','submitted','sent','delivered'].filter(smsNothingDispatched),['cancelled','denied']);
});

test('a cancelled or denied SMS review can be sent again without editing; any other outcome keeps its operation ID',async()=>{
 const priorDocument=globalThis.document,pending=[],calls=[];
 globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
 globalThis.__commsSms={smsSendHistory:async()=>[],status:async()=>({permissions:{sms:'granted',phoneState:'granted'},subscriptions:[{id:3,slot:0,displayName:'SIM'}]}),threadPage:async()=>({rows:[],next:null}),observeMessages:async()=>async()=>{},requestAccess:async()=>{},sendSms:(review,operationId)=>{calls.push(operationId);return new Promise((resolve,reject)=>pending.push({resolve,reject}));}};
 const loaded=await bundle('apps/app/src/prototype/sms-adapter.ts',/platform-plugins|aosp-image|aosp-telephony|native-adapter$/,path=>path.includes('aosp-telephony')?'export const createAospTelephony=()=>globalThis.__commsSms;':path.includes('platform-plugins')?'export const registerPlugin=()=>globalThis.__commsSms;':path.includes('aosp-image')?'export const aospImage=true;':'export const watchReturnToApp=()=>()=>{};');
 try{
  class Component{view='messages';S(){return {view:this.view};}setState(){}}
  const views={messages:{}};loaded.module.installSmsAdapter(Component,views);const owner=new Component();owner.componentDidMount();await tick();
  let model=views.messages.render();model.nativeOnRecipients({target:{value:'+15555550100'}});model.nativeOnBody({target:{value:'hello'}});views.messages.render().nativeSims[0].pick();
  const send=async status=>{views.messages.render().nativeSend();await tick();pending.at(-1).resolve({status});await tick();await tick();};
  await send('cancelled');assert.match(views.messages.render().nativeNotice,/Cancelled/);
  await send('denied');
  // Granting access between the two attempts does not need to reset anything either.
  views.messages.render().nativeSendAccess();await tick();
  await send('submitted');
  assert.equal(new Set(calls.slice(0,3)).size,3,'each attempt after a cancelled or denied record uses a new operation ID');
  await send('unknown');await send('failed');
  assert.equal(calls[3],calls[2],'a submitted send is never given a fresh ID');
  assert.equal(calls[4],calls[2],'an unknown outcome is never given a fresh ID');
  assert.equal(views.messages.render().nativeBody,'hello','the draft was not edited');
  owner.componentWillUnmount();
 }finally{globalThis.document=priorDocument;delete globalThis.__commsSms;loaded.dispose();}
});

test('one return to the app runs its watcher once, and again only after leaving',async()=>{
 const m=await region('apps/app/src/prototype/native-adapter.ts','tile-facts');
 let now=1000;const gate=m.returnGate(250,()=>now);
 // visibilitychange, focus and appResumed for the same return.
 assert.deepEqual([gate.returned(),gate.returned(),gate.returned()],[true,false,false]);
 now+=249;assert.equal(gate.returned(),false);
 now+=1;assert.equal(gate.returned(),true,'a later focus (closing Android quick settings) runs again');
 gate.left();assert.equal(gate.returned(),true,'leaving and returning inside the window still runs');
 const source=read('apps/app/src/prototype/native-adapter.ts');
 assert.match(source,/export function watchReturnToApp[\s\S]{0,200}if \(document\.hidden\) gate\.left\(\); else if \(gate\.returned\(\)\) run\(\);/);
});

test('repeated return triggers start one Messages read',async()=>{
 const m=await region('apps/app/src/prototype/native-adapter.ts','tile-facts');
 let reads=0;const client={smsSendHistory:async()=>[],status:async()=>{reads++;return {permissions:{sms:'granted'},subscriptions:[]};},threadPage:async()=>({rows:[],next:null}),observeMessages:async()=>async()=>{}};
 const session=createSmsSession(client,true,()=>{});session.setActive(true);await tick();reads=0;
 const gate=m.returnGate(250,()=>0),check=()=>{if(gate.returned())void session.refresh();};
 check();check();check();await tick();assert.equal(reads,1);session.setActive(false);
});

test('Contacts keeps the rows on screen while a refresh is in flight and clears them when access is lost',async()=>{
 const priorDocument=globalThis.document;let release,readable=true,lists=0;
 globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
 globalThis.__commsContacts={status:async()=>({available:true,readable}),requestPermissions:async()=>({available:true,readable}),list:()=>++lists===1?Promise.resolve({contacts:[{id:'1',name:'Ada'}],more:false}):new Promise(done=>{release=done;})};
 const loaded=await bundle('apps/app/src/prototype/contacts-adapter.ts',/platform-plugins|native-adapter|mvp-features$/,path=>path.includes('platform-plugins')?'export const registerPlugin=()=>globalThis.__commsContacts;':path.includes('mvp-features')?'export const isMvpView=()=>true;':'export const watchReturnToApp=run=>{globalThis.__commsContacts.returned=run;return()=>{};};');
 try{
  class Component{view='contacts';S(){return {view:this.view};}setState(){}vget(){return {q:''};}toast(){}}
  const views={contacts:{render:state=>({list:state.list})}};loaded.module.installContactsAdapter(Component,views);
  const owner=new Component(),names=()=>views.contacts.render({},{set(){}}).list.map(row=>row.name);
  owner.componentDidMount();await tick();assert.deepEqual(names(),['Ada']);
  globalThis.__commsContacts.returned();await tick();
  assert.equal(views.contacts.render({},{set(){}}).nativeBusy,true);
  assert.deepEqual(names(),['Ada'],'rows are not blanked while the next read is in flight');
  release({contacts:[{id:'1',name:'Ada'},{id:'2',name:'Bo'}],more:false});await tick();assert.deepEqual(names(),['Ada','Bo']);
  readable=false;globalThis.__commsContacts.returned();await tick();assert.deepEqual(names(),[],'rows go when access is no longer granted');
  readable=true;lists=0;globalThis.__commsContacts.returned();await tick();assert.deepEqual(names(),['Ada']);
  owner.view='home';owner.componentDidUpdate();assert.deepEqual(names(),[],'rows go when the view is left');
  owner.componentWillUnmount();
 }finally{globalThis.document=priorDocument;delete globalThis.__commsContacts;loaded.dispose();}
});

test('a listener status read never discards or replaces a Pause or Turn off result',async()=>{
 const m=await region('apps/app/src/prototype/settings-adapter.ts','settings-reads');
 const gate=m.listenerReadGate();
 const early=gate.beginRead();assert.equal(typeof early,'number');
 assert.equal(gate.beginAction(),true);assert.equal(gate.busy(),true);
 assert.equal(gate.beginAction(),false,'one action at a time');
 assert.equal(gate.beginRead(),null,'no status read starts during the action');
 assert.equal(gate.readApplies(early),false,'a read started before the action is dropped');
 gate.endAction();assert.equal(gate.busy(),false);
 assert.equal(gate.readApplies(early),false,'and stays dropped after the action');
 const later=gate.beginRead();assert.equal(gate.readApplies(later),true);
 const newest=gate.beginRead();assert.equal(gate.readApplies(later),false);assert.equal(gate.readApplies(newest),true);
 const source=read('apps/app/src/prototype/settings-adapter.ts');
 const action=source.slice(source.indexOf('async function listenerAction('),source.indexOf('const changed ='));
 assert.match(action,/if \(!listenerReads\.beginAction\(\)\) return;/);
 assert.match(action,/if \(owner !== instance\) return;\s+listener = next;/,'the action result is applied whatever was refreshed meanwhile');
 assert.match(action,/finally \{ listenerReads\.endAction\(\);/);
 assert.match(source,/const read = listenerReads\.beginRead\(\);\s+if \(read === null\) return;\s+const status = await listenerStatus\(\);\s+if \(owner === instance && capabilityAbort === abort && listenerReads\.readApplies\(read\)\) listener = status;/);
});

test('a resume behind another view defers the Settings device read until Settings is shown',async()=>{
 const m=await region('apps/app/src/prototype/settings-adapter.ts','settings-reads');
 assert.equal(m.settingsResumeRead('settings'),'now');
 for(const view of ['home','messages',null,undefined])assert.equal(m.settingsResumeRead(view),'on-show');
 const source=read('apps/app/src/prototype/settings-adapter.ts');
 assert.match(source,/addListener\('appResumed', \(\) => \{\s+if \(settingsResumeRead\(this\.S\?\.\(\)\.view\) === 'now'\) \{ void refresh\(\); void refreshCapabilities\(\); return; \}[\s\S]{0,200}resumedUnread = true;/);
 assert.match(source,/else if \(resumedUnread && owner === this\) \{ void refresh\(\); void refreshCapabilities\(\); \}/,'the deferred read runs when Settings comes to the front');
 assert.match(source,/if \(!instance\) return;\s+resumedUnread = false;/,'any read satisfies the deferred one');
});

test('Google connect stops waiting after a bounded time and never carries an attempt or note across Cloud sessions',async t=>{
 const priorDocument=globalThis.document,priorWindow=globalThis.window;
 const listeners=new Set(),state={session:'s1',changed:0,opened:0,rejected:0,returns:new Set(),fail:false,documentListeners:0};
 globalThis.document={hidden:false,addEventListener(){state.documentListeners++;},removeEventListener(){state.documentListeners--;}};
 globalThis.window={addEventListener(){},removeEventListener(){}};
 globalThis.__commsGoogle={state,controller:{getCloudClient:()=>state.session?{sessionId:state.session,client:{}}:null,openCloudAccount(){},subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},rejectCloudSession(){state.rejected++;}}};
 const switchTo=session=>{state.session=session;for(const listener of listeners)listener();};
 const loaded=await bundle('apps/app/src/runtime/google-connect-flow.ts',/connection-ui|google-accounts|native-connection$/,path=>path.includes('connection-ui')?'export const connectionController=globalThis.__commsGoogle.controller;':path.includes('google-accounts')?'const s=globalThis.__commsGoogle.state;export const notifyGoogleAccountsChanged=()=>{s.changed++;};export const createGoogleAccounts=()=>({connect:async(signal,calendar,gmail,redirect)=>{if(s.fail)throw Error("initiate");return "https://accounts.example/consent?state="+new URL(redirect).searchParams.get("state");}});':'const s=globalThis.__commsGoogle.state;export const googleConnectReturnUrl=async()=>"https://eliza.app/alphaphone/google/return";export const onGoogleConnectReturn=listener=>{s.returns.add(listener);return()=>s.returns.delete(listener);};export const openConnectionBrowser=async url=>{s.opened++;s.url=url;};');
 t.mock.timers.enable({apis:['setTimeout']});
 try{
  const {googleConnect,googleConnectOwnerChanged,GOOGLE_CONNECT_WAIT_MS}=loaded.module;
  assert.equal(googleConnectOwnerChanged('s1','s1'),false);assert.equal(googleConnectOwnerChanged('s1','s2'),true);assert.equal(googleConnectOwnerChanged('s1',undefined),true);
  const settle=async()=>{for(let i=0;i<4;i++)await tick();};
  const deliver=result=>{const token=new URL(state.url).searchParams.get('state');for(const listener of [...state.returns])listener({state:token,result});};

  // The page never goes to the background and no App Link arrives: the wait still ends.
  let run=googleConnect.start();await settle();
  assert.equal(googleConnect.getSnapshot(),'waiting');assert.equal(state.opened,1);
  await googleConnect.start();assert.equal(state.opened,1,'a second start while waiting does nothing');
  t.mock.timers.tick(GOOGLE_CONNECT_WAIT_MS-1);await settle();assert.equal(googleConnect.getSnapshot(),'waiting');
  t.mock.timers.tick(1);await settle();t.mock.timers.tick(400);await run;
  assert.equal(googleConnect.getSnapshot(),'idle');assert.equal(state.changed,1,'the grant is read again after the time limit');
  assert.equal(state.documentListeners,0,'the back-in-front listeners are released');assert.equal(state.returns.size,0);

  // A denied note belongs to the session that asked.
  run=googleConnect.start();await settle();deliver('denied');await run;
  assert.equal(googleConnect.getSnapshot(),'denied');assert.equal(state.changed,2);
  switchTo('s1');assert.equal(googleConnect.getSnapshot(),'denied','an unrelated controller update keeps the note');
  switchTo('s2');assert.equal(googleConnect.getSnapshot(),'idle','another Cloud session does not see it');

  // An attempt in flight is retired with its session; its late return changes nothing.
  run=googleConnect.start();await settle();assert.equal(googleConnect.getSnapshot(),'waiting');
  const stale=[...state.returns],token=new URL(state.url).searchParams.get('state');
  switchTo('s3');assert.equal(googleConnect.getSnapshot(),'idle');
  for(const listener of stale)listener({state:token,result:'failed'});await run;
  assert.equal(googleConnect.getSnapshot(),'idle');assert.equal(state.changed,2,'no refresh is announced for the retired attempt');
  assert.equal(state.rejected,0);

  // The new session can start at once, and a failure is still reported to it.
  state.fail=true;await googleConnect.start();assert.equal(googleConnect.getSnapshot(),'failed');assert.equal(state.rejected,1);
  switchTo(null);assert.equal(googleConnect.getSnapshot(),'idle','signing out clears the note');
 }finally{t.mock.timers.reset();globalThis.document=priorDocument;globalThis.window=priorWindow;delete globalThis.__commsGoogle;loaded.dispose();}
});
