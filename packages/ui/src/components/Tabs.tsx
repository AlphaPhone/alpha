import type { ComponentProps } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn, focusRing } from "../lib/cn.ts";

export type TabsProps = ComponentProps<typeof TabsPrimitive.Root>;
export type TabsListProps = ComponentProps<typeof TabsPrimitive.List>;
export type TabsTriggerProps = ComponentProps<typeof TabsPrimitive.Trigger>;
export type TabsContentProps = ComponentProps<typeof TabsPrimitive.Content>;

/** Views of one thing, one shown at a time: holds a `TabsList` and a `TabsContent` for each value. */
export function Tabs({ className, ...props }: TabsProps) {
  return <TabsPrimitive.Root className={cn("flex flex-col gap-4", className)} {...props} />;
}

/** The segmented control that switches the view: a `TabsTrigger` for each. Name it with `aria-label`. */
export function TabsList({ className, ...props }: TabsListProps) {
  return <TabsPrimitive.List className={cn("flex rounded-full bg-secondary p-1", className)} {...props} />;
}

/** One segment: pressing it shows the `TabsContent` of the same value. */
export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        focusRing,
        "min-h-11 min-w-11 flex-1 rounded-full px-4 text-sm font-semibold text-muted-foreground transition-colors duration-fast ease-standard disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

/** What one segment shows. */
export function TabsContent({ className, ...props }: TabsContentProps) {
  return <TabsPrimitive.Content className={cn(focusRing, "rounded-lg", className)} {...props} />;
}
