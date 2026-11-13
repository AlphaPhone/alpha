// In-app subscription checkout (apps/app/src/runtime/subscription-checkout.ts) and its Cloud adapter
// methods. Every Cloud answer here is a synthetic copy of the pinned route shapes
// (cloud/api/v1/subscriptions/{plans,checkout,checkout/confirm}); nothing contacts Eliza Cloud or a
// payment provider, and no payment is made.
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBrowserModule} from './fixtures/browser-source.mjs';
const [flow,protocol]=await loadBrowserModule(['apps/app/src/runtime/subscription-checkout.ts','apps/app/src/runtime/cloud-protocol.ts']);
const {SubscriptionCheckout,SubscriptionCheckoutError,checkoutFailure,checkoutFailureMessage,plansFromResponse,checkoutFromResponse,confirmationFromResponse,parseBillingReturn,checkoutPageUrl,planPrice,parsePendingCheckout,chooserShown,PENDING_CHECKOUT_TTL_MS}=flow;

const owner={environment:'production',userId:'11111111-1111-4111-8111-111111111111',organizationId:'22222222-2222-4222-8222-222222222222'};
const SESSION='cs_test_a1B2c3D4',PAGE='https://checkout.stripe.com/c/pay/'+SESSION;
const signal=()=>new AbortController().signal;
const http=(status,code)=>Object.assign(new Error(`Cloud http (${status})`),{name:'CloudProtocolError',code:'http',status,data:code?{success:false,code}:{}});
const plan=(key,name,amountCents,extra={})=>({key,name,catalogVersion:'v1',active:true,interval:'month',intervalCount:1,currency:'usd',amountCents,allowance:{amountUsd:'20.00',fundingClass:'allowance_eligible',rollover:false,expiresAt:'billing_period_end'},...extra});
const open=(sessionId=SESSION)=>({status:'open',checkoutUrl:'https://checkout.stripe.com/c/pay/'+sessionId,sessionId});

/** A phone: durable storage that outlives `restart()`, and a scripted Cloud. */
function phone(script=[]){
 const state={stored:null,starts:[],confirms:[],opened:[],keys:0,now:1_800_000_000_000};
 const answer=()=>{const next=script.shift();if(next instanceof Error)throw next;if(typeof next==='function')return next();return next;};
 const ports={
  start:async(planKey,idempotencyKey)=>{state.starts.push({planKey,idempotencyKey});return answer();},
  confirm:async sessionId=>{state.confirms.push(sessionId);return answer();},
  open:async url=>{state.opened.push(url);},
  storage:{read:()=>state.stored,write:value=>{state.stored=value;}},
  uuid:()=>`00000000-0000-4000-8000-${String(++state.keys).padStart(12,'0')}`,
  now:()=>state.now,
 };
 return {state,script,restart:()=>new SubscriptionCheckout(ports),checkout:new SubscriptionCheckout(ports)};
}
const kind=async promise=>{try{await promise;}catch(error){assert.ok(error instanceof SubscriptionCheckoutError,String(error));return error.kind;}assert.fail('expected a checkout failure');};

test('the catalogue offers only Cloud\'s active monthly plans with their published names and prices',()=>{
 const plans=plansFromResponse({success:true,data:{catalogVersion:'v1',plans:[plan('plus_monthly','Plus',2000),plan('pro_monthly','Pro',9999,{allowance:null}),plan('team_yearly','Team',1),plan('plus_monthly','Duplicate',1),{...plan('pro_monthly','Off',1),active:false}]}});
 assert.deepEqual(plans,[{key:'plus_monthly',name:'Plus',amountCents:2000,allowanceUsd:'20.00'},{key:'pro_monthly',name:'Pro',amountCents:9999,allowanceUsd:null}]);
 assert.equal(planPrice(plans[0]),'$20');assert.equal(planPrice(plans[1]),'$99.99');assert.equal(planPrice({amountCents:1905}),'$19.05');
 for(const bad of [null,{success:false},{success:true,data:{}},{success:true,data:{plans:[plan('plus_monthly','Plus',0)]}},{success:true,data:{plans:[plan('plus_monthly','Plus',20.5)]}},{success:true,data:{plans:[plan('plus_monthly','',2000)]}},{success:true,data:{plans:[plan('plus_monthly','Plus',2000,{currency:'eur'})]}},{success:true,data:{plans:[plan('plus_monthly','Plus',2000,{interval:'year'})]}}])
  assert.throws(()=>plansFromResponse(bad),SubscriptionCheckoutError);
 assert.equal(chooserShown({catalogue:'ready',plans,step:'choose',planKey:null,error:'',notice:''}),true);
 for(const view of [null,{catalogue:'ready',plans:[],step:'choose'},{catalogue:'absent',plans,step:'choose'},{catalogue:'unavailable',plans,step:'choose'},{catalogue:'loading',plans:[],step:'choose'}])assert.equal(chooserShown(view),false);
 assert.equal(chooserShown({catalogue:'unavailable',plans:[],step:'awaiting'}),true,'a checkout that is open stays visible');
});

