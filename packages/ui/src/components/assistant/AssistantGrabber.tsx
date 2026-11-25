import type { ComponentProps } from "react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Mark } from "../Mark.tsx";
import { type AssistantPull, useAssistantPull } from "./assistant-pull.ts";
export type { AssistantRelease } from "./assistant-pull.ts";

type Press = { now: number };

export type AssistantGrabberProps = Omit<ComponentProps<"button">, "children" | "disabled" | "onClick" | "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onLostPointerCapture"> & AssistantPull & {
  /** The resting dock opens by its mark. The sheet uses a resize handle. */
  variant?: "mark" | "handle";
  /** The click a button receives, which may be the late click of a gesture just ended. */
  onTap?: (press: Press & { keyboard: boolean }) => void;
};

/**
 * The handle of Ask Alpha: it reports a finger pressing, dragging, lifting or released as plain facts with their time;
 * the dock's rules choose where Ask Alpha lands.
 * @model spec/app/assistant/dock.md
 */
export function AssistantGrabber({ variant = "handle", onPress, onDrag, onRelease, onLift, onCancel, onTap, className, ...props }: AssistantGrabberProps) {
  const pull = useAssistantPull<HTMLButtonElement>({ onPress, onDrag, onRelease, onLift, onCancel });
  return (
    <button
      type="button"
      aria-label={variant === "mark" ? "Open conversation" : "Resize chat"}
      className={cn(focusRing, "flex size-11 shrink-0 touch-none justify-center", variant === "mark" ? "items-center overflow-hidden rounded-full bg-alpha text-alpha-foreground" : "cursor-grab items-start rounded-sm px-0.5 pt-1.5", className)}
      {...pull}
      onClick={(event) => onTap?.({ now: event.timeStamp, keyboard: event.detail === 0 })}
      {...props}
    >
      {variant === "mark" ? <Mark aria-hidden className="size-[118%] shrink-0" /> : <span aria-hidden className="h-1 w-10 rounded-full bg-muted-foreground/45" />}
    </button>
  );
}
