// spec/telephony/attention.md, "Story: See what is new from Home"; spec/telephony/attention.md, "One unread conversation opens it, several open the list; missed calls lead to Recents, otherwise Voicemail"
import { useCallback } from "react";
import { useMachine } from "../../../gen/telephony__attention.react.ts";
import { initial } from "../../../gen/telephony__attention.ts";
import { HomeAttention } from "../../telephony/attention.vibe";
import type { AppId } from "../app-screen.ts";
import { HomeCardsView } from "./HomeCardsView.tsx";
import { runtime, type TelephonyRuntime } from "./runtime.ts";

export interface HomeCardsProps {
  /** Open an app at a route, as the shell's surfaces do. */
  open: (app: AppId, route?: string) => void;
  /** The runtime the cards run on. */
  runtime?: TelephonyRuntime;
}

/**
 * The cards Home mounts while it is in front on the Alpha image.
 * @model spec/telephony/attention.md
 */
export function HomeCards({ open, runtime: on = runtime }: HomeCardsProps) {
  const { state = initial } = useMachine(on);
  const visit = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const running = on.runFork(HomeAttention.use((a) => a.visit()));
    return () => running.interruptUnsafe();
  }, [on]);
  return (
    <div ref={visit} className="contents">
      <HomeCardsView attention={state} open={open} />
    </div>
  );
}
