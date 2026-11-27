// spec/app/settings/facts.md, "Story: Manage my saved passwords"
import { Banner, Button, ConfirmDialog, ListGroup, ListRow, Menu, MenuContent, MenuItem, MenuTrigger, SearchField } from "@repo/ui";
import { ChevronRight, Clipboard, Ellipsis, Eye, Globe, LockKeyhole, Trash2, UnlockKeyhole } from "lucide-react";
import { useMemo } from "react";
import { useMachine as useFacts } from "../../gen/app__settings__facts.react.ts";
import { useTimed } from "../runtime/ui.tsx";
import { untimed } from "../runtime/index.vibe";
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
  const remove = vault.remove;
  const removal = remove.tag === "VaultSelected" ? rows.find(({ id, revision }) => id === remove.id && revision === remove.revision) : undefined;
  const cancel = { type: "cancelVaultRemoval" } as const;

  return (
    <>
      <ListGroup>
        {can(unlock) ? <ListRow title="Unlock" leading={<UnlockKeyhole />} onClick={() => void send(unlock)} /> : null}
        {can(lock) ? <ListRow title="Lock" leading={<LockKeyhole />} onClick={() => void send(lock)} /> : null}
        {vault.phase === "VaultNeedsLock" ? <ListRow className="min-h-16.25" title="Saved passwords" detail="Needs screen lock" /> : null}
        {vault.phase === "VaultUnavailable" ? <ListRow className="min-h-16.25" title="Saved passwords" detail="Saved passwords are unavailable." /> : null}
        {vault.phase === "VaultAway" || vault.phase === "VaultChecking" ? <ListRow className="min-h-16.25" title="Saved passwords" detail="Checking…" /> : null}
        {vault.phase === "VaultUnlocking" ? <ListRow title="Unlocking…" leading={<LockKeyhole />} /> : null}
        {vault.phase === "VaultLocking" ? <ListRow title="Locking…" leading={<LockKeyhole />} /> : null}
        {vault.phase === "VaultEditing" ? <ListRow title="Password editor" /> : null}
      </ListGroup>
      {vault.notice === "VaultFailed" ? <Banner variant="warn">Could not confirm the password vault</Banner> : null}
      {ready && vault.notice === "VaultChanged" && <Banner variant="info">Password saved</Banner>}
      {ready && vault.notice === "VaultCopied" && <Banner variant="info">Password copied</Banner>}
      {ready && vault.notice === "VaultRemoved" && <Banner variant="info">Password deleted</Banner>}
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
              const reveal = { type: "vaultRowAction", choice: "RevealPassword", id, revision, now: untimed } as const;
              const copy = { ...reveal, choice: "CopyPassword" } as const;
              const remove = { type: "reviewVaultRemoval", id, revision, now: untimed } as const;
              return (
                <div key={id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center">
                  <ListRow title={label} detail={username} leading={<Globe />} trailing={<ChevronRight />} disabled={!can(edit)} onClick={() => void send(edit)} />
                  <Menu>
                    <MenuTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label={`Options for ${label}`}><Ellipsis aria-hidden /></Button>
                    </MenuTrigger>
                    <MenuContent align="end">
                      <MenuItem disabled={!can(reveal)} onSelect={() => void send(reveal)}><Eye aria-hidden />Reveal password</MenuItem>
                      <MenuItem disabled={!can(copy)} onSelect={() => void send(copy)}><Clipboard aria-hidden />Copy password</MenuItem>
                      <MenuItem disabled={!can(remove)} onSelect={() => void send(remove)}><Trash2 aria-hidden />Delete password</MenuItem>
                    </MenuContent>
                  </Menu>
                </div>
              );
            }) : <ListRow title={rows.length ? "No matching passwords" : "No saved passwords"} />}
          </ListGroup>
        </>
      ) : null}
      {removal && <ConfirmDialog open title={`Delete password for “${removal.label}”?`} destructive confirmLabel="Delete"
        onCancel={() => { if (can(cancel)) void send(cancel); }}
        onConfirm={() => {
          const confirm = { type: "confirmVaultRemoval", id: removal.id, revision: removal.revision, now: untimed } as const;
          if (can(confirm)) void send(confirm);
        }} />}
    </>
  );
}
