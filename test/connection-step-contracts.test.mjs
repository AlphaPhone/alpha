/** Connection controller, native connection, local agent, sign-in and delegation step contracts.
 * Real source is sliced or bundled and run with injected infrastructure: no renderer, network,
 * credential store or phone. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from './support/strip-types.mjs';
import {loadBrowserModule} from './fixtures/browser-source.mjs';
import {CloudSignInError,SIGN_IN_WAITING,SIGN_IN_CODE_LOST,normalizeSignInCode,signInStepHeld,signInMethodsRecheck,verifyFailureStep} from '../apps/app/src/runtime/cloud-sign-in.ts';
import {planWindowEnd} from '../apps/app/src/runtime/subscription-entitlement.ts';

const read=name=>readFileSync(new URL('../apps/app/src/runtime/'+name,import.meta.url),'utf8');
const ui=read('connection-ui.tsx'),connection=read('native-connection.ts'),delegation=read('cloud-delegation-ui.tsx'),panel=read('cloud-sign-in-ui.tsx');
function between(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,`${start} … ${end}`);return source.slice(a,b);}
const compile=text=>stripTypeScriptTypes(text.replace(/^export /gm,''),{mode:'strip'});
/** Runs sliced source in a context; free names in the slice resolve to (and assign) its properties. */
function load(text,context,expose=''){const box=vm.createContext({AbortController,DOMException,Date,Error,Promise,Map,Set,Math,JSON,console,setTimeout,queueMicrotask,...context});vm.runInContext(compile(text)+'\n'+expose,box);return box;}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// ---- Sign-in: code step, held steps and the method choice's re-check ----

test('a failed code check keeps the code step, asks for a new code, or restarts',()=>{
 const now=1_000_000,live={step:'code',expiresAt:now+60_000};
 for(const code of ['invalid-code','offline','dns','timeout','secure-connection'])assert.equal(verifyFailureStep(code,live,now),'stay',code);
 assert.equal(verifyFailureStep('expired',live,now),'resend','the host dropped an attempt whose deadline is still ahead');
 assert.equal(verifyFailureStep('expired',{step:'code',expiresAt:now},now),'restart','a real expiry starts again');
 assert.equal(verifyFailureStep('expired',{step:'mfa',expiresAt:now+60_000},now),'restart','a second verification cannot be re-sent');
 for(const code of ['attempts-exhausted','rate-limited','unavailable','rejected'])assert.equal(verifyFailureStep(code,live,now),'restart',code);
});

function verifyFixture(failure,view){
 const state={signIn:view,error:'',busy:false},failed=[];
 const box=load('globalThis.methods={'+between(ui,'async verifySignInCode(code: string) {','\n  },')+'\n  }};',{state,normalizeSignInCode,CloudSignInError,verifyFailureStep,SIGN_IN_CODE_LOST,TRANSPORT_FAILURES:['offline','dns','timeout','secure-connection'],
  update:patch=>Object.assign(state,patch),signInFailureMessage:code=>'message:'+code,
  work:async(_message,action)=>{state.error='';try{await action(new AbortController().signal);}catch(error){state.error='message:'+error.code;}},
  signInClient:()=>({verifyEmailSignIn:async()=>{throw new CloudSignInError(failure);},verifyMfaSignIn:async()=>{throw new CloudSignInError(failure);}}),
  signInFailed:(environment,keep=false)=>{failed.push(keep);if(!keep)state.signIn={step:'choose',environment};},signedIn:async()=>{},ensureResident:async()=>{}});
 return {state,failed,verify:()=>box.methods.verifySignInCode('123456')};
}
test('verifying a code is correct whether or not the host kept the attempt after a failed request',async()=>{
 const view=()=>({step:'code',environment:'production',email:'owner@example.invalid',attemptId:'a',expiresAt:Date.now()+600_000,resendAt:0});
 // The request never reached Cloud: the code step stays under either host behaviour.
 const offline=verifyFixture('offline',view());await offline.verify();
 assert.deepEqual(offline.failed,[true]);assert.equal(offline.state.signIn.step,'code');assert.equal(offline.state.error,'message:offline');
 // A host that dropped the attempt answers the retry (or the old code after a failed resend) with
 // `expired`: the owner stays on the code step and is asked for a new code.
 const lost=verifyFixture('expired',view());await lost.verify();
 assert.deepEqual(lost.failed,[],'the attempt view is not replaced by the method choice');
 assert.equal(lost.state.signIn.step,'code');assert.equal(lost.state.error,SIGN_IN_CODE_LOST);
 // Past the attempt's own deadline the sign-in starts again.
 const expired=verifyFixture('expired',{...view(),expiresAt:Date.now()-1});await expired.verify();
 assert.deepEqual(expired.failed,[false]);assert.equal(expired.state.signIn.step,'choose');assert.equal(expired.state.error,'message:expired');
 const wrong=verifyFixture('invalid-code',view());await wrong.verify();assert.deepEqual(wrong.failed,[true]);
});