test('a checkout answer opens only the provider\'s hosted page with a well-formed session',()=>{
 assert.deepEqual(checkoutFromResponse({success:true,data:{status:'open',presentation:'mobile',commandId:'c',checkoutUrl:PAGE,sessionId:SESSION,expiresAt:'2026-11-13T00:00:00.000Z'}}),{status:'open',checkoutUrl:PAGE,sessionId:SESSION});
 for(const status of ['completed','expired','stale_intent'])assert.deepEqual(checkoutFromResponse({success:true,data:{status,commandId:'c',checkoutUrl:null}}),{status});
 const mobile={status:'open',presentation:'mobile',checkoutUrl:PAGE,sessionId:SESSION};
 for(const change of [{checkoutUrl:'https://checkout.stripe.com.evil.example/c/pay/x'},{checkoutUrl:'http://checkout.stripe.com/c/pay/x'},{checkoutUrl:'https://user@checkout.stripe.com/c'},{checkoutUrl:'https://checkout.stripe.com:8443/c'},{checkoutUrl:'https://billing.stripe.com/p'},{checkoutUrl:null},{sessionId:'cs_other_1'},{sessionId:undefined},{presentation:'shared'},{presentation:undefined},{status:'pending'}])
  assert.throws(()=>checkoutFromResponse({success:true,data:{...mobile,...change}}),SubscriptionCheckoutError,JSON.stringify(change));
 assert.equal(checkoutPageUrl(PAGE),PAGE);assert.equal(checkoutPageUrl('javascript:alert(1)'),null);assert.equal(checkoutPageUrl(undefined),null);
});

test('a confirmation is the settled subscription; a replay and a missing plan summary are still a success',()=>{
 assert.deepEqual(confirmationFromResponse({success:true,data:{subscriptionId:'sub_1',replayed:false},entitlement:{plan:{id:'plus_monthly',name:'Plus',status:'active'},source:'subscription',effectiveUntil:null}}),{subscriptionId:'sub_1',replayed:false,planName:'Plus'});
 assert.deepEqual(confirmationFromResponse({success:true,data:{subscriptionId:null,replayed:true},entitlement:null}),{subscriptionId:null,replayed:true,planName:null});
 for(const bad of [{success:true},{success:true,data:{subscriptionId:'s'}},{success:false,data:{subscriptionId:'s',replayed:false}},{success:true,data:{subscriptionId:7,replayed:false}}])assert.throws(()=>confirmationFromResponse(bad),SubscriptionCheckoutError);
});

