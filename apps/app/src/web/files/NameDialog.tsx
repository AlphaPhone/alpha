// spec/os/android/files/storage.md, "A rename never replaces a different entry and reports the new path only when it happened"
import { useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle, Input } from "../components/ui/index.ts";

export type NameDialogProps = {
  /** A new folder, or a rename. */
  op: "create" | "rename";
  /** The name the field starts with. */
  initial: string;
  /** Selects the name before its extension on first focus, so a rename keeps the extension. */
  keepExtension?: boolean;
  busy?: boolean;
  /** Why the last name was refused, in Alpha's words. */
  error?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
};

/** Names a new folder or renames a file; a name already used is refused, never replaced. */
export function NameDialog({ op, initial, keepExtension = false, busy = false, error, onConfirm, onCancel }: NameDialogProps) {
  const [value, setValue] = useState(initial);
  const [selected, setSelected] = useState(false);
  const dot = initial.lastIndexOf(".");
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent>
        <DialogTitle>{op === "create" ? "New folder" : "Rename"}</DialogTitle>
        <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); if (value.trim()) onConfirm(value.trim()); }}>
          <Input autoFocus aria-label="Name" value={value} invalid={error !== undefined} aria-describedby={error ? "files-name-error" : undefined}
            onChange={(event) => setValue(event.target.value)}
            onFocus={(event) => {
              if (selected) return;
              setSelected(true);
              event.target.setSelectionRange(0, keepExtension && dot > 0 ? dot : event.target.value.length);
            }} />
          {error && <p id="files-name-error" role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
            <Button type="submit" loading={busy} disabled={!value.trim()}>{op === "create" ? "Create" : "Rename"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
