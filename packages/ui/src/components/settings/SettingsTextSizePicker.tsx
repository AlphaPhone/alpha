import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
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
  { percent: 100, sample: "text-base" },
  { percent: 115, sample: "text-lg" },
  { percent: 130, sample: "text-xl" },
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
      <div role="group" aria-label="Text size" aria-busy={busy || undefined} className="flex flex-col items-center gap-2 p-3">
        <div className="grid w-full grid-cols-5 gap-1.5">
          {sizes.map(({ percent, sample }) => (
            <Button
              key={percent}
              variant="secondary"
              size="sm"
              aria-label={`${percent} percent`}
              aria-pressed={size === percent}
              disabled={busy || !onChoose}
              className={cn("px-0", size === percent && "bg-foreground text-background hover:bg-foreground active:bg-foreground")}
              onClick={() => onChoose?.(percent)}
            >
              <span aria-hidden className={sample}>Aa</span>
            </Button>
          ))}
        </div>
        {busy ? <Spinner size="sm" label="Applying" /> : null}
      </div>
    </ListGroup>
  );
}
