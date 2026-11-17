import React,{useCallback,useEffect,useRef,useState} from 'react';
import './cloud-plan-ui.css';
import {Busy,StatusDot} from './status-ui';
import {billingOperationProblem,formatUsd,normalizeReferralCode,parseCommand,parseQuote,upgradeOutcome,
 type BillingAuthorityPort,type BillingAuthorityStatus,type BillingOperation,type CheckoutStart,type PlanChangeQuote,
 type PlanKey,type PlanOffer,type ReferralState,type SubscriptionState} from './cloud-plans';

/** The signed-in account's Cloud client, as the plan manager uses it. */
export interface PlanAccountClient {
 subscriptionPlans(signal:AbortSignal):Promise<PlanOffer[]>;
 subscriptionState(signal:AbortSignal):Promise<SubscriptionState|null>;
 startSubscriptionCheckout(planKey:PlanKey,idempotencyKey:string,signal:AbortSignal):Promise<CheckoutStart>;
 confirmSubscriptionCheckout(sessionId:string,signal:AbortSignal):Promise<{subscriptionId:string|null}>;
 referral(signal:AbortSignal):Promise<ReferralState>;
 applyReferral(code:string,signal:AbortSignal):Promise<{applied:true}|{applied:false;reason:'invalid'|'used'|'refused'}>;
 openPaymentPage(url:string,signal:AbortSignal):Promise<void>;
}
export interface PlanAccount { client:PlanAccountClient; identity:{email?:string;userId:string;organizationId?:string;credentialId:string} }

/**
 * A checkout opened in the browser, waiting for the app to come back on its billing return. Kept
 * per signed-in key in memory only: Cloud's own payment evidence decides, the session id is only a
 * lookup, and a restarted app simply reads the subscription again.
 */
const pendingCheckouts=new Map<string,{sessionId:string;planKey:PlanKey;idempotencyKey:string;expiresAt:number}>();
export const pendingCheckoutFor=(credentialId:string)=>pendingCheckouts.get(credentialId)??null;

type Step=
 | {kind:'idle'}
 | {kind:'verify';then:BillingOperation;codeSent:boolean}
 | {kind:'quote';quote:PlanChangeQuote}
 | {kind:'confirm-cancel'};

const dateLabel=(at:number)=>new Date(at).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});

/**
 * In-app plans (owner directive 2026-11-15: every subscription action happens in Alpha Phone).
 * Choose or switch a plan, cancel or keep it, and share or enter a referral code. Payment itself is
 * Stripe's page, opened from here and returning here; plan changes and cancellation first confirm
 * the account with a one-time email code (native billing authority).
 */