test('the billing return is the exact app link with a success session or a bare cancel',()=>{
 const base='https://eliza.app/alphaphone/billing/return',web='https://eliza.app';
 assert.deepEqual(parseBillingReturn(`${base}?session_id=${SESSION}&result=success`,web),{result:'success',sessionId:SESSION});
 assert.deepEqual(parseBillingReturn(`${base}?result=success&session_id=cs_live_Zz9`,web),{result:'success',sessionId:'cs_live_Zz9'});
 assert.deepEqual(parseBillingReturn(`${base}?result=cancel`,web),{result:'cancel'});
 for(const url of [`${base}?result=success`,`${base}?session_id=${SESSION}`,`${base}?session_id={CHECKOUT_SESSION_ID}&result=success`,`${base}?session_id=${SESSION}&result=success&x=1`,`${base}?session_id=${SESSION}&session_id=${SESSION}&result=success`,`${base}?result=cancel&session_id=${SESSION}`,`${base}?result=paid`,base,
  `${base}?result=cancel#x`,`http://eliza.app/alphaphone/billing/return?result=cancel`,`https://evil.example/alphaphone/billing/return?result=cancel`,`https://eliza.app:8443/alphaphone/billing/return?result=cancel`,`https://user@eliza.app/alphaphone/billing/return?result=cancel`,
  `https://eliza.app/alphaphone/billing/return/?result=cancel`,`https://eliza.app/alphaphone/auth/callback?result=cancel`,`https://staging.eliza.app/alphaphone/billing/return?result=cancel`,'alphaphone://billing?result=cancel',null,7])
  assert.equal(parseBillingReturn(url,web),null,String(url));
});

test('success: Subscribe records its intent before the request, opens the payment page, and the return confirms it',async()=>{
 const p=phone();
 p.script.push(()=>{assert.equal(parsePendingCheckout(JSON.parse(p.state.stored)).idempotencyKey,p.state.starts[0].idempotencyKey,'the idempotency key is durable before Cloud is asked');return open();});
 assert.equal(await p.checkout.subscribe(owner,'plus_monthly',signal()),'opened');
 assert.deepEqual(p.state.opened,[PAGE]);
 assert.equal(p.checkout.pending(owner).sessionId,SESSION);
 p.script.push({subscriptionId:'sub_1',replayed:false,planName:'Plus'});
 assert.deepEqual(await p.checkout.confirm(owner,signal(),{sessionId:SESSION}),{subscriptionId:'sub_1',replayed:false,planName:'Plus'});
 assert.deepEqual(p.state.confirms,[SESSION]);
 assert.equal(p.state.stored,null,'a settled purchase leaves no intent behind');
 assert.equal(await kind(p.checkout.confirm(owner,signal())),'nothing-pending');
 assert.equal(p.state.confirms.length,1,'nothing is sent without a recorded checkout');
});

test('cancel keeps the intent: Subscribe to the same plan continues it, another plan is a new intent',async()=>{
 const p=phone([open(),open(),open('cs_test_other')]);
 await p.checkout.subscribe(owner,'plus_monthly',signal());
 // The owner returned with result=cancel: nothing is confirmed and nothing is forgotten.
 await p.checkout.subscribe(owner,'plus_monthly',signal());
 assert.equal(p.state.starts[1].idempotencyKey,p.state.starts[0].idempotencyKey);
 await p.checkout.subscribe(owner,'pro_monthly',signal());
 assert.notEqual(p.state.starts[2].idempotencyKey,p.state.starts[0].idempotencyKey);
 assert.deepEqual([p.checkout.pending(owner).planKey,p.checkout.pending(owner).sessionId],['pro_monthly','cs_test_other']);
 assert.equal(p.state.confirms.length,0);
});

test('confirm replay: a second confirmation of a settled checkout is a success, not an error',async()=>{
 const p=phone([open(),{subscriptionId:'sub_1',replayed:true,planName:'Plus'}]);
 await p.checkout.subscribe(owner,'plus_monthly',signal());
 assert.equal((await p.checkout.confirm(owner,signal())).replayed,true);
 assert.equal(p.state.stored,null);
});

