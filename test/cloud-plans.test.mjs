// In-app subscription management: the wire contracts the app accepts from Cloud, the routes each
// transport admits, and the native billing authority's fixed route table.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {nativeSource,runJvm,jsonJarSkip} from './fixtures/jvm-tools.mjs';

const plans=await import('../apps/app/src/runtime/cloud-plans.ts');
const {managedServiceRequest:allowed}=await import('../apps/app/src/runtime/managed-service-routes.ts');
const {productionCloud,alphaCloudCutover}=await import('../apps/app/src/runtime/cloud-deployment.generated.ts');

const envelope=data=>({success:true,data});
const plan=(key,name,amountCents,amountUsd)=>({key,name,catalogVersion:'v1',active:true,interval:'month',intervalCount:1,currency:'usd',amountCents,
 allowance:{amountUsd,fundingClass:'allowance_eligible',rollover:false,expiresAt:'billing_period_end'},fundingClasses:['allowance_eligible'],rateLimits:{},resourceCeilings:{}});

test('plans are parsed from the catalogue and sorted by price',()=>{
 const parsed=plans.parsePlans(envelope({catalogVersion:'v1',plans:[plan('pro_monthly','Pro',10000,'90.00'),plan('plus_monthly','Plus',3000,'25.00')]}));
 assert.deepEqual(parsed,[{key:'plus_monthly',name:'Plus',amountCents:3000,allowanceUsd:'25.00'},{key:'pro_monthly',name:'Pro',amountCents:10000,allowanceUsd:'90.00'}]);
 assert.throws(()=>plans.parsePlans(envelope({plans:[plan('team_monthly','Team',1,'1')]})),plans.PlanResponseError);
 assert.throws(()=>plans.parsePlans(envelope({plans:[plan('plus_monthly','Plus',-1,'1')]})),plans.PlanResponseError);
 assert.equal(plans.formatUsd(3000),'$30');
 assert.equal(plans.formatUsd(1999),'$19.99');
});

const subscription=(overrides={})=>({subscriptionId:'sub_1',planKey:'plus_monthly',catalogVersion:'v1',lifecycleRevision:'7',projectionRevision:'7',state:'active',
 currentPeriodStart:'2026-11-01T00:00:00Z',currentPeriodEnd:'2026-12-01T00:00:00Z',cancelAtPeriodEnd:false,pendingPlanKey:null,graceExpiresAt:null,dunningStartedAt:null,
 cancellationControl:{action:'cancel',method:'POST',endpoint:'/api/v1/subscriptions/cancel',subscriptionId:'sub_1',expectedSubscriptionRevision:7,eligible:true,blockers:[]},...overrides});

test('the subscription comes from the billing snapshot observation, and only an available one counts',()=>{
 const state=plans.parseSubscription(envelope({schemaVersion:2,v2:{subscription:{status:'available',observedAt:'x',value:subscription()}}}));
 assert.deepEqual(state,{subscriptionId:'sub_1',planKey:'plus_monthly',state:'active',currentPeriodEnd:Date.parse('2026-12-01T00:00:00Z'),cancelAtPeriodEnd:false,pendingPlanKey:null,
  control:{action:'cancel',eligible:true,expectedSubscriptionRevision:7},revision:7});
 assert.equal(plans.parseSubscription(envelope({schemaVersion:2,v2:{subscription:{status:'not_applicable',reason:'none'}}})),null);
 assert.equal(plans.parseSubscription(envelope({schemaVersion:2,v2:{subscription:{status:'unavailable',error:{code:'x',retryable:true}}}})),null);
 assert.equal(plans.parseSubscription(envelope({schemaVersion:1})),null);
 const scheduled=plans.parseSubscription(envelope({v2:{subscription:{status:'available',value:subscription({cancelAtPeriodEnd:true,cancellationControl:{action:'undo',expectedSubscriptionRevision:8,eligible:true}})}}}));
 assert.deepEqual([scheduled.cancelAtPeriodEnd,scheduled.control.action,scheduled.revision],[true,'undo',8]);
 assert.throws(()=>plans.parseSubscription(envelope({v2:{subscription:{status:'available',value:subscription({state:'weird'})}}})),plans.PlanResponseError);
});

