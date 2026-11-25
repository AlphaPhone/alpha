// spec/app/update/index.md, "Story: Settings rows"; spec/app/update/index.md, "Story: Allow automatic updates"; spec/app/update/index.md, "A version name is shown only when it has 1 to 64 characters, and notes only when they have at most 500"
import { ListGroup, ListRow, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { ChevronRight, Download, RefreshCw, Shield } from "lucide-react";
import type { Machine as UpdatesMachine } from "../../gen/app__update.effect.vibe";
import {
  automaticStatus, checkLabel, checking, downloading, installLabel, installRowShown, noteText, offerName, offerNotes,
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
    <ListGroup aria-label="Updates">
      {status !== "" && <ListRow title="Automatic updates" trailing={status} />}
      {can(allow) && <ListRow title="Allow automatic updates" leading={<Shield aria-hidden />} trailing={<ChevronRight aria-hidden className="size-4" />} onClick={() => void send(allow)} />}
      {installRowShown(state) && (
        <ListRow
          title={installLabel(state)}
          leading={<Download aria-hidden />}
          className="[&>span:last-child]:min-w-0 [&>span:last-child]:max-w-1/2"
          {...(can(install) ? { onClick: () => void send(install), "aria-label": installLabel(state) } : {})}
          trailing={<><span className="wrap-anywhere text-right">{name === "" ? version : `Version ${name} (${version})`}</span>{downloading(state) && <Spinner size="sm" label="Downloading" />}</>}
        />
      )}
      {installRowShown(state) && notes !== "" && <p className="px-4 pb-2 text-sm whitespace-pre-line text-muted-foreground">{notes}</p>}
      <ListRow
        title={checkLabel(state)}
        leading={<RefreshCw aria-hidden />}
        {...(can(check) ? { onClick: () => void send(check) } : {})}
        trailing={checking(state) ? <Spinner size="sm" label="Checking" /> : <ChevronRight aria-hidden className="size-4" />}
      />
      {note !== "" && <ListRow title="Update check" trailing={<span role="status" className="max-w-44 text-right">{note}</span>} />}
    </ListGroup>
  );
}
