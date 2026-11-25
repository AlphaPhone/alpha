import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn, focusRing } from "../../lib/cn.ts";
import { ListGroup } from "../ListGroup.tsx";

type Theme = "system" | "light" | "dark";

export type SettingsAppearancePickerProps = {
  /** The appearance shown: the owner's choice, until the phone says it could not keep it. */
  theme: Theme;
  /** A choice is being kept on the phone: nothing else can be chosen until it is. */
  keeping?: boolean;
  /** Called with the owner's choice; Alpha shows it at once and the phone keeps it. */
  onChoose?: (theme: Theme) => void;
};

const choices: { value: Theme; title: string }[] = [
  { value: "system", title: "System" },
  { value: "light", title: "Light" },
  { value: "dark", title: "Dark" },
];

/**
 * Light, dark, or following the phone, as one segmented row. The choice shows at once and is kept; one is kept at a
 * time.
 * @model spec/app/settings/preferences.md
 */
export function SettingsAppearancePicker({ theme, keeping = false, onChoose }: SettingsAppearancePickerProps) {
  const locked = keeping || !onChoose;
  const choose = (value: string) => {
    const chosen = choices.find((choice) => choice.value === value);
    if (chosen) onChoose?.(chosen.value);
  };
  return (
    <ListGroup>
      <div className="flex min-h-15 items-center gap-3 py-2 pr-2.5 pl-4.5">
        <span aria-hidden className="min-w-0 flex-1 text-md">Theme</span>
        <RadioGroupPrimitive.Root
          value={theme}
          onValueChange={choose}
          disabled={locked}
          aria-label="Theme"
          aria-busy={keeping || undefined}
          orientation="horizontal"
          className="flex shrink-0 gap-0.5 rounded-full bg-background p-0.75"
        >
          {choices.map(({ value, title }) => (
            <RadioGroupPrimitive.Item
              key={value}
              value={value}
              className={cn(
                focusRing,
                "min-h-11 min-w-13 rounded-full px-3.5 text-snippet font-semibold text-muted-foreground transition-colors duration-fast ease-standard disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-alpha data-[state=checked]:text-alpha-foreground",
              )}
            >
              {title}
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>
      </div>
    </ListGroup>
  );
}
