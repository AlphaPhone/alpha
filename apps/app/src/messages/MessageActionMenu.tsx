import { Trash2, createLucideIcon } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type Ref } from "react";
import type { CopyReport } from "./messages.vibe";

export interface MessageActions {
  copy?: ((report: CopyReport) => void) | undefined;
  remove?: (() => void) | undefined;
  covered?: boolean;
}

interface MessageActionMenuProps {
  actions: MessageActions;
  focusOnOpen: boolean;
  close: () => void;
  ref?: Ref<HTMLDivElement>;
}

/** Copy and Copied glyphs drawn as strokes, while Delete uses Lucide's trash-2. */
const CopyGlyph = createLucideIcon({ name: "MessageCopy", node: [["path", { key: "copy", d: "M9 9h11v11H9zM5 15H4V4h11v1" }]] });
const CopiedGlyph = createLucideIcon({ name: "MessageCopied", node: [["path", { key: "check", d: "M5 12l5 5 9-10" }]] });

const actionItem = "flex min-h-11 shrink-0 items-center gap-2 rounded-option px-3.5 text-sm leading-normal font-semibold whitespace-nowrap transition-colors duration-fast pointer-fine:hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-accent";

// spec/app/messages/index.md, "Copy puts a message's text on the clipboard, Call opens Phone with the number, and a message Alpha cannot show opens in the messaging app; none changes anything here"
export function MessageActionMenu({ actions, focusOnOpen, close, ref }: MessageActionMenuProps) {
  const [copy, setCopy] = useState<Parameters<CopyReport>[0] | "pending">();
  const copyAttemptRef = useRef(0);
  const handleKey = (event: KeyboardEvent) => {
    const key = event.key;
    if (key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    if (items.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const current = items.findIndex((item) => item === item.ownerDocument.activeElement);
    const step = key === "ArrowLeft" ? -1 : 1;
    const next = key === "Home" ? 0 : key === "End" ? items.length - 1 : (current + step + items.length) % items.length;
    items.at(next)?.focus();
  };

  return (
    <div ref={ref} data-alpha-sms-actions role="menu" aria-label="Message actions" className={`mt-2 flex max-w-full overflow-x-auto rounded-md bg-secondary p-1 leading-normal${copy === "failed" ? " flex-wrap" : ""}`} onKeyDown={handleKey}>
      {actions.copy && <button type="button" role="menuitem" autoFocus={focusOnOpen} className={`${actionItem} min-w-25`} disabled={copy === "pending"} onClick={() => {
        const attempt = ++copyAttemptRef.current;
        setCopy("pending");
        actions.copy?.((outcome) => { if (attempt === copyAttemptRef.current) setCopy(outcome); });
      }}>{copy === "copied" ? <><CopiedGlyph aria-hidden className="size-4" />Copied!</> : <><CopyGlyph aria-hidden className="size-4" />Copy</>}</button>}
      {actions.remove && <button type="button" role="menuitem" autoFocus={focusOnOpen && !actions.copy} className={`${actionItem} text-hangup`} onClick={actions.remove}><Trash2 aria-hidden className="size-4" />Delete</button>}
      <span role="status" className={copy === "failed" ? "basis-full px-2 pb-1 text-caption text-muted-foreground" : "sr-only"}>{copy === "copied" ? "Copied." : copy === "failed" ? "Copy failed" : ""}</span>
    </div>
  );
}
