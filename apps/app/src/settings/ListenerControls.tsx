// spec/app/voice/listener.md, "Story: See and control the listener"
import { Banner, ListGroup, ListRow, SettingsAndroidRow, SettingsSwitchRow, Spinner } from "@repo/ui";
import { Ear, ExternalLink, MicOff, Pause } from "lucide-react";
import { shown, type Shown } from "../../gen/app__voice__listener.ts";
import { useMachine } from "../../gen/app__voice__listener.react.ts";
import type { Common, SettingsRuntime } from "./Settings.tsx";

const status: Readonly<Partial<Record<Shown, string>>> = {
  Unknown: "Checking…",
  Unavailable: "Unavailable",
  Listening: "Listening",
  IndicatorLost: "Stopped because the microphone indicator wasn’t shown",
  MayBeOn: "Microphone may be on",
};

/** Privacy shows the installed listener's status and leaves all start or resume decisions to its consent screen. */
export function ListenerControls({ runtime, common }: { runtime: SettingsRuntime; common: Common }) {
  const { state, can, send } = useMachine(runtime);
  if (!state || (!state.image && !state.mayBeOn)) return null;
  const position = shown(state);
  const stop = { type: "turnOff" } as const;
  const pause = { type: "pause" } as const;
  const consent = { type: "openConsent" } as const;
  const acknowledge = { type: "acknowledge" } as const;
  const saving = state.acting !== "NoAct";
  const opening = state.consentScreen.status === "Loading";
  const detail = state.mayBeOn ? "Stop could not be confirmed" : status[position] ?? state.report.reason;
  const choose = state.report.on ? stop : consent;
  return (
    <ListGroup>
      {position === "MayBeOn" ? <SettingsAndroidRow {...common} target="android-home" title="Microphone may be on" icon={<MicOff />} /> : null}
      {state.known && !state.mayBeOn ? (
        <SettingsSwitchRow title="Listening" detail={detail} icon={<Ear />} checked={state.report.on}
          saving={saving} onCheckedChange={can(choose) ? () => void send(choose) : undefined} />
      ) : <ListRow title="Listening" detail={detail} leading={<Ear />} />}
      {can(pause) ? <ListRow title="Pause" aria-label="Pause listening" leading={<Pause />} onClick={() => void send(pause)} /> : null}
      {can(stop) && state.mayBeOn ? <ListRow title="Turn off listening" onClick={() => void send(stop)} /> : null}
      {position === "IndicatorLost" && can(acknowledge) ? <ListRow title="Dismiss indicator warning" onClick={() => void send(acknowledge)} /> : null}
      {state.image ? <ListRow title="Listening settings" disabled={!can(consent)} onClick={() => void send(consent)}
        trailing={opening ? <Spinner size="sm" label="Opening" /> : <ExternalLink aria-hidden className="size-4" />} /> : null}
      {state.consentScreen.status === "Failed" ? <Banner variant="warn">Listening settings are unavailable</Banner> : null}
    </ListGroup>
  );
}