export function CloudPlanManager({account,authority,serviceName,onChanged,onPaymentOpened}:{account:PlanAccount;authority:BillingAuthorityPort;serviceName:string;onChanged:()=>void;
 /** A Stripe page opened: the app's next return checks the plan even before Cloud confirms it. */
 onPaymentOpened?:()=>void}){
 const [plans,setPlans]=useState<PlanOffer[]|null>(null);
 const [subscription,setSubscription]=useState<SubscriptionState|null|undefined>(undefined);
 const [referral,setReferral]=useState<ReferralState|null>(null);
 const [step,setStep]=useState<Step>({kind:'idle'});
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [code,setCode]=useState('');
 const [referralInput,setReferralInput]=useState('');
 const live=useRef<AbortController|null>(null);
 // The caller passes a fresh callback each render; reading it through a ref keeps the effects below stable.
 const changed=useRef(onChanged);changed.current=onChanged;
 const notifyChanged=useCallback(()=>changed.current(),[]);
 const opened=useRef(onPaymentOpened);opened.current=onPaymentOpened;
 const credential=account.identity.credentialId;
 // service.client is one object per signed-in key (the component is keyed by credential); the wrapper is not.
 const client=account.client;

 const load=useCallback(async(signal:AbortSignal)=>{
  // An unreadable subscription (a Cloud without the billing snapshot, or a refused read) leaves it unknown:
  // the plans still show, but nothing that could buy twice or change the wrong plan is offered.
  const [offered,current,mine]=await Promise.all([client.subscriptionPlans(signal),client.subscriptionState(signal).catch(()=>undefined),client.referral(signal).catch(()=>null)]);
  signal.throwIfAborted();
  setPlans(offered);setSubscription(current);setReferral(mine);
 },[client]);

 const act=useCallback(async(label:string,work:(signal:AbortSignal)=>Promise<void>)=>{
  if(live.current)return;
  const controller=new AbortController();live.current=controller;
  setBusy(label);setError('');setNotice('');
  try{await work(controller.signal);}
  catch(failure){if(!controller.signal.aborted)setError(failure instanceof Error&&failure.message&&failure.message.length<80?failure.message:'Couldn’t finish. Try again.');}
  finally{if(live.current===controller)live.current=null;setBusy('');}
 },[]);

 /** A checkout returned (or the sheet reopened): Cloud confirms from its own payment evidence. */
 const confirmPending=useCallback(async(signal:AbortSignal)=>{
  const pending=pendingCheckouts.get(credential);
  if(!pending)return;
  if(Date.now()>pending.expiresAt){pendingCheckouts.delete(credential);return;}
  const confirmed=await client.confirmSubscriptionCheckout(pending.sessionId,signal).catch(()=>null);
  if(confirmed?.subscriptionId){pendingCheckouts.delete(credential);setNotice('Plan active');notifyChanged();}
 },[client,credential,notifyChanged]);

 useEffect(()=>{
  void act('Loading plans',async signal=>{await confirmPending(signal);await load(signal);});
  const returned=()=>{if(document.visibilityState==='visible'&&pendingCheckouts.has(credential))void act('Checking payment',async signal=>{await confirmPending(signal);await load(signal);});};
  document.addEventListener('visibilitychange',returned);
  return ()=>{document.removeEventListener('visibilitychange',returned);live.current?.abort();live.current=null;};
 },[act,confirmPending,load,credential]);

 /** Plan changes and cancellation: with an account session, or after confirming one. */
 const withAuthority=useCallback(async(operation:BillingOperation,signal:AbortSignal):Promise<{status:number;body:unknown}|null>=>{
  const problem=billingOperationProblem(operation);
  if(problem)throw Error('Not available');
  const status:BillingAuthorityStatus=await authority.status();
  signal.throwIfAborted();
  if(status.status!=='authorized'){setStep({kind:'verify',then:operation,codeSent:false});return null;}
  const answer=await authority.perform(operation);
  if(answer.status===401){setStep({kind:'verify',then:operation,codeSent:false});return null;}
  return answer;
 },[authority]);

 const finish=useCallback(async(operation:BillingOperation,signal:AbortSignal)=>{
  const answer=await withAuthority(operation,signal);
  if(!answer)return;
  if(answer.status===409)throw Error('Your plan changed. Check it again.');
  if(answer.status<200||answer.status>=300)throw Error('Not accepted');
  if(operation.operation==='upgrade-review'||operation.operation==='downgrade-review'){
   setStep({kind:'quote',quote:parseQuote(answer.body,operation.operation==='upgrade-review'?'upgrade':'downgrade')});return;
  }
  // Cloud accepted a change: its quote is spent and is never offered for another confirm, and the plan
  // is read again whatever happens next.
  setStep({kind:'idle'});
  try{
   switch(operation.operation){
    case 'upgrade-confirm':{
     const command=parseCommand(answer.body);
     if(command.status==='FAILED')throw Error('The upgrade was not made');
     // A payment that needs action (3-D Secure, a new card) continues on Stripe's invoice page.
     const payment=await authority.perform({operation:'upgrade-payment',commandId:command.commandId}).catch(()=>null);
     const outcome=upgradeOutcome(command,payment);
     if(outcome.kind==='failed')throw Error('The upgrade was not made');
     if(outcome.kind==='pay'){opened.current?.();await client.openPaymentPage(outcome.invoiceUrl,signal);setNotice('Finish payment, then come back');}
     else setNotice(outcome.kind==='applied'?'Plan upgraded':'Upgrade not finished yet. Check your plan again shortly.');
     break;
    }
    case 'downgrade-confirm':{const command=parseCommand(answer.body);if(command.status==='FAILED')throw Error('The change was not made');setNotice('Plan changes at renewal');break;}
    case 'cancel':setNotice('Plan ends at the end of this period');break;
    case 'undo-cancel':setNotice('Plan continues');break;
   }
  }finally{notifyChanged();}
  await load(signal);
 },[client,authority,load,notifyChanged,withAuthority]);

 const subscribe=(plan:PlanOffer)=>void act('Opening checkout',async signal=>{
  const previous=pendingCheckouts.get(credential);
  const idempotencyKey=previous&&previous.planKey===plan.key&&Date.now()<previous.expiresAt?previous.idempotencyKey:crypto.randomUUID();
  const started=await client.startSubscriptionCheckout(plan.key,idempotencyKey,signal);
  if(started.status==='open'){opened.current?.();pendingCheckouts.set(credential,{sessionId:started.sessionId,planKey:plan.key,idempotencyKey,expiresAt:started.expiresAt});setNotice('Finish payment, then come back');}
  else if(started.status==='completed'){pendingCheckouts.delete(credential);setNotice('Plan active');notifyChanged();await load(signal);}
  else {pendingCheckouts.delete(credential);throw Error('Checkout expired. Try again.');}
 });
 const change=(target:PlanOffer)=>{
  const current=subscription;if(!current||current.revision===null||!plans)return;
  const from=plans.find(plan=>plan.key===current.planKey);
  const operation:BillingOperation={operation:from&&target.amountCents>from.amountCents?'upgrade-review':'downgrade-review',subscriptionId:current.subscriptionId,expectedSubscriptionRevision:current.revision,targetPlanKey:target.key};
  void act('Reviewing',signal=>finish(operation,signal));
 };
 const cancelOrKeep=(action:'cancel'|'undo')=>{
  const control=subscription?.control;if(!subscription||!control)return;
  void act(action==='cancel'?'Cancelling':'Keeping plan',signal=>finish({operation:action==='cancel'?'cancel':'undo-cancel',subscriptionId:subscription.subscriptionId,expectedSubscriptionRevision:control.expectedSubscriptionRevision,idempotencyKey:crypto.randomUUID()},signal));
 };
 const sendCode=()=>{
  const email=account.identity.email;if(!email||step.kind!=='verify')return;
  void act('Sending code',async()=>{await authority.start({email});setStep({...step,codeSent:true});setCode('');});
 };
 const verifyCode=(event:React.FormEvent)=>{
  event.preventDefault();if(step.kind!=='verify'||!code.trim())return;
  const then=step.then;
  void act('Confirming',async signal=>{
   const status=await authority.verify({code:code.trim(),userId:account.identity.userId,...(account.identity.organizationId?{organizationId:account.identity.organizationId}:{})});
   if(status.status!=='authorized')throw Error('Code not accepted');
   setCode('');setStep({kind:'idle'});await finish(then,signal);
  });
 };
 const applyReferral=(event:React.FormEvent)=>{
  event.preventDefault();const normalized=normalizeReferralCode(referralInput);
  if(!normalized){setError('Check the code');return;}
  void act('Applying code',async signal=>{
   const result=await client.applyReferral(normalized,signal);
   if(result.applied){setReferralInput('');setNotice('Referral code applied');notifyChanged();return;}
   throw Error(result.reason==='used'?'A referral code is already applied':result.reason==='invalid'?'Unknown code':'Code not accepted');
  });
 };
 const share=()=>{if(!referral)return;const text=`Use my ${serviceName} referral code: ${referral.code}`;
  void (navigator.share?navigator.share({text}).catch(()=>{}):navigator.clipboard?.writeText(referral.code).then(()=>setNotice('Code copied')).catch(()=>{}));};

 const active=!!subscription&&(['active','grace','past_due'] as string[]).includes(subscription.state);
 const working=!!busy;
 const unknownPlan=plans!==null&&subscription===undefined;
 return <section className="alpha-plans" aria-label="Plans" aria-busy={working||undefined}>
  <h2>Plans</h2>
  {plans===null?<p className="alpha-plans-loading">{working?<Busy label={busy}/>:'Plans unavailable'}</p>:
  <ul className="alpha-plans-list">{plans.map(plan=>{
   const current=active&&subscription?.planKey===plan.key,pending=subscription?.pendingPlanKey===plan.key;
   return <li key={plan.key} className="alpha-plan" data-current={current||undefined}>
    <div className="alpha-plan-heading"><strong>{plan.name}</strong><span>{formatUsd(plan.amountCents)}<small>/month</small></span></div>
    <p>${plan.allowanceUsd} of AI usage each month</p>
    {current?<p className="alpha-plan-state"><StatusDot tone={subscription?.cancelAtPeriodEnd||subscription?.state==='past_due'?'warn':'ok'}>{subscription?.state==='past_due'?'Payment due':subscription?.cancelAtPeriodEnd?`Ends ${dateLabel(subscription.currentPeriodEnd)}`:`Renews ${dateLabel(subscription!.currentPeriodEnd)}`}</StatusDot></p>
    :pending?<p className="alpha-plan-state"><StatusDot tone="warn">Starts {dateLabel(subscription!.currentPeriodEnd)}</StatusDot></p>
    :<button type="button" disabled={working||unknownPlan||(!!active&&(subscription?.revision===null||!!subscription?.pendingPlanKey))} onClick={()=>active?change(plan):subscribe(plan)}>{active?`Switch to ${plan.name}`:`Subscribe`}</button>}
   </li>;})}</ul>}
  {unknownPlan&&!working&&<p className="alpha-plans-unknown">Couldn’t read your current plan. Refresh the account and try again.</p>}
  {active&&subscription?.control&&<div className="alpha-plans-actions">{subscription.control.action==='undo'
   ?<button type="button" disabled={working||!subscription.control.eligible} onClick={()=>cancelOrKeep('undo')}>Keep plan</button>
   :step.kind==='confirm-cancel'?<><p>Your plan stays until {dateLabel(subscription.currentPeriodEnd)}, then ends.</p><button type="button" className="alpha-plans-danger" disabled={working} onClick={()=>cancelOrKeep('cancel')}>Cancel plan</button><button type="button" disabled={working} onClick={()=>setStep({kind:'idle'})}>Not now</button></>
   :<button type="button" className="alpha-plans-quiet" disabled={working||!subscription.control.eligible} onClick={()=>setStep({kind:'confirm-cancel'})}>Cancel plan</button>}</div>}

  {step.kind==='quote'&&<div className="alpha-plans-review" role="group" aria-label="Review plan change">
   <p>{step.quote.direction==='upgrade'?<>Due now <strong>{formatUsd(step.quote.dueNowCents)}</strong>, then {formatUsd(step.quote.recurringCents)}/month.</>:<>No charge now. From {step.quote.effectiveAt?dateLabel(step.quote.effectiveAt):'renewal'}, {formatUsd(step.quote.recurringCents)}/month.</>}</p>
   <button type="button" disabled={working||Date.now()>step.quote.expiresAt} onClick={()=>{const quote=step.quote;void act('Changing plan',signal=>finish({operation:quote.direction==='upgrade'?'upgrade-confirm':'downgrade-confirm',quoteId:quote.quoteId,idempotencyKey:crypto.randomUUID()},signal));}}>Confirm</button>
   <button type="button" className="alpha-plans-quiet" disabled={working} onClick={()=>setStep({kind:'idle'})}>Not now</button>
  </div>}

  {step.kind==='verify'&&<div className="alpha-plans-verify" role="group" aria-label="Confirm it’s you">
   <p>Confirm it’s you to change your plan. We’ll email a code to {account.identity.email??'your account email'}.</p>
   {!step.codeSent?<button type="button" disabled={working||!account.identity.email} onClick={sendCode}>Send code</button>
   :<form onSubmit={verifyCode}><label><span className="alpha-sr">Code</span><input value={code} onChange={event=>setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Code" maxLength={12} disabled={working} required/></label><button type="submit" disabled={working||!code.trim()}>Confirm</button></form>}
   <button type="button" className="alpha-plans-quiet" disabled={working} onClick={()=>setStep({kind:'idle'})}>Not now</button>
  </div>}

  <h2>Referrals</h2>
  {referral&&<div className="alpha-plans-referral"><p>Your code <strong>{referral.code}</strong>{referral.totalReferrals>0&&<small> · used {referral.totalReferrals}×</small>}</p><button type="button" disabled={working} onClick={share}>Share</button></div>}
  <form className="alpha-plans-referral-entry" onSubmit={applyReferral} aria-label="Enter a referral code"><label><span className="alpha-sr">Referral code</span><input value={referralInput} onChange={event=>setReferralInput(event.target.value)} placeholder="Referral code" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={64} disabled={working}/></label><button type="submit" disabled={working||!referralInput.trim()}>Apply</button></form>

  {working&&plans!==null&&<p role="status"><Busy label={busy}/></p>}
  {error&&<p role="alert">{error}</p>}
  {notice&&<p role="status">{notice}</p>}
 </section>;
}
