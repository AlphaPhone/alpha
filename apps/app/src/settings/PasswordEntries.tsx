// spec/app/settings/facts.md, "Story: Manage my saved passwords"
import { Banner, Button, ListGroup, ListRow, SearchField } from "@repo/ui";
import { ChevronRight, Globe, LockKeyhole, UnlockKeyhole } from "lucide-react";
import { useMemo } from "react";
import { useMachine as useFacts } from "../../gen/app__settings__facts.react.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { SettingsRuntime } from "./Settings.tsx";

const empty = [] as const;

/** The unlocked visit's metadata and the controls that hand an exact entry to Android. @model spec/app/settings/facts.md */
export function PasswordEntries({ runtime }: { runtime: SettingsRuntime }) {
  const { state, can, send } = useTimed(runtime, useFacts);
  const vault = state?.vault;
  const rows = vault?.rows ?? empty;
  const query = vault?.query ?? "";
  const shown = useMemo(() => {
    const asked = query.trim().toLowerCase();
    const sorted = [...rows].sort((left, right) => left.label.localeCompare(right.label) || left.username.localeCompare(right.username));
    return !asked ? sorted : sorted.filter(({ label, username, terms }) =>
      [label, username, ...terms].some((one) => one.toLowerCase().includes(asked)));
  }, [rows, query]);

  if (!vault) return null;
  const unlock = { type: "vaultUnlock" } as const;
  const lock = { type: "vaultLock" } as const;
  const create = { type: "vaultCreate", now: untimed } as const;
  const ready = can(create);

  return (
    <>
      <ListGroup heading="Saved passwords">
        {can(unlock) ? <ListRow title="Unlock" leading={<UnlockKeyhole />} onClick={() => void send(unlock)} /> : null}
        {can(lock) ? <ListRow title="Lock" leading={<LockKeyhole />} onClick={() => void send(lock)} /> : null}
        {vault.phase === "VaultNeedsLock" ? <ListRow title="Needs screen lock" /> : null}
        {vault.phase === "VaultUnavailable" ? <ListRow title="Unavailable" /> : null}
        {vault.phase === "VaultAway" || vault.phase === "VaultChecking" ? <ListRow title="Checking…" /> : null}
        {vault.phase === "VaultUnlocking" ? <ListRow title="Unlocking…" leading={<LockKeyhole />} /> : null}
        {vault.phase === "VaultLocking" ? <ListRow title="Locking…" leading={<LockKeyhole />} /> : null}
        {vault.phase === "VaultEditing" ? <ListRow title="Password editor" /> : null}
      </ListGroup>
      {vault.notice === "VaultFailed" ? <Banner variant="warn">Could not confirm the password vault</Banner> : null}
      {vault.notice === "VaultChanged" && ready ? <Banner variant="info">Password saved</Banner> : null}
      {ready ? (
        <>
          <div className="flex items-center gap-2">
            <SearchField aria-label="Search passwords" placeholder="Search passwords" className="min-w-0 flex-1" value={query}
              onValueChange={(value) => {
                const search = { type: "vaultSearch", query: value } as const;
                if (can(search)) void send(search);
              }}
            />
            <Button onClick={() => void send(create)}>Add password</Button>
          </div>
          <ListGroup>
            {shown.length ? shown.map(({ id, revision, label, username }) => {
              const edit = { type: "vaultEdit", id, revision, now: untimed } as const;
              return <ListRow key={id} title={label} detail={username} leading={<Globe />} trailing={<ChevronRight />} disabled={!can(edit)} onClick={() => void send(edit)} />;
            }) : <ListRow title={rows.length ? "No matching passwords" : "No saved passwords"} />}
          </ListGroup>
        </>
      ) : null}
    </>
  );
}
