// spec/telephony/messages.md, "Delete passes the exact listed row after confirmation, and an unconfirmed delete keeps the row and blocks another"; spec/telephony/messages.md, "A local bubble lasts until the provider lists its row, the send is refused, or the visit ends"
import { Check, Copy, Image as ImageIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MessageRow } from "../../../gen/telephony__messages.ts";
import { Button } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { longWhen, messageSegments } from "./present.ts";

export interface MessageBubbleProps {
  /** The provider row, or a local send waiting for its row. */
  row: Pick<MessageRow, "id" | "outgoing" | "body" | "pictures" | "complete" | "condition" | "date">;
  /** A local bubble: dimmed while sending, with no menu. */
  local?: boolean;
  /** This row's Copy and Delete menu is open, and whether Delete is confirming. */
  menu?: "closed" | "open" | "confirming";
  /** Delete is refused for this row after an unconfirmed delete. */
  deleteBlocked?: boolean;
  /** A delete is running. */
  deleting?: boolean;
  /** Toggle the menu: tap, long-press or the context-menu key. */
  onMenu?: () => void;
  /** Ask, cancel and confirm Delete. */
  onDeleteAsked?: () => void;
  onDeleteCancelled?: () => void;
  onDeleteConfirmed?: () => void;
  /** Open a credential-free link in Alpha's Browser, only on the owner's tap. */
  onLink?: (href: string) => void;
}

const STATUS = { Received: "", PendingOut: "Sending…", SentOut: "Sent", FailedOut: "Not sent", DeliveredOut: "Delivered" } as const;

/**
 * One message: its text as text with safe links, a picture count, its send status, and Copy and Delete below it.
 * @model spec/telephony/messages.md
 * @design design.md
 */
export function MessageBubble({ row, local = false, menu = "closed", deleteBlocked = false, deleting = false, onMenu, onDeleteAsked, onDeleteCancelled, onDeleteConfirmed, onLink }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  if (!row.complete) return <p className="self-start rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">Use the system messaging app to view this message.</p>;
  const status = local ? "Sending…" : STATUS[row.condition];
  return (
    <div className={cn("flex max-w-[80%] flex-col gap-1", row.outgoing ? "self-end items-end" : "self-start items-start", local && "opacity-70")}>
      <div
        role={local ? undefined : "button"}
        tabIndex={local ? undefined : 0}
        aria-haspopup={local ? undefined : "menu"}
        aria-expanded={local ? undefined : menu !== "closed"}
        aria-label={row.body ? `Message actions: ${row.body}` : "Picture message actions"}
        title={longWhen(row.date)}
        onClick={(event) => {
          if ((event.target as Element).closest("a") || local) return;
          onMenu?.();
        }}
        onContextMenu={(event) => {
          if (local) return;
          event.preventDefault();
          onMenu?.();
        }}
        onKeyDown={(event) => {
          if (local || !(event.key === "Enter" || event.key === " " || event.key === "ContextMenu")) return;
          event.preventDefault();
          onMenu?.();
        }}
        className={cn(focusRing, "rounded-xl px-3 py-2 whitespace-pre-wrap break-words", row.outgoing ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground")}
      >
        {row.pictures > 0 && (
          <span className="flex items-center gap-1 text-sm"><ImageIcon aria-hidden className="size-4" />{row.pictures > 1 ? `${row.pictures} pictures` : "Picture"}</span>
        )}
        {messageSegments(row.body).map((part, index) =>
          part.href ? (
            <a key={index} href={part.href} onClick={(event) => { event.preventDefault(); onLink?.(part.href!); }} className="text-primary underline">{part.text}</a>
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
      </div>
      {status && <span className="font-mono text-xs uppercase text-muted-foreground">{status}</span>}
      {menu === "open" && (
        <div role="menu" className="flex gap-1">
          {row.body && (
            <Button
              role="menuitem"
              variant="ghost"
              size="sm"
              onClick={() => void navigator.clipboard.writeText(row.body).then(() => setCopied(true), () => setCopied(false))}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          )}
          <Button role="menuitem" variant="ghost" size="sm" disabled={deleteBlocked} onClick={onDeleteAsked}><Trash2 aria-hidden />Delete</Button>
        </div>
      )}
      {menu === "confirming" && (
        <div role="alertdialog" aria-label="Delete this message?" className="flex gap-1">
          <Button variant="ghost" size="sm" disabled={deleting} onClick={onDeleteCancelled}>Cancel</Button>
          <Button variant="destructive" size="sm" loading={deleting} onClick={onDeleteConfirmed}>Delete</Button>
        </div>
      )}
    </div>
  );
}