test('process death before the checkout answer: the restarted phone reuses the same idempotency key',async()=>{
 const p=phone([Object.assign(new Error('Connection request failed'),{}),open()]);
 assert.equal(await kind(p.checkout.subscribe(owner,'plus_monthly',signal())),'offline');
 const restarted=p.restart();
 assert.equal(restarted.pending(owner).sessionId,null);
 assert.equal(await restarted.subscribe(owner,'plus_monthly',signal()),'opened');
 assert.equal(p.state.starts[1].idempotencyKey,p.state.starts[0].idempotencyKey);
 // Cloud may also report that the lost request was already paid for.
 const q=phone([http(503,'service_unavailable'),{status:'completed'}]);
 assert.equal(await kind(q.checkout.subscribe(owner,'plus_monthly',signal())),'unavailable');
 assert.equal(await q.restart().subscribe(owner,'plus_monthly',signal()),'entitled');
 assert.equal(q.state.starts[1].idempotencyKey,q.state.starts[0].idempotencyKey);assert.equal(q.state.stored,null);assert.deepEqual(q.state.opened,[]);
});

test('process death between checkout and return: the restarted phone confirms the recorded session',async()=>{
 const p=phone([open()]);
 await p.checkout.subscribe(owner,'plus_monthly',signal());
 const restarted=p.restart();
 assert.deepEqual([restarted.pending(owner).planKey,restarted.pending(owner).sessionId],['plus_monthly',SESSION]);
 // No link at all (resume), or a link naming another session: the recorded session is the one confirmed.
 p.script.push(http(503,'service_unavailable'));
 assert.equal(await kind(restarted.confirm(owner,signal())),'not-confirmed');
 assert.equal(restarted.pending(owner).sessionId,SESSION,'an unpaid checkout stays pending');
 p.script.push({subscriptionId:'sub_1',replayed:false,planName:null});
 await restarted.confirm(owner,signal(),{sessionId:'cs_test_someoneElse'});
 assert.deepEqual(p.state.confirms,[SESSION,SESSION]);
 // The answer carrying the session id was lost: a returned link's id is used for this account's intent only.
 const q=phone([new Error('Connection request failed'),{subscriptionId:'sub_2',replayed:false,planName:null}]);
 await kind(q.checkout.subscribe(owner,'plus_monthly',signal()));
 await q.restart().confirm(owner,signal(),{sessionId:'cs_live_fromLink'});
 assert.deepEqual(q.state.confirms,['cs_live_fromLink']);
 // A link with nothing recorded, or for another account's record, confirms nothing.
 const other={...owner,userId:'33333333-3333-4333-8333-333333333333'};
 const r=phone([open()]);await r.checkout.subscribe(owner,'plus_monthly',signal());
 assert.equal(r.checkout.pending(other),null);
 assert.equal(await kind(r.checkout.confirm(other,signal(),{sessionId:SESSION})),'nothing-pending');
 assert.equal(r.state.confirms.length,0);
 r.state.now+=PENDING_CHECKOUT_TTL_MS;
 assert.equal(r.checkout.pending(owner),null,'an intent older than a checkout session is not resumed');
});

test('503 account_not_ready, 409 identity_conflict and 401 are told apart and leave the purchase retryable',async()=>{
 for(const [error,expected] of [[http(503,'account_not_ready'),'account-not-ready'],[http(409,'identity_conflict'),'identity-conflict'],[http(401,'authentication_required'),'sign-in'],[http(403,'access_denied'),'not-allowed'],[http(429,'rate_limit_exceeded'),'rate-limited'],[http(503,'service_unavailable'),'unavailable'],
  [Object.assign(new Error('Cloud credentials-missing'),{name:'CloudProtocolError',code:'credentials-missing'}),'sign-in'],[Object.assign(new Error('Cloud expired'),{name:'CloudProtocolError',code:'expired'}),'sign-in'],[new Error('Cloud account changed'),'account-changed'],[new Error('Connection timed out'),'offline']]){
  const p=phone([error,open()]);
  assert.equal(await kind(p.checkout.subscribe(owner,'plus_monthly',signal())),expected);
  assert.deepEqual(p.state.opened,[],'no payment page opens after a refusal');
  assert.ok(p.checkout.pending(owner),`${expected} keeps the intent`);
  assert.equal(await p.checkout.subscribe(owner,'plus_monthly',signal()),'opened',`${expected} can be retried`);
  assert.equal(p.state.starts[1].idempotencyKey,p.state.starts[0].idempotencyKey);
  assert.ok(checkoutFailureMessage(expected).length>0);assert.doesNotMatch(checkoutFailureMessage(expected),/http|\d{3}|cs_|stripe/i);
 }
 // The same refusals at confirmation keep the checkout pending.
 for(const [error,expected] of [[http(503,'account_not_ready'),'account-not-ready'],[http(409,'identity_conflict'),'identity-conflict'],[http(401),'sign-in'],[http(500),'not-confirmed'],[new Error('Connection request failed'),'offline']]){
  const p=phone([open(),error,{subscriptionId:'sub_1',replayed:false,planName:null}]);
  await p.checkout.subscribe(owner,'plus_monthly',signal());
  assert.equal(await kind(p.checkout.confirm(owner,signal())),expected);
  assert.equal(p.checkout.pending(owner).sessionId,SESSION);
  await p.checkout.confirm(owner,signal());assert.equal(p.state.stored,null);
 }
 assert.equal(checkoutFailure(http(400,'validation_error'),'start').kind,'unsupported','a Cloud without mobile checkout falls back to the hosted plan page');
 assert.equal(checkoutFailure(http(404),'start').kind,'unsupported');
 assert.equal(checkoutFailure(http(404),'confirm').kind,'unknown-session');
});

