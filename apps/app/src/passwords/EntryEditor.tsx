// spec/app/passwords/entry.md, "Story: Write a password entry"; spec/app/passwords/index.md, "Story: Add, change and delete a password"
import { Banner, Button, Input, Label } from "@repo/ui";
import type { Event, Vault } from "../../gen/app__passwords.ts";
import type { EntryDraft } from "./passwords.vibe";

export interface EntryEditorProps {
  readonly state: Vault;
  readonly draft: EntryDraft;
  readonly can: (event: Event) => boolean;
  readonly send: (event: Event) => Promise<unknown>;
  readonly onDraftChange: (next: Partial<EntryDraft>) => EntryDraft;
}

const problemCopy: Record<Vault["entry"]["problem"], string | undefined> = {
  Fine: undefined,
  NoDetails: "Enter a name and at least one website before saving.",
  NoPassword: "Type a password or generate one before saving.",
  Retype: "The vault locked while editing. Retype or generate a password before saving.",
  Refused: "The vault could not save this password.",
};

const generatedLengths = [16, 20, 32] as const;

/** New and Edit password entry form; secrets stay in the vault machine and are never logged or persisted outside it. */
export function EntryEditor({ state, draft, can, send, onDraftChange }: EntryEditorProps) {
  const { entry } = state;
  const problem = problemCopy[entry.problem];
  const updateDetails = (patch: Partial<EntryDraft>) => {
    const next = onDraftChange(patch);
    const ev: Event = { type: "details", named: next.name.trim().length > 0, website: next.website.trim().length > 0 };
    if (can(ev)) void send(ev);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-foreground">
          {entry.form === "New" ? "New password" : "Edit password"}
        </h3>
        {can({ type: "closeForm" }) ? (
          <Button variant="ghost" size="sm" onClick={() => void send({ type: "closeForm" })}>Cancel</Button>
        ) : null}
      </div>

      {problem ? <Banner variant="warn">{problem}</Banner> : null}

      <div className="flex flex-col gap-1">
        <Label htmlFor="pw-name">Name</Label>
        <Input
          id="pw-name"
          aria-label="Name"
          value={draft.name}
          onChange={(e) => updateDetails({ name: e.target.value })}
          placeholder="Example Bank"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="pw-username">Username</Label>
        <Input
          id="pw-username"
          aria-label="Username"
          value={draft.username}
          onChange={(e) => updateDetails({ username: e.target.value })}
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="pw-website">Website</Label>
        <Input
          id="pw-website"
          aria-label="Website"
          value={draft.website}
          onChange={(e) => updateDetails({ website: e.target.value })}
          placeholder="example.com"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="pw-secret">Password</Label>
        <Input
          id="pw-secret"
          aria-label="Password"
          type="password"
          value={state.password}
          onChange={(e) => {
            const ev: Event = { type: "typePassword", p: e.target.value };
            if (can(ev)) void send(ev);
          }}
          placeholder={entry.generate ? `Will generate ${entry.chars}-character password` : entry.form === "Edit" ? "Leave blank to keep existing" : "Enter password"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption text-muted-foreground">Generate:</span>
        {generatedLengths.map((chars) => (
          <Button
            key={chars}
            variant={entry.generate && entry.chars === chars ? "primary" : "outline"}
            size="sm"
            disabled={!can({ type: "generate", chars })}
            onClick={() => void send({ type: "generate", chars })}
          >
            {chars} chars
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {can({ type: "save" }) ? (
          <Button variant="primary" loading={state.waiting && state.change === "Saving"} onClick={() => void send({ type: "save" })}>
            Save password
          </Button>
        ) : null}
        {can({ type: "remove" }) ? (
          <Button
            variant="destructive"
            loading={state.waiting && state.change === "Removing"}
            onClick={() => void send({ type: "remove" })}
          >
            {entry.confirmDelete ? "Confirm delete" : "Delete"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
