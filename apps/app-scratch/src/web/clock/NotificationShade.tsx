// spec/clock/notifications.md, "Story: Act on exactly the notification I see"; spec/clock/notifications.md, "Story: Ask Alpha about one of its notifications"
import { Bell, MessageCircleQuestion, X } from "lucide-react";
import { canAsk, canClearAll, clearableKeys, reviewable, type NoticeRow, type Shade } from "../../../gen/clock__notifications.ts";
import { Button, EmptyState, ListRow, Sheet, SheetContent } from "../components/ui/index.ts";
import { noticeReport } from "./text.ts";

/** The shade's current visit and rows, and the owner's action on each row. */
export type NotificationShadeProps = {
  /** The shade's visit and the rows listed for it. */
  shade: Shade;
  onOpenChange: (open: boolean) => void;
  onPress: (row: NoticeRow) => void;
  onSwipe: (row: NoticeRow) => void;
  onClearAll: () => void;
  onSelect: (row: NoticeRow) => void;
  onAsk: (row: NoticeRow) => void;
};

const time = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/**
 * The current notifications of Alpha and the apps the owner chose, acted on row by row.
 * @model spec/clock/notifications.md
 */
export function NotificationShade({ shade, onOpenChange, onPress, onSwipe, onClearAll, onSelect, onAsk }: NotificationShadeProps) {
  const report = noticeReport(shade.report);
  return (
    <Sheet open={shade.open} onOpenChange={onOpenChange}>
      <SheetContent side="top" title="Notifications" hideTitle className="max-h-[80dvh] px-3 pb-4">
        {shade.rows.length === 0 ? <EmptyState title={shade.failed ? "Unavailable" : "No notifications"} icon={<Bell className="size-8" />} /> : (
          <ul className="flex flex-col overflow-y-auto">
            {shade.rows.map((row) => (
              <li key={`${row.source}:${row.id}`} className="flex items-center" onPointerDown={() => { if (row.source === "OwnNotice" && row.opaque) onSelect(row); }}>
                <ListRow
                  className="flex-1"
                  leading={<Bell aria-hidden className="size-5" />}
                  title={row.source === "ExternalNotice" ? row.appLabel : row.title || "Alpha Phone"}
                  detail={row.source === "ExternalNotice" && row.title !== row.appLabel ? [row.title, row.text].filter(Boolean).join(" · ") : row.text}
                  trailing={time(row.at)}
                  onClick={() => onPress(row)}
                />
                {reviewable(row) && (
                  <Button variant="ghost" size="icon" aria-label={`Ask Alpha about this ${row.appLabel || "Alpha Phone"} notification`} disabled={!canAsk(shade, row.id, row.revision)} onClick={() => onAsk(row)}>
                    <MessageCircleQuestion aria-hidden className="size-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" aria-label={`Dismiss ${row.title || row.appLabel}`} disabled={shade.acting} onClick={() => onSwipe(row)}><X aria-hidden className="size-4" /></Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between px-2">
          <p role="status" className="text-sm text-muted-foreground">{report}</p>
          <Button variant="ghost" size="sm" disabled={!canClearAll(shade, clearableKeys(shade))} onClick={onClearAll}>Clear all</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
