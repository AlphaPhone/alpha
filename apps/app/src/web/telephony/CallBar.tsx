// spec/telephony/callBar.md, "Story: See my live call over every view"; spec/telephony/callBar.md, "An ended call's bar holds its place for a moment and takes no taps"; spec/telephony/callBar.md, "Return and End act only on the call the bar shows, and End is asked once"
import { useCallback } from "react";
import { useMachine } from "../../../gen/telephony__callBar.react.ts";
import { initial } from "../../../gen/telephony__callBar.ts";
import { CallWatch } from "../../telephony/call-bar.vibe";
import { CommsStage } from "../../telephony/comms.vibe";
import { CallBarView } from "./CallBarView.tsx";
import { runtime, type TelephonyRuntime } from "./runtime.ts";

export interface CallBarProps {
  /** The runtime the bar runs on. */
  runtime?: TelephonyRuntime;
}

/**
 * The top surface the shell keeps mounted over every view on the Alpha image.
 * @model spec/telephony/callBar.md
 */
export function CallBar({ runtime: on = runtime }: CallBarProps) {
  const { state = initial } = useMachine(on);
  const watch = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const watching = on.runFork(CallWatch.use((w) => w.watch()));
    const following = on.runFork(CommsStage.use((stage) => stage.follow()));
    return () => {
      watching.interruptUnsafe();
      following.interruptUnsafe();
    };
  }, [on]);
  return (
    <div ref={watch} className="contents">
      <CallBarView
        bar={state}
        onReturn={(callId) => on.runFork(CallWatch.use((w) => w.returnToCall(callId)))}
        onEnd={(callId) => on.runFork(CallWatch.use((w) => w.end(callId)))}
      />
    </div>
  );
}
