import { type ComponentProps, useCallback, useRef } from "react";
import { cn } from "../../lib/cn.ts";

export type HomeCardRowProps = ComponentProps<"section">;

/** The daily overview above Home's tiles: the cards that are drawn, in order, in a row that scrolls sideways. */
export function HomeCardRow({ className, ref, onScroll, onPointerDown, onTouchStart, onWheel, onKeyDown, ...props }: HomeCardRowProps) {
  const interactedRef = useRef(false);
  const pinStart = (node: HTMLElement) => {
    if (!interactedRef.current && !node.contains(node.ownerDocument.activeElement) && node.scrollLeft !== 0) {
      node.scrollLeft = 0;
    }
  };
  const rowRef = useCallback((node: HTMLElement | null) => {
    const cleanup = typeof ref === "function" ? ref(node) : undefined;
    if (ref && typeof ref !== "function") ref.current = node;
    if (!node) return typeof cleanup === "function" ? cleanup : undefined;
    pinStart(node);
    if (typeof MutationObserver === "undefined") return typeof cleanup === "function" ? cleanup : undefined;
    const observer = new MutationObserver(() => pinStart(node));
    observer.observe(node, { childList: true });
    return () => {
      observer.disconnect();
      if (typeof cleanup === "function") cleanup();
      else if (ref && typeof ref !== "function") ref.current = null;
    };
  }, [ref]);
  return (
    <section
      ref={rowRef}
      aria-label="Your day"
      onPointerDown={(event) => {
        interactedRef.current = true;
        onPointerDown?.(event);
      }}
      onTouchStart={(event) => {
        interactedRef.current = true;
        onTouchStart?.(event);
      }}
      onWheel={(event) => {
        interactedRef.current = true;
        onWheel?.(event);
      }}
      onKeyDown={(event) => {
        interactedRef.current = true;
        onKeyDown?.(event);
      }}
      onScroll={(event) => {
        pinStart(event.currentTarget);
        onScroll?.(event);
      }}
      className={cn("-my-2 flex shrink-0 touch-pan-x snap-x snap-mandatory scroll-px-[calc(var(--alpha-home-spacing,var(--spacing))*6)] gap-[calc(var(--alpha-home-spacing,var(--spacing))*3)] overflow-x-auto px-[calc(var(--alpha-home-spacing,var(--spacing))*6)] py-2 [overflow-anchor:none] [scrollbar-width:none] not-has-[button]:hidden after:w-[calc(var(--alpha-home-spacing,var(--spacing))*3)] after:shrink-0", className)}
      {...props}
    />
  );
}
