// spec/app/update/index.md, "Story: Settings rows"; spec/app/update/index.md, "Story: Allow automatic updates"
import { Alert, ListGroup, ListRow, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import type { Machine as UpdatesMachine } from "../../gen/app__update.effect.vibe";
import { automaticStatus, checkLabel, installLabel, installRowShown, noteText } from "../../gen/app__update.ts";
import { useMachine } from "../../gen/app__update.react.ts";
import { useTimed } from "../runtime/react.ts";
import type { Time } from "../runtime/time.vibe";

export interface UpdateRowsProps {
  /** Provides the resident updates machine. */
  runtime: ManagedRuntime.ManagedRuntime<UpdatesMachine | Time, unknown>;
}

const check = { type: "checkNow" } as const;
const install = { type: "install" } as const;
const allow = { type: "allowAutomatic" } as const;

/**
 * Settings' update rows: what the last check from here found, the update to install, Check for updates and, while
 * Android's permission is missing, the way to Android's setting.
 * @model spec/app/update/index.md
 */
export function UpdateRows({ runtime }: UpdateRowsProps) {
  const { state, can, send } = useTimed(runtime, useMachine);
  if (!state || state.installed === 0) return null;
  const note = noteText(state);
  const status = automaticStatus(state);
  return (
    <ListGroup heading="Updates">
      {note !== "" && <Alert variant={state.note === "CouldNotCheck" ? "warn" : "info"}>{note}</Alert>}
      {installRowShown(state) && (
        <ListRow
          title={installLabel(state)}
          detail={`Version ${state.offer.release.version}`}
          leading={<Download aria-hidden />}
          disabled={!can(install)}
          onClick={() => void send(install)}
          trailing={state.installing && !state.automatic ? <Spinner size="sm" label="Downloading" /> : undefined}
        />
      )}
      <ListRow
        title={checkLabel(state)}
        leading={<RefreshCw aria-hidden />}
        disabled={!can(check)}
        onClick={() => void send(check)}
        trailing={state.check.status === "Loading" && state.asked ? <Spinner size="sm" label="Checking" /> : undefined}
      />
      {status !== "" && <ListRow title="Automatic updates" trailing={status} />}
      {can(allow) && <ListRow title="Allow automatic updates" trailing={<ExternalLink aria-hidden />} onClick={() => void send(allow)} />}
    </ListGroup>
  );
}
