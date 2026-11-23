// spec/account/billing.md, "Story: Choose or change my plan in Alpha"; spec/account/billing.md, "Story: Share or enter a referral code"
import { Check, Share2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  type Billing, type Outcome, type PaidPlan, canApplyReferral, canAuthorityVerified, canConfirmCancel, canConfirmChange, canRequestCancel,
  canRequestChange, canRequestKeep, canSendAuthorityCode, canSubscribe, quoteLive,
} from "../../../gen/account__billing.ts";
import type { BillingDetails } from "../../account/billing.vibe";
import { Button, Card, CardTitle, Input, Spinner } from "../components/ui/index.ts";

/** The plan manager's state, Cloud's offers and the owner's plan actions. */
export interface PlanManagerProps {
  billing: Billing;
  details: BillingDetails;
  onSubscribe: (plan: PaidPlan) => void;
  onChange: (target: PaidPlan) => void;
  onCancel: () => void;
  onKeep: () => void;
  onSendCode: () => void;
  onVerifyCode: (code: string) => void;
  onConfirmChange: () => void;
  onConfirmCancel: () => void;
  onApplyReferral: (code: string) => void;
  onShareReferral: (code: string) => void;
  onClose: () => void;
}

const outcomes: Partial<Record<Outcome, string>> = {
  PlanActive: "Plan active",
  PlanUpgraded: "Plan upgraded",
  UpgradePending: "Not finished yet",
  ChangesAtRenewal: "Changes at renewal",
  EndsAtPeriodEnd: "Ends at period end",
  PlanContinues: "Plan continues",
  ChangeRefused: "Not changed",
  PaymentOpened: "Finish payment, then return",
  CheckoutUnavailable: "Checkout unavailable",
  ReferralApplied: "Referral applied",
  ReferralRefused: "Referral not accepted",
};

const money = (cents: number) => (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 });
const day = (at: number) => new Date(at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
const planOf = { plus_monthly: "Plus", pro_monthly: "Pro" } as const;

/**
 * In-app plans: choose, switch, cancel or keep a plan, confirm it is you first, and share or enter a referral code.
 * Payment is Stripe's own page.
 * @model spec/account/billing.md
 */
export function PlanManager({ billing, details, onSubscribe, onChange, onCancel, onKeep, onSendCode, onVerifyCode, onConfirmChange, onConfirmCancel, onApplyReferral, onShareReferral, onClose }: PlanManagerProps) {
  const [code, setCode] = useState("");
  const [referral, setReferral] = useState("");
  const current = billing.current.tag === "OnPlan" ? billing.current : undefined;
  const outcome = outcomes[billing.outcome];
  const verify = (event: FormEvent) => {
    event.preventDefault();
    if (canAuthorityVerified(billing, true) && code.trim()) {
      onVerifyCode(code);
      setCode("");
    }
  };
  const refer = (event: FormEvent) => {
    event.preventDefault();
    if (canApplyReferral(billing) && referral.trim()) onApplyReferral(referral);
  };
  if (billing.manager === "ManagerLoading") return <Spinner label="Loading plans" className="mx-auto my-8" />;
  if (billing.manager === "ManagerFailed") return <p role="status">Plans unavailable</p>;
  return (
    <section aria-label="Plans" className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {details.offers.map((offer) => {
          const plan = planOf[offer.key];
          const mine = current?.plan === plan;
          return (
            <li key={offer.key}>
              <Card className="flex items-center justify-between gap-3 p-4">
                <div>
                  <CardTitle className="font-serif text-xl">{offer.name}</CardTitle>
                  <p className="text-muted-foreground">{money(offer.amountCents)}/mo · ${offer.allowance.amountUsd} AI</p>
                  {mine && current && (
                    <p className={current.paymentDue || current.endsAtPeriodEnd ? "text-warn" : "text-ok"}>
                      {current.paymentDue ? "Payment due" : current.endsAtPeriodEnd && details.renewsAt ? `Ends ${day(details.renewsAt)}` : details.renewsAt ? `Renews ${day(details.renewsAt)}` : "Active"}
                    </p>
                  )}
                </div>
                {mine ? <Check aria-label="Current plan" className="text-ok" />
                  : current ? <Button variant="outline" disabled={!canRequestChange(billing, plan)} onClick={() => onChange(plan)}>Switch</Button>
                  : <Button loading={billing.checkout.tag === "OpeningCheckout"} disabled={!canSubscribe(billing, plan)} onClick={() => onSubscribe(plan)}>Subscribe</Button>}
              </Card>
            </li>
          );
        })}
      </ul>
      {current && !current.endsAtPeriodEnd && <Button variant="ghost" disabled={!canRequestCancel(billing)} onClick={onCancel}>Cancel plan</Button>}
      {current?.endsAtPeriodEnd && <Button variant="outline" disabled={!canRequestKeep(billing)} onClick={onKeep}>Keep plan</Button>}
      {billing.pending.tag !== "NoPending" && billing.authority !== "Authorized" && (
        <Card className="flex flex-col gap-3 p-4" aria-label="Confirm it’s you">
          <CardTitle className="font-serif text-xl">Confirm it’s you</CardTitle>
          {billing.authority === "SessionRequired" ? (
            <Button disabled={!canSendAuthorityCode(billing)} onClick={onSendCode}>Email me a code</Button>
          ) : (
            <form onSubmit={verify} className="flex gap-2">
              <Input aria-label="Code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.currentTarget.value)} />
              <Button type="submit" disabled={!code.trim()}>Confirm</Button>
            </form>
          )}
        </Card>
      )}
      {billing.quote.tag === "Quoted" && details.quote && (
        <Card className="flex flex-col gap-2 p-4" aria-label="Plan change review">
          <p>{details.quote.dueNowCents > 0 ? `${money(details.quote.dueNowCents)} now, then ` : ""}{money(details.quote.recurringCents)}/mo</p>
          <Button disabled={!canConfirmChange(billing) || !quoteLive(billing.quote)} loading={billing.busy} onClick={onConfirmChange}>
            {quoteLive(billing.quote) ? "Change plan" : "Review expired"}
          </Button>
        </Card>
      )}
      {(billing.pending.tag === "CancelPlan" || billing.pending.tag === "KeepPlan") && billing.authority === "Authorized" && (
        <Button variant={billing.pending.tag === "CancelPlan" ? "destructive" : "primary"} loading={billing.busy} disabled={!canConfirmCancel(billing)} onClick={onConfirmCancel}>
          {billing.pending.tag === "CancelPlan" ? "Cancel at period end" : "Keep my plan"}
        </Button>
      )}
      {outcome && <p role="status">{outcome}</p>}
      {details.referral && (
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono">{details.referral.code}</span>
          <Button variant="ghost" size="icon" aria-label="Share referral code" onClick={() => onShareReferral(details.referral?.code ?? "")}><Share2 aria-hidden /></Button>
        </div>
      )}
      <form aria-label="Enter a referral code" onSubmit={refer} className="flex gap-2">
        <Input aria-label="Referral code" maxLength={64} autoCapitalize="none" value={referral} onChange={(event) => setReferral(event.currentTarget.value)} />
        <Button type="submit" variant="outline" loading={billing.referring} disabled={!canApplyReferral(billing) || !referral.trim()}>Apply</Button>
      </form>
      <Button variant="ghost" className="self-start" disabled={billing.busy} onClick={onClose}>Done</Button>
    </section>
  );
}
