// spec/app/account/change.md, "Story: Change or cancel my plan"; spec/app/account/change.md, "Story: Keep plan changes to their sign-in"
import type { PlanOffer, SnapshotSubscription } from "@elizaos/cloud";
import { Button, Input, Spinner } from "@repo/ui";
import { Effect, type Layer } from "effect";
import { useState } from "react";
import { useMachine } from "../../gen/app__account__change.react.ts";
import * as Change from "../../gen/app__account__change.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import type { AccountWrites } from "./profile.vibe";
import type { checkout } from "./billing.vibe";
import type { codes } from "./codes.vibe";
import { beginBillingVerification, ChangeReviewPort, checkPlanChange, chooseChange, confirmReviewedChange, leaveBillingVerification, type managePlan, payInvoice, sendBillingFactor, settleBillingVerification } from "./change.vibe";
import type { BillingVerification } from "./change-authority.vibe";

type Services = Resident | AccountWrites | Layer.Success<ReturnType<typeof managePlan>> | Layer.Success<ReturnType<typeof checkout>> | Layer.Success<ReturnType<typeof codes>>;
type Props = Pick<Shown<Services>, "runtime"> & {
  readonly subscription: SnapshotSubscription;
  readonly offers: readonly PlanOffer[];
  readonly refresh: () => void;
};

const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const notices: Record<Change.Notice, string> = {
  Quiet: "", Changed: "Plan changed", ChangesAtRenewal: "Plan changes at renewal",
  Ending: "Plan ends at the end of this period", Continues: "Plan continues",
  FinishPayment: "Finish payment, then come back", NotFinished: "Cloud hasn’t finished this change",
  NotChanged: "The change was not made", PlanMoved: "Your plan changed. Check it again.",
  OutcomeUnknown: "Cloud hasn’t confirmed what happened", ConfirmItIsYou: "",
};

