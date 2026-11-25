import type { LucideIcon } from "lucide-react";

export type PhotoSelectionAction = {
  /** What the action does, under its mark. */
  label: string;
  /** What it is read out as, such as "Share selected". */
  description: string;
  icon: LucideIcon;
  /** Left out where the rules do not take it now: the action shows, dimmed. */
  onPress?: () => void;
};

export type PhotoSelectionBarProps = {
  /** The actions on the selection, side by side. */
  actions: PhotoSelectionAction[];
};

/** What can be done with the items selected: a bar of marks and words above the Ask Alpha bar. */
export function PhotoSelectionBar({ actions }: PhotoSelectionBarProps) {
  return (
    <div role="toolbar" aria-label="Selection actions" className="absolute inset-x-0 bottom-27 z-20 flex h-18 items-start justify-around bg-background px-3 pt-2.5 border-t border-border">
      {actions.map(({ label, description, icon: Icon, onPress }) => (
        <button key={label} type="button" aria-label={description} disabled={!onPress} onClick={onPress} className="flex min-h-12 min-w-16 flex-col items-center gap-0.75 text-xs text-foreground disabled:opacity-40">
          <Icon aria-hidden className="size-5.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
