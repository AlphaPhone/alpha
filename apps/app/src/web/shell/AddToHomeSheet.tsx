// spec/shell/favorites.md, "An edit adds, removes or moves one key and leaves every other slot where it was"
import { Plus } from "lucide-react";
import { ListRow } from "../components/ui/index.ts";
import type { TileFace } from "./AppTile.tsx";
import { InlineSheet } from "./InlineSheet.tsx";

export interface AddToHomeSheetProps {
  /** Alpha's apps that are not on Home now. */
  hidden: readonly TileFace[];
  open: boolean;
  onAdd: (key: string) => void;
  onClose: () => void;
}

/** Edit mode's "+": the Alpha apps the owner removed from Home, to put back. */
export function AddToHomeSheet({ hidden, open, onAdd, onClose }: AddToHomeSheetProps) {
  return (
    <InlineSheet title="Add to Home" open={open} onClose={onClose}>
      {hidden.map((face) => {
        const Icon = face.icon;
        return (
          <ListRow key={face.key} title={face.label} leading={Icon ? <Icon aria-hidden className="size-6" /> : null}
            trailing={<Plus aria-hidden className="size-5 text-primary" />} aria-label={`Add ${face.label} to Home`} onClick={() => onAdd(face.key)} />
        );
      })}
    </InlineSheet>
  );
}
