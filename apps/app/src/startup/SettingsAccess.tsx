// spec/app/startup/access.md, "Story: Look at access again"
import { StartupAccessPanel, type StartupAccessRowState } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine } from "../../gen/app__startup__access.effect.vibe";
import { useMachine } from "../../gen/app__startup__access.react.ts";
import { busy, count, flow, grantOf, nextKey, offered, panel, place } from "../../gen/app__startup__access.ts";
import { word, type Key } from "../../gen/app__startup__steps.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";

const ordered: readonly Key[] = ["Notifications", "Microphone", "Camera", "Location", "Calendar", "Photos", "Files"];
type AccessRuntime = ManagedRuntime.ManagedRuntime<Machine | Time, unknown>;

function AccessView({ runtime, review }: { runtime: AccessRuntime; review: boolean }) {
  const { state, can, send } = useTimed(runtime, useMachine);
  if (!state || panel(state) !== (review ? "Review" : "Walkthrough")) return null;
  const current = review ? state.look === "AtOne" ? state.target : undefined : nextKey(state);
  const act = { type: "act", now: untimed } as const;
  const proceed = { type: "proceed", now: untimed } as const;
  const skip = { type: "skip", now: untimed } as const;
  const mayAct = can(act, "Owner");
  const rows: StartupAccessRowState[] = ordered.filter((key) => offered(state, key)).map((key) => {
    const showing = flow(state, key);
    return {
      access: key,
      word: word(key, showing, grantOf(state, key)),
      busy: current === key && busy(state),
      action: current === undefined ? "Settings" : current === key && mayAct && (review || showing !== "Ready")
        ? state.stalled ? "Check" : showing === "Unavailable" ? "Try again" : showing === "CanRequest" ? "Allow" : "Settings"
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
        if (can(event, "Owner")) void send(event, "Owner");
      }}
      onContinue={!review && can(proceed, "Owner") ? () => void send(proceed, "Owner") : undefined}
      onSkip={!review && can(skip, "Owner") ? () => void send(skip, "Owner") : undefined}
      onDone={review ? () => void send({ type: "leave", now: untimed }, "Owner") : undefined}
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
