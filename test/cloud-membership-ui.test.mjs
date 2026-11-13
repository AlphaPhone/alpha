import {test}from'node:test';
import assert from'node:assert/strict';
import {createRequire}from'node:module';
import React from'react';import{renderToStaticMarkup}from'react-dom/server';import{buildSync}from'esbuild';
const code=buildSync({entryPoints:['apps/app/src/runtime/cloud-membership-ui.tsx'],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],loader:{'.css':'empty'},logLevel:'silent'}).outputFiles[0].text;
const module={exports:{}};
new Function('require','module','exports',code)(createRequire(import.meta.url),module,module.exports);
const{CloudMembershipControls}=module.exports;
const calls=[];const base={email:'example@alpha.test',busy:false,balance:'funded',plan:{kind:'credits'},onRedeem:async()=>{calls.push('redeem');return false;},onManagePlan:()=>calls.push('plan'),onRefresh:()=>calls.push('refresh')};
const render=(extra={})=>renderToStaticMarkup(React.createElement(CloudMembershipControls,{...base,...extra}));
test('subscription entry offers a monthly plan and keeps code redemption secondary without acting on render',()=>{const s=render();assert.match(s,/aria-label="Balance and membership"/);assert.match(s,/Choose plan/);assert.match(s,/>Code</);assert.doesNotMatch(s,/<details|Have a membership code|<input/);assert.deepEqual(calls,[]);});
test('the account sheet shows a returned balance once without inferring it from a plan',()=>{
 const html=render({credits:{usd:'9.911418',observedAt:0}});
 assert.match(html,/\$9\.91/);assert.equal((html.match(/<dt>Balance<\/dt>/g)||[]).length,1);
 assert.match(html,/Add funds/);
 assert.match(render({credits:null,balance:'unavailable'}),/Not available/);
 assert.doesNotMatch(render({credits:null,balance:'unavailable'}),/\$0\.00/);
});
test('subscription management action follows the verified plan state',()=>{
 for(const plan of [{kind:'active',planName:'Example plan'},{kind:'expired',planName:'Expired plan'},{kind:'unavailable',reason:'outage'}])assert.match(render({plan}),/>Plan</);
 for(const plan of [{kind:'inactive',status:'none',planName:null},{kind:'credits'}]){const html=render({plan});assert.match(html,/>Choose plan</);assert.match(html,/No plan/);}
});
test('unavailable and checking plans do not invent an inactive subscription or a renewal date',()=>{for(const [balance,plan] of [['unavailable',{kind:'unavailable',reason:'outage'}],['checking',{kind:'checking'}]]){const html=render({balance,plan});assert.doesNotMatch(html,/No plan|d left|\$0\.00/);assert.match(html,balance==='checking'?/Checking/:/Unconfirmed/);}});
test('active subscription retains its verified plan and access end without implying automatic renewal',()=>{const s=render({plan:{kind:'active',planName:'Example plan'},endsAt:Date.now()+86400000});assert.match(s,/<dt>Plan<\/dt>/);assert.match(s,/Example plan/);assert.match(s,/\dd left/);assert.doesNotMatch(s,/Renews|Next payment/);});
test('busy prevents all membership actions and retains provided errors and notices',()=>{const s=render({busy:true,error:'Example error',notice:'Example notice'});const buttons=[...s.matchAll(/<button\b([^>]*)>/g)];assert.ok(buttons.length>=3);assert.ok(buttons.every(x=>x[1].includes('disabled')));assert.match(s,/role="alert">Example error/);assert.match(s,/Example notice/);assert.deepEqual(calls,[]);});
test('the account sheet omits the redundant subscription paragraph and checkbox',()=>{
 const html=render();assert.doesNotMatch(html,/Choose a plan or enter|type="checkbox"|Your browser may|Sign-in valid until/);
 assert.deepEqual(calls,[]);
});

test('identical redemption and connection recovery warnings render once without hiding the warning',()=>{const html=render({error:'Recovery requires review',connectionError:'Recovery requires review'});assert.equal((html.match(/Recovery requires review/g)||[]).length,1);assert.equal((html.match(/role="alert"/g)||[]).length,1);});
test('distinct redemption and global recovery errors both remain visible',()=>{const html=render({error:'Code was not accepted',connectionError:'Recovery requires review'});assert.equal((html.match(/role="alert"/g)||[]).length,2);assert.match(html,/Code was not accepted/);assert.match(html,/Recovery requires review/);});
test('no membership error produces no error alert',()=>{assert.doesNotMatch(render({error:'',connectionError:''}),/role="alert"/);});
test('the subscription section shows one plan and one reported monthly allowance',()=>{
 const plan={kind:'active',planName:'Example plan',allowance:{unit:'requests',period:'month',limit:40,used:3,resetsAt:null}};
 const html=render({plan,endsAt:Date.now()+86400000});
 assert.equal((html.match(/Example plan/g)||[]).length,1);
 assert.equal((html.match(/3 of 40 requests used this month/g)||[]).length,1);
 assert.match(html,/>Code</);
 assert.deepEqual(calls,[]);
});