test('a held step that meets the send cooldown when sent again keeps waiting; a tap does not',async()=>{
 assert.equal(signInStepHeld('waiting',false),true);assert.equal(signInStepHeld('cooldown',true),true);
 assert.equal(signInStepHeld('cooldown',false),false);assert.equal(signInStepHeld('other',true),false);
 const pending={kind:'email',value:'owner@example.invalid'};
 const state={signIn:{step:'choose',environment:'production'},signInPending:pending,error:SIGN_IN_WAITING};
 let outcome='message:cooldown',sends=0;
 const box=load(between(ui,'function holdSignInStep(','/** Once Cloud answers, the held step'),{state,SIGN_IN_WAITING,signInStepHeld,operation:null,update:patch=>Object.assign(state,patch),signInFailureMessage:code=>'message:'+code,
  connectionController:{signInEmail:async value=>{sends++;await null;state.error=outcome;if(state.error)box.holdSignInStep({kind:'email',value});}}},'globalThis.holdSignInStep=holdSignInStep;globalThis.sendPendingSignInStep=sendPendingSignInStep;');
 // A host that counted the unsent code toward its cooldown refuses the automatic send.
 box.sendPendingSignInStep();await tick();
 assert.equal(sends,1);assert.deepEqual(state.signInPending,pending,'still held');assert.equal(state.error,SIGN_IN_WAITING);
 // The next automatic send goes out once the cooldown has passed (or the host never stamped it).
 outcome='';box.sendPendingSignInStep();await tick();
 assert.equal(sends,2);assert.equal(state.signInPending,null);assert.equal(state.error,'');
 // The owner tapping twice inside the cooldown sees the cooldown, not an endless wait.
 state.error='message:cooldown';box.holdSignInStep(pending);
 assert.equal(state.signInPending,null);assert.equal(state.error,'message:cooldown');
});

