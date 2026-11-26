// spec/app/settings/index.md, "Each page links to what another area owns there"; spec/app/shell/layers.md, "Story: Keep a sheet or a dialog above the phone"; spec/kit/read.md, "Story: Read from outside"; spec/app/account/index.md, "Story: Have the agent running"
import { Button, Sheet, SheetContent, StatusDot } from "@repo/ui";
import type { Layer } from "effect";
import { X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useMachine } from "../../gen/app__shell__layers.react.ts";
import { listed, top } from "../../gen/app__shell__layers.ts";
import { area, type Alpha, type Area, type Resident, type Shown } from "../runtime/ui.tsx";
import { together } from "../runtime/index.vibe";
import { accountMachines, accountResident } from "./account.vibe";
import { AccountPanel } from "./AccountPanel.tsx";
import { accountLayer, profileLive, profileShelf } from "./profile.vibe";
import { recordsMachine } from "./resident.vibe";

export { accountMachines, accountResident };

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
    className="gap-1.5 text-caption text-muted-foreground [&_svg]:size-1.5 [&_circle]:fill-current" />;
}

const accountAreaMap = new WeakMap<Alpha, ReturnType<typeof area<Layer.Success<typeof recordsMachine>, never>>>();

function accountAreaFor(alpha: Alpha) {
  const known = accountAreaMap.get(alpha);
  if (known) return known;
  const profile = profileFor(alpha);
  const layer = together(recordsMachine, profileLive(profile.publish));
  function AccountSheet({ runtime }: Shown<Layer.Success<typeof recordsMachine> | Resident>) {
    const { state, can, send } = useMachine(runtime);
    const shown = useSyncExternalStore(profile.subscribe, profile.snapshot, profile.snapshot);
    if (!state || !listed(state, accountLayer)) return null;
    const close = { type: "closeLayer", id: accountLayer } as const;
    const onClose = () => { if (can(close)) void send(close); };
    return (
      <Sheet open={top(state).id === accountLayer} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          title="Account"
          className="max-h-dvh max-w-105 gap-2.5 bg-background px-6.5 pt-9 pb-[max(--spacing(7),env(safe-area-inset-bottom))] text-foreground [&_h2]:flex [&_h2]:min-h-12 [&_h2]:items-center [&_h2]:text-title"
          actions={<Button variant="secondary" className="mt-2 rounded-lg" onClick={onClose}>Done</Button>}
        >
          <span aria-hidden className="absolute inset-x-0 top-3 mx-auto h-1 w-8 rounded-full bg-border" />
          <Button variant="ghost" size="icon" aria-label="Close Account" className="absolute top-9 right-6.5 size-12" onClick={onClose}><X /></Button>
          <AccountPanel runtime={runtime} profile={shown} />
        </SheetContent>
      </Sheet>
    );
  }
  const built = area(layer, AccountSheet);
  accountAreaMap.set(alpha, built);
  return built;
}

/** Returns the shared Account area runtime for `alpha` without constructing a second Whole instance. */
export function accountRuntime(alpha: Alpha) {
  return accountAreaFor(alpha).runtime(alpha);
}

/** Secondary Area export for embedding Account inside a `settings/account` slot when wired in `areas.ts`. */
export const accountSettingsArea: Area = {
  open(alpha) {
    const profile = profileFor(alpha);
    const shown = accountRuntime(alpha);
    return function AccountEmbedded() {
      const current = useSyncExternalStore(profile.subscribe, profile.snapshot, profile.snapshot);
      return <AccountPanel runtime={shown} profile={current} />;
    };
  },
};

/** The account sheet above Settings, drawing verified profile details and full Account management. */
const overlayArea = {
  open(alpha, place) {
    return accountAreaFor(alpha).open(alpha, place);
  },
} satisfies Area;

export default overlayArea;
