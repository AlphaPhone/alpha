// spec/app/account/billing.md, "The plans and their prices are read from Cloud, and only the newest reading is taken"; spec/app/account/plan.md, "Story: Know my plan"; spec/app/settings/index.md, "Each page links to what another area owns there"; spec/app/shell/layers.md, "Story: Keep a sheet or a dialog above the phone"; spec/kit/read.md, "Story: Read from outside"
import { Button, cn, Sheet, SheetContent, Spinner, StatusDot } from "@repo/ui";
import { ChevronDown, X } from "lucide-react";
import { Layer } from "effect";
import { useSyncExternalStore } from "react";
import * as Billing from "../../gen/app__account__billing.effect.vibe";
import { useMachine as useBilling } from "../../gen/app__account__billing.react.ts";
import { useMachine } from "../../gen/app__shell__layers.react.ts";
import { listed, top } from "../../gen/app__shell__layers.ts";
import { area, type Alpha, type Area, type Resident, type Shown } from "../runtime/area.tsx";
import { checkout, choosePurchase, recheckPlan, tierOf } from "./billing.vibe";
import { accountLayer, closeCatalog, openCatalog, type Profile, profileLive, profileShelf } from "./profile.vibe";

const usd = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
const planDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const credits = (micros: number) => usd.format(micros / 1_000_000);
const roundUsd = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const price = (cents: number) => (cents % 100 === 0 ? roundUsd : usd).format(cents / 100);

/** Account balance and allowance as returned by the current Cloud plan read. */
function AccountPlan({ plan }: { plan: NonNullable<Extract<Profile, { tag: "Read" }>["plan"]> }) {
  if (plan.tag === "CheckingPlan") return <Spinner label="Reading Cloud plan" className="text-muted-foreground" />;
  if (plan.tag === "PlanUnavailable") return <p role="status" className="text-sm text-muted-foreground">Cloud plan unavailable</p>;
  return (
    <dl aria-label="Cloud plan" className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <dt className="text-muted-foreground">Balance</dt>
        <dd className="text-base font-semibold">{credits(plan.balanceMicros)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Plan</dt>
        <dd className="text-base font-semibold">{plan.name}
          {plan.paymentDue ? <span className="block text-sm font-normal text-muted-foreground">Payment due</span> : null}
        </dd>
      </div>
      {plan.allowance ? <div className="col-span-2">
        <dt className="text-muted-foreground">Usage</dt>
        <dd>{credits(plan.allowance.availableMicros)} remaining · Resets {planDate.format(plan.allowance.resetsAt)}</dd>
      </div> : null}
    </dl>
  );
}

/** The account read in the open sheet, in the form Cloud confirmed. */
function AccountDetails({ profile }: { profile: Profile }) {
  if (profile.tag === "Reading") return <Spinner label="Reading account" className="text-muted-foreground" />;
  if (profile.tag === "SignInRequired") return <p role="status" className="text-sm text-muted-foreground">Sign-in required</p>;
  if (profile.tag === "Unavailable") return <p role="status" className="text-sm text-muted-foreground">Couldn’t read your account</p>;
  return (
    <div className="min-w-0 wrap-anywhere">
      <p className="text-sm text-muted-foreground">{profile.contact || profile.name || "Signed in"}</p>
      {profile.contact && profile.name && profile.contact !== profile.name ? <p className="text-sm text-muted-foreground">{profile.name}</p> : null}
      {profile.plan ? <AccountPlan plan={profile.plan} /> : null}
    </div>
  );
}

/** The offers the owner can inspect in the open Account sheet. */
type CheckoutRuntime = Layer.Success<ReturnType<typeof checkout>>;

function Plans({ runtime, shelf, canSubscribe }: { runtime: Shown<Resident | CheckoutRuntime>["runtime"]; shelf: ReturnType<typeof profileShelf>; canSubscribe: boolean }) {
  const { state, can, send } = useBilling(runtime);
  const catalog = useSyncExternalStore(shelf.subscribe, shelf.catalog, shelf.catalog);
  const offers = catalog && state?.offers.status === "Loaded" && state.offers.ticket === catalog.ticket ? catalog.offers : undefined;
  const failed = state?.offers.status === "Failed";
  const selected = state?.review;
  const shown = catalog && selected?.tag === "PurchaseReview" && catalog.ticket === selected.ticket
    ? offers?.find((offer) => tierOf(offer) === selected.tier) : undefined;
  const closeReview = { type: "closePurchaseReview" } as const;
  return (
    <details aria-busy={state?.offers.status === "Loading" || undefined} className="group mt-4 border-t border-border pt-3" onToggle={(event) => {
      runtime.runFork(event.currentTarget.open ? openCatalog() : closeCatalog(shelf.publishCatalog));
    }}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        View plans
        <ChevronDown aria-hidden className="size-4 group-open:rotate-180" />
      </summary>
      {offers?.length ? (
        <ul aria-label="Plans" className="grid gap-3 pb-1">
          {offers.map((offer) => {
            const review = { type: "reviewPlan", tier: tierOf(offer), ticket: catalog?.ticket ?? 0 } as const;
            const allowance = /^\d+(?:\.\d+)?$/.test(offer.allowance.amountUsd) ? Number(offer.allowance.amountUsd) : Number.NaN;
            return (
              <li key={offer.key} className="grid gap-1 rounded-tile border border-border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <strong className="text-lg font-semibold">{offer.name}</strong>
                  <span className="text-sm">{price(offer.amountCents)}<span className="text-muted-foreground">/month</span></span>
                </div>
                {Number.isFinite(allowance) ? <p className="text-sm text-muted-foreground">{price(Math.round(allowance * 100))} of AI usage each month</p> : null}
                {canSubscribe && catalog?.buyer && !shown && can(review)
                  ? <Button className="mt-2" aria-label={`Review ${offer.name} subscription`} onClick={() => void send(review)}>Subscribe</Button> : null}
              </li>
            );
          })}
        </ul>
      ) : failed || offers ? <p role="status" className="text-sm text-muted-foreground">{failed ? "Plans unavailable" : "No plans available"}</p>
        : <Spinner label="Reading plans" className="text-muted-foreground" />}
      {canSubscribe && shown && catalog && selected?.tag === "PurchaseReview" ? (
        <section aria-label="Review subscription" className="mt-3 grid gap-2 rounded-tile border border-border p-4">
          <p className="text-sm font-medium">{shown.name} · {price(shown.amountCents)}/month</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => void send(closeReview)}>Not now</Button>
            <Button onClick={() => runtime.runFork(choosePurchase(catalog, shown, selected.number))}>Continue to Stripe</Button>
          </div>
        </section>
      ) : null}
    </details>
  );
}

