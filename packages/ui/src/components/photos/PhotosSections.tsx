import { Folder, Images } from "lucide-react";
import { cn } from "../../lib/cn.ts";

export type PhotosSection = "library" | "albums";

export type PhotosSectionsProps = {
  /** The section showing. */
  value: PhotosSection;
  /** Called with the section chosen; without it neither can be chosen. */
  onChange?: (section: PhotosSection) => void;
};

const sections = [
  { id: "library", label: "Library", Icon: Images },
  { id: "albums", label: "Albums", Icon: Folder },
] as const;

/** Library or Albums, side by side, the one showing filled. */
export function PhotosSections({ value, onChange }: PhotosSectionsProps) {
  return (
    <div role="group" aria-label="Photos sections" className="mx-4 mb-3 flex shrink-0 gap-0.75 rounded-segment bg-secondary p-1">
      {sections.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          disabled={!onChange}
          onClick={() => onChange?.(id)}
          className={cn(
            "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-segment-option px-3 py-2 text-center text-sm leading-snug font-semibold transition-colors duration-200",
            value === id ? "bg-foreground text-background" : "text-foreground",
          )}
        >
          <Icon aria-hidden className="size-4.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
