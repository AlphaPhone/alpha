import type { ComponentProps } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { field, floatingPanel, floatingRow } from "../lib/styles.ts";

export type SelectProps = ComponentProps<typeof SelectPrimitive.Root>;
export type SelectTriggerProps = Omit<ComponentProps<typeof SelectPrimitive.Trigger>, "children"> & {
  /** Shown while nothing is chosen. */
  placeholder?: string;
  /** Marks the choice as refused, visibly and through `aria-invalid`. */
  invalid?: boolean;
};
export type SelectContentProps = ComponentProps<typeof SelectPrimitive.Content>;
export type SelectItemProps = ComponentProps<typeof SelectPrimitive.Item>;

/** One choice out of many, shown closed as the one chosen: holds a `SelectTrigger` and a `SelectContent` of `SelectItem`s. */
export function Select(props: SelectProps) {
  return <SelectPrimitive.Root {...props} />;
}

/** The field that shows the choice and opens the list. Name it with a `Label` or `aria-label`. */
export function SelectTrigger({ placeholder, invalid = false, className, ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger aria-invalid={invalid || undefined} className={cn(field, "flex h-12 items-center justify-between gap-2 text-left data-placeholder:text-muted-foreground", className)} {...props}>
      <span className="truncate">
        <SelectPrimitive.Value placeholder={placeholder} />
      </span>
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/** The floating list of `SelectItem`s, as wide as its trigger. */
export function SelectContent({ position = "popper", sideOffset = 8, collisionPadding = 8, className, children, ...props }: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(floatingPanel, "max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden", className)}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1.5">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

/** One choice of the list; the chosen one carries a check. */
export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item className={cn(floatingRow, "justify-between", className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator>
        <Check aria-hidden className="size-5 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
