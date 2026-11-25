import { cn, focusRing } from "../../lib/cn.ts";
import { ListGroup } from "../ListGroup.tsx";
import { Spinner } from "../Spinner.tsx";

type Percent = 75 | 100 | 115 | 130 | 150;

export type SettingsTextSizePickerProps = {
  /** The size the phone says it applied, in percent; 0 while the phone has reported none. */
  size: 0 | Percent;
  /** The phone is applying a change or reading the size: nothing else can be chosen until it answers. */
  busy?: boolean;
  /** Called with the size the owner chose; the phone applies it and Alpha shows what the phone confirmed. */
  onChoose?: (percent: Percent) => void;
};

const sizes: { percent: Percent; sample: string }[] = [
  { percent: 75, sample: "text-xs" },
  { percent: 100, sample: "text-md" },
  { percent: 115, sample: "text-date" },
  { percent: 130, sample: "text-quote" },
  { percent: 150, sample: "text-2xl" },
];

/**
 * The size of Alpha's text, in five steps each drawn at its own size. The size marked is the one the phone applied;
 * when the phone has reported none, none is marked.
 * @model spec/app/settings/preferences.md
 */
export function SettingsTextSizePicker({ size, busy = false, onChoose }: SettingsTextSizePickerProps) {
  return (
    <ListGroup heading="Text size">
      <div role="group" aria-label="Text size" aria-busy={busy || undefined} className="flex flex-wrap items-center gap-1 px-2.5 py-2">
        {sizes.map(({ percent, sample }) => (
          <button
            key={percent}
            type="button"
            aria-label={`${percent} percent`}
            aria-pressed={size === percent}
            disabled={busy || !onChoose}
            className={cn(
              focusRing,
              "flex min-h-14 min-w-11 flex-auto items-center justify-center rounded-drawer-icon px-1.5 leading-tight text-foreground disabled:pointer-events-none aria-pressed:bg-primary aria-pressed:text-primary-foreground",
              busy && "opacity-50",
            )}
            onClick={() => onChoose?.(percent)}
          >
            <span aria-hidden className={sample}>Aa</span>
          </button>
        ))}
        {busy ? <Spinner size="sm" label="Applying" className="basis-full" /> : null}
      </div>
    </ListGroup>
  );
}