test('an expired or spent intent gets exactly one new key; a session Cloud does not know is dropped but the intent kept',async()=>{
 const p=phone([{status:'expired'},open()]);
 assert.equal(await p.checkout.subscribe(owner,'plus_monthly',signal()),'opened');
 assert.equal(p.state.starts.length,2);assert.notEqual(p.state.starts[1].idempotencyKey,p.state.starts[0].idempotencyKey);
 const q=phone([{status:'stale_intent'},{status:'expired'}]);
 assert.equal(await kind(q.checkout.subscribe(owner,'plus_monthly',signal())),'unavailable');
 assert.equal(q.state.starts.length,2,'never a loop of new keys');
 const r=phone([open(),http(400,'validation_error')]);
 await r.checkout.subscribe(owner,'plus_monthly',signal());
 assert.equal(await kind(r.checkout.confirm(owner,signal())),'unknown-session');
 assert.deepEqual([r.checkout.pending(owner).sessionId,r.checkout.pending(owner).idempotencyKey],[null,r.state.starts[0].idempotencyKey]);
});

test('a billing conflict settles a recorded session first, otherwise forgets the intent so the next attempt is fresh',async()=>{
 const p=phone([open(),http(409,'billing_state_conflict'),{subscriptionId:'sub_1',replayed:true,planName:null}]);
 await p.checkout.subscribe(owner,'plus_monthly',signal());
 assert.equal(await p.checkout.subscribe(owner,'plus_monthly',signal()),'entitled');
 assert.deepEqual(p.state.confirms,[SESSION]);assert.equal(p.state.stored,null);
 const q=phone([http(409,'billing_state_conflict'),open()]);
 assert.equal(await kind(q.checkout.subscribe(owner,'plus_monthly',signal())),'billing-conflict');
 assert.equal(q.state.stored,null);
 await q.checkout.subscribe(owner,'plus_monthly',signal());
 assert.notEqual(q.state.starts[1].idempotencyKey,q.state.starts[0].idempotencyKey);
});

test('an aborted step is an abort, and a stored record that is not a purchase intent is ignored',async()=>{
 const p=phone([()=>{throw new DOMException('Cancelled','AbortError');}]);
 await assert.rejects(p.checkout.subscribe(owner,'plus_monthly',signal()),{name:'AbortError'});
 assert.equal(await kind(p.checkout.subscribe(owner,'team_yearly',signal())),'unsupported');
 for(const stored of ['{','null','[]',JSON.stringify({v:2}),JSON.stringify({v:1,owner,planKey:'plus_monthly',idempotencyKey:'short',sessionId:null,startedAt:1}),JSON.stringify({v:1,owner,planKey:'plus_monthly',idempotencyKey:'00000000-0000-4000-8000-000000000001',sessionId:'not-a-session',startedAt:p.state.now})]){p.state.stored=stored;assert.equal(p.checkout.pending(owner),null,stored);}
});

