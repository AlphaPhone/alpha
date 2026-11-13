import React from 'react';
import {Busy} from './status-ui';
import {planPrice,type CheckoutView} from './subscription-checkout';
/**
 * The first-run plan step for a signed-in account without a plan: Cloud's published plans, each
 * with one Subscribe action, and the state of a checkout that is open in the browser. Names and
 * prices are Cloud's catalogue; nothing is charged here. Payment happens on the provider's hosted
 * page and is confirmed by Cloud, never by this view.
 */
export function SubscriptionChooser({view,disabled,busy,onSubscribe,onCheckPayment,onBackToPlans}:{view:CheckoutView;disabled:boolean;busy:boolean;onSubscribe:(planKey:string)=>void;onCheckPayment:()=>void;onBackToPlans:()=>void}){
 const awaited=view.step==='awaiting'?view.plans.find(plan=>plan.key===view.planKey)??null:null;
 return <section className="alpha-plan-chooser" aria-label="Choose a plan" data-checkout-step={view.step}>
  {view.step==='awaiting'?<>
   <p className="alpha-plan-chooser-status" role="status">{busy?<Busy label="Confirming payment"/>:awaited?`Finish paying for ${awaited.name} in your browser`:'Finish paying in your browser'}</p>
   <div className="alpha-plan-chooser-actions">
    <button type="button" className="alpha-membership-primary" disabled={disabled} onClick={onCheckPayment}>Check payment</button>
    {view.planKey&&<button type="button" className="alpha-membership-secondary" disabled={disabled} onClick={()=>onSubscribe(view.planKey!)}>Open checkout again</button>}
    <button type="button" className="alpha-membership-secondary" disabled={disabled} onClick={onBackToPlans}>Back to plans</button>
   </div>
  </>:<ul className="alpha-plan-chooser-plans">{view.plans.map(plan=><li key={plan.key} data-plan={plan.key}>
   <div className="alpha-plan-chooser-plan"><strong>{plan.name}</strong><span>{planPrice(plan)} / month</span>{plan.allowanceUsd&&<small>${plan.allowanceUsd} of usage each month</small>}</div>
   <button type="button" className="alpha-membership-primary" aria-label={`Subscribe to ${plan.name}`} disabled={disabled} onClick={()=>onSubscribe(plan.key)}>Subscribe</button>
  </li>)}</ul>}
  {view.error&&<p className="alpha-plan-chooser-error" role="alert">{view.error}</p>}
 </section>;
}
