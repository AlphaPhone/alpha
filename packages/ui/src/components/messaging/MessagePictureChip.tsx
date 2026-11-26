import { X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

interface MessagePictureChipProps {
  name: string;
  disabled?: boolean;
  onRemove: () => void;
}

/** The selected picture's name and its removal action occupy one touch target. */
export function MessagePictureChip({ name, disabled, onRemove }: MessagePictureChipProps) {
  return (
    <button type="button" aria-label={`Remove ${name}`} disabled={disabled} onClick={onRemove}
      className={cn(focusRing, "flex min-h-11 max-w-full items-center gap-1.5 rounded-tile bg-secondary px-3 text-sm leading-[normal] font-normal text-foreground disabled:opacity-50")}>
      <span className="truncate">{name}</span>
      <X aria-hidden className="size-3.5 shrink-0" />
    </button>
  );
}