// The Cloud adapter: exact routes, bodies and credential binding.
function cloud(answers){
 const calls=[],opened=[],credential={credentialId:'credential-1',token:'synthetic-mobile-key',userId:owner.userId,organizationId:owner.organizationId};
 const client=new protocol.CloudProtocol('production',async request=>{calls.push(request);const next=answers.shift();if(next instanceof Error)throw next;return next;},{read:async()=>credential,write:async()=>{},clear:async()=>{}},async url=>{opened.push(url);});
 return {client,calls,opened,credential};
}
test('the adapter reads the public catalogue, starts a mobile checkout with the signed-in key and confirms by session',async()=>{
 const c=cloud([{status:200,data:{success:true,data:{catalogVersion:'v1',plans:[plan('plus_monthly','Plus',2000)]}}},{status:200,data:{success:true,data:{status:'open',presentation:'mobile',commandId:'c',checkoutUrl:PAGE,sessionId:SESSION,expiresAt:'x'}}},{status:200,data:{success:true,data:{subscriptionId:'sub_1',replayed:false},entitlement:null}}]);
 assert.equal((await c.client.subscriptionPlans(signal()))[0].name,'Plus');
 assert.deepEqual([c.calls[0].url,c.calls[0].method,c.calls[0].headers.Authorization,c.calls[0].body],['https://api.eliza.app/api/v1/subscriptions/plans','GET',undefined,undefined]);
 const key='00000000-0000-4000-8000-000000000001';
 assert.deepEqual(await c.client.startSubscriptionCheckout('plus_monthly',key,'credential-1',signal()),{status:'open',checkoutUrl:PAGE,sessionId:SESSION});
 assert.deepEqual([c.calls[1].url,c.calls[1].method,c.calls[1].headers.Authorization,c.calls[1].redirect],['https://api.eliza.app/api/v1/subscriptions/checkout','POST','Bearer synthetic-mobile-key','error']);
 assert.deepEqual(c.calls[1].body,{planKey:'plus_monthly',idempotencyKey:key,presentation:'mobile'});
 assert.equal((await c.client.confirmSubscriptionCheckout(SESSION,'credential-1',signal())).subscriptionId,'sub_1');
 assert.deepEqual([c.calls[2].url,c.calls[2].body],['https://api.eliza.app/api/v1/subscriptions/checkout/confirm',{sessionId:SESSION}]);
 await c.client.openSubscriptionCheckout(PAGE,signal());assert.deepEqual(c.opened,[PAGE]);
 await assert.rejects(c.client.openSubscriptionCheckout('https://evil.example/pay',signal()),{name:'CloudProtocolError',code:'invalid-response'});
 assert.deepEqual(c.opened,[PAGE]);
});
test('the adapter reports an absent catalogue as null, keeps a refusal\'s status and code, and refuses another sign-in before sending',async()=>{
 for(const status of [404,405,501])assert.equal(await cloud([{status,data:{}}]).client.subscriptionPlans(signal()),null);
 await assert.rejects(cloud([{status:503,data:{success:false,code:'service_unavailable'},retryAfter:'5'}]).client.subscriptionPlans(signal()),{code:'http',status:503,retryAfter:'5'});
 for(const [status,code,expected] of [[503,'account_not_ready','account-not-ready'],[409,'identity_conflict','identity-conflict'],[401,'authentication_required','sign-in'],[409,'billing_state_conflict','billing-conflict']]){
  const c=cloud([{status,data:{success:false,error:'x',code}}]);
  const error=await c.client.startSubscriptionCheckout('plus_monthly','00000000-0000-4000-8000-000000000001','credential-1',signal()).catch(e=>e);
  assert.deepEqual([error.name,error.code,error.status],['CloudProtocolError','http',status]);
  assert.equal(checkoutFailure(error,'start').kind,expected);
 }
 const c=cloud([{status:200,data:{}}]);
 const changed=await c.client.confirmSubscriptionCheckout(SESSION,'another-credential',signal()).catch(e=>e);
 assert.equal(checkoutFailure(changed,'confirm').kind,'account-changed');assert.equal(c.calls.length,0);
});
