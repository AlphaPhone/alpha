// spec/app/passwords/index.md, "Story: Unlock my passwords"; spec/app/passwords/index.md, "Story: Add, change and delete a password"; spec/app/passwords/index.md, "Story: Recover a damaged vault"; spec/app/passwords/index.md, "Story: Fill passwords in"
import { Banner, Button, Card, ConfirmDialog, EmptyState, ListGroup, ListRow, SearchField, Sheet, SheetContent, Spinner, StatusDot } from "@repo/ui";
import { Effect } from "effect";
import { KeyRound, Lock, Plus, RefreshCw, ShieldAlert, Unlock, X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { useMachine as usePasswords } from "../../gen/app__passwords.react.ts";
import { useMachine as useLayers } from "../../gen/app__shell__layers.react.ts";
import { listed, top } from "../../gen/app__shell__layers.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { EntryEditor } from "./EntryEditor.tsx";
import { PasswordVault, matchingPasswords, passwordsLayer } from "./passwords.vibe";

const noticeText: Record<string, string | undefined> = {
  Quiet: undefined,
  Expired: "Vault locked after timeout.",
  Failed: "Could not read passwords.",
  Saved: "Password saved.",
  Removed: "Password deleted.",
  ResetDone: "Vault reset. Saved passwords were erased.",
  Unsure: "Alpha could not confirm whether the change finished.",
  Filled: "Password filled.",
};

const serviceLabel: Record<string, string> = {
  Unknown: "Checking autofill",
  Unsupported: "Autofill unsupported",
  Alpha: "Alpha is your autofill service",
  Other: "Another autofill service is active",
  NoService: "No autofill service selected",
};

type PasswordsHook = ReturnType<typeof usePasswords>;

function PasswordsBody({ runtime, machine }: { runtime: Shown<Resident>["runtime"]; machine: PasswordsHook }) {
  const { state, can, send } = machine;
  const vault = useMemo(() => runtime.runSync(Effect.flatMap(PasswordVault, (found) => Effect.succeed(found))), [runtime]);
  const snap = useSyncExternalStore((listener) => vault.subscribe(listener), () => vault.snapshot(), () => vault.snapshot());
  if (!state) return null;

  const shownNotice = noticeText[state.notice];
  const filtered = matchingPasswords(snap.entries, state.query);

  return (
    <div className="flex flex-col gap-4">
      {shownNotice ? <Banner variant={state.notice === "Failed" || state.notice === "Unsure" ? "warn" : "info"}>{shownNotice}</Banner> : null}

      {state.damaged ? (
        <Card>
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="text-base font-medium text-foreground">Vault cannot be opened</p>
              <p className="text-sm text-muted-foreground">
                The device encryption key is no longer available. Resetting erases all saved passwords so you can start again.
              </p>
            </div>
          </div>
          {can({ type: "askReset" }) ? (
            <Button variant="destructive" onClick={() => void send({ type: "askReset" })}>Reset vault</Button>
          ) : null}
        </Card>
      ) : null}

      <ConfirmDialog
        open={state.reset.showing}
        onCancel={() => { if (can({ type: "cancelReset" })) void send({ type: "cancelReset" }); }}
        title="Reset password vault?"
        confirmLabel="Reset vault"
        destructive
        onConfirm={() => { if (can({ type: "confirmReset" })) void send({ type: "confirmReset" }); }}
      >
        All saved passwords on this phone will be permanently erased.
      </ConfirmDialog>

      {!state.damaged && state.lock !== "Unlocked" ? (
        <Card className="items-start">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Unlock to view or edit saved passwords.</p>
          </div>
          {state.lock === "Unlocking" ? (
            <Spinner label="Unlocking vault" />
          ) : can({ type: "unlock" }) ? (
            <Button variant="primary" onClick={() => void send({ type: "unlock" })}>
              <Unlock className="mr-1.5 size-4" aria-hidden />
              Unlock passwords
            </Button>
          ) : null}
        </Card>
      ) : null}

      {state.lock === "Unlocked" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {can({ type: "openNew" }) ? (
              <Button variant="primary" size="sm" onClick={() => {
                vault.resetDraft();
                void send({ type: "openNew" });
              }}>
                <Plus className="mr-1 size-4" aria-hidden />
                Add password
              </Button>
            ) : null}
            {can({ type: "lockNow" }) ? (
              <Button variant="secondary" size="sm" onClick={() => void send({ type: "lockNow" })}>
                <Lock className="mr-1 size-4" aria-hidden />
                Lock
              </Button>
            ) : null}
            {can({ type: "refresh" }) ? (
              <Button variant="ghost" size="sm" aria-label="Refresh passwords" onClick={() => void send({ type: "refresh" })}>
                <RefreshCw className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>

          {state.entry.form !== "Closed" ? (
            <Card>
              <EntryEditor
                state={state}
                draft={snap.draft}
                can={can}
                send={send}
                onDraftChange={(patch) => vault.setDraft(patch)}
              />
            </Card>
          ) : null}

          {state.listing.status === "Loading" ? (
            <Spinner label="Loading saved passwords" />
          ) : (
            <>
              <SearchField
                aria-label="Search passwords"
                value={state.query}
                onValueChange={(query) => { if (can({ type: "search", query })) void send({ type: "search", query }); }}
                placeholder="Search passwords"
              />
              {state.count === 0 ? (
                <EmptyState icon={<KeyRound />} title="No saved passwords">
                  <p className="text-sm text-muted-foreground">Add a password to fill it into sites automatically.</p>
                </EmptyState>
              ) : filtered.length === 0 ? (
                <EmptyState icon={<KeyRound />} title="No matching passwords">
                  <p className="text-sm text-muted-foreground">Try a different name, username or website.</p>
                </EmptyState>
              ) : (
                <ListGroup heading="Saved passwords">
                  {filtered.map((entry) => (
                    <ListRow
                      key={entry.id}
                      aria-label={entry.name}
                      title={entry.name}
                      detail={[entry.username, entry.websites.join(", ")].filter(Boolean).join(" · ")}
                      onClick={() => {
                        if (!can({ type: "openEdit" })) return;
                        vault.resetDraft(entry);
                        void send({ type: "openEdit" });
                      }}
                    />
                  ))}
                </ListGroup>
              )}
            </>
          )}
        </div>
      ) : null}

      <Card className="flex-row items-center justify-between">
        <StatusDot
          status={state.service === "Alpha" ? "ok" : "off"}
          label={serviceLabel[state.service] ?? "Autofill"}
          showLabel
        />
        {can({ type: "useForAutofill" }) ? (
          <Button variant="outline" size="sm" onClick={() => void send({ type: "useForAutofill" })}>
            Use for autofill
          </Button>
        ) : null}
      </Card>
    </div>
  );
}

/** Full Password Manager panel (unlock, list, search, edit, autofill settings, damaged vault recovery). */
export function PasswordsScreen({ runtime }: { runtime: Shown<Resident>["runtime"] }) {
  const machine = usePasswords(runtime);
  return <PasswordsBody runtime={runtime} machine={machine} />;
}

/** Browser autofill bar offered strictly for the focused site's saved credentials. */
export function AutofillPrompt({ runtime }: { runtime: Shown<Resident>["runtime"] }) {
  const { state, can, send } = usePasswords(runtime);
  const vault = useMemo(() => runtime.runSync(Effect.flatMap(PasswordVault, (found) => Effect.succeed(found))), [runtime]);
  const snap = useSyncExternalStore((listener) => vault.subscribe(listener), () => vault.snapshot(), () => vault.snapshot());
  if (!state || !state.browserFill || state.field === 0 || !state.foreground) return null;
  const origin = state.field;
  const host = snap.origins.get(origin) ?? `site #${origin}`;
  const fillEv = { type: "fill", origin } as const;
  if (!can(fillEv)) return null;
  return (
    <div role="region" aria-label="Password autofill" className="fixed inset-x-4 bottom-20 z-toast flex items-center justify-between gap-3 rounded-tile bg-card px-4 py-3 text-card-foreground shadow-md">
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-primary" aria-hidden />
        <span className="text-sm">Fill password for {host}</span>
      </div>
      <Button variant="primary" size="sm" onClick={() => void send(fillEv)}>Fill password</Button>
    </div>
  );
}

/** Overlay area for the Password Manager sheet and Browser autofill prompt. */
export function PasswordsOverlay({ runtime }: Shown<Resident>) {
  const layers = useLayers(runtime);
  const passwordsMachine = usePasswords(runtime);
  const isListed = layers.state ? listed(layers.state, passwordsLayer) : false;
  const isTop = layers.state ? top(layers.state).id === passwordsLayer : false;
  const closeLayer = { type: "closeLayer", id: passwordsLayer } as const;
  const onClose = () => { if (layers.can(closeLayer)) void layers.send(closeLayer); };

  return (
    <>
      {isListed && passwordsMachine.state ? (
        <Sheet open={isTop} onOpenChange={(open) => { if (!open) onClose(); }}>
          <SheetContent
            title="Password manager"
            className="max-h-dvh max-w-105 gap-3 overflow-y-auto bg-background px-6 pt-8 pb-7 text-foreground"
            actions={<Button variant="secondary" onClick={onClose}>Done</Button>}
          >
            <Button variant="ghost" size="icon" aria-label="Close Password manager" className="absolute top-6 right-5 size-10" onClick={onClose}>
              <X />
            </Button>
            <PasswordsBody runtime={runtime} machine={passwordsMachine} />
          </SheetContent>
        </Sheet>
      ) : null}
      <AutofillPrompt runtime={runtime} />
    </>
  );
}