/** Controls and reviews for the authenticated owner’s active subscription. */
export function ManagePlan({ runtime, subscription, offers, refresh }: Props) {
  const { state, can, send } = useMachine(runtime);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [verification, setVerification] = useState<BillingVerification>();
  const [verificationError, setVerificationError] = useState("");
  const [sentSms, setSentSms] = useState(false);
  if (state === undefined) return null;
  const view = runtime.runSync(Effect.flatMap(ChangeReviewPort, (shelf) => shelf.get()));
  const ownReview = view.selection?.subscription.id === subscription.id;
  const quote = ownReview && state.step === "Quoted" ? view.quote : undefined;
  const cancellation = ownReview && state.leave.showing;
  const requiresOwner = ownReview && state.notice === "ConfirmItIsYou";
  const invoice = view.payment?.command.subscriptionId === subscription.id && (state.unsettled || state.notice === "FinishPayment");
  const target = subscription.planKey === "plus_monthly" ? "pro_monthly" : "plus_monthly";
  const next = offers.find((offer) => offer.key === target);
  const working = checking || state.step === "Quoting" || state.step === "Settling";
  const eligibleChange = next !== undefined && subscription.status === "active" && subscription.pendingPlanKey === null;
  const showControls = Change.quiet(state) && !requiresOwner && state.notice !== "FinishPayment";
  const begin = () => {
    setChecking(true);
    setVerificationError("");
    setSentSms(false);
    void runtime.runPromise(beginBillingVerification())
      .then((answer) => { setVerification(answer); setCode(""); })
      .catch(() => setVerificationError("Couldn’t request the confirmation code."))
      .finally(() => setChecking(false));
  };
  const verify = (factor?: "sms" | "totp") => {
    setChecking(true);
    setVerificationError("");
    void runtime.runPromise(settleBillingVerification(code, factor))
      .then((answer) => {
        if (answer.tag === "TryAgain") setVerificationError("Check the code and try again.");
        else setVerification(answer);
        setCode("");
      })
      .catch(() => setVerificationError("Couldn’t confirm this account."))
      .finally(() => setChecking(false));
  };
  const sendSms = () => {
    setChecking(true);
    void runtime.runPromise(sendBillingFactor())
      .then((sent) => { setSentSms(sent); setVerificationError(sent ? "" : "Couldn’t send a text message."); })
      .catch(() => setVerificationError("Couldn’t send a text message."))
      .finally(() => setChecking(false));
  };
  const act = (choice: Parameters<typeof chooseChange>[0]) => {
    setCode("");
    setVerification(undefined);
    runtime.runFork(chooseChange(choice, subscription));
  };
  return (
    <section aria-label="Manage plan" className="mt-2 grid gap-3 border-t border-border pt-3">
      <p className="text-sm text-muted-foreground">
        {subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} {date.format(subscription.periodEnd)}
      </p>
      {showControls && <div className="flex flex-wrap gap-2">
        {eligibleChange && <Button variant="secondary" disabled={working} onClick={() => act(target === "pro_monthly" ? "Upgrade" : "Downgrade")}>
          Switch to {next.name}
        </Button>}
        {subscription.control.eligible && (subscription.control.action === "undo" || subscription.control.action === "cancel") &&
          <Button variant="secondary" disabled={working} onClick={() => act(subscription.control.action === "undo" ? "Keep" : "Cancel")}>
            {subscription.control.action === "undo" ? "Keep plan" : "Cancel plan"}
          </Button>}
      </div>}
      {working && <Spinner label={state.step === "Quoting" ? "Reading plan quote" : "Checking your plan"} />}
      {quote && <section aria-label="Review plan change" className="grid gap-2 rounded-tile border border-border p-3">
        <h3 className="text-sm font-semibold">Review plan change</h3>
        <p className="text-sm">Due now {currency.format(quote.answer.review.dueNow.amountDueCents / 100)}</p>
        <p className="text-sm">Then {currency.format(quote.answer.review.recurringEstimate.amountDueCents / 100)} per month</p>
        {quote.direction === "downgrade" && <p className="text-sm">Changes {date.format(quote.answer.review.effectiveAt)}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runtime.runFork(confirmReviewedChange())}>Confirm change</Button>
          <Button variant="secondary" onClick={() => void send({ type: "notNow" })}>Not now</Button>
        </div>
      </section>}
      {cancellation && <section aria-label="Review plan cancellation" className="grid gap-2 rounded-tile border border-border p-3">
        <p className="text-sm">Your plan stays until {date.format(subscription.periodEnd)}, then ends.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runtime.runFork(confirmReviewedChange())}>Cancel plan</Button>
          <Button variant="secondary" onClick={() => void send({ type: "keepCancelling" })}>Not now</Button>
        </div>
      </section>}
      {requiresOwner && <section aria-label="Confirm your account" className="grid gap-2 rounded-tile border border-border p-3">
        <h3 className="text-sm font-semibold">Confirm it’s you</h3>
        <p className="text-sm">We’ll email a code to your account email.</p>
        {verification?.tag === "EnterCode" || verification?.tag === "UseFactor" ? <>
          <Input aria-label="Confirmation code" autoComplete="one-time-code" inputMode="numeric"
            value={code} onChange={(event) => setCode(event.currentTarget.value)} />
          <div className="flex flex-wrap gap-2">
            {verification.tag === "EnterCode"
              ? <Button disabled={checking || !code.trim()} onClick={() => verify()}>Verify code</Button>
              : verification.factors.map((factor) => factor === "sms" && !sentSms ? (
                <Button key={factor} disabled={checking} onClick={sendSms}>Text me a code</Button>
              ) : (
                <Button key={factor} disabled={checking || !code.trim()} onClick={() => verify(factor)}>
                  Verify {factor === "totp" ? "authenticator" : "text message"} code
                </Button>
              ))}
            <Button variant="secondary" disabled={checking} onClick={begin}>Send another email</Button>
          </div>
        </> : <Button disabled={checking} onClick={begin}>Email me a code</Button>}
        {(verification?.tag === "Unavailable" || verificationError) && <p role="status" className="text-sm">
          {verificationError || "Couldn’t confirm this account."}
        </p>}
        {can({ type: "dismissNotice" }) && <Button variant="secondary" disabled={checking} onClick={() => runtime.runFork(leaveBillingVerification())}>Not now</Button>}
      </section>}
      {(ownReview || state.unsettled || state.notice === "FinishPayment") && notices[state.notice] && <p role="status" className="text-sm">{notices[state.notice]}</p>}
      {invoice && <Button onClick={() => runtime.runFork(payInvoice())}>Continue to Stripe</Button>}
      {(state.unsettled || state.notice === "FinishPayment") && <Button variant="secondary" disabled={checking} onClick={() => {
        setChecking(true);
        void runtime.runPromise(checkPlanChange(refresh)).finally(() => setChecking(false));
      }}>
        Check plan status
      </Button>}
    </section>
  );
}
