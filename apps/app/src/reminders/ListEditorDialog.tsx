// spec/app/reminders/index.md, "Creating, renaming and deleting custom lists protects the default Reminders list and keeps every item in a valid list"
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Input, Label, cn } from "@repo/ui";
import { useState } from "react";
import type { DeleteMode } from "../../gen/app__reminders.ts";
import type { ReminderListColor, ReminderListIcon, ReminderListRecord } from "./store.ts";
import { LIST_COLORS, LIST_ICONS, ListIcon, listColorBadgeClass, listColorLabel, listIconLabel } from "./visuals.tsx";

/** Dialog for creating or renaming a custom reminder list with color and icon choices. */
export function ListEditorDialog({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  readonly open: boolean;
  readonly initial: ReminderListRecord | null;
  readonly onClose: () => void;
  readonly onSubmit: (name: string, color: ReminderListColor, icon: ReminderListIcon) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState<ReminderListColor>(initial?.color ?? "blue");
  const [icon, setIcon] = useState<ReminderListIcon>(initial?.icon ?? "list");
  const trimmed = name.trim();

  function handleSave() {
    if (trimmed === "") return;
    onSubmit(trimmed, color, icon);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent closeLabel="Close list editor" aria-describedby={undefined}>
        <DialogTitle>{initial ? "Edit list" : "New list"}</DialogTitle>
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            <span className={cn("flex size-14 items-center justify-center rounded-full shadow-sm", listColorBadgeClass(color))}>
              <ListIcon icon={icon} className="size-7" />
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder-list-name">List name</Label>
            <Input
              id="reminder-list-name"
              value={name}
              placeholder="Groceries, Work, Errands…"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") handleSave(); }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {LIST_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={listColorLabel(swatch)}
                  aria-pressed={color === swatch}
                  onClick={() => setColor(swatch)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full transition-transform",
                    listColorBadgeClass(swatch),
                    color === swatch && "ring-2 ring-ring ring-offset-2 ring-offset-popover scale-105",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-4 gap-2">
              {LIST_ICONS.map((choice) => (
                <Button
                  key={choice}
                  type="button"
                  variant={icon === choice ? "primary" : "secondary"}
                  size="sm"
                  aria-label={listIconLabel(choice)}
                  aria-pressed={icon === choice}
                  onClick={() => setIcon(choice)}
                >
                  <ListIcon icon={choice} />
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={trimmed === ""} onClick={handleSave}>{initial ? "Save list" : "Create list"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Safe deletion dialog for a custom list offering either reassigning items to Reminders or deleting them. */
export function DeleteListDialog({
  list,
  itemCount,
  onClose,
  onDelete,
}: {
  readonly list: ReminderListRecord | null;
  readonly itemCount: number;
  readonly onClose: () => void;
  readonly onDelete: (listId: string, mode: DeleteMode) => void;
}) {
  if (list === null) return null;
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent closeLabel="Cancel delete list">
        <DialogTitle>Delete “{list.name}”?</DialogTitle>
        <DialogDescription>
          {itemCount > 0
            ? `This list has ${itemCount} ${itemCount === 1 ? "reminder" : "reminders"}. Move them to Reminders or delete them with the list.`
            : "This list is empty and will be removed."}
        </DialogDescription>
        <div className="flex flex-col gap-2 pt-2">
          {itemCount > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onDelete(list.id, "ReassignToDefault");
                onClose();
              }}
            >
              Move reminders to Reminders
            </Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onDelete(list.id, itemCount > 0 ? "CascadeItems" : "ReassignToDefault");
              onClose();
            }}
          >
            {itemCount > 0 ? "Delete list and reminders" : "Delete list"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
