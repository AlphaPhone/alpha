// spec/app/account/plan.md, "Story: Know my plan"; spec/app/settings/index.md, "Each page links to what another area owns there"; spec/app/shell/layers.md, "Story: Keep a sheet or a dialog above the phone"; spec/kit/read.md, "Story: Read from outside"
import { Button, Sheet, SheetContent, Spinner, StatusDot } from "@repo/ui";
import { Layer } from "effect";
import { X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { useMachine } from "../../gen/app__shell__layers.react.ts";
import { listed, top } from "../../gen/app__shell__layers.ts";
import { area, type Alpha, type Resident, type Shown } from "../runtime/area.tsx";
import { accountLayer, type Profile, profileShelf } from "./profile.vibe";

const usd = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
const planDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const credits = (micros: number) => usd.format(micros / 1_000_000);

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

/** The verified account shown below the Account row in Settings. */
export function AccountStatus({ alpha }: { alpha: Alpha }) {
  const shelf = useMemo(() => alpha.runtime.runSync(profileShelf), [alpha.runtime]);
  const current = useSyncExternalStore(shelf.subscribe, shelf.snapshot, shelf.snapshot);
  if (current.tag === "Reading") return null;
  const label = current.tag === "Read" ? current.contact || "Signed in"
    : current.tag === "SignInRequired" ? "Signed out" : "Account unavailable";
  return <StatusDot status={current.tag === "Read" ? "ok" : "off"} label={label} showLabel
    className="gap-1.5 text-caption text-muted-foreground [&_svg]:size-1.5 [&_circle]:fill-current" />;
}

function AccountSheet({ runtime }: Shown<Resident>) {
  const { state, can, send } = useMachine(runtime);
  const shelf = useMemo(() => runtime.runSync(profileShelf), [runtime]);
  const shown = useSyncExternalStore(shelf.subscribe, shelf.snapshot, shelf.snapshot);
  if (!state || !listed(state, accountLayer)) return null;
  const close = { type: "closeLayer", id: accountLayer } as const;
  const onClose = () => { if (can(close)) void send(close); };
  return (
    <Sheet open={top(state).id === accountLayer} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        title="Account"
        className="max-h-dvh max-w-105 gap-2.5 bg-background px-6.5 pt-9 pb-[max(--spacing(7),var(--alpha-safe-bottom))] text-foreground [&_h2]:flex [&_h2]:min-h-12 [&_h2]:items-center [&_h2]:text-title"
        actions={<Button variant="secondary" className="mt-2 rounded-lg" onClick={onClose}>Done</Button>}
      >
        <span aria-hidden className="absolute inset-x-0 top-3 mx-auto h-1 w-8 rounded-full bg-border" />
        <Button variant="ghost" size="icon" aria-label="Close Account" className="absolute top-9 right-6.5 size-12" onClick={onClose}><X /></Button>
        <AccountDetails profile={shown} />
      </SheetContent>
    </Sheet>
  );
}

/** The account sheet above Settings, drawing only the details the authenticated account read returned. */
export default area(Layer.empty, AccountSheet);
