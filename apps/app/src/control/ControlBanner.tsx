// spec/app/control/index.md, "Story: Control a third-party app within an owner-approved lease"; spec/app/control/index.md, "The kill-switch immediately revokes any active lease, clears any in-flight operation, and signals the native bridge and overlay"
import { Banner, Button, StatusDot } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine as ControlMachine } from "../../gen/app__control.effect.vibe";
import { useMachine } from "../../gen/app__control.react.ts";
import type { Alpha } from "../runtime/ui.tsx";
import { type ExternalControl, externalControl, triggerControlKillSwitch } from "./control.vibe";

export interface ControlBannerProps {
  /** Runtime providing the external-app control machine and resident agent control client. */
  readonly runtime: ManagedRuntime.ManagedRuntime<ControlMachine | ExternalControl, unknown>;
}

/**
 * Compact system-overlay kill-switch banner showing when Alpha holds an active third-party app
 * control lease or in-flight UI operation, with an immediate owner Stop action.
 * @model spec/app/control/index.md
 */
export function ControlBanner({ runtime }: ControlBannerProps) {
  const { state, can } = useMachine(runtime);
  if (state === undefined || (state.lease.status !== "LeaseActive" && !state.pending.active)) return null;
  const busy = state.pending.active;
  const canStop = can({ type: "killSwitch" }, "Owner");
  const steps = `${state.lease.usedOps}/${state.lease.maxOps}`;
  const stop = () => {
    void runtime.runPromise(triggerControlKillSwitch("kill_switch"));
  };
  return (
    <Banner
      data-alpha-control-banner=""
      variant="info"
      aria-label="External app control"
      action={canStop ? <Button variant="destructive" size="sm" onClick={stop}>Stop</Button> : null}
    >
      <div className="flex items-center gap-2">
        <StatusDot status={busy ? "busy" : "ok"} label={busy ? "Acting" : "Active"} />
        <span className="truncate text-sm font-medium text-foreground">
          {busy ? "Alpha acting in app" : "Alpha control active"}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">{steps}</span>
      </div>
    </Banner>
  );
}

const controlRuntimes = new WeakMap<Alpha, ManagedRuntime.ManagedRuntime<ControlMachine | ExternalControl, unknown>>();

function controlRuntimeFor(alpha: Alpha) {
  const existing = controlRuntimes.get(alpha);
  if (existing !== undefined) return existing;
  const created = alpha.over(externalControl);
  controlRuntimes.set(alpha, created);
  return created;
}

/** Overlay-scoped host that lazily binds the external-app control runtime over `alpha` and mounts `ControlBanner`. */
export function OverlayControlBanner({ alpha }: { readonly alpha: Alpha }) {
  return <ControlBanner runtime={controlRuntimeFor(alpha)} />;
}