test('the method choice polls Cloud only for states the re-check can change',()=>{
 const base={step:'choose',methodsUnconfirmed:false,connectionError:false,pending:false,anyMethod:true};
 assert.equal(signInMethodsRecheck(base),false,'a cooldown, rate limit or refused address is not polled');
 for(const patch of [{methodsUnconfirmed:true},{connectionError:true},{pending:true},{anyMethod:false}])assert.equal(signInMethodsRecheck({...base,...patch}),true,JSON.stringify(patch));
 for(const step of ['code','mfa','google'])assert.equal(signInMethodsRecheck({...base,step,methodsUnconfirmed:true,connectionError:true,pending:true,anyMethod:false}),false,step);
 // The panel takes the decision from that function and the controller says which errors are connection errors.
 assert.match(panel,/const recheck = signInMethodsRecheck\(\{ step: view\.step, methodsUnconfirmed, connectionError: connectionError \?\? error === SIGN_IN_WAITING,/);
 assert.doesNotMatch(panel,/methodsUnconfirmed \|\| !!error/);
 assert.match(ui,/<CloudSignInPanel [^\n]*connectionError=\{connectionFailure\(snapshot\.error\)\}/);
});

// ---- Plan window, admission and the background re-check ----

test('a plan end that has passed is never carried forward',()=>{
 const now=10_000,active={kind:'active',planName:'Plan',status:'active',allowance:null,expiresAt:now+50,refreshFailed:false};
 assert.equal(planWindowEnd(active,now-1,now),null,'the old end is dropped after a renewal');
 assert.equal(planWindowEnd(active,now,now),null);
 assert.equal(planWindowEnd(active,now+5_000,now),now+5_000);
 assert.equal(planWindowEnd({...active,source:'billing-limits',expiresAt:now+9_000},now+5_000,now),now+9_000,'Cloud’s period end wins');
 assert.equal(planWindowEnd({...active,source:'billing-limits',expiresAt:0},now+5_000,now),now+5_000);
 assert.equal(planWindowEnd({kind:'credits',source:'billing-limits'},now+5_000,now),null);
 assert.equal(planWindowEnd(active,undefined,now),null);
 // Admission and the refresher both take the end from that function.
 const admission=between(ui,'async function admitCloudResident(','\n/**\n * Cloud reported, on a background refresh');
 assert.match(admission,/const endsAt=planWindowEnd\(view,/);assert.match(admission,/const nextEnd=planWindowEnd\(next,state\.planEndsAt\?\?null,Date\.now\(\)\);/);
 assert.match(admission,/verifiedAt:Date\.now\(\),endsAt:nextEnd\}\);/);
});

function admissionFixture(readFailure){
 const state={},updates=[],recheck=new AbortController();let detached=0;
 const box=load(between(ui,'async function admitCloudResident(','\n/**\n * Cloud reported, on a background refresh'),{state,planRecheck:recheck,residentKeyRefused:true,service:{identity:{}},cloud:null,
  stopEntitlementRefresh:()=>{},update:patch=>{updates.push(patch);Object.assign(state,patch);},residentEnvironment:()=>'production',makeCloud:()=>({environment:'production'}),
  cloudCredentialStore:{read:async()=>{throw readFailure;}},detachService:()=>{detached++;box.service=null;},SAVED_SIGN_IN_UNREADABLE:'unreadable'},'globalThis.admit=admitCloudResident;');
 return {box,state,recheck,detached:()=>detached};
}
test('an unreadable saved sign-in still admits the agent, unbound, and says so',async()=>{
 const f=admissionFixture(new SyntaxError('Unexpected token'));
 const admission=await f.box.admit(new AbortController().signal);
 assert.equal(admission.binding,'unbound');assert.equal(admission.notice.error,'unreadable');assert.equal(admission.notice.open,true);
 assert.equal(f.detached(),1,'the account that can no longer be confirmed is detached');
 assert.equal(f.state.residentSubscription,null);assert.equal(f.state.residentPlanNotice,null);
 assert.equal(f.recheck.signal.aborted,true,'an admission ends a background re-check in flight');
 // A cancelled step still reports the cancellation.
 const cancelled=admissionFixture(Error('Keystore unavailable')),controller=new AbortController();
 controller.abort();await assert.rejects(cancelled.box.admit(controller.signal),error=>error.name==='AbortError');
});

function recheckFixture(overrides={}){
 const state={session:{},purpose:'agent',open:false,error:''};let admit,admissions=0,drains=0,direct=0;
 const box=load(between(ui,'async function recheckResidentPlan(','/** Bind or unbind Eliza Cloud inference'),{state,operation:null,planRecheck:null,active:{kind:'resident'},residentBinding:'unbound',residentRebindQueued:false,
  bindingRetries:0,bindingRetryAt:-Infinity,PLAN_RECHECK_INTERVAL_MS:60_000,residentBindable:()=>true,update:patch=>Object.assign(state,patch),
  queueResidentRebind:()=>{direct++;},runQueuedResidentRebind:()=>{drains++;},admitCloudResident:()=>{admissions++;return new Promise((resolve,reject)=>{admit={resolve,reject};});},...overrides},
  'globalThis.recheck=recheckResidentPlan;globalThis.delay=bindingRetryDelayMs;globalThis.step=planRecheckStep;');
 return {box,state,finish:value=>admit.resolve(value),fail:error=>admit.reject(error),admissions:()=>admissions,drains:()=>drains,direct:()=>direct};
}
test('a background plan re-check never holds the connection step, and runs once at a time',async()=>{
 const f=recheckFixture(),first=f.box.recheck(),second=f.box.recheck();
 assert.equal(f.box.operation,null,'sends, taps and other steps are not refused while it runs');
 assert.ok(f.box.planRecheck);assert.equal(f.admissions(),1,'a second return to Alpha joins the check in flight');
 f.finish({binding:'cloud'});await first;await second;
 assert.equal(f.box.planRecheck,null);assert.equal(f.box.residentRebindQueued,true,'a changed binding is applied by one queued rebind');assert.equal(f.drains(),1);
 // Unchanged binding: nothing is rebound; a notice is shown only when no other step owns the dialog.
 const same=recheckFixture(),run=same.box.recheck();same.finish({binding:'unbound',notice:{error:'Sign in again.',open:true}});await run;
 assert.equal(same.box.residentRebindQueued,false);assert.equal(same.state.open,true);assert.equal(same.state.error,'Sign in again.');
 const busy=recheckFixture(),busyRun=busy.box.recheck();busy.box.operation=new AbortController();busy.finish({binding:'unbound',notice:{error:'Sign in again.',open:true}});await busyRun;
 assert.equal(busy.state.open,false,'a step that started meanwhile keeps its own outcome');
 // A failed read leaves the agent as it is and frees the next check.
 const failed=recheckFixture(),failedRun=failed.box.recheck();failed.fail(Error('offline'));await failedRun;
 assert.equal(failed.box.planRecheck,null);assert.equal(failed.box.residentRebindQueued,false);
 // Without a running resident the start itself reads the account.
 const stopped=recheckFixture({active:null});await stopped.box.recheck();assert.equal(stopped.direct(),1);assert.equal(stopped.admissions(),0);
 const other=recheckFixture({operation:new AbortController()});await other.box.recheck();assert.equal(other.admissions(),0);
});
test('a binding the agent still does not have is retried with backoff, never on every return',async()=>{
 const f=recheckFixture();
 const round=async explicit=>{f.box.residentRebindQueued=false;const run=f.box.recheck(explicit);f.finish({binding:'cloud'});await run;return f.box.residentRebindQueued;};
 const realNow=Date.now;let now=1_000_000;f.box.Date={now:()=>now};
 try{
  assert.equal(await round(),true,'the first mismatch rebinds at once');
  now+=59_000;assert.equal(await round(),false,'the same unmet binding waits');
  assert.equal(await round(true),true,'a check the owner asked for never waits');
  now+=10*60_000;assert.equal(await round(),true);
  now+=60_000;assert.equal(await round(),false,'the wait grows with each failed attempt');
  // Once the binding matches the count starts over.
  f.box.residentBinding='cloud';f.box.residentRebindQueued=false;const run=f.box.recheck();f.finish({binding:'cloud'});await run;
  assert.equal(f.box.bindingRetries,0);assert.equal(f.box.bindingRetryAt,-Infinity);
 }finally{Date.now=realNow;}
 assert.equal(f.box.delay(0),60_000);assert.equal(f.box.delay(1),120_000);assert.equal(f.box.delay(40),30*60_000);
 assert.ok([0,1,2,3,4,5,6,7].every(n=>f.box.delay(n+1)>=f.box.delay(n)));
 assert.equal(f.box.step({target:'kept',binding:'cloud',now:0,retryAt:Infinity,explicit:false}),'none','an outage keeps the stored binding');
 assert.equal(f.box.step({target:'unbound',binding:'unknown',now:5,retryAt:10,explicit:false}),'wait');
 assert.equal(f.box.step({target:'unbound',binding:'unknown',now:10,retryAt:10,explicit:false}),'rebind');
});
test('a plan rebind waits for a turn in flight and runs after it',()=>{
 let works=0;
 const box=load(between(ui,'function queueResidentRebind(','/** A native sign-in return'),{residentCloudFlow:()=>true,operation:null,sending:new AbortController(),residentRebindQueued:false,residentStartFailure:'',state:{open:false},work:async()=>{works++;}},'globalThis.queue=queueResidentRebind;');
 box.queue();assert.equal(works,0,'the turn is not aborted by a rebind');assert.equal(box.residentRebindQueued,true);
 box.sending=null;box.queue();assert.equal(works,1);assert.equal(box.residentRebindQueued,false);
 const send=ui.slice(ui.indexOf('  async send('),ui.indexOf('// A Google sign-in that native finished'));
 assert.match(send,/if \(residentRebindQueued && !sending\) setTimeout\(runQueuedResidentRebind, 0\);/);
});

// ---- Operation slot, retirement and expired sessions ----

test('every step that takes the connection slot runs the queued work when it ends',()=>{
 const calls=[];let settled=0,after=0;
 const box=load(between(ui,'function releaseOperation(','/** P-43: the agent always runs.'),{operation:null,runQueuedResidentRebind:()=>calls.push('rebind'),runQueuedSignInReturn:()=>calls.push('sign-in'),scheduleResidentAutoRetry:()=>calls.push('retry')},'globalThis.release=releaseOperation;');
 const controller=new AbortController();box.operation=controller;
 box.release(controller,()=>{settled++;},()=>{after++;});
 assert.equal(box.operation,null);assert.equal(settled,1);assert.equal(after,1);assert.deepEqual(calls,['rebind','sign-in','retry']);
 // A step that was replaced leaves the newer one in place and still settles.
 const newer=new AbortController();box.operation=newer;box.release(controller,()=>{settled++;},()=>{after++;});
 assert.equal(box.operation,newer);assert.equal(settled,2);assert.equal(after,1);
 assert.match(between(ui,'async truncateMessage(','\n  },'),/operation=controller;const settle=holdOperation\(\);[\s\S]*finally \{releaseOperation\(controller,settle,\(\)=>update\(\{busy:false\}\)\);\}/);
 assert.match(between(ui,'async prepareVoiceConversation(','\n  },'),/operation=controller;const settle=holdOperation\(\);[\s\S]*releaseOperation\(controller,settle\);\}/);
});

