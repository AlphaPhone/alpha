import { type ReactNode, useId } from "react";
import { Moon, Smartphone, Sun } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { RadioGroup, RadioGroupItem } from "../RadioGroup.tsx";

type Theme = "system" | "light" | "dark";

export type SettingsAppearancePickerProps = {
  /** The appearance shown: the owner's choice, until the phone says it could not keep it. */
  theme: Theme;
  /** A choice is being kept on the phone: nothing else can be chosen until it is. */
  keeping?: boolean;
  /** Called with the owner's choice; Alpha shows it at once and the phone keeps it. */
  onChoose?: (theme: Theme) => void;
};

const choices: { value: Theme; title: string; icon: ReactNode }[] = [
  { value: "system", title: "System", icon: <Smartphone /> },
  { value: "light", title: "Light", icon: <Sun /> },
  { value: "dark", title: "Dark", icon: <Moon /> },
];

/**
 * Light, dark, or following the phone. The choice shows at once and is kept; one is kept at a time.
 * @model spec/app/settings/preferences.md
 */
export function SettingsAppearancePicker({ theme, keeping = false, onChoose }: SettingsAppearancePickerProps) {
  const id = useId();
  const locked = keeping || !onChoose;
  const choose = (value: string) => {
    const chosen = choices.find((choice) => choice.value === value);
    if (chosen) onChoose?.(chosen.value);
  };
  return (
    <ListGroup heading="Appearance">
      <RadioGroup value={theme} onValueChange={choose} disabled={locked} aria-label="Appearance" aria-busy={keeping || undefined}>
        {choices.map(({ value, title, icon }) => (
          <ListRow key={value} asChild title={title} leading={icon} disabled={locked} trailing={<RadioGroupItem value={value} id={`${id}-${value}`} />}>
            <label htmlFor={`${id}-${value}`} />
          </ListRow>
        ))}
      </RadioGroup>
    </ListGroup>
  );
}
