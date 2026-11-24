// spec/app/photos/viewer.md, "Story: Look at a photo or video"; spec/app/photos/viewer.md, "Story: Share what I am looking at"
import { Alert, Button, Dialog, DialogContent, DialogTitle, Spinner } from "@repo/ui";
import { ChevronLeft, ChevronRight, Heart, Info, Share2, Trash2, X } from "lucide-react";
import { useMachine } from "../../gen/app__photos__viewer.react.ts";
import { type PhotosProps, lengthOf, seenOf } from "./shown.ts";

/** The size of a file as the owner reads it. */
function sized(bytes: number): string {
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * The Viewer over Photos: the item open, full screen, with its neighbours in the order Photos lists them, its info,
 * and its favourite, share and delete; each control offered exactly when the rules take it from the owner.
 * @model spec/app/photos/viewer.md
 */
export function Viewer({ runtime, rows }: PhotosProps & { rows: readonly number[] }) {
  const { state, can, send } = useMachine(runtime);
  if (!state || state.open === 0) return null;
  const owner = <E extends Parameters<typeof can>[0]>(event: E) => can(event, "Owner");
  const tell = <E extends Parameters<typeof send>[0]>(event: E) => void send(event, "Owner");
  const at = rows.indexOf(state.open);
  const newer = at > 0 ? rows[at - 1] : undefined;
  const older = at >= 0 ? rows[at + 1] : undefined;
  const seen = seenOf(runtime, state.open)?.item;
  const loaded = state.read.status === "Loaded";
  const video = state.kind === "Clip";
  const close = { type: "close" } as const;
  const trash = { type: "trashOpen", neighbour: older ?? newer ?? 0 } as const;
  const swipe = (neighbour: number | undefined) => (neighbour === undefined ? undefined : ({ type: "swipe", neighbour } as const));
  const toNewer = swipe(newer);
  const toOlder = swipe(older);
  const zoom = { type: "zoomTo", level: state.zoom === 1 ? 2 : 1 } as const;
  return (
    <Dialog open onOpenChange={(opened) => { if (!opened && owner(close)) tell(close); }}>
      <DialogContent aria-describedby={undefined} className="flex h-full max-h-none w-full max-w-none flex-col gap-3 rounded-none bg-background p-3">
        <div className="flex items-center gap-1">
          {owner(close) && <Button variant="ghost" size="icon" aria-label="Close" onClick={() => tell(close)}><X /></Button>}
          <DialogTitle className="flex-1 truncate text-base">{seen ? new Date(seen.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : video ? "Video" : "Photo"}</DialogTitle>
          {owner({ type: "toggleInfo" }) && <Button variant="ghost" size="icon" aria-label="Info" aria-pressed={state.info} onClick={() => tell({ type: "toggleInfo" })}><Info /></Button>}
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          {state.gone ? (
            <Alert variant="info">This item was deleted</Alert>
          ) : state.read.status === "Failed" ? (
            <Alert variant="destructive" className="items-center">
              <span className="flex-1">This item couldn't be read</span>
              {owner({ type: "reload" }) && <Button size="sm" variant="outline" onClick={() => tell({ type: "reload" })}>Try again</Button>}
            </Alert>
          ) : !loaded ? (
            <Spinner label={video ? "Loading video" : "Loading photo"} />
          ) : seen?.image ? (
            <img
              src={seen.image}
              alt={video ? "Video" : "Photo"}
              onDoubleClick={owner(zoom) ? () => tell(zoom) : undefined}
              className="max-h-full max-w-full object-contain transition-transform duration-fast ease-standard"
              style={{ transform: `scale(${state.zoom})` }}
            />
          ) : null}
          {video && loaded && <span className="absolute bottom-2 left-2 rounded-full bg-foreground/60 px-2 text-sm text-background">{lengthOf(state.duration)}</span>}
          {toNewer && owner(toNewer) && <Button variant="secondary" size="icon" aria-label="Newer" className="absolute left-0" onClick={() => tell(toNewer)}><ChevronLeft /></Button>}
          {toOlder && owner(toOlder) && <Button variant="secondary" size="icon" aria-label="Older" className="absolute right-0" onClick={() => tell(toOlder)}><ChevronRight /></Button>}
        </div>
        {state.info && seen && (
          <dl aria-label="Details" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {seen.name ? <><dt className="text-muted-foreground">Name</dt><dd className="truncate">{seen.name}</dd></> : null}
            <dt className="text-muted-foreground">Size</dt><dd>{seen.width} × {seen.height}, {sized(seen.size)}</dd>
            {seen.folder ? <><dt className="text-muted-foreground">Folder</dt><dd className="truncate">{seen.folder}</dd></> : null}
          </dl>
        )}
        <div role="toolbar" aria-label="Change this item" className="flex justify-around">
          {owner({ type: "toggleFavourite" }) && (
            <Button variant="ghost" aria-pressed={state.favourite} onClick={() => tell({ type: "toggleFavourite" })}>
              <Heart className={state.favourite ? "fill-current" : undefined} />{state.favourite ? "Unfavourite" : "Favourite"}
            </Button>
          )}
          {owner({ type: "share" }) && <Button variant="ghost" onClick={() => tell({ type: "share" })}><Share2 />Share</Button>}
          {owner(trash) && <Button variant="ghost" onClick={() => tell(trash)}><Trash2 />Delete</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
