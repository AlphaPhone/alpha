// spec/app/notes/actions.md, "Story: Share a note"; spec/app/maps/index.md, "The card shares the place or the arrival time, opens its website, or opens it in the phone's maps app"
import { Button, Dialog, DialogClose, DialogContent, DialogTitle } from "@repo/ui";
import { X } from "lucide-react";
import { useSyncExternalStore, type ComponentType, type CSSProperties } from "react";
import { desktopPreview } from "./canvas.vibe";

/** One place the share panel sends to, in the order it is listed. */
export interface ShareDestination {
  readonly label: string;
  readonly Icon: ComponentType<{ readonly "aria-hidden"?: boolean; readonly className?: string }>;
  readonly choose: () => void;
}

/** Alpha's share panel, as v119's openSharePanel drew it: "Share", a close button and one row for each destination, over the dock and inside the desktop preview. */
export function SharePanel({ open, close, destinations, restore }: {
  readonly open: boolean;
  readonly close: () => void;
  readonly destinations: readonly ShareDestination[];
  /** Puts the focus back where the owner opened the panel; without it the dialog returns the focus itself. */
  readonly restore?: () => void;
}) {
  const preview = useSyncExternalStore(desktopPreview.subscribe, desktopPreview.snapshot, () => undefined);
  let style: CSSProperties | undefined;
  if (preview !== undefined) {
    const panelBottom = preview.top + (preview.height - 108) * preview.scale - 8;
    style = {
      left: Math.max(12, preview.left + 12),
      width: Math.max(0, preview.width * preview.scale - 24),
      bottom: `max(12px, calc(100dvh - ${panelBottom}px))`,
      maxHeight: Math.max(0, panelBottom - preview.top - 16),
    };
  }
  return <Dialog open={open} onOpenChange={(shown) => { if (!shown) close(); }}>
    <DialogContent aria-describedby={undefined} overlayClassName="bg-foreground/35 dark:bg-background/35" style={style}
      className="inset-x-auto top-auto bottom-[calc(max(6.75rem,var(--alpha-dock-overlap,0px),var(--alpha-safe-bottom,env(safe-area-inset-bottom)))+--spacing(2))] left-3 mx-0 max-h-[80dvh] w-[calc(100vw_-_--spacing(6))] max-w-[calc(100vw_-_2em_-_6px)] translate-y-0 gap-0 overflow-y-auto rounded-panel bg-background p-5 text-md shadow-none"
      onCloseAutoFocus={restore === undefined ? undefined : (event) => { event.preventDefault(); restore(); }}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <DialogTitle className="font-sans text-2xl font-bold">Share</DialogTitle>
        <DialogClose asChild><Button size="icon" variant="secondary" className="size-11 rounded-full text-md" aria-label="Close share"><X className="size-5.5" /></Button></DialogClose>
      </div>
      <div className="flex flex-col gap-2">
        {destinations.map(({ label, Icon, choose }) =>
          <Button key={label} variant="secondary" className="h-auto min-h-13 justify-start gap-3 rounded-lg px-4 py-3.5 text-md font-normal" onClick={choose}>
            <Icon aria-hidden className="size-5.25" />{label}
          </Button>)}
      </div>
    </DialogContent>
  </Dialog>;
}
