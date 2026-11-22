// spec/account/plan.md, "Story: Use my plan's AI on the phone"; spec/account/billing.md, "Story: Redeem a membership code"; spec/account/sheet.md, "A membership code entry opens on request and closes with the sheet"
import { CreditCard, Ticket, Wallet } from "lucide-react";
import { type FormEvent, useState } from "react";
import { type Billing, canOpenFunds, canOpenManager, canStartRedeem } from "../../../gen/account__billing.ts";
import type { Admission } from "../../../gen/account__plan.ts";
import type { Sheet } from "../../../gen/account__sheet.ts";
import type { PlanSummary } from "../../account/entitlement.vibe";
import { Button, Input, Progress, Spinner } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";

export interface MembershipPanelProps {
  /** The signed-in account's address, when Cloud named one. */
  email?: string;
  summary: PlanSummary;
  admission: Admission;
  billing: Billing;
  sheet: Sheet;
  onManagePlan: () => void;
  onAddFunds: () => void;
  onToggleCode: () => void;
  onRedeem: (code: string) => void;
}

const usd = (micros: number) => (micros / 1_000_000).toLocaleString(undefined, { style: "currency", currency: "USD" });

/**
 * Membership and credits, read from Cloud for the signed-in account (P-59): balance, plan, allowance and the plan's actions.
 * @model spec/account/billing.md
 */
export function MembershipPanel({ email, summary, admission, billing, sheet, onManagePlan, onAddFunds, onToggleCode, onRedeem }: MembershipPanelProps) {
  const [code, setCode] = useState("");
  const view = summary.view;
  const plan = view?.plan;
  const paid = plan?.tag === "PlanPaid";
  const allowance = view?.allowance;
  const used = allowance && allowance.granted > 0 ? Math.min(100, Math.max(0, Math.round(((allowance.granted - allowance.available) / allowance.granted) * 100))) : undefined;
  const credit = view?.credit;
  const redeem = (event: FormEvent) => {
    event.preventDefault();
    if (canStartRedeem(billing) && code.trim()) {
      onRedeem(code);
      setCode("");
    }
  };
  const planName = paid ? (plan.planKey === "ProMonthly" ? "Pro" : "Plus") : plan === undefined ? undefined : "No plan";
  return (
    <section aria-label="Balance and membership" className="flex flex-col gap-4">
      {email && <p className="text-muted-foreground">{email}</p>}
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="font-mono text-xs uppercase text-muted-foreground">Balance</dt>
          <dd className="text-2xl">{credit === undefined ? <Spinner size="sm" label="Checking" /> : credit.kind === "funded" ? usd(credit.usdMicros) : credit.kind === "zero" ? usd(0) : <span aria-label="Not available">—</span>}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase text-muted-foreground">Plan</dt>
          <dd className={cn("text-2xl", paid && plan.warning && "text-warn")} aria-label={paid && plan.warning ? `${planName}, payment due` : planName}>
            {planName ?? <Spinner size="sm" label="Checking" />}
          </dd>
        </div>
        {used !== undefined && (
          <div className="col-span-2">
            <dt className="font-mono text-xs uppercase text-muted-foreground">Usage</dt>
            <dd><Progress value={used} aria-label={`${used}% of this period's allowance used`} /></dd>
          </div>
        )}
      </dl>
      {admission.notice === "OfflineNotice" && <p role="status" className="text-warn">Offline</p>}
      {(admission.notice === "NeedsPlanNotice" || admission.notice === "PlanEndedNotice") && <p role="status" className="text-warn">Plan needed</p>}
      {admission.notice === "SignInNotice" && <p role="status" className="text-destructive">Sign in again</p>}
      {billing.outcome === "CodeRedeemed" && <p role="status" className="text-ok">Code redeemed</p>}
      {billing.outcome === "CodeRefused" && <p role="alert" className="text-destructive">Code not accepted</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!canOpenManager(billing) && billing.manager !== "ManagerShown"} onClick={onManagePlan}>
          <CreditCard aria-hidden />{paid ? "Plan" : "Choose plan"}
        </Button>
        {canOpenFunds(billing) && <Button variant="outline" onClick={onAddFunds}><Wallet aria-hidden />Add funds</Button>}
        <Button variant="outline" aria-expanded={sheet.codeEntry} onClick={onToggleCode}><Ticket aria-hidden />{sheet.codeEntry ? "Close code" : "Code"}</Button>
      </div>
      {sheet.codeEntry && (
        <form aria-label="Redeem a membership code" onSubmit={redeem} className="flex gap-2">
          <Input
            aria-label="Membership code" name="membership-code" value={code} placeholder="Enter code" autoComplete="off" autoCapitalize="characters"
            autoCorrect="off" spellCheck={false} maxLength={64} disabled={billing.redeem.tag !== "RedeemIdle"} onChange={(event) => setCode(event.currentTarget.value)}
          />
          <Button type="submit" loading={billing.redeem.tag !== "RedeemIdle"} disabled={!canStartRedeem(billing) || !code.trim()}>Redeem</Button>
        </form>
      )}
    </section>
  );
}
