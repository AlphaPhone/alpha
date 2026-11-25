// spec/app/voice/listener.md, "Story: See and control the listener"
import { ListGroup, ListRow, SettingsNavRow, SettingsSwitchRow } from "@repo/ui";
import { Ear, ExternalLink } from "lucide-react";
import { useEffect } from "react";
import { type Event, type Shown, shown } from "../../gen/app__voice__listener.ts";
import type { Machine } from "../../gen/app__voice__listener.effect.vibe";
import { useMachine } from "../../gen/app__voice__listener.react.ts";
import { area, type Resident, type Shown as AreaShown } from "../runtime/area.tsx";
import { listener, openListenerSettings, refreshListener } from "./listener.vibe";

const words: Record<Shown, string> = {
  Unavailable: "Unavailable",
  Unknown: "Status unavailable",
  Off: "Off",
  Listening: "Listening",
  Waiting: "Waiting",
  Paused: "Paused",
  IndicatorLost: "Stopped because the microphone indicator was lost",
  MayBeOn: "The microphone may be on",
};

function ListenerSettings({ runtime }: AreaShown<Machine | Resident>) {
  const { state, can, send } = useMachine(runtime);
  const image = state?.image === true;
  useEffect(() => {
    if (image) void runtime.runPromiseExit(refreshListener());
  }, [image, runtime]);
  if (!state || !image) return null;

  const status = shown(state);
  const detail = state.reads.status === "Failed" && status !== "MayBeOn" && status !== "IndicatorLost"
    ? words.Unknown : words[status];
  const open = () => void runtime.runPromiseExit(openListenerSettings());
  const offer = (event: Event) => { if (can(event)) void send(event); };
  const pause = { type: "pause" } as const;
  const turnOff = { type: "turnOff" } as const;
  const acknowledge = { type: "acknowledge" } as const;
  const changeListening = state.report.on ? (can(turnOff) ? () => offer(turnOff) : undefined) : open;
  return (
    <ListGroup>
      {state.known && (
        <SettingsSwitchRow title="Listening" detail={detail} icon={<Ear />} checked={state.report.on}
          reading={state.reads.status === "Loading"} saving={state.acting !== "NoAct"} onCheckedChange={changeListening} />
      )}
      {!state.known && <p role="status" className="px-4 py-2 text-sm text-muted-foreground">
        {state.reads.status === "Loading" ? "Checking listener status…" : words[status]}
      </p>}
      {can(pause) && state.report.mic && <ListRow title="Pause listening" onClick={() => offer(pause)} />}
      {can(acknowledge) && <ListRow title="Dismiss microphone indicator notice" onClick={() => offer(acknowledge)} />}
      <SettingsNavRow title="Listening settings" icon={<ExternalLink />} onOpen={open} />
    </ListGroup>
  );
}

export default area(listener, ListenerSettings);
