// spec/account/billing.md, "Story: Add funds"
import { type FormEvent, useState } from "react";
import { type Billing, canStartFunds, fundsAmountAccepted } from "../../../gen/account__billing.ts";
import { Button, Input, Label } from "../components/ui/index.ts";

/** The funds form's state and its two actions. */
export interface FundsFormProps {
  billing: Billing;
  /** The amount in cents, $5 to $1,000; payment continues on Stripe's page. */
  onAdd: (cents: number) => void;
  onClose: () => void;
}

/**
 * Add funds with its own amount and checkout; it never opens the plan manager.
 * @model spec/account/billing.md
 */
export function FundsForm({ billing, onAdd, onClose }: FundsFormProps) {
  const [amount, setAmount] = useState("10");
  const cents = Math.round(Number(amount) * 100);
  const valid = Number.isFinite(cents) && fundsAmountAccepted(cents);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid && canStartFunds(billing, cents)) onAdd(cents);
  };
  return (
    <section aria-label="Add funds" className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <Label htmlFor="funds-amount">Amount in dollars</Label>
        <Input id="funds-amount" type="number" min={5} max={1000} step={0.01} value={amount} invalid={!valid} disabled={billing.funds === "FundsOpening"} onChange={(event) => setAmount(event.currentTarget.value)} />
        <Button type="submit" loading={billing.funds === "FundsOpening"} disabled={!valid || billing.funds !== "FundsForm"}>Continue</Button>
      </form>
      {!valid && <p role="alert" className="text-destructive">$5 to $1,000</p>}
      {billing.funds === "FundsAwaitingReturn" && <p role="status">Finish payment, then return to Alpha</p>}
      {billing.outcome === "CheckoutUnavailable" && <p role="alert" className="text-destructive">Couldn’t open checkout</p>}
      <Button variant="ghost" className="self-start" disabled={billing.funds === "FundsOpening"} onClick={onClose}>Done</Button>
    </section>
  );
}
