import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';

// A phone with no Cloud sign-in starts its agent beside the sign-in page (connection-ui.tsx
// startResidentBesideSignIn): startup resolves at once, the operation slot stays free for the
// owner's sign-in, and agent work that follows waits for that start. The real functions are
// evaluated here with in-memory ports. No agent, native host or Cloud runs, and nothing here
// measures how long a phone takes to start.
const ui=readFileSync(new URL('../apps/app/src/runtime/connection-ui.tsx',import.meta.url),'utf8');
const part=(start,end)=>{const a=ui.indexOf(start),b=ui.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start);return ui.slice(a,b);};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const ownProvider=/^function ownProviderSelected\(.*$/m.exec(ui)[0];

function phone({android=true,mocks=false,saved=null,provider={mode:'cloud',selected:false},unreadable=false,recovery=undefined}={}){
  const source=`
    let operation=null,active=null,residentStartFailure='';
    const isAndroid=${android},testMocksEnabled=${mocks},residentAlwaysPresent=true,RESIDENT_NAME='Alpha',RESIDENT_STARTING='Starting';
    const state={open:false,busy:false,message:'',error:'',kind:'starting',signIn:null,cloudAccount:null,startupResolved:false,automaticRestore:true,purpose:'agent',residentRecoveryReason:${JSON.stringify(recovery)}};
    const events=[],update=patch=>{Object.assign(state,patch);events.push({update:{...patch}});};
    const connect=deferred(),starts=[];
    const residentBindable=()=>true,residentEnvironment=()=>'production',residentCloudFlow=()=>true;
    const cloudCredentialStore={read:async()=>{if(${unreadable})throw Error('locked');return ${JSON.stringify(saved)};}};
    const localProviderStatus=async()=>(${JSON.stringify(provider)});
    ${ownProvider}
    const connectResident=(signal,admitted,beside)=>{events.push({connect:{admitted,beside}});return connect.promise.then(()=>{active={};state.kind='resident';});};
    const residentRecoveryReason=()=>null,errorMessage=error=>error.message,errorKindOf=()=>null;
    const queueResidentRebind=()=>{events.push('rebind');},runQueuedResidentRebind=()=>{events.push('queued rebind');},runQueuedSignInReturn=()=>{events.push('queued return');},scheduleResidentAutoRetry=()=>{events.push('auto retry');};
    const startResident=async(message='Starting')=>{starts.push(message);};
    const save=value=>{events.push({save:value});},selection=()=>({kind:'resident'});
    const isOwnProvider=ownProviderSelected;
    ${part('/**\n * The first agent start of a phone with no sign-in','/** Start (or restart) the resident.')}
    ${part('async function ensureResident()','/** Retires the running agent')}
    ${part('async function settleResidentAfterStartup()','function activate(')}
    ${part('async function startResidentGate(','function conversationKey(')}
    ${part('export function productionCloudSignInRequired(','/** Explicit account/plan').replace('export ','')}
    return {state,events,starts,connect,startResidentGate,ensureResident,settleResidentAfterStartup,signedOutBootSettled,productionCloudSignInRequired,
      boot:()=>signedOutBoot,setOperation(value){operation=value;},setActive(value){active=value;}};
  `;
  return new Function('deferred',transformSync(source,{loader:'ts',format:'cjs'}).code)(deferred);
}
const connects=f=>f.events.filter(event=>event.connect).map(event=>event.connect);

test('a phone with no sign-in resolves startup at once and starts its agent beside the sign-in page',async()=>{
  const f=phone();
  await f.startResidentGate();
  // The gate returned while the agent start is still pending.
  assert.deepEqual(connects(f),[{admitted:undefined,beside:true}],'the agent start was asked for, once');
  assert.ok(f.boot(),'the start is still running');
  assert.deepEqual(f.starts,[],'nothing took the operation slot');
  assert.equal(f.state.startupResolved,true);assert.equal(f.state.automaticRestore,false);assert.equal(f.state.residentSavedCredential,false);
  assert.equal(f.state.busy,false,'the page is not busy: the readiness check and the owner can use the slot');
  assert.equal(f.productionCloudSignInRequired(f.state),true,'the sign-in page is required now');
  // Nothing else starts the agent meanwhile.
  await f.settleResidentAfterStartup();await f.ensureResident();
  assert.deepEqual(f.starts,[]);assert.equal(connects(f).length,1);
  // Agent work that follows a sign-in waits for the start, saying so.
  let waited=false;const waiting=f.signedOutBootSettled(new AbortController().signal,'Signing in…').then(()=>{waited=true;});
  await settle();assert.equal(waited,false);assert.equal(f.state.message,'Signing in…');
  f.connect.resolve();await waiting;
  assert.equal(waited,true);assert.equal(f.boot(),null,'settled');
  // With no start running the wait is immediate and writes nothing.
  const before=f.events.length;await f.signedOutBootSettled(new AbortController().signal,'Signing in…');assert.equal(f.events.filter(event=>event.update).length,f.events.slice(0,before).filter(event=>event.update).length);
});

test('a saved sign-in, own keys or anything unknown takes the ordinary start and never shows the sign-in page first',async()=>{
  for(const [name,options] of [
    ['saved sign-in',{saved:{credentialId:'key'}}],
    ['own keys',{provider:{mode:'own',selected:true,provider:'cerebras'}}],
    ['unreadable key store',{unreadable:true}],
    ['pending recovery',{recovery:'journal'}],
    ['test-mocks build',{mocks:true}],
    ['browser',{android:false}],
  ]){
    const f=phone(options);
    await f.startResidentGate();
    assert.deepEqual(f.starts,['Starting'],`${name}: the ordinary start, in the operation slot`);
    assert.deepEqual(connects(f),[],name);assert.equal(f.boot(),null,name);
    assert.equal(f.state.startupResolved,false,`${name}: startup is not resolved before the start ends`);
    if(options.android!==false&&!options.mocks)assert.equal(f.productionCloudSignInRequired(f.state),false,`${name}: no sign-in page while the saved state is restored`);
  }
});

test('a wait for the start ends with its caller, and the start continues',async()=>{
  const f=phone();await f.startResidentGate();
  const step=new AbortController(),reason=new DOMException('Cancelled','AbortError');
  const waiting=f.signedOutBootSettled(step.signal);step.abort(reason);
  await assert.rejects(waiting,error=>error===reason);
  assert.ok(f.boot(),'Back does not stop the agent start');
  const aborted=new AbortController();aborted.abort(reason);
  await assert.rejects(f.signedOutBootSettled(aborted.signal),error=>error===reason);
  f.connect.resolve();await f.boot();assert.equal(f.boot(),null);
});

test('a start that fails beside the sign-in page recovers without replacing what the owner is doing',async()=>{
  const idle=phone();await idle.startResidentGate();
  const boot=idle.boot();idle.connect.reject(new Error('Local agent failed to start.'));await boot;
  assert.equal(idle.state.kind,'recovering');assert.equal(idle.state.error,'Local agent failed to start.','reported as a background start reports it');
  assert.ok(idle.events.includes('auto retry'));
  // In a code step, or under an error the owner is reading, the owner's state is kept.
  for(const patch of [{signIn:{step:'code'}},{error:'invalid-code'}]){
    const f=phone();await f.startResidentGate();Object.assign(f.state,patch);
    const running=f.boot();f.connect.reject(new Error('Local agent failed to start.'));await running;
    assert.equal(f.state.kind,'recovering');assert.equal(f.state.error,patch.error??'');
  }
  // A waiting sign-in is released by a failed start too: its own start reports the outcome.
  const f=phone();await f.startResidentGate();
  const waiting=f.signedOutBootSettled(new AbortController().signal);f.connect.reject(new Error('Local agent failed to start.'));
  await waiting;assert.equal(f.boot(),null);
});

test('a key stored while the agent was starting is admitted when the start ends',async()=>{
  // Back after the native commit adopts the key while the start is running: ensureResident starts nothing then.
  const running=phone();await running.startResidentGate();
  running.state.residentSavedCredential=true;await running.ensureResident();assert.deepEqual(running.starts,[]);
  const boot=running.boot();running.connect.resolve();await boot;
  assert.ok(running.events.includes('rebind'),'the running agent rebinds to the key');
  const failed=phone();await failed.startResidentGate();failed.state.residentSavedCredential=true;
  const failing=failed.boot();failed.connect.reject(new Error('Local agent failed to start.'));await failing;await settle();
  assert.deepEqual(failed.starts,['Restarting'],'a stopped agent starts with the key');
  // A sign-in step that is itself waiting binds the key; the end of the start adds nothing.
  const owned=phone();await owned.startResidentGate();owned.state.residentSavedCredential=true;owned.setOperation({});
  const held=owned.boot();owned.connect.resolve();await held;
  assert.ok(!owned.events.includes('rebind'));assert.deepEqual(owned.starts,[]);
});

test('every agent restart reachable from the sign-in page waits for the start beside it',()=>{
  const waits=[
    ['a verified sign-in',part('async function residentSignedIn(','/** The key is stored;'),/await signedOutBootSettled\(signal, 'Signing in…'\);[\s\S]*signal\.throwIfAborted\(\); retire\(\);/],
    ['own keys',part('  async configureLocal(','  /** Stops the running agent'),/await signedOutBootSettled\(signal\);await configureLocalProvider\(/],
    ['a provider change',part('async function restartAfterProviderChange(','/** Key-manager requests'),/await signedOutBootSettled\(signal\); await retire\(\); await connectResident\(signal\);/],
    ['a rebind',part('function rebindResident()','/** A native sign-in return that arrived'),/await signedOutBootSettled\(signal\);\s*retire\(\);/],
    ['Restore saved sign-in',part('  async restoreSavedSignIn() {','  async startLocal()'),/await signedOutBootSettled\(signal\);\s*retire\(\);\s*await connectResident\(signal\);/],
    ['an explicit start',part('async function startResident(','// Keep startup-error provenance'),/await signedOutBootSettled\(signal\); if \(active\) return;/],
  ];
  for(const [name,source,pattern] of waits)assert.match(source,pattern,name);
  // The start beside the page is a real agent start, and keeps the owner's step on screen when it ends.
  const beside=part('async function startResidentBesideSignIn()','/** Start (or restart) the resident.');
  assert.match(beside,/await connectResident\(controller\.signal, undefined, true\);/);
  const connect=part('async function connectResident(','async function connectCloud(');
  assert.match(connect,/const ownerShown = ownerStep\(\) \? \{ message: state\.message, error: state\.error, errorKind: state\.errorKind \?\? null \} : null;\n  activate\([^\n]*\n  if \(ownerShown\) update\(ownerShown\);/);
  assert.match(connect,/\.\.\.\(ownerStep\(\)\?\{\}:\{message:'',error:error\?\?'',errorKind:/);
  // The page's own readiness check runs as soon as startup is resolved and nothing is busy.
  assert.match(ui,/if \(automaticSignInProbe\.current \|\| snapshot\.busy \|\| snapshot\.startupResolved===false \|\| snapshot\.automaticRestore\) return;/);
});
