// spec/shell/navigation.md, "The stand-in shade opens only over Home"
import { X } from "lucide-react";
import { Button } from "../components/ui/index.ts";

/** The browser build's development stand-in for Android's shade. */
export interface StandInShadeProps {
  open: boolean;
  onClose: () => void;
}

/** The development browser's stand-in for Android's shade; never in a product build. */
export function StandInShade({ open, onClose }: StandInShadeProps) {
  if (!open) return null;
  return (
    <section role="dialog" aria-modal="true" aria-label="Notifications (development stand-in)" data-alpha-stand-in-shade
      className="absolute inset-x-0 top-0 z-40 flex flex-col gap-3 rounded-b-xl bg-card p-4 text-card-foreground shadow-lg" data-alpha-header>
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Development shade</h2>
        <Button variant="ghost" size="icon" aria-label="Close notifications" onClick={onClose}><X aria-hidden className="size-5" /></Button>
      </div>
      <p className="text-sm text-muted-foreground">Android draws its own shade on a phone.</p>
    </section>
  );
}
