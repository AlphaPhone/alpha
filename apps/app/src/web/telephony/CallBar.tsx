// spec/telephony/callBar.md, "Story: See my live call over every view"; spec/telephony/callBar.md, "An ended call's bar holds its place for a moment and takes no taps"; spec/telephony/callBar.md, "Return and End act only on the call the bar shows, and End is asked once"
import { PhoneOff } from "lucide-react";
import { useEffect } from "react";
import { useMachine } from "../../../gen/telephony__callBar.react.ts";
import { barPhase, barWords, initial, shownCall, type CallBar as CallBarState } from "../../../gen/telephony__callBar.ts";
import { CallWatch } from "../../telephony/call-bar.vibe";
import { CommsStage } from "../../telephony/comms.vibe";
import { Button } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { barWordsText } from "./present.ts";
import { runtime, type TelephonyRuntime } from "./runtime.ts";

export interface CallBarViewProps {
  /** The bar's state. */
  bar: CallBarState;
  /** Bring the call screen to the front. */
  onReturn?: (callId: string) => void;
  /** End or decline the call. */
  onEnd?: (callId: string) => void;
}

/**
 * The ongoing-call bar: what the call screen says, Return to call, and End (Decline while it rings). An ended call's bar holds its place without controls.
 * @model spec/telephony/callBar.md
 * @design design.md
 */
export function CallBarView({ bar, onReturn, onEnd }: CallBarViewProps) {
  const phase = barPhase(bar);
  if (phase === "NoBar") return null;
  const call = shownCall(bar.calls);
  const status = barWordsText(barWords(bar));
  const ended = phase === "EndedBar";
  const ringing = call.phase === "Ringing";
  return (
    <div role="status" aria-live="polite" className="flex h-12 items-center gap-2 border-b border-border bg-card px-4 text-card-foreground">
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", ended ? "bg-muted-foreground" : "bg-ok")} />
      <button
        type="button"
        disabled={ended}
        aria-label={ended ? status : `Return to call, ${status}`}
        onClick={() => onReturn?.(call.id)}
        className={cn(focusRing, "flex-1 rounded-sm text-left font-mono text-sm uppercase tabular-nums")}
      >
        {status}
      </button>
      {!ended && (
        <Button
          variant="destructive"
          size="sm"
          aria-label={ringing ? "Decline" : "End call"}
          disabled={bar.ending === call.id}
          onClick={() => onEnd?.(call.id)}
        >
          <PhoneOff aria-hidden />
        </Button>
      )}
    </div>
  );
}

export interface CallBarSurfaceProps {
  /** The runtime the bar runs on. */
  runtime?: TelephonyRuntime;
}

/**
 * The top surface the shell keeps mounted over every view on the Alpha image.
 * @model spec/telephony/callBar.md
 */
export function CallBarSurface({ runtime: on = runtime }: CallBarSurfaceProps) {
  const { state = initial } = useMachine(on);
  useEffect(() => {
    const watching = on.runFork(CallWatch.use((watch) => watch.watch()));
    const following = on.runFork(CommsStage.use((stage) => stage.follow()));
    const eligible = () => on.runFork(CallWatch.use((watch) => watch.eligible(!document.hidden)));
    const visible = () => {
      eligible();
      if (!document.hidden) on.runFork(CallWatch.use((watch) => watch.refresh()));
    };
    eligible();
    document.addEventListener("visibilitychange", visible);
    return () => {
      document.removeEventListener("visibilitychange", visible);
      watching.interruptUnsafe();
      following.interruptUnsafe();
    };
  }, [on]);
  return (
    <CallBarView
      bar={state}
      onReturn={(callId) => on.runFork(CallWatch.use((watch) => watch.returnToCall(callId)))}
      onEnd={(callId) => on.runFork(CallWatch.use((watch) => watch.end(callId)))}
    />
  );
}