function retireFixture(active){
 const state={session:null};
 const box=load(between(ui,'\nfunction retire(','/** Test mocks only (the mock-mode exit'),{state,active,epoch:0,sending:null,testMocksEnabled:false,residentAlwaysPresent:true,RESIDENT_NAME:'On this device',actionReceipts:new Map(),conversationMemory:new Map(),automationsRequests:new Set(),
  retireReadReplies:()=>{},pauseHostedBackground:async()=>{},retireClockReviews:async()=>{},cancelStoppedReply:()=>{},update:patch=>Object.assign(state,patch)},'globalThis.retire=retire;');
 return box;
}
test('retiring the connection disconnects the resident client',async()=>{
 let disconnects=0;const box=retireFixture({kind:'resident',remote:{disconnect:async()=>{disconnects++;}}});
 await box.retire();assert.equal(disconnects,1);assert.equal(box.active,null);
 // A failed disconnect never fails the retirement; other agent kinds are not touched here.
 const failing=retireFixture({kind:'resident',remote:{disconnect:async()=>{throw Error('closed');}}});await failing.retire();await tick();
 const remote=retireFixture({kind:'remote',remote:{disconnect:async()=>{disconnects++;}}});await remote.retire();assert.equal(disconnects,1);
 assert.match(between(ui,'\nfunction activate(','\n}\n'),/if \(active && active !== next && active\.kind === 'resident'\) void active\.remote\.disconnect\(\)\.catch\(\(\) => \{\}\);/);
});