test('checkout opens only Stripe Checkout and keeps the session for the return',()=>{
 const open=plans.parseCheckout(envelope({status:'open',presentation:'mobile',commandId:'cmd_1',checkoutUrl:'https://checkout.stripe.com/c/pay/cs_test_1',sessionId:'cs_test_1',expiresAt:'2026-11-15T12:00:00Z'}));
 assert.deepEqual(open,{status:'open',commandId:'cmd_1',checkoutUrl:'https://checkout.stripe.com/c/pay/cs_test_1',sessionId:'cs_test_1',expiresAt:Date.parse('2026-11-15T12:00:00Z')});
 for(const checkoutUrl of ['https://evil.example/pay','http://checkout.stripe.com/x','https://user:pw@checkout.stripe.com/x','https://checkout.stripe.com.evil.example/x'])
  assert.throws(()=>plans.parseCheckout(envelope({status:'open',commandId:'c',checkoutUrl,sessionId:'s',expiresAt:'2026-11-15T12:00:00Z'})),plans.PlanResponseError,checkoutUrl);
 assert.deepEqual(plans.parseCheckout(envelope({status:'completed',commandId:'c',checkoutUrl:null})),{status:'completed',commandId:'c'});
 assert.throws(()=>plans.parseCheckout(envelope({status:'pending',commandId:'c'})),plans.PlanResponseError);
});

test('plan change quotes, commands and upgrade payment continuation',()=>{
 const invoice={amountDueCents:7000,subtotalCents:7000,discountCents:0,taxCents:0,totalCents:7000,startingBalanceCents:0};
 const up=plans.parseQuote(envelope({quoteId:'q1',review:{kind:'upgrade_estimate',targetPlanKey:'pro_monthly',dueNow:invoice,recurringEstimate:{...invoice,amountDueCents:10000},expiresAt:'2026-11-15T12:05:00Z'}}),'upgrade');
 assert.deepEqual(up,{quoteId:'q1',direction:'upgrade',targetPlanKey:'pro_monthly',dueNowCents:7000,recurringCents:10000,effectiveAt:null,expiresAt:Date.parse('2026-11-15T12:05:00Z')});
 const down=plans.parseQuote(envelope({quoteId:'q2',review:{kind:'downgrade_estimate',targetPlanKey:'plus_monthly',amountDueNowCents:0,effectiveAt:'2026-12-01T00:00:00Z',recurringEstimate:{...invoice,amountDueCents:3000},expiresAt:'2026-11-15T12:05:00Z'}}),'downgrade');
 assert.deepEqual([down.dueNowCents,down.recurringCents,down.effectiveAt],[0,3000,Date.parse('2026-12-01T00:00:00Z')]);
 assert.throws(()=>plans.parseQuote(envelope({quoteId:'q',review:{kind:'downgrade_estimate'}}),'upgrade'),plans.PlanResponseError);
 assert.deepEqual(plans.parseCommand(envelope({commandId:'c1',status:'APPLIED',failure:null})),{commandId:'c1',status:'APPLIED',failure:null});
 const payment=plans.parseUpgradePayment(envelope({command:{commandId:'c1',status:'PREPARED'},continuation:{kind:'hosted_invoice',hostedInvoiceUrl:'https://invoice.stripe.com/i/acct_1/x',amountDueCents:7000}}));
 assert.equal(payment.invoiceUrl,'https://invoice.stripe.com/i/acct_1/x');
 assert.throws(()=>plans.parseUpgradePayment(envelope({command:{commandId:'c1',status:'PREPARED'},continuation:{hostedInvoiceUrl:'https://pay.example/x'}})),plans.PlanResponseError);
 assert.equal(plans.parseUpgradePayment(envelope({command:{commandId:'c1',status:'APPLIED'},continuation:null})).invoiceUrl,null);
});

