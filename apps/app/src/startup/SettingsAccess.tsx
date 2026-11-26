// spec/app/startup/access.md, "Story: Look at access again"
import { StartupAccessPanel, StartupAllSet, type StartupAccessRowState } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { useMachine } from "../../gen/app__startup__access.react.ts";
import { busy, count, flow, grantOf, nextKey, offered, panel, place, shownKey } from "../../gen/app__startup__access.ts";
import { word, type Key } from "../../gen/app__startup__steps.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";
import { type AccessSurface, actOnAccess } from "./settingsAccess.vibe";

const ordered: readonly Key[] = ["Notifications", "Microphone", "Camera", "Location", "Calendar", "Photos", "Files"];
type AccessRuntime = ManagedRuntime.ManagedRuntime<AccessSurface | Time, unknown>;

function AccessView({ runtime, review }: { runtime: AccessRuntime; review: boolean }) {
  const { state, can } = useTimed(runtime, useMachine);
  const shell = useShell(runtime).state;
  if (!state || !shell) return null;
  const showing = panel(state);
  if (showing === "Hidden") return null;
  const visit = { route: shell.route, panel: showing, look: state.look, key: shownKey(state), since: state.since };
  const send = (event: Parameters<typeof actOnAccess>[0]) => runtime.runFork(actOnAccess(event, visit));
  if (!review && showing === "AllSet") {
    const done = { type: "done" } as const;
    return <StartupAllSet
      trouble={state.finish.trouble === "NoTrouble" ? undefined : state.finish.trouble}
      notSaved={state.notice === "NotSaved"}
      onDone={can(done, "Owner") ? () => void send(done) : undefined}
    />;
  }
  if (showing !== (review ? "Review" : "Walkthrough")) return null;
  const current = review ? state.look === "AtOne" ? state.target : undefined : nextKey(state);
  const act = { type: "act", now: untimed } as const;
  const proceed = { type: "proceed", now: untimed } as const;
  const skip = { type: "skip", now: untimed } as const;
  const mayAct = can(act, "Owner");
  const rows: StartupAccessRowState[] = ordered.filter((key) => offered(state, key)).map((key) => {
    const step = flow(state, key);
    return {
      access: key,
      word: word(key, step, grantOf(state, key)),
      busy: current === key && busy(state),
      action: current === undefined
        ? (step === "Checking" ? undefined : "Settings")
        : current === key && mayAct && (review || step !== "Ready")
          ? state.stalled ? "Check" : step === "Unavailable" ? "Try again" : step === "CanRequest" ? "Allow" : "Settings"
          : undefined,
    };
  });
  return (
    <StartupAccessPanel
      review={review}
      native={offered(state, "Files")}
      current={current}
      rows={rows}
      place={review ? undefined : { step: place(state), count: count(state) }}
      continueReady={current !== undefined && flow(state, current) === "Ready"}
      notice={state.notice === "Quiet" ? undefined : state.notice}
      onAct={(key) => {
        const event = current === undefined ? { type: "review", key, now: untimed } as const : act;
        if (can(event, "Owner")) void send(event);
      }}
      onContinue={!review && can(proceed, "Owner") ? () => void send(proceed) : undefined}
      onSkip={!review && can(skip, "Owner") ? () => void send(skip) : undefined}
      onDone={review ? () => void send({ type: "leave", now: untimed }) : undefined}
    />
  );
}

/** The Startup access panel opened by Settings. */
export function AccessReview({ runtime }: { runtime: AccessRuntime }) {
  return <AccessView runtime={runtime} review />;
}

/** The permission walkthrough after a confirmed startup account. */
export function AccessWalkthrough({ runtime }: { runtime: AccessRuntime }) {
  return <AccessView runtime={runtime} review={false} />;
}
