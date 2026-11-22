// spec/shell/navigation.md, "A layer is listed once, closes with its owner or with Back, and holds the phone while open"; spec/shell/gestures.md, "A sheet follows a drag down its grip and closes past the dismiss distance"; spec/shell/focus.md, "A closed modal returns focus to its opener, and never over a control that took it"
import { useRef, useState, type ReactNode } from "react";
import { sheetRelease } from "../../../gen/shell__gestures.ts";
import { Sheet, SheetContent } from "../components/ui/index.ts";

export interface InlineSheetProps {
  /** The sheet's accessible name and one title. */
  title: string;
  /** Whether the shell lists the sheet as open (`useLayer`). */
  open: boolean;
  /** The owner closes the sheet: Escape, the scrim, a drag past the dismiss distance or its own controls. */
  onClose: () => void;
  /** The sheet is the topmost layer, so Escape and drags reach it. */
  top?: boolean;
  children: ReactNode;
}

/** A bottom sheet that owns the phone while open, moves with a drag of its grip and returns focus when it closes. */
export function InlineSheet({ title, open, onClose, top = true, children }: InlineSheetProps) {
  const start = useRef<{ id: number; x: number; y: number; grip: boolean } | null>(null);
  const [pulled, setPulled] = useState(0);
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next && top) onClose(); }}>
      <SheetContent
        side="bottom"
        title={title}
        data-alpha-sheet
        style={pulled > 0 ? { translate: `0 ${pulled}px` } : undefined}
        onPointerDown={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const grip = event.clientY <= box.top + 80 && (event.target as Element).closest("button,input,textarea,select,a") === null;
          start.current = { id: event.pointerId, x: event.clientX, y: event.clientY, grip };
          if (grip) event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = start.current;
          if (!drag || drag.id !== event.pointerId || !drag.grip) return;
          const down = event.clientY - drag.y;
          if (Math.abs(event.clientX - drag.x) > Math.max(16, Math.abs(down))) { start.current = { ...drag, grip: false }; setPulled(0); return; }
          setPulled(Math.max(0, down));
        }}
        onPointerUp={(event) => {
          const drag = start.current;
          start.current = null;
          setPulled(0);
          if (!drag || drag.id !== event.pointerId) return;
          if (sheetRelease(top, drag.grip, false, Math.max(0, event.clientY - drag.y)) === "SheetCloses") onClose();
        }}
        onPointerCancel={() => { start.current = null; setPulled(0); }}
      >
        <div className="flex flex-col gap-2 overflow-y-auto px-5 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
