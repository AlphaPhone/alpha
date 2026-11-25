import { type ComponentProps, useRef } from "react";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "../lib/cn.ts";
import { floatingPanel, floatingRow } from "../lib/styles.ts";

export type MenuProps = ComponentProps<typeof MenuPrimitive.Root>;
export type MenuTriggerProps = ComponentProps<typeof MenuPrimitive.Trigger>;
export type MenuContentProps = ComponentProps<typeof MenuPrimitive.Content>;
export type MenuItemProps = ComponentProps<typeof MenuPrimitive.Item> & {
  /** Marks an action that cannot be taken back, such as Delete. */
  destructive?: boolean;
};

/** The actions of one thing, opened from a button: holds a `MenuTrigger` and a `MenuContent`. */
export function Menu(props: MenuProps) {
  return <MenuPrimitive.Root {...props} />;
}

/** Opens the menu; pass `asChild` to use a `Button`. */
export const MenuTrigger = MenuPrimitive.Trigger;

/** The floating list of `MenuItem`s. Escape, a press outside and choosing an item close it. */
export function MenuContent({ align = "end", sideOffset = 0, collisionPadding = 8, className, ...props }: MenuContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content align={align} sideOffset={sideOffset} collisionPadding={collisionPadding} className={cn(floatingPanel, "flex min-w-50 flex-col", className)} {...props} />
    </MenuPrimitive.Portal>
  );
}

/**
 * One action of a menu; an icon before its words is decorative. A touch chooses it only when the touch began on it:
 * the tap that opened the menu lands its click on whichever item opened under the finger, and is not a choice.
 */
export function MenuItem({ destructive = false, className, onPointerDown, onClick, ...props }: MenuItemProps) {
  const pressed = useRef(false);
  return (
    <MenuPrimitive.Item
      className={cn(floatingRow, "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5", destructive && "text-destructive", className)}
      onPointerDown={(event) => {
        pressed.current = true;
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        const touched = "pointerType" in event.nativeEvent && (event.nativeEvent.pointerType === "touch" || event.nativeEvent.pointerType === "pen");
        const began = pressed.current;
        pressed.current = false;
        if (touched && !began) event.preventDefault();
        else onClick?.(event);
      }}
      {...props}
    />
  );
}