test('only a Cloud refusal reads as an expired Cloud sign-in; the on-device agent is restarted instead',()=>{
 const box=load(between(ui,'function expired(','function selection()')+between(ui,'\nfunction errorMessage(','/** A resident start that does not open'),{testMocksEnabled:false,RESIDENT_SIGN_IN_EXPIRED:'Your sign-in expired. Sign in again.',CloudSignInError,EntitlementError:class extends Error{},
  residentRecoveryReason:()=>null,residentRecoveryMessage:()=>'',signInFailureMessage:code=>code,cloudServiceName:()=>'Cloud',cloud:{environment:'production'}},'globalThis.api={expired,fromLocalAgent,expiredTurnRoute,errorMessage};');
 const local=Object.assign(Error('Local agent request failed (HTTP 401).'),{status:401,source:'local-agent'});
 assert.equal(box.api.fromLocalAgent(local),true);assert.equal(box.api.fromLocalAgent({status:401}),false);assert.equal(box.api.fromLocalAgent(null),false);
 assert.equal(box.api.errorMessage({status:401}),'Your sign-in expired. Sign in again.');
 assert.equal(box.api.errorMessage(local),'Local agent request failed (HTTP 401).','the full-screen Cloud sign-in is not forced by the agent’s own refusal');
 assert.equal(box.api.expiredTurnRoute('resident',true),'restart-resident');
 assert.equal(box.api.expiredTurnRoute('resident',false),'sign-in');
 for(const kind of ['remote','local','cloud'])assert.equal(box.api.expiredTurnRoute(kind,true),'sign-in',kind);
 const send=ui.slice(ui.indexOf('  async send('),ui.indexOf('// A Google sign-in that native finished'));
 const restart=send.indexOf("expiredTurnRoute(selected.kind, residentAlwaysPresent) === 'restart-resident'"),signIn=send.indexOf("retire('Sign-in required');");
 assert.ok(restart>0&&signIn>restart,'the resident route is decided before the sign-in route');
 assert.match(send.slice(restart,signIn),/retire\(\);\s+update\(\{ kind: 'recovering' \}\);\s+void Promise\.resolve\(\)\.then\(ensureResident\);/);
});

test('the automatic retry of a kept sign-in reads the account again without restarting a running agent',()=>{
 const box=load(between(ui,'export function savedSignInRetryStep(','/** Stable for the panel'),{},'globalThis.step=savedSignInRetryStep;');
 assert.equal(box.step({busy:false,running:true}),'admission');assert.equal(box.step({busy:false,running:false}),'start');
 assert.equal(box.step({busy:true,running:true}),'none');assert.equal(box.step({busy:true,running:false}),'none');
 let rechecks=0,starts=0;const state={busy:false,session:{}};
 const methods=load('globalThis.methods={'+between(ui,'  retrySavedSignIn() {','\n  },')+'\n  }};',{state,operation:null,active:{kind:'resident'},savedSignInRetryStep:box.step,recheckResidentPlan:async()=>{rechecks++;},connectionController:{startLocal:async()=>{starts++;}}});
 methods.methods.retrySavedSignIn();assert.deepEqual([rechecks,starts],[1,0],'no retire, re-registration or history restore');
 state.session=null;methods.methods.retrySavedSignIn();assert.deepEqual([rechecks,starts],[1,1]);
 state.busy=true;methods.methods.retrySavedSignIn();assert.deepEqual([rechecks,starts],[1,1]);
 const chooser=ui.slice(ui.indexOf('export function ConnectionChooser'));
 assert.match(chooser,/const attempt=\(\)=>\{if\(alive&&!document\.hidden&&!connectionController\.getSnapshot\(\)\.busy\)connectionController\.retrySavedSignIn\(\);\};/);
});

// ---- Credentials, receipts and sign-out ----