test('an account without an email names the configured Cloud service, never a fixed brand',()=>{
 const html=render({email:'',serviceName:'Example Cloud'});
 assert.match(html,/Signed in to Example Cloud/);
 assert.doesNotMatch(html,/Eliza Cloud/);
 assert.match(render({email:''}),/Signed in to Cloud</);
});

// First-run plan step: the in-app chooser replaces the hosted "Choose plan" action only for an
// account without a plan and only when Cloud published a catalogue. Rendering never acts.
const plans=[{key:'plus_monthly',name:'Plus',amountCents:2000,allowanceUsd:'20.00'},{key:'pro_monthly',name:'Pro',amountCents:9999,allowanceUsd:null}];
const view=(extra={})=>({catalogue:'ready',plans,step:'choose',planKey:null,error:'',notice:'',...extra});
const step={onChoosePlan:()=>calls.push('choose'),onSubscribe:key=>calls.push('subscribe '+key),onCheckPayment:()=>calls.push('check'),onBackToPlans:()=>calls.push('back')};
test('an account without a plan sees one chooser: Cloud\'s plans with a Subscribe action each and an "I have a code" entry',()=>{
 const html=render({...step,checkout:view()});
 assert.equal((html.match(/aria-label="Choose a plan"/g)||[]).length,1,'one chooser, and no separate Choose plan button');
 assert.doesNotMatch(html,/>Choose plan</);
 assert.match(html,/<strong>Plus<\/strong><span>\$20 \/ month<\/span><small>\$20\.00 of usage each month<\/small>/);
 assert.match(html,/<strong>Pro<\/strong><span>\$99\.99 \/ month<\/span><\/div>/);
 assert.equal((html.match(/>Subscribe<\/button>/g)||[]).length,2);
 assert.match(html,/aria-label="Subscribe to Plus"/);assert.match(html,/aria-label="Subscribe to Pro"/);
 assert.match(html,/aria-label="I have a code"[^>]*>.*?I have a code<\/button>/);
 assert.doesNotMatch(html,/aria-label="Use code"|<input|Check payment/);
 assert.deepEqual(calls,[]);
});
test('an entitled account, an unchecked plan and a Cloud without a catalogue never show the chooser',()=>{
 for(const plan of [{kind:'active',planName:'Example plan'},{kind:'expired',planName:'Expired plan'},{kind:'unavailable',reason:'outage'},{kind:'checking'}]){
  const html=render({...step,plan,checkout:view()});assert.doesNotMatch(html,/Subscribe|alpha-plan-chooser|I have a code/,plan.kind);
 }
 for(const checkout of [null,undefined,view({catalogue:'absent'}),view({catalogue:'unavailable'}),view({catalogue:'loading',plans:[]}),view({plans:[]})]){
  const html=render({...step,checkout});assert.match(html,/aria-label="Choose a plan"[^>]*>.*?Choose plan<\/button>/);assert.doesNotMatch(html,/Subscribe|alpha-plan-chooser/);assert.match(html,/aria-label="Use code"/);
 }
 // Without the Subscribe handler (a host that cannot start a checkout) the hosted plan page stays.
 assert.doesNotMatch(render({checkout:view()}),/Subscribe|alpha-plan-chooser/);
});
test('a checkout open in the browser shows its state, a confirmation action and the way back; errors are alerts',()=>{
 const html=render({...step,checkout:view({step:'awaiting',planKey:'plus_monthly'})});
 assert.match(html,/data-checkout-step="awaiting"/);
 assert.match(html,/role="status">Finish paying for Plus in your browser</);
 for(const label of ['Check payment','Open checkout again','Back to plans'])assert.match(html,new RegExp('>'+label+'</button>'));
 assert.doesNotMatch(html,/>Subscribe<\/button>/);
 assert.match(html,/I have a code/,'the code entry stays available while a checkout is open');
 // A restart may find the checkout before the catalogue: the state is still shown.
 assert.match(render({...step,checkout:view({catalogue:'unavailable',plans:[],step:'awaiting',planKey:'plus_monthly'})}),/Finish paying in your browser/);
 assert.match(render({...step,checkout:view({error:'Your account is still being set up. Try again in a moment'})}),/role="alert">Your account is still being set up\. Try again in a moment</);
 assert.match(render({...step,checkout:view({notice:'Checkout cancelled'})}),/role="status">Checkout cancelled</);
 const busy=render({...step,busy:true,checkout:view()});
 assert.ok([...busy.matchAll(/<button\b([^>]*)>/g)].every(match=>match[1].includes('disabled')),'no second purchase while a step runs');
 assert.deepEqual(calls,[]);
});
