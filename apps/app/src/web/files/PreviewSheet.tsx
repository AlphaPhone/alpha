// spec/files/preview.md, "Story: Do something with the file I am looking at"; spec/files/preview.md, "The content shown is the reply for this opening"; spec/files/preview.md, "The document viewer opens over the preview and closes exactly once"; spec/files/pdf.md, "A page is shown only from the newest request's reply, and only within the page count"
import { ChevronLeft, ChevronRight, ExternalLink, FolderInput, Info, Mail, MessageSquare, MoreVertical, Pencil, RotateCcw, Share2, Sparkles, Trash2, X } from "lucide-react";
import type { PreviewState } from "../../../gen/files__preview.ts";
import type { PdfPages } from "../../../gen/files__pdf.ts";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Sheet, SheetContent, Spinner } from "../components/ui/index.ts";
import { formatSize, pageText, previewText, shortDate, typeLabel } from "./format.ts";

/** Which of the file's actions are offered. */
export interface PreviewActions {
  readonly share: boolean;
  readonly email: boolean;
  readonly message: boolean;
  readonly ask: boolean;
  readonly move: boolean;
  readonly rename: boolean;
  readonly trash: boolean;
  readonly elsewhere: boolean;
  readonly reselect: boolean;
}

export type PreviewSheetProps = {
  preview: PreviewState;
  pages: PdfPages;
  actions: PreviewActions;
  /** "Open in Android" on the phone, "Download file" in the browser. */
  elsewhereLabel: string;
  /** The volume and folders the file is in, when Files knows them. */
  location: string;
  /** A change is in flight. */
  busy?: boolean;
  onClose: () => void;
  onPage: (page: number) => void;
  onShare: () => void;
  onEmail: () => void;
  onMessage: () => void;
  onAsk: () => void;
  onMove: () => void;
  onRename: () => void;
  onDetails: () => void;
  onTrash: () => void;
  onElsewhere: () => void;
  onReselect: () => void;
  onForget: () => void;
  onViewer: (open: boolean) => void;
};

/**
 * The file the owner opened: its text, picture, recording or PDF page, and one menu of what it allows.
 * @model spec/files/preview.md
 */
export function PreviewSheet({ preview, pages, actions, elsewhereLabel, location, busy = false, onClose, onPage, onShare, onEmail, onMessage, onAsk, onMove, onRename, onDetails, onTrash, onElsewhere, onReselect, onForget, onViewer }: PreviewSheetProps) {
  const doc = preview.doc;
  const viewable = preview.body.startsWith("blob:");
  const meta = [typeLabel(doc.mimeType, doc.kind), doc.size >= 0 ? formatSize(doc.size) : "", shortDate(doc.modified), location].filter(Boolean).join(" · ");
  return (
    <Sheet open={preview.shown} onOpenChange={(open) => !open && !preview.renaming && onClose()}>
      <SheetContent side="full" title={doc.name} hideTitle>
        <header className="flex items-center gap-2 px-2">
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} disabled={preview.renaming}><X className="size-5" /></Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-serif text-xl">{doc.name}</h2>
            <p className="truncate text-sm text-muted-foreground">{meta}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="File actions" disabled={busy || preview.renaming}><MoreVertical className="size-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.share && <DropdownMenuItem onSelect={onShare}><Share2 className="size-4" />Share</DropdownMenuItem>}
              {actions.move && <DropdownMenuItem onSelect={onMove}><FolderInput className="size-4" />Add to folder</DropdownMenuItem>}
              {actions.email && <DropdownMenuItem onSelect={onEmail}><Mail className="size-4" />Email</DropdownMenuItem>}
              {actions.message && <DropdownMenuItem onSelect={onMessage}><MessageSquare className="size-4" />Messages</DropdownMenuItem>}
              {actions.ask && <DropdownMenuItem onSelect={onAsk}><Sparkles className="size-4" />Ask Alpha</DropdownMenuItem>}
              {actions.elsewhere && <DropdownMenuItem onSelect={onElsewhere}><ExternalLink className="size-4" />{elsewhereLabel}</DropdownMenuItem>}
              {actions.rename && <DropdownMenuItem onSelect={onRename}><Pencil className="size-4" />Rename</DropdownMenuItem>}
              <DropdownMenuItem onSelect={onDetails}><Info className="size-4" />Details</DropdownMenuItem>
              {(actions.trash || doc.source !== "Browsed") && <DropdownMenuSeparator />}
              {actions.trash && <DropdownMenuItem destructive onSelect={onTrash}><Trash2 className="size-4" />Delete</DropdownMenuItem>}
              {doc.source !== "Browsed" && <DropdownMenuItem onSelect={onForget}>Remove from Recent</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {preview.content === "ContentReading" && <div className="flex justify-center py-8"><Spinner label="Reading the file" /></div>}
          {preview.content === "ContentText" && <pre className="font-legible text-base whitespace-pre-wrap break-words">{preview.body}</pre>}
          {preview.content === "ContentMedia" && doc.kind === "KindImage" && <img src={preview.body} alt={doc.name} className="mx-auto max-h-full object-contain" />}
          {preview.content === "ContentMedia" && doc.kind === "KindVideo" && <video src={preview.body} controls playsInline aria-label={doc.name} className="mx-auto max-h-full" />}
          {preview.content === "ContentMedia" && doc.kind === "KindAudio" && <audio src={preview.body} controls aria-label={doc.name} className="w-full" />}
          {preview.content === "ContentPdf" && pages.shown && (
            <figure className="flex flex-col items-center gap-2">
              <img src={pages.image} alt={`${doc.name}, page ${pages.page + 1}`} className="max-w-full" />
              <figcaption className="flex items-center gap-2">
                <Button variant="ghost" size="icon" aria-label="Previous page" disabled={pages.pending || pages.page === 0} onClick={() => onPage(pages.page - 1)}><ChevronLeft className="size-5" /></Button>
                <span className="text-sm tabular-nums" aria-live="polite">Page {pages.page + 1} of {pages.count}</span>
                <Button variant="ghost" size="icon" aria-label="Next page" disabled={pages.pending || pages.page + 1 >= pages.count} onClick={() => onPage(pages.page + 1)}><ChevronRight className="size-5" /></Button>
              </figcaption>
            </figure>
          )}
          {pages.pending && preview.content === "ContentPdf" && <Spinner label="Rendering the page" />}
          {preview.content === "ContentUnavailable" && (
            <p role="status" className="py-8 text-center text-sm text-muted-foreground">
              {doc.kind === "KindPdf" ? pageText(pages.outcome) : viewable ? "This file has no preview here." : previewText(preview.body)}
            </p>
          )}
          {preview.content === "ContentUnavailable" && viewable && (
            <div className="flex justify-center"><Button variant="outline" onClick={() => onViewer(true)}>View document</Button></div>
          )}
          {actions.reselect && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p role="status" className="text-sm">The file was renamed, but access to it ended. Select the renamed file to check it and continue.</p>
              <Button onClick={onReselect}><RotateCcw className="size-4" />Select again</Button>
            </div>
          )}
        </div>
        {preview.viewer && viewable && (
          <div role="dialog" aria-label="Selected document" className="fixed inset-0 z-50 flex flex-col bg-background">
            <iframe title={doc.name} sandbox="" src={preview.body} className="min-h-0 flex-1 border-0" />
            <div className="flex justify-end p-2"><Button autoFocus onClick={() => onViewer(false)}>Done</Button></div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
