// spec/app/passwords/index.md, "Story: Unlock my passwords"; spec/app/passwords/index.md, "Story: Recover a damaged vault"; spec/app/passwords/index.md, "Story: Fill passwords in"
import type { Found, Result, Service as AutofillService } from "../../gen/app__passwords.ts";
import type { EntryDraft, PasswordsBackend, SavedPasswordSummary } from "../../src/passwords/passwords.vibe";

/** Controllable fake vault backend standing at the native ElizaPasswords boundary. */
export interface PasswordsHarness {
  readonly backend: PasswordsBackend;
  readonly savedSecrets: Map<string, string>;
  readonly filledHosts: string[];
  readonly autofillSettingsOpened: () => number;
  setDamaged(damaged: boolean): void;
  setService(service: AutofillService, browserFill?: boolean): void;
  setWindowMs(ms: number): void;
  setSaveResult(result: Result | undefined): void;
  seed(entry: SavedPasswordSummary, secret: string): void;
}

/** Creates an in-memory PasswordsBackend fake for passwords journeys. */
export function passwordsHarness(): PasswordsHarness {
  let unlocked = false;
  let damaged = false;
  let service: AutofillService = "Other";
  let browserFill = true;
  let windowMs = 60_000;
  let forcedSaveResult: Result | undefined;
  let autofillOpens = 0;
  let nextId = 1;
  const entries = new Map<string, SavedPasswordSummary>();
  const savedSecrets = new Map<string, string>();
  const filledHosts: string[] = [];

  const backend: PasswordsBackend = {
    unlock() {
      if (damaged) return Promise.resolve({ ok: false, windowMs, damaged: true });
      unlocked = true;
      return Promise.resolve({ ok: true, windowMs });
    },
    lock() {
      unlocked = false;
      return Promise.resolve();
    },
    list(): Promise<{ readonly found: Found; readonly entries: readonly SavedPasswordSummary[] }> {
      if (!unlocked) return Promise.resolve({ found: "FoundLocked", entries: [] });
      return Promise.resolve({ found: "Listed", entries: [...entries.values()] });
    },
    save(draft: EntryDraft, password: string, generate: boolean, chars: number): Promise<Result> {
      if (forcedSaveResult !== undefined) return Promise.resolve(forcedSaveResult);
      if (!unlocked) return Promise.resolve("WasLocked");
      const id = draft.editingId ?? `entry-${nextId++}`;
      const existing = entries.get(id);
      const websites = draft.website.split(",").map((s) => s.trim()).filter(Boolean);
      entries.set(id, {
        id,
        name: draft.name.trim(),
        username: draft.username.trim(),
        websites,
        revision: (existing?.revision ?? 0) + 1,
      });
      if (generate) savedSecrets.set(id, `gen-${chars}-${id}`);
      else if (password) savedSecrets.set(id, password);
      return Promise.resolve("Done");
    },
    remove(id: string): Promise<Result> {
      if (!unlocked) return Promise.resolve("WasLocked");
      if (!entries.has(id)) return Promise.resolve("Refused");
      entries.delete(id);
      savedSecrets.delete(id);
      return Promise.resolve("Done");
    },
    reset(): Promise<Result> {
      entries.clear();
      savedSecrets.clear();
      damaged = false;
      unlocked = false;
      return Promise.resolve("Done");
    },
    status() {
      return Promise.resolve({ service, browserFill });
    },
    openAutofillSettings() {
      autofillOpens += 1;
      service = "Alpha";
      return Promise.resolve();
    },
    fill(_origin: number, host: string) {
      filledHosts.push(host);
      return Promise.resolve(true);
    },
  };

  return {
    backend,
    savedSecrets,
    filledHosts,
    autofillSettingsOpened: () => autofillOpens,
    setDamaged(value) { damaged = value; },
    setService(next, browser = true) { service = next; browserFill = browser; },
    setWindowMs(ms) { windowMs = ms; },
    setSaveResult(result) { forcedSaveResult = result; },
    seed(entry, secret) {
      entries.set(entry.id, entry);
      savedSecrets.set(entry.id, secret);
    },
  };
}
