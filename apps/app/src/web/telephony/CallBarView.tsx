// spec/telephony/callBar.md, "While a call rings, Android's incoming alert is the only call bar"; spec/telephony/callBar.md, "The bar says Calling until the call is active, and only an active call counts a clock from its connect time"; spec/telephony/callBar.md, "An ended call's bar holds its place for a moment and takes no taps"; spec/telephony/callBar.md, "Return and End act only on the call the bar shows, and End is asked once"
import { PhoneOff } from "lucide-react";
import { barDrawn, barWords, shownCall, type CallBar as CallBarState } from "../../../gen/telephony__callBar.ts";
import { Button } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { barWordsText } from "./present.ts";

export interface CallBarViewProps {
  /** The bar's state. */
  bar: CallBarState;
  /** Bring the call screen to the front. */
  onReturn?: (callId: string) => void;
  /** End the call. */
  onEnd?: (callId: string) => void;
}

/**
 * The ongoing-call bar: what the call screen says, Return to call, and End. It draws nothing while a call rings: Android's incoming alert answers or declines it. An ended call's bar holds its place without controls.
 * @model spec/telephony/callBar.md
 * @design design.md
 */
export function CallBarView({ bar, onReturn, onEnd }: CallBarViewProps) {
  const phase = barDrawn(bar);
  if (phase === "NoBar") return null;
  const call = shownCall(bar.calls);
  const status = barWordsText(barWords(bar));
  const ended = phase === "EndedBar";
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
          aria-label="End call"
          disabled={bar.ending === call.id}
          onClick={() => onEnd?.(call.id)}
        >
          <PhoneOff aria-hidden />
        </Button>
      )}
    </div>
  );
}
