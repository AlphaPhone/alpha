// spec/clock/vocabulary.md, "Repeat days are distinct days from Sunday as 1 to Saturday as 7, and none means one time"
import { Toggle } from "../components/ui/index.ts";
import { DAY_NAMES } from "./text.ts";

export type DayPickerProps = {
  /** The chosen days, Sunday as 1 to Saturday as 7; none is a one-time alarm. */
  days: readonly number[];
  onChange: (days: number[]) => void;
  /** Days cannot be chosen, such as when the phone's Clock handoff takes no repeat days. */
  disabled?: boolean;
};

/** The repeat-day chips, Monday first. */
export function DayPicker({ days, onChange, disabled = false }: DayPickerProps) {
  return (
    <div role="group" aria-label="Repeat" className="flex justify-between gap-1">
      {[2, 3, 4, 5, 6, 7, 1].map((day) => (
        <Toggle
          key={day}
          aria-label={`Repeat on ${DAY_NAMES[day - 1]}`}
          pressed={days.includes(day)}
          disabled={disabled}
          onPressedChange={(on) => onChange(on ? [...days, day].sort((a, b) => a - b) : days.filter((d) => d !== day))}
          className="size-10 rounded-full font-mono text-xs uppercase"
        >
          {DAY_NAMES[day - 1].slice(0, 2)}
        </Toggle>
      ))}
    </div>
  );
}
