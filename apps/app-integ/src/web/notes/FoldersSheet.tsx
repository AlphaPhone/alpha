// spec/notes/folders.md, "A folder is created once per name, up to a hundred folders"; spec/notes/folders.md, "Renaming keeps the folder's ID, so every note stays in it"; spec/notes/folders.md, "Deleting a folder removes it first, and its notes then read as in no folder"
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, Input, Sheet, SheetContent } from "../components/ui/index.ts";
import type { NotesFolder } from "../../notes/folders.vibe";

export type FoldersSheetProps = {
  /** Whether the sheet is open. */
  open: boolean;
  /** The owner's folders. */
  folders: readonly NotesFolder[];
  /** The folder the list shows, if any. */
  selected?: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string | undefined) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
};

/** The owner's folders: show one, make one, rename or delete one. Deleting a folder never deletes its notes. */
export function FoldersSheet({ open, folders, selected, onOpenChange, onSelect, onCreate, onRename, onDelete }: FoldersSheetProps) {
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string }>();
  const valid = (value: string) => value.replace(/\s+/g, " ").trim() !== "" && value.replace(/\s+/g, " ").trim().length <= 40;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" title="Folders">
        <ul className="flex flex-col gap-1">
          <li><Button variant={selected === undefined ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => onSelect(undefined)}>All notes</Button></li>
          {folders.map((folder) => (
            <li key={folder.id} className="flex items-center gap-1">
              {renaming?.id === folder.id ? (
                <form className="flex flex-1 items-center gap-1" onSubmit={(event) => { event.preventDefault(); if (valid(renaming.name)) onRename(folder.id, renaming.name); setRenaming(undefined); }}>
                  <Input autoFocus aria-label={`New name of ${folder.name}`} value={renaming.name} maxLength={40} onChange={(event) => setRenaming({ id: folder.id, name: event.target.value })} />
                  <Button type="submit" variant="ghost" size="icon" aria-label="Save name" disabled={!valid(renaming.name)}><Check aria-hidden /></Button>
                </form>
              ) : (
                <Button variant={selected === folder.id ? "secondary" : "ghost"} className="flex-1 justify-start" onClick={() => onSelect(folder.id)}>{folder.name}</Button>
              )}
              <Button variant="ghost" size="icon" aria-label={`Rename ${folder.name}`} onClick={() => setRenaming({ id: folder.id, name: folder.name })}><Pencil aria-hidden /></Button>
              <Button variant="ghost" size="icon" aria-label={`Delete folder ${folder.name}`} onClick={() => onDelete(folder.id)}><Trash2 aria-hidden /></Button>
            </li>
          ))}
        </ul>
        <form className="mt-3 flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); if (!valid(name)) return; onCreate(name); setName(""); }}>
          <Input aria-label="New folder" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
          <Button type="submit" size="icon" aria-label="Add folder" disabled={!valid(name) || folders.length >= 100}><Plus aria-hidden /></Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