test('a confirmed upgrade is reported as done only when its command is applied',()=>{
 const command=status=>({commandId:'c1',status,failure:null});
 const pay=(body,status=200)=>({status,body:envelope(body)});
 // Applied by the payment step, or already applied at confirmation with an unreadable payment step.
 assert.deepEqual(plans.upgradeOutcome(command('PREPARED'),pay({command:{commandId:'c1',status:'APPLIED'},continuation:null})),{kind:'applied'});
 assert.deepEqual(plans.upgradeOutcome(command('APPLIED'),null),{kind:'applied'});
 // A payment that needs action continues on Stripe's invoice page.
 assert.deepEqual(plans.upgradeOutcome(command('PREPARED'),pay({command:{commandId:'c1',status:'PREPARED'},continuation:{hostedInvoiceUrl:'https://invoice.stripe.com/i/x'}})),{kind:'pay',invoiceUrl:'https://invoice.stripe.com/i/x'});
 // The payment step failed, was refused or answered for another command: never "upgraded".
 for(const payment of [null,{status:500,body:{}},{status:401,body:{}},pay({nonsense:true}),pay({command:{commandId:'other',status:'APPLIED'},continuation:null})])
  assert.deepEqual(plans.upgradeOutcome(command('PREPARED'),payment),{kind:'pending'},JSON.stringify(payment));
 assert.deepEqual(plans.upgradeOutcome(command('OUTCOME_UNKNOWN'),pay({command:{commandId:'c1',status:'OUTCOME_UNKNOWN'},continuation:null})),{kind:'pending'});
 assert.deepEqual(plans.upgradeOutcome(command('PREPARED'),pay({command:{commandId:'c1',status:'FAILED'},continuation:null})),{kind:'failed'});
 assert.deepEqual(plans.upgradeOutcome(command('FAILED'),null),{kind:'failed'});
});

test('the chat plan card copy follows the Alpha Cloud cutover flag',()=>{
 // Off (shipped): the current Cloud's hosted billing page.
 assert.deepEqual(plans.managePlanCardCopy('subscription-required',false,'Eliza Cloud'),{title:'Manage plan in Eliza Cloud',sub:'Opens in your browser. Nothing is purchased here.'});
 assert.deepEqual(plans.managePlanCardCopy('billing-refused',false,'Eliza Cloud'),{title:'Manage billing in Eliza Cloud',sub:'Opens in your browser. Nothing is purchased here.'});
 assert.deepEqual(plans.managePlanCardCopy('allowance-exhausted',false,'Eliza Cloud').title,'Manage billing in Eliza Cloud');
 // On: the in-app plans; never the browser copy.
 assert.deepEqual(plans.managePlanCardCopy('subscription-required',true,'Alpha Cloud'),{title:'Choose a plan',sub:'Opens your plans here. Nothing is bought until you pay on Stripe’s page.'});
 assert.deepEqual(plans.managePlanCardCopy('billing-refused',true,'Alpha Cloud').title,'Manage plan');
 for(const limit of ['subscription-required','billing-refused','allowance-exhausted'])assert.doesNotMatch(plans.managePlanCardCopy(limit,true,'Alpha Cloud').sub,/browser/);
});

test('referrals: own code, and entered codes are normalized conservatively',()=>{
 assert.deepEqual(plans.parseReferral({code:'ALPHA-123',total_referrals:2,is_active:true}),{code:'ALPHA-123',totalReferrals:2,active:true});
 assert.throws(()=>plans.parseReferral({code:'',total_referrals:0,is_active:true}),plans.PlanResponseError);
 assert.equal(plans.normalizeReferralCode('  ALPHA-123 '),'ALPHA-123');
 for(const code of ['','abc','has space','a/b','x'.repeat(65)])assert.equal(plans.normalizeReferralCode(code),null,code);
});

test('billing operations carry only their own fields',()=>{
 const key=crypto.randomUUID();
 assert.equal(plans.billingOperationProblem({operation:'cancel',subscriptionId:'sub_1',expectedSubscriptionRevision:7,idempotencyKey:key}),null);
 assert.equal(plans.billingOperationProblem({operation:'upgrade-review',subscriptionId:'sub_1',expectedSubscriptionRevision:7,targetPlanKey:'pro_monthly'}),null);
 assert.equal(plans.billingOperationProblem({operation:'upgrade-confirm',quoteId:'q1',idempotencyKey:key}),null);
 assert.notEqual(plans.billingOperationProblem({operation:'cancel',subscriptionId:'../x',expectedSubscriptionRevision:7,idempotencyKey:key}),null);
 assert.notEqual(plans.billingOperationProblem({operation:'upgrade-review',subscriptionId:'s',expectedSubscriptionRevision:-1,targetPlanKey:'pro_monthly'}),null);
 assert.notEqual(plans.billingOperationProblem({operation:'portal'}),null);
});

