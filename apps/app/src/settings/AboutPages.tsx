// spec/app/settings/licences.md, "Story: Read the licences"; spec/app/settings/developer.md, "Story: Read the problem log"
import { ConfirmDialog, SettingsLicenceDetail, SettingsLicencesPage, SettingsProblemLogPage, type SettingsProblemLogPageProps } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { useState } from "react";
import * as DeveloperGen from "../../gen/app__settings__developer.ts";
import { useMachine as useDeveloper } from "../../gen/app__settings__developer.react.ts";
import type { Machine as DeveloperMachine } from "../../gen/app__settings__developer.effect.vibe";
import { useMachine as useLicences } from "../../gen/app__settings__licences.react.ts";
import type { Machine as LicencesMachine } from "../../gen/app__settings__licences.effect.vibe";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";
import { type Notice, Notices } from "./about.vibe";
import type { Common } from "./Settings.tsx";

export interface AboutProps {
  readonly runtime: ManagedRuntime.ManagedRuntime<LicencesMachine | DeveloperMachine | Notices | Time, unknown>;
  readonly common: Common;
}

/** Alpha's own names for the flags the notices carry; a flag it has no name for is shown as written. */
const flags: Record<string, string> = {
  copyleft: "Copyleft", "network-copyleft": "Network copyleft", "weak-copyleft": "Weak copyleft", "share-alike": "Share-alike data",
  unknown: "Unknown license", "no-license-file": "No license file in package", unverified: "License unverified", "permissive-new": "Permissive, newly listed",
  "not-open-source": "Not open-source terms", "proprietary-owned": "Proprietary, license held by owner", proprietary: "Proprietary, no license recorded",
};

const matches = (notice: Notice, query: string) => `${notice.name} ${notice.license}`.toLowerCase().includes(query.trim().toLowerCase());

/** The licences, searched; one opens from the list the search shows, and Back returns to the same search. */
export function Licences({ runtime, common }: AboutProps) {
  const { state, send, can } = useTimed(runtime, useLicences);
  if (!state) return null;
  const notices = runtime.runSync(Notices.use((held) => held.get()));
  const shown = notices.filter((notice) => matches(notice, state.query));
  const open = state.licence >= 0 ? shown[state.licence] : undefined;
  if (open !== undefined) {
    return (
      <SettingsLicenceDetail
        name={open.name}
        licence={`${open.license} · ${open.version}`}
        flags={(open.flags ?? []).map((flag) => flags[flag] ?? flag)}
        text={open.text}
        onBack={() => void send({ type: "closeLicence" })}
      />
    );
  }
  const status = state.load.read.status;
  return (
    <SettingsLicencesPage
      onBack={common.onBack}
      load={status === "Loaded" ? "loaded" : status === "Failed" ? "failed" : "loading"}
      found={state.found}
      query={state.query}
      licences={shown.map((notice) => ({ name: notice.name, licence: notice.license }))}
      onQuery={(query) => {
        const search = { type: "search", query, shown: notices.filter((notice) => matches(notice, query)).length } as const;
        if (can(search)) void send(search);
      }}
      onOpen={(licence) => void send({ type: "openLicence", licence })}
    />
  );
}

const logWords: Record<DeveloperGen.LogWord, SettingsProblemLogPageProps["log"]> = { LogWaiting: "waiting", NoProblems: "none", SomeProblems: "some", LogUnavailable: "unavailable" };
const stores: Record<DeveloperGen.Store, SettingsProblemLogPageProps["needs"][number]> = {
  DevicePreferences: "device-preferences", DeviceRoles: "device-roles", NotificationData: "notification-data", AlertSounds: "alert-sounds",
};
const storesNamed = Object.fromEntries(Object.entries(stores).map(([store, name]) => [name, store])) as Record<SettingsProblemLogPageProps["needs"][number], DeveloperGen.Store>;

// spec/app/settings/developer.md, "Clear is offered only for a log with problems, one at a time; once the startup area answers, the log is read again"; spec/app/settings/developer.md, "Saved data that cannot be read is listed, and each such store is handed to its owner to recover"
/** The Problem log: what it holds, Retry when it could not be read, Clear and Export, and each store to recover. */
export function Problems({ runtime, common }: AboutProps) {
  const { state, can, send } = useTimed(runtime, useDeveloper);
  const [asking, setAsking] = useState(false);
  if (!state) return null;
  const clear = { type: "clearLog", at: untimed } as const;
  const retry = { type: "openLog", at: untimed } as const;
  const startExport = { type: "startExport", at: untimed } as const;
  const word = logWords[DeveloperGen.logWord(state)];
  return (
    <>
    <ConfirmDialog
      open={asking && can(clear)}
      title="Clear the problem log?"
      confirmLabel="Clear"
      destructive
      onConfirm={() => {
        setAsking(false);
        if (can(clear)) void send(clear);
      }}
      onCancel={() => setAsking(false)}
    >
      The problems Alpha recorded are deleted from this phone.
    </ConfirmDialog>
    <SettingsProblemLogPage
      onBack={common.onBack}
      log={word}
      problems={state.problems}
      needs={state.needs.map((store) => stores[store])}
      clearing={state.clearing.read.status === "Loading"}
      exporting={state.exporting.read.status === "Loading"}
      onRetry={word === "unavailable" && can(retry) ? () => void send(retry) : undefined}
      onClear={can(clear) ? () => setAsking(true) : undefined}
      onExport={can(startExport) ? () => void send(startExport) : undefined}
      onRecover={(store) => {
        const recover = { type: "recoverStore", store: storesNamed[store] } as const;
        if (can(recover)) void send(recover);
      }}
    />
    </>
  );
}
