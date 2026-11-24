// spec/telephony/callBar.md, "Story: See my live call over every view"; spec/telephony/callBar.md, "An ended call's bar holds its place for a moment and takes no taps"; spec/telephony/callBar.md, "Return and End act only on the call the bar shows, and End is asked once"
import { useCallback } from "react";
import { useMachine } from "../../../gen/telephony__callBar.react.ts";
import { initial } from "../../../gen/telephony__callBar.ts";
import { CallWatch } from "../../telephony/call-bar.vibe";
import { CommsStage } from "../../telephony/comms.vibe";
import { CallBarView } from "./CallBarView.tsx";
import { act, start } from "../shell/services.ts";
import { runtime } from "./runtime.ts";

/** The call bar takes nothing from the shell: it reads the app's runtime. */
export type CallBarProps = Record<string, never>;

/**
 * The top surface the shell keeps mounted over every view on the Alpha image.
 * @model spec/telephony/callBar.md
 */
export function CallBar(_props: CallBarProps) {
  const { state = initial } = useMachine(runtime);
  const watch = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const watching = start(CallWatch.use((w) => w.watch()));
    const following = start(CommsStage.use((stage) => stage.follow()));
    return () => {
      watching();
      following();
    };
  }, []);
  return (
    <div ref={watch} className="contents">
      <CallBarView
        bar={state}
        onReturn={(callId) => act(CallWatch.use((w) => w.returnToCall(callId)))}
        onEnd={(callId) => act(CallWatch.use((w) => w.end(callId)))}
      />
    </div>
  );
}
