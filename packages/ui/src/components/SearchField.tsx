import { Search, X } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { Button } from "./Button.tsx";
import { Input, type InputProps } from "./Input.tsx";

export type SearchFieldProps = Omit<InputProps, "type" | "value" | "defaultValue" | "onChange"> & {
  /** What is being looked for; the parent keeps it. */
  value: string;
  /** Called with the text as it is typed, and with "" when it is cleared. */
  onValueChange: (value: string) => void;
  /** The accessible name of the clear button. */
  clearLabel?: string;
};

/** A field that finds or filters: the text between a search icon and a button that clears it. Name it with `aria-label`; `ref` reaches the field, to focus it. */
export function SearchField({ value, onValueChange, clearLabel = "Clear", disabled, className, ...props }: SearchFieldProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search aria-hidden className="pointer-events-none absolute left-4 size-5 text-muted-foreground" />
      <Input
        type="search"
        enterKeyHint="search"
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        className="px-12 [&::-webkit-search-cancel-button]:appearance-none"
        {...props}
      />
      {value ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={clearLabel}
          disabled={disabled}
          className="absolute right-0.5 text-muted-foreground"
          onClick={(event) => {
            onValueChange("");
            event.currentTarget.parentElement?.querySelector("input")?.focus();
          }}
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}