test('without the Alpha Cloud cutover the renderer route filter admits none of the in-app plan routes (native: connection-routes.test.mjs)',()=>{
 const api=productionCloud.api;
 assert.equal(alphaCloudCutover,false,'shipped builds keep the current Cloud');
 for(const [path,method,body] of [['/api/v1/subscriptions/plans','GET',false],['/api/v1/subscriptions/checkout','POST',true],['/api/v1/subscriptions/checkout/confirm','POST',true],['/api/v1/referrals','GET',false],['/api/v1/referrals/apply','POST',true]]){
  assert.equal(allowed(api+path,method,body),false,`default ${method} ${path}`);
  assert.equal(allowed(api+path,method,body,{alphaCloud:false}),false,`flag off ${method} ${path}`);
 }
 // The current Cloud's own routes are unchanged.
 assert.equal(allowed(api+'/api/v1/billing/limits','GET'),true);
 assert.equal(allowed(api+'/api/v1/subscription/redeem','POST',true),true);
});

test('with the Alpha Cloud cutover the device transport admits the plan catalogue, checkout and referrals, never plan changes',()=>{
 const api=productionCloud.api,on={alphaCloud:true};
 assert.equal(allowed(api+'/api/v1/subscriptions/plans','GET',false,on),true);
 assert.equal(allowed(api+'/api/v1/subscriptions/checkout','POST',true,on),true);
 assert.equal(allowed(api+'/api/v1/subscriptions/checkout/confirm','POST',true,on),true);
 assert.equal(allowed(api+'/api/v1/referrals','GET',false,on),true);
 assert.equal(allowed(api+'/api/v1/referrals/apply','POST',true,on),true);
 for(const [path,method,body] of [['/api/v1/subscriptions/checkout','POST',false],['/api/v1/subscriptions/checkout?x=1','POST',true],['/api/v1/referrals','POST',true],['/api/v1/referrals/apply','GET',false],
  ['/api/v1/subscriptions/cancel','POST',true],['/api/v1/subscriptions/cancel/undo','POST',true],['/api/v1/subscriptions/upgrade/review','POST',true],['/api/v1/subscriptions/portal','POST',true],['/api/v1/subscriptions/commands','GET',false]])
  assert.equal(allowed(api+path,method,body,on),false,`${method} ${path}`);
 assert.equal(allowed('https://other.invalid/api/v1/referrals','GET',false,on),false);
});

