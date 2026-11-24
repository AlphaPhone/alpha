// spec/app/settings/licences.md, "Story: Read the licences"; spec/app/settings/developer.md, "Story: Read the problem log"
import { Alert, Button, ListGroup, ListRow, SearchField, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import * as DeveloperGen from "../../gen/app__settings__developer.ts";
import { useMachine as useDeveloper } from "../../gen/app__settings__developer.react.ts";
import type { Machine as DeveloperMachine } from "../../gen/app__settings__developer.effect.vibe";
import { useMachine as useLicences } from "../../gen/app__settings__licences.react.ts";
import type { Machine as LicencesMachine } from "../../gen/app__settings__licences.effect.vibe";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";
import { type Notice, Notices } from "./about.vibe";

export interface AboutProps {
  runtime: ManagedRuntime.ManagedRuntime<LicencesMachine | DeveloperMachine | Notices | Time, unknown>;
}

/** Alpha's own names for the flags the notices carry; a flag it has no name for is shown as written. */
const flags: Record<string, string> = {
  copyleft: "Copyleft", "network-copyleft": "Network copyleft", "weak-copyleft": "Weak copyleft", "share-alike": "Share-alike data",
  unknown: "Unknown license", "no-license-file": "No license file in package", unverified: "License unverified", "permissive-new": "Permissive, newly listed",
  "not-open-source": "Not open-source terms", "proprietary-owned": "Proprietary, license held by owner", proprietary: "Proprietary, no license recorded",
};

const matches = (notice: Notice, query: string) => `${notice.name} ${notice.license}`.toLowerCase().includes(query.trim().toLowerCase());

/** The licences, searched; one opens from the list the search shows, and Back returns to the same search. */
export function Licences({ runtime }: AboutProps) {
  const { state, send, can } = useTimed(runtime, useLicences);
  if (!state) return null;
  const notices = runtime.runSync(Notices.use((held) => held.get()));
  const shown = notices.filter((notice) => matches(notice, state.query));
  const open = state.licence >= 0 ? shown[state.licence] : undefined;
  if (open !== undefined) {
    return (
      <article aria-label={open.name} className="flex flex-col gap-3">
        <Button variant="ghost" onClick={() => void send({ type: "closeLicence" })}>Back to licences</Button>
        <ListGroup>
          <ListRow title={open.name} detail={`${open.version} · ${open.license}`} />
          {(open.flags ?? []).map((flag) => <ListRow key={flag} title={flags[flag] ?? flag} />)}
        </ListGroup>
        <pre className="text-sm whitespace-pre-wrap">{open.text}</pre>
      </article>
    );
  }
  const status = state.load.read.status;
  return (
    <>
      {status === "Loading" && <Spinner label="Loading licences" />}
      {status === "Failed" && <Alert variant="warn">The licences couldn't load</Alert>}
      {status === "Loaded" && state.found === 0 && <Alert>No licences were found</Alert>}
      {status === "Loaded" && state.found > 0 && (
        <>
          <SearchField aria-label="Search licences" value={state.query} onValueChange={(query) => {
            const search = { type: "search", query, shown: notices.filter((notice) => matches(notice, query)).length } as const;
            if (can(search)) void send(search);
          }} />
          <p aria-live="polite" className="px-4 text-sm text-muted-foreground">{`${state.shown} of ${state.found}`}</p>
          <ListGroup>
            {shown.map((notice, licence) => (
              <ListRow key={`${notice.name}@${notice.version}`} title={notice.name} detail={notice.license} onClick={() => void send({ type: "openLicence", licence })} />
            ))}
          </ListGroup>
        </>
      )}
    </>
  );
}

const logWords: Record<DeveloperGen.LogWord, string> = { LogWaiting: "Reading", NoProblems: "No problems", SomeProblems: "Problems recorded", LogUnavailable: "Unavailable" };
const stores: Record<DeveloperGen.Store, string> = { DevicePreferences: "Device preferences", DeviceRoles: "Device roles", NotificationData: "Notification data", AlertSounds: "Alert sounds" };

/** The Problem log: what it holds, Retry when it could not be read, Clear and Export, and each store to recover. */
export function Problems({ runtime }: AboutProps) {
  const { state, can, send } = useTimed(runtime, useDeveloper);
  if (!state) return null;
  const word = DeveloperGen.logWord(state);
  const clear = { type: "clearLog", at: untimed } as const;
  const retry = { type: "openLog", at: untimed } as const;
  const exportIt = { type: "startExport", at: untimed } as const;
  return (
    <>
      <ListGroup>
        <ListRow title="Problems" trailing={word === "LogWaiting" ? <Spinner size="sm" label="Reading" /> : word === "SomeProblems" ? String(state.problems) : logWords[word]} />
        {state.needs.map((store) => {
          const recover = { type: "recoverStore", store } as const;
          return can(recover) && <ListRow key={store} title={`Recover ${stores[store]}`} onClick={() => void send(recover)} />;
        })}
      </ListGroup>
      <div className="flex flex-wrap gap-2 px-4">
        {word === "LogUnavailable" && can(retry) && <Button variant="outline" onClick={() => void send(retry)}>Retry</Button>}
        {can(clear) && <Button variant="outline" onClick={() => void send(clear)}>Clear</Button>}
        <Button variant="outline" loading={state.exporting.read.status === "Loading"} disabled={!can(exportIt)} onClick={() => void send(exportIt)}>Export diagnostics</Button>
      </div>
      {state.exporting.read.status === "Failed" && <Alert variant="warn">The diagnostics couldn't be shared</Alert>}
    </>
  );
}
