// spec/app/update/index.md, "Story: Settings rows"; spec/app/update/index.md, "Story: Allow automatic updates"; spec/app/update/index.md, "A version name is shown only when it has 1 to 64 characters, and notes only when they have at most 500"
import { Alert, ListGroup, ListRow, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import type { Machine as UpdatesMachine } from "../../gen/app__update.effect.vibe";
import {
  automaticStatus, checkLabel, checking, downloading, installLabel, installRowShown, noteIsTrouble, noteText, offerName, offerNotes,
} from "../../gen/app__update.ts";
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
 * Settings' update rows: what the last check or install from here came to, the update offered with its version name
 * and notes, Install update and Check for updates where they can be pressed, and, while Android's permission is
 * missing, the way to Android's setting.
 * @model spec/app/update/index.md
 */
export function UpdateRows({ runtime }: UpdateRowsProps) {
  const { state, can, send } = useTimed(runtime, useMachine);
  if (!state || state.installed === 0) return null;
  const note = noteText(state);
  const status = automaticStatus(state);
  const name = offerName(state);
  const notes = offerNotes(state);
  const version = state.offer.release.version;
  return (
    <ListGroup heading="Updates">
      {note !== "" && <Alert variant={noteIsTrouble(state) ? "warn" : "info"}>{note}</Alert>}
      {installRowShown(state) && (
        <ListRow
          title={installLabel(state)}
          detail={name === "" ? `Version ${version}` : `Version ${name} (${version})`}
          leading={<Download aria-hidden />}
          {...(can(install) ? { onClick: () => void send(install) } : {})}
          trailing={downloading(state) ? <Spinner size="sm" label="Downloading" /> : undefined}
        />
      )}
      {installRowShown(state) && notes !== "" && <p className="px-4 pb-2 text-sm whitespace-pre-line text-muted-foreground">{notes}</p>}
      <ListRow
        title={checkLabel(state)}
        leading={<RefreshCw aria-hidden />}
        {...(can(check) ? { onClick: () => void send(check) } : {})}
        trailing={checking(state) ? <Spinner size="sm" label="Checking" /> : undefined}
      />
      {status !== "" && <ListRow title="Automatic updates" trailing={status} />}
      {can(allow) && <ListRow title="Allow automatic updates" trailing={<ExternalLink aria-hidden />} onClick={() => void send(allow)} />}
    </ListGroup>
  );
}
