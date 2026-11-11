import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React, {act} from 'react';
import {JSDOM} from 'jsdom';
import {transformSync} from 'esbuild';
import {normalizeSignInPhone, validSignInPhone, signInReadiness} from '../apps/app/src/runtime/cloud-sign-in.ts';

// The sign-in entry as the controller and the page really wire it (connection-ui.tsx and
// cloud-sign-in-ui.tsx sources, evaluated here with in-memory ports): the readiness probe flag, typed
// phone numbers, the plan action of an account with no email, and Back after a code verification
// committed. Nothing is sent; no native host, Cloud or Android runs.
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const ui=read('apps/app/src/runtime/connection-ui.tsx');
const part=(start,end)=>{const a=ui.indexOf(start),b=ui.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start);return ui.slice(a,b);};
Object.assign(globalThis,new Function('React',transformSync(read('apps/app/src/runtime/status-ui.tsx').replace(/^import .*;\n/gm,'').replaceAll('export ',''),{loader:'tsx',jsxFactory:'React.createElement'}).code+';return {Busy,StatusDot};')(React),{iconStyle:()=>({})});
const CloudSignInPanel=new Function('React','useRef','useState','useEffect',transformSync(read('apps/app/src/runtime/cloud-sign-in-ui.tsx').replace(/^import .*;\n/gm,'').replaceAll('export ',''),{loader:'tsx',jsxFactory:'React.createElement'}).code+';return CloudSignInPanel;')(React,React.useRef,React.useState,React.useEffect);
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const settle=()=>new Promise(resolve=>setImmediate(resolve));

/** The real operation slot (work), sign-in controller methods and readiness reader. */
function controller({stored=null,resident=true}={}){
  const source=`
    let planRecheck=null,operation=null,residentStartInBackground=false,active=null,signInReadinessOwner=null,googleSignInGeneration=0,googleSignInPrior=null,codeSignInPrior=null,providerStatusGeneration=0,epoch=0;
    let inAppGoogle=false,inAppPhone=true,inAppEmail=true,service=null,planManagementReturn=false;
    const state={signIn:null,open:false,busy:false,message:'',error:'',purpose:'agent',cloudAccount:null};
    const events=[],update=values=>{Object.assign(state,values);events.push({...values});};
    const client={},store={value:${JSON.stringify(stored)}};
    let cloud={environment:'production',cancelLogin(){events.push({cancelLogin:true});}};const makeCloud=environment=>({environment,cancelLogin(){}});
    const cloudSignIn={status:()=>readiness.promise},cloudSignInPhone=true,readiness=deferred();
    const SIGN_IN_READINESS_WAIT_MS=6000,ACCOUNT_CHANGED='Account changed';
    const cloudServiceName=()=> 'Eliza Cloud',cloudEnvironmentAllowed=()=>true,residentCloudFlow=()=>${resident},residentEnvironment=()=>'production';
    const signInClient=()=>client,residentRecoveryReason=()=>null,cloudCredentialStore={read:async()=>store.value};
    const ensureResident=async()=>{events.push({ensureResident:true});},queueResidentRebind=()=>{events.push({rebind:true});};
    const errorKindOf=()=>null,errorMessage=error=>error.message,runQueuedResidentRebind=()=>{},runQueuedSignInReturn=()=>{},scheduleResidentAutoRetry=()=>{};
    const testMocksEnabled=false,isAndroid=true,browserCloudResidentEnabled=false,expired=()=>false,ownProviderSelected=()=>false;
    const signInEntryPage=()=>false,explicitSignedOutCloudEntry=()=>false;
    const validSignInEmail=()=>true,normalizeSignInCode=value=>/^\\d{6}$/.test(value)?value:null;
    class CloudSignInError extends Error {constructor(code){super(code);this.code=code;}}
    class CodeExpiredError extends Error {constructor(){super('code-expired');}}
    const signInFailureMessage=code=>code,signInFailed=(environment,keep=false,prefill={})=>{if(!keep)update({signIn:{step:'choose',environment,...prefill}});};
    const signedIn=async()=>{events.push({authenticated:true});};
    ${part('async function inAppSignInMethods(','/** A failed or cancelled step')}
    ${part('async function work(','\n/** ')}
    const connectionController={
    close(){events.push({close:true});},
    cancel(){operation?.abort(new DOMException('Cancelled','AbortError'));cloud.cancelLogin();},
    ${part('  async beginSignIn(','  /** Leaves the sign-in screen')}
    ${part('  async cancelSignIn() {','  async signInGoogle()')}
    ${part('  async signInEmail(','  /**\n   * A retained native Google outcome')}
    ${part('  async residentManagePlan() {','  /**\n   * Redeems a subscription code')}
    };
    return {state,events,client,store,readiness,connectionController,setService(value){service=value;},setActive(value){active=value;},planReturn:()=>planManagementReturn};
  `;
  return new Function('deferred','signInReadiness','normalizeSignInPhone','validSignInPhone','setTimeout','clearTimeout',transformSync(source,{loader:'ts',format:'cjs'}).code)(deferred,signInReadiness,normalizeSignInPhone,validSignInPhone,setTimeout,clearTimeout);
}