test('the native billing authority performs only its fixed routes with validated bodies',{skip:jsonJarSkip},()=>{
 const root=mkdtempSync(join(tmpdir(),'alpha-billing-routes-'));
 try{
  const source=join(root,'BillingRoutesTest.java');
  const jwt=claims=>`e30.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;
  writeFileSync(source,`package ai.alphacompute.alphaphone;
import org.json.JSONObject;
public class BillingRoutesTest {
 static int checks;
 static void check(boolean ok){if(!ok)throw new AssertionError("check "+checks);checks++;}
 static void refused(String json){try{BillingAuthorityRoutes.route(new JSONObject(json));}catch(IllegalArgumentException expected){checks++;return;}catch(Exception other){throw new AssertionError(other);}throw new AssertionError("expected refusal "+checks+": "+json);}
 public static void main(String[] args) throws Exception {
  BillingAuthorityRoutes.Route cancel=BillingAuthorityRoutes.route(new JSONObject("{\\"operation\\":\\"cancel\\",\\"subscriptionId\\":\\"sub_1\\",\\"expectedSubscriptionRevision\\":7,\\"idempotencyKey\\":\\"abcdefgh-1234\\"}"));
  check(cancel.method.equals("POST")&&cancel.path.equals("/api/v1/subscriptions/cancel")&&cancel.body.getLong("expectedSubscriptionRevision")==7&&cancel.body.length()==3);
  check(BillingAuthorityRoutes.route(new JSONObject("{\\"operation\\":\\"undo-cancel\\",\\"subscriptionId\\":\\"sub_1\\",\\"expectedSubscriptionRevision\\":7,\\"idempotencyKey\\":\\"abcdefgh-1234\\"}")).path.equals("/api/v1/subscriptions/cancel/undo"));
  check(BillingAuthorityRoutes.route(new JSONObject("{\\"operation\\":\\"upgrade-review\\",\\"subscriptionId\\":\\"sub_1\\",\\"expectedSubscriptionRevision\\":7,\\"targetPlanKey\\":\\"pro_monthly\\"}")).path.equals("/api/v1/subscriptions/upgrade/review"));
  check(BillingAuthorityRoutes.route(new JSONObject("{\\"operation\\":\\"downgrade-confirm\\",\\"quoteId\\":\\"q1\\",\\"idempotencyKey\\":\\"abcdefgh-1234\\"}")).path.equals("/api/v1/subscriptions/downgrade/confirm"));
  BillingAuthorityRoutes.Route payment=BillingAuthorityRoutes.route(new JSONObject("{\\"operation\\":\\"upgrade-payment\\",\\"commandId\\":\\"cmd_1\\"}"));
  check(payment.path.equals("/api/v1/subscriptions/upgrade/cmd_1/payment")&&payment.body==null);
  refused("{\\"operation\\":\\"portal\\"}");
  refused("{\\"operation\\":\\"upgrade-payment\\",\\"commandId\\":\\"../../user\\"}");
  refused("{\\"operation\\":\\"cancel\\",\\"subscriptionId\\":\\"sub_1\\",\\"expectedSubscriptionRevision\\":7.5,\\"idempotencyKey\\":\\"abcdefgh-1234\\"}");
  refused("{\\"operation\\":\\"cancel\\",\\"subscriptionId\\":\\"sub_1\\",\\"expectedSubscriptionRevision\\":7,\\"idempotencyKey\\":\\"abcdefgh-1234\\",\\"path\\":\\"/x\\"}");
  refused("{\\"operation\\":\\"upgrade-review\\",\\"subscriptionId\\":\\"sub_1\\",\\"expectedSubscriptionRevision\\":7,\\"targetPlanKey\\":\\"team_monthly\\"}");
  refused("{\\"operation\\":\\"upgrade-confirm\\",\\"quoteId\\":\\"q1\\",\\"idempotencyKey\\":\\"short\\"}");
  long now=1_800_000_000_000L;
  check(BillingAuthorityRoutes.sessionExpiry("${jwt({exp:1_800_000_600})}",now)==1_800_000_600_000L);
  check(BillingAuthorityRoutes.sessionExpiry("${jwt({exp:1_900_000_000})}",now)==now+3_600_000L);
  try{BillingAuthorityRoutes.sessionExpiry("${jwt({exp:1_700_000_000})}",now);throw new AssertionError("expired accepted");}catch(IllegalArgumentException expected){checks++;}
  try{BillingAuthorityRoutes.sessionExpiry("not-a-jwt",now);throw new AssertionError("garbage accepted");}catch(IllegalArgumentException expected){checks++;}
  JSONObject user=new JSONObject().put("id","u1").put("organization_id","o1");
  check(BillingAuthorityRoutes.sameAccount(user,"u1","o1"));
  check(!BillingAuthorityRoutes.sameAccount(user,"u2","o1"));
  check(!BillingAuthorityRoutes.sameAccount(user,"u1","o2"));
  check(!BillingAuthorityRoutes.sameAccount(null,"u1","o1"));
  // The session is bound to the phone's stored Cloud key in the native sign-in host's real slot shape
  // {credentialId, token, expiresAt, serverCredentialId} (no identity there); Cloud's /api/v1/user answer names the account.
  String slot="{\\"credentialId\\":\\"c1\\",\\"token\\":\\"eliza_mobile_key1\\",\\"expiresAt\\":1900000000000,\\"serverCredentialId\\":\\"s1\\"}";
  BillingAuthorityRoutes.Account key=BillingAuthorityRoutes.Account.of(slot);
  check(key!=null&&key.credentialId.equals("c1")&&key.serverCredentialId.equals("s1")&&key.userId==null);
  check("eliza_mobile_key1".equals(BillingAuthorityRoutes.Account.token(slot)));
  BillingAuthorityRoutes.Account a=key.withIdentity(new JSONObject().put("userId","u1").put("organizationId","o1"));
  check(a.userId.equals("u1")&&a.organizationId.equals("o1")&&a.same(key));
  try{key.withIdentity(new JSONObject());throw new AssertionError("identity-less account");}catch(SecurityException expected){checks++;}
  BillingAuthorityRoutes.Account renewedExpiry=BillingAuthorityRoutes.Account.of("{\\"credentialId\\":\\"c1\\",\\"token\\":\\"eliza_mobile_key1\\",\\"expiresAt\\":1950000000000,\\"serverCredentialId\\":\\"s1\\"}");
  BillingAuthorityRoutes.Account newToken=BillingAuthorityRoutes.Account.of("{\\"credentialId\\":\\"c1\\",\\"token\\":\\"eliza_mobile_key2\\",\\"expiresAt\\":1950000000000,\\"serverCredentialId\\":\\"s2\\"}");
  BillingAuthorityRoutes.Account other=BillingAuthorityRoutes.Account.of("{\\"credentialId\\":\\"c3\\",\\"token\\":\\"eliza_mobile_key3\\",\\"expiresAt\\":1950000000000,\\"serverCredentialId\\":\\"s3\\"}");
  check(a.same(renewedExpiry)&&!a.same(newToken)&&!a.same(other)&&!a.same(null));
  check(BillingAuthorityRoutes.Account.of(null)==null&&BillingAuthorityRoutes.Account.of("{\\"credentialId\\":\\"c1\\"}")==null&&BillingAuthorityRoutes.Account.of("not json")==null);
  BillingAuthorityRoutes.Session session=new BillingAuthorityRoutes.Session();
  try{session.pending(null,"e@example.invalid","v",now+60_000);throw new AssertionError("code sent signed out");}catch(SecurityException expected){checks++;}
  session.pending(a,"e@example.invalid","v",now+60_000);
  check(session.pendingAccount(other)==null&&session.pendingFor(a,now)==null);
  session.pending(a,"e@example.invalid","v",now+60_000);
  check(session.pendingAccount(renewedExpiry)==a&&session.pendingFor(key,now)[0].equals("e@example.invalid"));
  check(!session.bind(other,a,"jwt",now+600_000)&&session.current(key,now)==null);
  session.pending(a,"e@example.invalid","v",now+60_000);
  check(session.bind(key,a,"jwt",now+600_000)&&session.pendingFor(key,now)==null);
  check("jwt".equals(session.current(renewedExpiry,now))&&session.expiresAt()==now+600_000);
  // Sign-out ends it.
  check(session.current(null,now)==null&&session.current(key,now)==null);
  session.bind(key,a,"jwt",now+600_000);
  // A new key (even for the same account), or another account, ends it.
  check(session.current(newToken,now)==null&&session.current(key,now)==null);
  session.bind(key,a,"jwt",now+600_000);
  check(session.current(other,now)==null&&session.current(key,now)==null);
  // Expiry, a refusal and clear() end it.
  session.bind(key,a,"jwt",now+600_000);
  check(session.current(key,now+600_000)==null);
  session.bind(key,a,"jwt",now+600_000);session.spent("other");check("jwt".equals(session.current(key,now)));
  session.spent("jwt");check(session.current(key,now)==null);
  session.bind(key,a,"jwt",now+600_000);session.clear();check(session.current(key,now)==null&&session.expiresAt()==0);
  System.out.println("PASS billing routes "+checks);
 }
}
`);
  assert.match(runJvm([nativeSource('BillingAuthorityRoutes.java'),source],'ai.alphacompute.alphaphone.BillingRoutesTest',{json:true}),/^PASS billing routes \d+/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