const notices: Record<Billing.Notice, string> = {
  Quiet: "",
  PlanActive: "Payment confirmed",
  NotYetPaid: "Payment not yet confirmed",
  CheckoutExpired: "Checkout expired",
  ConfirmUnknown: "Payment status unconfirmed",
  CheckoutUnavailable: "Checkout unavailable",
};

function PurchaseStatus({ runtime }: { runtime: Shown<Resident | CheckoutRuntime>["runtime"] }) {
  const { state, can, send } = useBilling(runtime);
  if (!state) return null;
  const stop = { type: "stopWaiting", now: 0 } as const;
  const check = { type: "checkPayment", now: 0 } as const;
  if (!state.visit.open && !notices[state.notice] && !can(check)) return null;
  return (
    <div className="mt-2 grid gap-1">
      {notices[state.notice] ? <p role="status" className="text-sm">{notices[state.notice]}</p> : null}
      {state.visit.open && state.notice === "Quiet"
        ? <p role="status" className="text-sm">{state.checkout.session ? "Waiting for Stripe" : "Opening Stripe"}</p> : null}
      {can(stop) ? <Button variant="ghost" onClick={() => void send(stop)}>Stop waiting</Button> : null}
      {can(check) ? <Button variant="ghost" onClick={() => void send(check)}>Check payment status</Button> : null}
      {state.unsettled ? <Button variant="ghost" onClick={() => runtime.runFork(recheckPlan())}>Refresh plan</Button> : null}
    </div>
  );
}

const profiles = new WeakMap<Alpha, ReturnType<typeof profileShelf>>();

function profileFor(alpha: Alpha) {
  const known = profiles.get(alpha);
  if (known) return known;
  const made = profileShelf();
  profiles.set(alpha, made);
  return made;
}

/** The verified account shown below the Account row in Settings. */
export function AccountStatus({ alpha }: { alpha: Alpha }) {
  const profile = profileFor(alpha);
  const current = useSyncExternalStore(profile.subscribe, profile.snapshot, profile.snapshot);
  if (current.tag === "Reading") return null;
  const label = current.tag === "Read" ? current.contact || "Signed in"
    : current.tag === "SignInRequired" ? "Signed out" : "Account unavailable";
  return <StatusDot status={current.tag === "Read" ? "ok" : "off"} label={label} showLabel
    className={cn("flex gap-1.5 text-caption leading-normal text-muted-foreground [&_circle]:fill-current [&_svg]:size-2.5", current.tag === "Read" && "[&_svg]:text-status-ok")} />;
}

/** The account sheet above Settings, drawing only the details the authenticated account read returned. */
export default {
  open(alpha, place) {
    const profile = profileFor(alpha);
    function AccountSheet({ runtime }: Shown<Resident | CheckoutRuntime>) {
      const { state, can, send } = useMachine(runtime);
      const shown = useSyncExternalStore(profile.subscribe, profile.snapshot, profile.snapshot);
      if (!state || !listed(state, accountLayer)) return null;
      const close = { type: "closeLayer", id: accountLayer } as const;
      const onClose = () => { if (can(close)) void send(close); };
      return (
        <Sheet open={top(state).id === accountLayer} onOpenChange={(open) => { if (!open) onClose(); }}>
          <SheetContent
            title="Account"
            className="max-h-dvh max-w-105 gap-2.5 before:hidden bg-background px-6.5 pt-9 pb-[max(--spacing(7),env(safe-area-inset-bottom))] text-foreground [&_h2]:flex [&_h2]:min-h-12 [&_h2]:items-center [&_h2]:text-title"
            actions={<Button variant="secondary" className="mt-2 rounded-lg" onClick={onClose}>Done</Button>}
          >
            <span aria-hidden className="absolute inset-x-0 top-3 mx-auto h-1 w-8 rounded-full bg-border" />
            <Button variant="ghost" size="icon" aria-label="Close Account" className="absolute top-9 right-6.5 size-12" onClick={onClose}><X /></Button>
            <AccountDetails profile={shown} />
            {shown.tag === "Read" ? <PurchaseStatus runtime={runtime} /> : null}
            {shown.tag === "Read" ? <Plans runtime={runtime} shelf={profile} canSubscribe={shown.plan?.tag === "PlanRead" && shown.plan.name === "No plan"} /> : null}
          </SheetContent>
        </Sheet>
      );
    }
    return area(Layer.provideMerge(profileLive(profile.publish, profile.publishCatalog, profile.refreshed), checkout(profile.refresh, profile.publishCatalog)), AccountSheet).open(alpha, place);
  },
} satisfies Area;