async function panel(run){
  const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
  const previous={};
  for(const key of ['window','document','HTMLElement','IS_REACT_ACT_ENVIRONMENT']){
    previous[key]=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{value:key==='IS_REACT_ACT_ENVIRONMENT'?true:dom.window[key],configurable:true,writable:true});
  }
  const {createRoot}=await import('react-dom/client');
  const root=createRoot(document.getElementById('root'));
  const render=async props=>{await act(async()=>{root.render(React.createElement(CloudSignInPanel,props));await Promise.resolve();});};
  try{await run({document:dom.window.document,window:dom.window,render});}
  finally{await act(()=>root.unmount());dom.window.close();for(const [key,value]of Object.entries(previous)){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
}
// What the page passes the panel, from the page's own source: the snapshot decides, never the busy message.
const probingOf=new Function('snapshot',transformSync(/^  const probing=.*$/m.exec(ui)[0],{loader:'ts'}).code+';return probing;');
const pageProps=(f,actions={})=>({view:f.state.signIn??{step:'choose',environment:'production'},busy:f.state.busy,ready:!!f.state.signIn,dismissible:false,google:false,phone:true,message:f.state.message,error:f.state.error,probing:probingOf(f.state),unavailable:false,actions:{google(){},email(){},verify(){},resend(){},cancel(){},...actions}});

test('the readiness probe publishes its own state, which the page reads; the busy message decides nothing',async()=>{
  assert.match(ui,/^  const probing=snapshot\.signInProbing===true;$/m,'the page reads the controller state');
  assert.doesNotMatch(ui,/signInProbeMessage|message===[^;]*Checking \$\{cloudServiceName/,'the probe is not inferred by comparing copy');
  assert.match(ui,/probing=\{probing\}/,'the panel receives it');
  const f=controller(),probe=f.connectionController.beginSignIn('production',false,true);
  await settle();
  assert.equal(f.state.busy,true);assert.equal(f.state.signInProbing,true,'set while the probe holds the operation');
  assert.equal(f.state.message,'Checking Eliza Cloud sign-in…');
  await panel(async({document,render})=>{
    await render(pageProps(f));
    assert.ok(document.querySelector('.alpha-auth-loading'),'the probe shows the loading state');
    assert.equal(document.querySelector('button'),null,'no Back for a check the owner did not start');
    // The same busy snapshot without the probe flag is an owner step: it keeps its controls and Back.
    await render({...pageProps(f),ready:true,probing:probingOf({...f.state,signInProbing:false})});
    assert.equal(document.querySelector('.alpha-auth-loading'),null);
    assert.ok([...document.querySelectorAll('button')].some(button=>button.textContent==='Back'));
  });
  f.readiness.resolve({inApp:true,google:false,email:true,phone:true});await probe;
  assert.equal(f.state.busy,false);assert.equal(f.state.signInProbing,false,'cleared when the probe ends');
  assert.deepEqual(f.state.signIn,{step:'choose',environment:'production'});
  // An owner step is never a probe, whatever its message says.
  const sending=deferred();f.client.startEmailSignIn=()=>sending.promise;
  const email=f.connectionController.signInEmail('person@example.invalid');await settle();
  assert.equal(f.state.busy,true);assert.equal(f.state.signInProbing,false);
  sending.resolve({attemptId:'a',expiresAt:Date.now()+60000,resendAt:Date.now()+30000});await email;
  // A cancelled probe clears it too.
  const g=controller(),cancelled=g.connectionController.beginSignIn('production',false,true);await settle();
  assert.equal(g.state.signInProbing,true);g.connectionController.cancel();await cancelled;
  assert.equal(g.state.signInProbing,false);assert.equal(g.state.busy,false);
});

test('a typed phone number is normalised before validation and shown back in that form',async()=>{
  for(const [typed,expected] of [['+1 (415) 555-0100','+14155550100'],['415-555-0100','+14155550100'],['415.555.0100','+14155550100'],['(415) 555 0100','+14155550100'],['1 415 555 0100','+14155550100'],
    ['0044 20 7946 0958','+442079460958'],['+44 20 7946 0958','+442079460958'],[' +14155550100 ','+14155550100']]){
    assert.equal(normalizeSignInPhone(typed),expected,typed);assert.equal(validSignInPhone(expected),true,expected);
  }
  // No country is guessed for a national number, and nothing but separators is dropped.
  for(const typed of ['020 7946 0958','555-0100','+1 415 555 010a','4155550100x','++14155550100','+0123456789',''])assert.equal(validSignInPhone(normalizeSignInPhone(typed)),false,typed);
  // The panel's one field sends a separated number to the phone action, and the controller sends the host E.164.
  const f=controller(),sent=[];f.state.signIn={step:'choose',environment:'production'};f.state.open=true;
  f.client.startPhoneSignIn=async number=>{sent.push(number);return {attemptId:'attempt',expiresAt:Date.now()+60000,resendAt:Date.now()+30000};};
  await panel(async({document,window,render})=>{
    const typedTo=[];
    await render({...pageProps(f,{phone:number=>typedTo.push(['phone',number]),email:address=>typedTo.push(['email',address])}),ready:true});
    const input=document.querySelector('input');input.value='(415) 555-0100';
    await act(()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
    assert.deepEqual(typedTo,[['phone','(415) 555-0100']]);
    await f.connectionController.signInPhone(typedTo[0][1]);
    assert.deepEqual(sent,['+14155550100']);
    assert.equal(f.state.signIn.step,'code');assert.equal(f.state.signIn.phone,'+14155550100');
    await render({...pageProps(f),ready:true});
    assert.equal(document.querySelector('strong').textContent,'+14155550100','the code step names the number the code went to');
  });
  // A number that cannot be normalised is refused before anything is sent.
  const g=controller(),none=[];g.state.signIn={step:'choose',environment:'production'};g.client.startPhoneSignIn=async number=>{none.push(number);};
  await g.connectionController.signInPhone('020 7946 0958');
  assert.deepEqual(none,[]);assert.equal(g.state.error,'invalid-phone');assert.equal(g.state.busy,false);
  // A failed send returns to the entry with the normalised number.
  const h=controller();h.state.signIn={step:'choose',environment:'production'};h.client.startPhoneSignIn=async()=>{throw Error('offline');};
  await h.connectionController.signInPhone('415 555 0100');
  assert.deepEqual(h.state.signIn,{step:'choose',environment:'production',phone:'+14155550100'});
});

test('Choose plan needs the verified Cloud key, not an email address',async()=>{
  const f=controller(),opened=[];
  await f.connectionController.residentManagePlan();
  assert.equal(f.state.error,'Sign in first','signed out: nothing opens');assert.deepEqual(opened,[]);
  // Signed in by phone: the account has no email.
  f.setService({identity:{environment:'production',credentialId:'key',userId:'user',organizationId:'org'},client:{openSubscriptionManagement:async signal=>{opened.push(signal.aborted);}}});
  await f.connectionController.residentManagePlan();
  assert.deepEqual(opened,[false],'billing opens once');assert.equal(f.state.error,'');assert.equal(f.planReturn(),true);
  assert.doesNotMatch(part('  async residentManagePlan() {','  /**\n   * Redeems a subscription code'),/identity\.email/);
});

test('Back after a code verification committed adopts the stored key instead of showing signed out',async()=>{
  for(const [step,phone] of [['code',false],['code',true],['mfa',false]]){
    for(const running of [true,false]){
      const f=controller({stored:{credentialId:'old-key'}}),pending=deferred();
      const view=step==='code'?{step,environment:'production',attemptId:'attempt',email:phone?'':'person@example.invalid',...(phone?{phone:'+14155550100'}:{}),resendAt:0,expiresAt:Date.now()+60000}:{step,environment:'production',attemptId:'attempt',email:'person@example.invalid',method:'totp',expiresAt:Date.now()+60000};
      f.state.signIn=view;f.state.open=true;f.setActive(running?{}:null);
      f.client.verifyEmailSignIn=f.client.verifyPhoneSignIn=f.client.verifyMfaSignIn=()=>pending.promise;
      const verifying=f.connectionController.verifySignInCode('123456');await settle();
      assert.equal(f.state.busy,true);
      // The native host stored the new key; Back arrives before the reply does.
      f.store.value={credentialId:'new-key'};
      await f.connectionController.cancelSignIn();
      assert.equal(f.state.signIn,null,`${step}: the sign-in page closes`);assert.equal(f.state.residentSavedCredential,true);assert.equal(f.state.message,'Signed in');
      assert.ok(f.events.some(event=>running?event.rebind:event.ensureResident),'the stored key is admitted');
      pending.resolve({status:'authenticated'});await verifying;
      assert.ok(!f.events.some(event=>event.authenticated),'the cancelled reply adopts nothing a second time');
    }
  }
});

test('Back during a code verification that stored nothing new returns to the entry as before',async()=>{
  for(const [before,after] of [[{credentialId:'old-key'},{credentialId:'old-key'}],[null,null]]){
    const f=controller({stored:before}),pending=deferred();
    f.state.signIn={step:'code',environment:'production',attemptId:'attempt',email:'person@example.invalid',resendAt:0,expiresAt:Date.now()+60000};f.state.open=true;
    f.client.verifyEmailSignIn=()=>pending.promise;
    const verifying=f.connectionController.verifySignInCode('123456');await settle();
    f.store.value=after;await f.connectionController.cancelSignIn();
    assert.deepEqual(f.state.signIn,{step:'choose',environment:'production',email:'person@example.invalid'});
    assert.ok(!f.events.some(event=>event.rebind||event.ensureResident&&f.state.signIn===null));
    pending.reject(new Error('cancelled'));await verifying;
  }
  // Another attempt's record, or a store that could not be read before verifying, adopts nothing.
  const f=controller({stored:null}),pending=deferred();let reads=0;
  f.state.signIn={step:'code',environment:'production',attemptId:'attempt',email:'person@example.invalid',resendAt:0,expiresAt:Date.now()+60000};f.state.open=true;
  f.client.verifyEmailSignIn=()=>pending.promise;
  Object.defineProperty(f.store,'value',{get(){if(reads++===0)throw Error('locked');return {credentialId:'new-key'};}});
  const verifying=f.connectionController.verifySignInCode('123456');await settle();
  await f.connectionController.cancelSignIn();
  assert.equal(f.state.signIn.step,'choose','no comparison was possible, so nothing is adopted');
  pending.reject(new Error('cancelled'));await verifying;
});
