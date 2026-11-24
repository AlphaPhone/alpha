import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "../Button.tsx";

export type StartupAssistantSurfaceProps = {
  /** The conversation with Ask Alpha, which the assistant area draws. */
  children?: ReactNode;
  /** Ends the assistant surface; offered once Alpha knows it is one. */
  onClose?: () => void;
};

/**
 * The surface Android shows when the assistant is called: chat and a way to close it, and nothing of Home.
 * @model spec/app/startup/index.md
 */
export function StartupAssistantSurface({ children, onClose }: StartupAssistantSurfaceProps) {
  return (
    <div className="flex size-full min-h-0 flex-1 flex-col bg-background pt-[env(safe-area-inset-top)] text-foreground">
      <div className="flex shrink-0 justify-end px-2 pt-2">
        <Button variant="ghost" size="icon" aria-label="Close" disabled={!onClose} onClick={onClose}>
          <X />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
