import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;

export type DropdownMenuContentProps = ComponentProps<typeof MenuPrimitive.Content>;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: DropdownMenuContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content sideOffset={sideOffset} className={cn("z-50 min-w-44 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md", className)} {...props} />
    </MenuPrimitive.Portal>
  );
}

export type DropdownMenuItemProps = ComponentProps<typeof MenuPrimitive.Item> & { destructive?: boolean };

export function DropdownMenuItem({ className, destructive, ...props }: DropdownMenuItemProps) {
  return <MenuPrimitive.Item className={cn("flex h-10 cursor-default items-center gap-2 rounded-sm px-2 text-sm outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent", destructive && "text-destructive", className)} {...props} />;
}

export const DropdownMenuSeparator = ({ className, ...props }: ComponentProps<typeof MenuPrimitive.Separator>) => <MenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
