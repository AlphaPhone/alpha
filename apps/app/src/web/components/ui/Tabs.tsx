import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export const Tabs = TabsPrimitive.Root;

export type TabsListProps = ComponentProps<typeof TabsPrimitive.List>;

/** The row of tabs; the selected one is underlined in the accent. */
export function TabsList({ className, ...props }: TabsListProps) {
  return <TabsPrimitive.List className={cn("flex gap-4 border-b border-border", className)} {...props} />;
}

export type TabsTriggerProps = ComponentProps<typeof TabsPrimitive.Trigger>;

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return <TabsPrimitive.Trigger className={cn(focusRing, "-mb-px border-b-2 border-transparent py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground", className)} {...props} />;
}

export const TabsContent = TabsPrimitive.Content;