test('a key that was just issued is removed only when Cloud refused it',()=>{
 const box=load(between(ui,'export function cloudKeyRefused(','/** Whether the last admission'),{},'globalThis.refused=cloudKeyRefused;');
 assert.equal(box.refused({status:401}),true);assert.equal(box.refused({status:403}),true);
 for(const error of [{status:400},{status:404},{status:500},{code:'invalid-response'},Error('Connection request failed'),null,undefined,'401'])assert.equal(box.refused(error),false,String(error));
 const admission=between(ui,'async function admitCloudResident(','\n/**\n * Cloud reported, on a background refresh');
 assert.match(admission,/stopEntitlementRefresh\(\);\n\s+residentKeyRefused=false;/);
 assert.equal(admission.split('residentKeyRefused=cloudKeyRefused(error);').length,3,'identity and entitlement refusals both record it');
 assert.match(between(ui,'async function signedIn(','/** The development hosted-agent client.'),/if \(residentKeyRefused && !state\.cloudAccount && state\.residentPlanNotice !== 'offline' && issued &&/);
 assert.match(between(ui,'async function residentBrowserLoginAction(','async function browserCloudLoginAction('),/if\(residentKeyRefused&&!state\.cloudAccount&&state\.residentPlanNotice!=='offline'&&issued&&/);
});

test('reconnecting under the same enrollment writes nothing to the keystore',async()=>{
 const box=load(between(ui,'export async function persistEnrollment(','async function remoteIdentity('),{},'globalThis.api={persistEnrollment,rememberActionReceipt};');
 const writes=[],store={write:async(slot,value)=>{writes.push([slot,{...value}]);}};
 const credential={installationId:'i',key:'k'};
 await box.api.persistEnrollment(store,'device:scope',credential,'enrollment-1');
 assert.deepEqual(writes,[['device:scope',{installationId:'i',key:'k',enrollmentId:'enrollment-1'}]]);
 await box.api.persistEnrollment(store,'device:scope',credential,'enrollment-1');assert.equal(writes.length,1);
 await box.api.persistEnrollment(store,'device:scope',credential,'enrollment-2');assert.equal(writes.length,2);assert.equal(credential.enrollmentId,'enrollment-2');
 assert.equal(ui.split('await persistEnrollment(').length,4,'resident, remote and Cloud connections all use it');
 assert.doesNotMatch(ui,/credential\.enrollmentId ?= ?registered\.enrollmentId/);
});

test('an approval that failed before it was sent can be approved again; a sent one is never repeated',async()=>{
 const box=load(between(ui,'export async function persistEnrollment(','async function remoteIdentity('),{},'globalThis.remember=rememberActionReceipt;');
 const receipts=new Map();let runs=0;
 const cancelled=box.remember(receipts,'p1','s1',async()=>{runs++;throw Error('The Notes review changed. Nothing was shared.');});
 await assert.rejects(cancelled,/Notes review changed/);await tick();
 assert.equal(receipts.has('p1'),false);
 const approved=box.remember(receipts,'p1','s1',async dispatched=>{runs++;dispatched();return {status:'applied'};});
 assert.equal(box.remember(receipts,'p1','s1',async()=>{runs++;return {status:'again'};}),approved,'one approval per proposal and session');
 assert.deepEqual(await approved,{status:'applied'});assert.equal(runs,2);
 // A failure after the request left the phone stays the proposal's outcome.
 const failed=box.remember(receipts,'p2','s1',async dispatched=>{dispatched();throw Error('Device action request failed');});
 await assert.rejects(failed);await tick();
 assert.equal(box.remember(receipts,'p2','s1',async()=>{runs++;}),failed);assert.equal(runs,2);
 // Another session never reuses it.
 const other=box.remember(receipts,'p2','s2',async dispatched=>{runs++;dispatched();return {status:'applied'};});assert.notEqual(other,failed);await other;
 assert.match(between(ui,'  async execute(proposal: ActionProposal','\n  },'),/return rememberActionReceipt\(actionReceipts, proposal\.id, sessionId, async dispatched => \{[\s\S]*dispatched\(\);\n\s+return selected\.actions!\.approve\(proposal\.id, context, signal\);/);
});

test('sign-out removes the key even when background retirement fails',async()=>{
 const state={error:'',residentInference:null},calls=[];
 const client={environment:'production',revokeSession:async()=>{calls.push('revoke');},disconnect:async()=>{calls.push('disconnect');}};
 const failing=()=>{const retirement=Promise.reject(Error('Background delivery could not be retired.'));retirement.catch(()=>{});return retirement;};
 const box=load('globalThis.methods={'+between(ui,'  async cloudSignOut() {','\n  async mock() {')+'};',{state,service:{client,identity:{credentialId:'c'},credentialReference:undefined},cloud:client,active:null,residentBinding:'cloud',residentRebindQueued:false,residentAlwaysPresent:true,CLOUD_SERVICE:'service',RESIDENT_UNBIND_UNCONFIRMED:'unconfirmed',
  work:async(_message,action)=>{try{await action(new AbortController().signal);}catch(error){state.error=error.message;}},cloudCredentialStore:{read:async()=>({credentialId:'c'})},residentCloudFlow:()=>true,residentBindable:()=>true,
  stopEntitlementRefresh:()=>{},writePlanAdmission:()=>{},update:patch=>Object.assign(state,patch),retire:failing,clearLocalProvider:async()=>{calls.push('unbind');},detachCloudTarget:()=>{},detachService:()=>{calls.push('detach');},
  localStorage:{removeItem:()=>{}},save:()=>{},connectResident:async()=>{calls.push('restart');},ensureResident:async()=>{}});
 await box.methods.cloudSignOut();await tick();
 assert.equal(state.error,'');assert.deepEqual(calls,['unbind','detach','revoke','disconnect','restart']);assert.equal(state.message,'Signed out.');
});

// ---- Native connection ----

test('a request deadline can only shorten its timeout',()=>{
 const box=load(between(connection,'export function cloudRequestTimerMs(','export const nativeRemoteRequest'),{},'globalThis.timer=cloudRequestTimerMs;');
 assert.equal(box.timer(30_000,undefined,1_000),30_000);
 assert.equal(box.timer(30_000,1_000+600_000,1_000),30_000,'a far deadline does not replace the timeout');
 assert.equal(box.timer(30_000,1_000+5_000,1_000),5_000);
 assert.equal(box.timer(30_000,500,1_000),1,'a passed deadline fires at once');
 assert.equal(box.timer(Infinity,undefined,0),2_147_483_647);
 assert.match(connection,/rejectAbort\(new Error\('Connection timed out'\)\);\},cloudRequestTimerMs\(input\.timeoutMs,input\.expiresAt,Date\.now\(\)\)\);/);
});

test('browser secrets fall back to memory only when durable storage never worked',async()=>{
 const box=load(between(connection,'export function memorySecretBackend()','const SECRET_DATABASE')+between(connection,'export function durableSecretsWithFallback(','function webSecrets()'),{},'globalThis.api={memorySecretBackend,durableSecretsWithFallback};');
 const refusal=()=>new DOMException('refused','InvalidStateError');
 // A private window: nothing durable ever answers, so the page keeps working from memory.
 const never={read:async()=>{throw refusal();},compareExchange:async()=>{throw refusal();}};
 const privateWindow=box.api.durableSecretsWithFallback(never,box.api.memorySecretBackend());
 assert.equal(await privateWindow.compareExchange('cloud:production',undefined,'key'),true);assert.equal(await privateWindow.read('cloud:production'),'key');
 // Durable storage that worked and then fails once: a removal is reported, never faked in memory.
 const durable=box.api.memorySecretBackend();let failNext=false;
 const flaky={read:slot=>durable.read(slot),compareExchange:async(slot,expected,value)=>{if(failNext){failNext=false;throw refusal();}return durable.compareExchange(slot,expected,value);}};
 const secrets=box.api.durableSecretsWithFallback(flaky,box.api.memorySecretBackend(),slot=>'ns:'+slot);
 await secrets.compareExchange('cloud:production',undefined,'key');assert.equal(await durable.read('ns:cloud:production'),'key','the slot name is mapped');
 failNext=true;await assert.rejects(secrets.compareExchange('cloud:production',undefined,null),error=>error.name==='InvalidStateError');
 assert.equal(await secrets.read('cloud:production'),'key','the key is still reported as stored');
 assert.equal(await secrets.compareExchange('cloud:production',undefined,null),true);assert.equal(await durable.read('ns:cloud:production'),null,'the retried sign-out removes the durable key');
 // Other failures are never swallowed.
 const broken=box.api.durableSecretsWithFallback({read:async()=>{throw Error('Stored connection secret is invalid.');},compareExchange:async()=>false},box.api.memorySecretBackend());
 await assert.rejects(broken.read('cloud:production'),/invalid/);
});

test('the browser admits the pending Cloud read authorization slot and nothing broader',()=>{
 const box=load(between(connection,'export const browserConnectionSlot=','export function memorySecretBackend()'),{},'globalThis.slot=browserConnectionSlot;');
 for(const slot of ['cloud-delegation:v1:owner','cloud:production','remote:https://agent.example','device:scope','cloud-runtime:session'])assert.equal(box.slot(slot),slot);
 for(const slot of ['cloud-delegation','cloud-delegations:v1:x','notes:1','cloud-delegation:v1:has space','',null,'x'.repeat(1025)])assert.throws(()=>box.slot(slot),/unavailable in the browser/,String(slot).slice(0,30));
});

// ---- Local agent ----

const agent=await loadBrowserModule('apps/app/src/runtime/local-agent.ts');
test('cancelling a start reaches native with the start’s own request id',async()=>{
 const starts=[],cancels=[];
 const bridge=agent.nativeAgentBridge({start:input=>{starts.push(input);return new Promise(()=>{});},cancelStart:async input=>{cancels.push(input);},request:async()=>({status:200,body:'{}'})});
 assert.equal(typeof bridge.cancelStart,'function');
 const controller=new AbortController(),connecting=new agent.LocalAgentProtocol(bridge).connect(controller.signal);
 await tick();controller.abort();await assert.rejects(connecting,error=>error.name==='AbortError');
 assert.equal(starts.length,1);assert.match(starts[0].requestId,/^[a-f0-9-]{36}$/);
 assert.deepEqual(cancels,[{requestId:starts[0].requestId}]);
});
test('Stop reads the conversation list once per conversation, and a refusal names its source',async()=>{
 const room='5f0c8a52-6d8e-4c4a-9a51-0b6e6f0d1a22',paths=[];let status=200;
 const local=new agent.LocalAgentProtocol({start:async()=>({}),request:async input=>{paths.push(input.path);
  if(input.path==='/api/conversations')return {status,body:JSON.stringify({conversations:[{id:'thread',title:'T',roomId:room}]})};
  return {status:200,body:JSON.stringify({aborted:true})};}});
 const session={ownerId:'owner',agentId:'agent',sessionId:'session',origin:'https://device.alpha.invalid'};local.session=session;
 for(let i=0;i<3;i++)assert.equal(await local.abortTurn('thread'),'aborted');
 assert.equal(paths.filter(path=>path==='/api/conversations').length,1);assert.equal(paths.filter(path=>path===`/api/turns/${room}/abort`).length,3);
 // A new connection reads its own list.
 await local.disconnect();local.session=session;assert.equal(await local.abortTurn('thread'),'aborted');
 assert.equal(paths.filter(path=>path==='/api/conversations').length,2);
 status=401;const refusal=await local.request('/api/conversations',undefined,new AbortController().signal).catch(error=>error);
 assert.equal(refusal.status,401);assert.equal(refusal.source,agent.LOCAL_AGENT_ERROR_SOURCE);assert.equal(agent.localAgentRefusal(refusal),true);
 assert.equal(agent.localAgentRefusal({status:401}),false);
});
test('waiting for shutdown tolerates a failed status read and polls with backoff',async()=>{
 const stopped={state:'stopped',serviceActive:false,socketListening:false};
 const run=async answers=>{let now=0,reads=0;const sleeps=[];
  const result=await agent.awaitLocalAgentStopped(async()=>{const answer=answers[Math.min(reads++,answers.length-1)];if(answer instanceof Error)throw answer;return answer;},{now:()=>now,sleep:async ms=>{sleeps.push(ms);now+=ms;}}).then(()=>'stopped',error=>error.message);
  return {result,reads,sleeps};};
 const recovered=await run([Error('bridge busy'),{state:'stopping',serviceActive:true,socketListening:true},stopped]);
 assert.equal(recovered.result,'stopped');assert.deepEqual(recovered.sleeps,[200,400]);
 const stuck=await run([{state:'stopping',serviceActive:true,socketListening:true}]);
 assert.match(stuck.result,/Shutdown is still pending/);
 assert.ok(stuck.reads<=40,`a 30 s wait costs ${stuck.reads} status reads`);assert.equal(Math.max(...stuck.sleeps),1000);
 const failing=await run([Error('bridge gone')]);assert.match(failing.result,/Shutdown is still pending/);
});

// ---- Cloud read authorization ----

const delegationApi=load(between(delegation,'export function createDelegationGate() {','export function CloudDelegationPanel({'),{},'globalThis.api={createDelegationGate,delegationCallbackDisposition,delegationCancelStep};').api;
test('a return that arrives while a step runs is read when that step ends',()=>{
 const gate=delegationApi.createDelegationGate();
 assert.equal(gate.enter(),true);assert.equal(gate.locked,true);assert.equal(gate.enter(),false,'one step at a time');
 gate.defer();gate.defer();assert.equal(gate.leave(),true,'the deferred return is due');assert.equal(gate.locked,false);
 assert.equal(gate.enter(),true);assert.equal(gate.leave(),false,'and is read once');
 assert.match(delegation,/async function callback\(\) \{\n\t\tif \(gate\.locked\) \{\n\t\t\tgate\.defer\(\);\n\t\t\treturn;\n\t\t\}/);
 assert.match(delegation,/const due = gate\.leave\(\);[\s\S]{0,260}if \(due && valid\(\)\) void callback\(\);/);
});
test('a used-up return is cleared; one for another account is kept for it',()=>{
 const now=Date.parse('2026-11-09T12:00:00Z'),record={state:'s',expiresAt:'2026-11-09T12:10:00Z'},d=delegationApi.delegationCallbackDisposition;
 assert.equal(d(record,{state:'s',code:'c'},now),'finish');
 assert.equal(d(record,{state:'s',error:'access_denied'},now),'denied');
 assert.equal(d(record,{state:'s'},now),'expired');
 assert.equal(d({...record,expiresAt:'2026-11-09T12:00:00Z'},{state:'s',code:'c'},now),'expired');
 assert.equal(d({...record,expiresAt:'not a date'},{state:'s',code:'c'},now),'expired');
 assert.equal(d(record,{state:'other',code:'c'},now),'other');assert.equal(d(null,{state:'s',code:'c'},now),'other');
 assert.match(delegation,/if \(disposition === "expired" \|\| !value\.code\) \{\n[^\n]*\n\t\t\t\tawait delegationNative\.clearDelegationCallback\(\{ state: record\.state \}\);/);
});
test('an authorization whose completion never arrives can still be cancelled',()=>{
 const step=delegationApi.delegationCancelStep;
 assert.equal(step('waiting',null),'cancel');
 assert.equal(step('finishing',null),'read-status','Cloud’s state is read before anything is cancelled');
 assert.equal(step('finishing','waiting'),'cancel');
 assert.equal(step('finishing','settled'),'done','a grant Cloud already holds is adopted, not cancelled');
 assert.equal(step('finishing','finishing'),'done');
 const cancel=between(delegation,'Return to authorization','Cancel authorization');
 assert.match(cancel,/disabled=\{busy\}\n\t\t\t\t\t\tonClick=\{\(\) => void run\(\(\) => cancelPending\(pending\)\)\}/);
 assert.doesNotMatch(delegation,/pending\.phase === "finishing"\}/);
});
test('a grant belongs to its account, and a revoke outcome survives a failed list read',()=>{
 assert.match(delegation,/useEffect\(\(\) => \{\n\t\tsetGrantId\(""\);\n\t\tsetPending\(null\);\n\t\tsetRevocations\(\[\]\);\n\t\}, \[scope\]\);/);
 assert.equal(delegation.split('await refreshRevocations().catch(').length,3,'both revoke paths keep their outcome');
 assert.doesNotMatch(delegation,/await refreshRevocations\(\);/);
});
