// spec/app/startup/access.md, "Story: Look at access again"
import { StartupAccessPanel, type StartupAccessRowState } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine } from "../../gen/app__startup__access.effect.vibe";
import { useMachine } from "../../gen/app__startup__access.react.ts";
import { busy, flow, grantOf, offered } from "../../gen/app__startup__access.ts";
import { word, type Key } from "../../gen/app__startup__steps.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";

const ordered: readonly Key[] = ["Notifications", "Microphone", "Camera", "Location", "Calendar", "Photos", "Files"];

/** The Startup access panel opened by Settings, in review mode. */
export function AccessReview({ runtime }: { runtime: ManagedRuntime.ManagedRuntime<Machine | Time, unknown> }) {
  const { state, can, send } = useTimed(runtime, useMachine);
  if (!state || state.look === "NotLooking") return null;
  const current = state.look === "AtOne" ? state.target : undefined;
  const act = { type: "act", now: untimed } as const;
  const mayAct = can(act, "Owner");
  const rows: StartupAccessRowState[] = ordered.filter((key) => offered(state, key)).map((key) => {
    const showing = flow(state, key);
    return {
      access: key,
      word: word(key, showing, grantOf(state, key)),
      busy: current === key && busy(state),
      action: current === undefined ? "Settings" : current === key && mayAct
        ? state.stalled ? "Check" : showing === "Unavailable" ? "Try again" : "Settings"
        : undefined,
    };
  });
  return (
    <StartupAccessPanel
      review
      current={current}
      rows={rows}
      notice={state.notice === "Quiet" ? undefined : state.notice}
      onAct={(key) => {
        const event = current === undefined ? { type: "review", key, now: untimed } as const : act;
        if (can(event, "Owner")) void send(event, "Owner");
      }}
      onDone={() => void send({ type: "leave", now: untimed }, "Owner")}
    />
  );
}
