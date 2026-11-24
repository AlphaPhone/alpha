// spec/settings/passwords.md, "Story: Use my saved passwords only after Android unlocks them"; spec/settings/passwords.md, "Story: Delete or reset only on purpose"; spec/settings/passwords.md, "Story: Fill passwords with Alpha"
import { ArrowLeft, Copy, Eye, Fingerprint, Globe, KeyRound, Lock, Pencil, Plus, RotateCw, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Task, Vault } from "../../../gen/settings__passwords.ts";
import { Button, EmptyState, Input, ScrollArea } from "../components/ui/index.ts";
import { Section, SettingRow } from "./Rows.tsx";

const UNAVAILABLE: Record<string, string> = {
  NoScreenLock: "Needs screen lock", Unsupported: "Unavailable", NotAdmitted: "Not available here", DeviceLocked: "Unlock the phone first",
  LegacyAuthorization: "Unlock to finish moving saved passwords", LegacyKey: "Saved passwords can’t be opened", BridgeMissing: "Unavailable",
};
const AUTOFILL: Record<string, string> = { AutofillThisApp: "Alpha", AutofillOther: "Other", AutofillNone: "None", AutofillUnread: "—", AutofillUnsupported: "Unavailable" };

/** What the owner can do in the vault page; every secret stays in Android's screens. */
export interface VaultActs {
  readonly run: (task: Task, id: string) => void;
  readonly edit: (id: string) => void;
  readonly askRemove: (id: string) => void;
  readonly askReset: () => void;
  /** Show one listed entry's metadata. */
  readonly openEntry: (id: string) => void;
  /** Return from an entry to the list. */
  readonly closeEntry: () => void;
  readonly refresh: () => void;
}

/** The vault as the page holds it, what the owner can do, and leaving the page. */
export interface PasswordsScreenProps { readonly vault: Vault; readonly acts: VaultActs; readonly onClose: () => void }

/**
 * Alpha's password vault: metadata while unlocked, everything else native.
 * @model spec/settings/passwords.md
 * @design design.md
 */
export function PasswordsScreen({ vault, acts, onClose }: PasswordsScreenProps) {
  const [query, setQuery] = useState("");
  const busy = (task: Task) => vault.task === task;
  const phase = vault.phase;
  const needle = query.trim().toLowerCase();
  const shown = [...vault.entries].sort((a, b) => a.label.localeCompare(b.label) || a.username.localeCompare(b.username))
    .filter((e) => !needle || [e.label, e.username, ...e.sites].some((v) => v.toLowerCase().includes(needle)));
  const entry = vault.selected === "" ? undefined : vault.entries.find((e) => e.id === vault.selected);
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-2 py-3">
        <Button variant="ghost" size="icon" aria-label={entry ? "Back to passwords" : "Close Passwords"} onClick={() => (entry ? acts.closeEntry() : onClose())}><ArrowLeft aria-hidden className="size-5" /></Button>
        <h1 className="font-serif text-2xl">{entry ? entry.label : "Passwords"}</h1>
      </header>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-6 px-3 pb-8">
          {phase.tag === "Checking" && <EmptyState title="Checking" icon={<KeyRound aria-hidden />} />}
          {phase.tag === "VaultUnavailable" && <EmptyState title={UNAVAILABLE[phase.reason]} icon={<Lock aria-hidden />} />}
          {phase.tag === "Damaged" && (
            <Section>
              <SettingRow label="Vault" state={{ word: "Damaged", tone: "destructive" }} />
              {vault.confirmReset
                ? <SettingRow label="Confirm reset" ariaLabel="Confirm reset vault, can’t be undone" destructive busy={busy("Resetting")} onOpen={() => acts.run("Resetting", "")} />
                : <SettingRow label="Reset vault" destructive icon={<Trash2 aria-hidden className="size-5" />} onOpen={acts.askReset} />}
            </Section>
          )}
          {phase.tag === "Locked" && (
            <Section>
              <SettingRow label="Unlock" ariaLabel="Unlock passwords" icon={<Fingerprint aria-hidden className="size-5" />} busy={busy("Unlocking")} onOpen={() => acts.run("Unlocking", "")} />
            </Section>
          )}
          {phase.tag === "Unlocked" && !entry && (
            <>
              <Section>
                <SettingRow label="Lock" ariaLabel="Lock passwords" icon={<Lock aria-hidden className="size-5" />} busy={busy("Locking")} onOpen={() => acts.run("Locking", "")} />
              </Section>
              <Input type="search" aria-label="Search passwords" value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
              <Button onClick={() => acts.edit("")} loading={busy("Editing")}><Plus aria-hidden className="size-4" />Add password</Button>
              <Section>
                {shown.length === 0 && <SettingRow label={vault.entries.length ? "No matching passwords" : "No saved passwords"} />}
                {shown.map((e) => <SettingRow key={e.id} label={e.label} state={{ word: e.username }} icon={<Globe aria-hidden className="size-5" />} ariaLabel={`Open ${e.label}`} onOpen={() => acts.openEntry(e.id)} />)}
              </Section>
            </>
          )}
          {phase.tag === "Unlocked" && entry && (
            <>
              <Section caption="Sites">{entry.sites.map((site) => <SettingRow key={site} label={site} />)}</Section>
              <Section>
                <SettingRow label="Username" state={{ word: entry.username }} />
                <SettingRow label="Show password" icon={<Eye aria-hidden className="size-5" />} busy={busy("Revealing")} onOpen={() => acts.run("Revealing", entry.id)} />
                <SettingRow label="Copy password" icon={<Copy aria-hidden className="size-5" />} busy={busy("Copying")} onOpen={() => acts.run("Copying", entry.id)} />
                <SettingRow label="Edit" icon={<Pencil aria-hidden className="size-5" />} busy={busy("Editing")} onOpen={() => acts.edit(entry.id)} />
                {vault.confirmRemove === entry.id
                  ? <SettingRow label="Confirm delete" ariaLabel="Confirm delete, can’t be undone" destructive busy={busy("Removing")} onOpen={() => acts.run("Removing", entry.id)} />
                  : <SettingRow label="Delete" destructive icon={<Trash2 aria-hidden className="size-5" />} onOpen={() => acts.askRemove(entry.id)} />}
              </Section>
            </>
          )}
          {phase.tag !== "Closed" && phase.tag !== "Checking" && (
            <Section caption="Autofill">
              <SettingRow label="Browser autofill" state={{ word: vault.browserFill ? "On" : "Off" }} />
              <SettingRow label="Autofill service" state={{ word: AUTOFILL[vault.autofill] }} />
              {vault.autofill !== "AutofillUnsupported" && vault.autofill !== "AutofillThisApp" && <SettingRow label="Use for autofill" busy={busy("OpeningAutofill")} onHandoff={() => acts.run("OpeningAutofill", "")} />}
              <SettingRow label="Refresh" ariaLabel="Refresh autofill status" icon={<RotateCw aria-hidden className="size-5" />} onOpen={acts.refresh} />
            </Section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
