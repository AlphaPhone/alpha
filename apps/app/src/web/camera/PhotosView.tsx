// spec/camera/library.md, "Story: See my whole permitted library, newest first"; spec/camera/library.md, "Story: Be told honestly what Android lets Alpha read"; spec/camera/browse.md, "Story: Look at one photo"; spec/camera/browse.md, "Story: Change my photos in batches I confirm"; spec/camera/albums.md, "Story: Keep my photos in albums"; spec/camera/agentLibrary.md, "Story: Let the assistant point at photos I can see"; spec/camera/media.md, "Story: Ask Alpha about the photo I am looking at"
import type { Effect } from "effect";
import { ChevronLeft, Heart, Images, Mail, MessageSquare, Pencil, ScanText, Settings2, Share2, Sparkles, Trash2, Undo2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { Dialogs as Albums, Event as AlbumEvent } from "../../../gen/camera__albums.ts";
import type { Host } from "../../../gen/camera__agentLibrary.ts";
import type { Browse, Event as BrowseEvent, Tab } from "../../../gen/camera__browse.ts";
import { scopeOffer, type Catalog, type Row } from "../../../gen/camera__library.ts";
import type { Reviews } from "../../../gen/camera__libraryReview.ts";
import { messagesPictureLimit } from "../../../gen/camera__media.ts";
import { reviewText, type AgentPhotos } from "../../camera/agentPhotos.vibe";
import type { AlbumKey, PhotoLibrary } from "../../camera/library.vibe";
import type { MediaReview } from "../../camera/mediaReview.vibe";
import { daysLeft, viewerTitle } from "../../camera/photoGrid.vibe";
import { formatBytes } from "../../camera/messages.vibe";
import { Alert, Button, Dialog, DialogContent, DialogTitle, EmptyState, Input, Sheet, SheetContent, Tabs, TabsList, TabsTrigger } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { PhotoEditor, type PhotoEditorProps, type RunEditor } from "./PhotoEditor.tsx";
import { PhotoGrid } from "./PhotoGrid.tsx";
import { ScanReview, type ScanReviewProps } from "./ScanReview.tsx";
import { VideoEditor, type VideoEditorProps } from "./VideoEditor.tsx";

const ALBUMS: readonly { key: AlbumKey; label: string; match: (row: Row) => boolean }[] = [
  { key: "favorites", label: "Favorites", match: (row) => row.favorite },
  { key: "videos", label: "Videos", match: (row) => row.video },
  { key: "camera", label: "Camera", match: (row) => /(^|\/)DCIM\/Camera\//i.test(row.folder) },
  { key: "screenshots", label: "Screenshots", match: (row) => /Screenshots\//i.test(row.folder) },
];

/** Run one call of a Photos service. */
export type RunService<S> = (use: (service: S) => Effect.Effect<unknown>) => void;

/** Photos' whole screen: the catalog, the grid's state, the rows it shows, the one short line, every dialog's machine state and the services its controls call. */
export interface PhotosViewProps {
  /** The route Photos was opened on: `album:<key>`, `item:<id>` or `select:<id>,<id>`. */
  route?: string;
  /** The permitted library and Recently deleted, as the catalog Machine keeps them. */
  catalog: Catalog;
  /** The open tab, selection, viewer and change in flight. */
  browse: Browse;
  /** The rows the open list shows, in grid order. */
  rows: readonly Row[];
  /** The one short line over Photos. */
  said: string;
  /** The clock time the grid's day headings and Recently deleted's days left count from. */
  now: number;
  /** Messages is on this image (the AOSP build), so a small enough picture may be offered to it. */
  messages: boolean;
  /** The browser build: an image is chosen from files rather than Android's picker. */
  browser: boolean;
  /** Close Photos. */
  onClose: () => void;
  /** Whether the browse Machine allows an event now. */
  can: (event: BrowseEvent) => boolean;
  /** The album dialogs, once their Machine has published. */
  albums: Albums | undefined;
  /** Whether the album dialogs allow an event now. */
  canAlbum: (event: AlbumEvent) => boolean;
  /** The owner's own review of a library change. */
  reviews: Reviews | undefined;
  /** The assistant's album and share requests waiting for review. */
  host: Host | undefined;
  /** The photo editor, once its Machine has published. */
  photoEdit: PhotoEditorProps["state"] | undefined;
  /** Whether the photo editor allows an event now. */
  canEdit: PhotoEditorProps["can"];
  /** The video editor, once its Machine has published. */
  videoEdit: VideoEditorProps["state"] | undefined;
  /** Whether the video editor allows an event now. */
  canVideo: VideoEditorProps["can"];
  /** The scan dialogs, once their Machine has published. */
  dialogs: ScanReviewProps["dialogs"] | undefined;
  /** The scanned document, once its Machine has published. */
  scan: ScanReviewProps["scan"] | undefined;
  /** Whether the scan dialogs allow an event now. */
  canDialog: ScanReviewProps["can"];
  /** Whether the scanned document allows an event now. */
  canScan: ScanReviewProps["canScan"];
  /** The searchable review's text lines, read once the review is ready. */
  searchLines: ScanReviewProps["searchLines"];
  /** Follows the Photos visit while the grid is mounted. */
  visit: (element: HTMLElement | null) => void | (() => void);
  /** The photo library's controls. */
  library: RunService<PhotoLibrary.Shape>;
  /** The assistant's photo requests. */
  agent: RunService<AgentPhotos.Shape>;
  /** Asking, emailing or messaging about one photo. */
  media: RunService<MediaReview.Shape>;
  /** The scanner's controls. */
  scanner: ScanReviewProps["scanner"];
  /** The media editor's controls. */
  edit: RunEditor;
}

/**
 * Photos: the permitted library, albums and Recently deleted, the viewer and every reviewed change.
 * @model spec/camera/browse.md
 * @design design.md
 */
export function PhotosView({
  route, catalog, browse, rows, said, now, messages, browser, onClose, can, albums, canAlbum, reviews, host, photoEdit, canEdit, videoEdit, canVideo,
  dialogs, scan, canDialog, canScan, searchLines, visit, library, agent, media, scanner, edit,
}: PhotosViewProps) {
  const followRoute = useCallback((element: HTMLElement | null) => {
    if (element !== null && route !== undefined && route !== "") library((l) => l.openRoute(route));
  }, [route, library]);
  const [name, setName] = useState("");
  const offer = scopeOffer(catalog.scope, false, true, false);
  const viewer = rows.find((row) => row.id === browse.viewer);
  const viewerAt = viewer === undefined ? -1 : rows.indexOf(viewer);
  /** Move the viewer to the item `step` places along the list it was opened from. */
  const step = (by: number) => {
    const next = viewerAt < 0 ? undefined : rows[viewerAt + by];
    if (next !== undefined) library((l) => l.swipe(next.id));
  };
  const swipeFrom = useRef<number | null>(null);
  const editing = viewer !== undefined && viewer.video;
  const card = reviews !== undefined && reviews.review !== 0 && reviews.reviewAction !== ""
    ? { ...reviewText(reviews.reviewAction as "trash" | "share" | "favorite" | "unfavorite", reviews.reviewCount), count: reviews.reviewCount }
    : host !== undefined && host.albumReview.length > 0 ? { title: "Create album from the assistant?", detail: `${host.albumReview.length} ${host.albumReview.length === 1 ? "item" : "items"}`, count: host.albumReview.length }
    : host !== undefined && host.shareReview.length > 0 ? { title: `Share ${host.shareReview.length} ${host.shareReview.length === 1 ? "item" : "items"}?`, detail: "Android share sheet", count: host.shareReview.length }
    : undefined;
  return (
    <div ref={visit} className="flex h-full flex-col bg-background text-foreground">
      <span ref={followRoute} hidden />
      <header className="flex items-center gap-2 px-2 py-2">
        <Button variant="ghost" size="icon" aria-label={browse.album !== "" ? "Back to albums" : "Back to apps"} onClick={() => (browse.album !== "" ? library((l) => l.openAlbum(undefined)) : onClose())}><ChevronLeft /></Button>
        <h1 className="flex-1 font-display text-2xl">Photos</h1>
        {!browse.selecting && browse.album.startsWith("custom:") && (
          <Button variant="ghost" size="icon" aria-label="Album options" disabled={!canAlbum({ type: "openDialog", target: browse.album.slice("custom:".length), media: "", mediaRevision: "" })}
            onClick={() => { setName(""); library((l) => l.openAlbumDialog(browse.album.slice("custom:".length), false)); }}><Settings2 /></Button>
        )}
        {!browse.selecting && browse.tab === "LibraryTab" && (
          <Button variant="ghost" size="icon" aria-label={browser ? "Choose image" : "Scan image text"} onClick={() => scanner((s) => s.chooseImage())}><ScanText /></Button>
        )}
        {browse.selecting ? (
          <Button variant="ghost" onClick={() => library((l) => l.cancelSelection())}>Done</Button>
        ) : (
          <Button variant="ghost" disabled={!can({ type: "startSelection", id: rows[0]?.id ?? "" })} onClick={() => rows[0] !== undefined && library((l) => l.startSelection(rows[0]!.id))}>Select</Button>
        )}
      </header>

      <Tabs value={browse.tab} onValueChange={(tab) => library((l) => l.switchTab(tab as Tab))}>
        <TabsList className="mx-4">
          <TabsTrigger value="LibraryTab">Library</TabsTrigger>
          <TabsTrigger value="AlbumsTab">Albums</TabsTrigger>
          <TabsTrigger value="TrashTab">Recently deleted</TabsTrigger>
        </TabsList>
      </Tabs>

      {offer !== "NoScopeAction" && catalog.scope !== "ScopeFull" && catalog.scope !== "ScopeUnknown" && browse.tab === "LibraryTab" && (
        <Alert variant="info" className="mx-4 mt-2 flex items-center gap-2">
          <span className="flex-1">{catalog.scope === "ScopeSelected" ? "Selected items" : catalog.scope === "ScopePartial" ? "Mixed access" : "Not allowed"}</span>
          <Button size="sm" variant="secondary" onClick={() => library((l) => (offer === "OpenAndroidSettings" ? l.openSettings() : l.requestAccess()))}>
            {offer === "ChooseMoreItems" ? "Choose items or allow all" : offer === "AskForAccess" ? "Allow access" : "Change in Android Settings"}
          </Button>
        </Alert>
      )}

      {browse.filtered && (
        <button type="button" aria-label={`Clear filter ${browse.filterLabel}`} onClick={() => library((l) => l.clearFilter())}
          className={cn("mx-4 mt-2 flex items-center gap-2 self-start rounded-full bg-secondary px-3 py-1 text-sm", focusRing)}>
          <Sparkles aria-hidden className="size-4" />{browse.filterLabel}<X aria-hidden className="size-4" />
        </button>
      )}

      {said !== "" && <p role="status" className="mx-4 mt-2 rounded-md bg-muted px-3 py-2 text-sm">{said}</p>}

      {browse.tab === "AlbumsTab" && browse.album === "" ? (
        <ul className="grid grid-cols-2 gap-3 p-4" aria-label="Albums">
          {[...ALBUMS.map((album) => ({ key: album.key, label: album.label, count: catalog.main.rows.filter(album.match).length })),
            ...(albums?.albums ?? []).map((album) => ({ key: `custom:${album.id}` as AlbumKey, label: album.name, count: -1 }))].map((album) => (
            <li key={album.key}>
              <button type="button" onClick={() => library((l) => l.openAlbum(album.key))}
                className={cn("flex w-full flex-col items-start gap-1 rounded-xl bg-card p-4 text-left", focusRing)}>
                <Images aria-hidden />
                <span className="font-display">{album.label}</span>
                {album.count >= 0 && <span className="font-mono text-xs text-muted-foreground">{album.count}</span>}
              </button>
            </li>
          ))}
          <li>
            <Button variant="outline" className="h-full w-full" disabled={!canAlbum({ type: "openDialog", target: "", media: "", mediaRevision: "" })}
              onClick={() => { setName(""); library((l) => l.openAlbumDialog("", false)); }}>New album</Button>
          </li>
        </ul>
      ) : rows.length === 0 ? (
        <EmptyState title={catalog.main.loading ? "Loading" : browse.tab === "TrashTab" ? (catalog.trash.failed ? "Couldn’t load" : "Empty") : catalog.main.failed ? "Couldn’t load photos" : browse.filtered ? "No matches" : "No photos"} icon={<Images />}>
          {browse.tab === "TrashTab" && catalog.trash.failed && <Button onClick={() => library((l) => l.retryTrash())}>Try again</Button>}
          {browse.tab !== "TrashTab" && !catalog.main.loading && catalog.main.failed && <Button onClick={() => library((l) => l.refresh())}>Retry loading photos</Button>}
        </EmptyState>
      ) : (
        <PhotoGrid rows={rows} selection={browse.selection} selecting={browse.selecting} columns={browse.columns} now={now}
          onOpen={(id) => library((l) => l.openViewer(id))} onToggle={(id) => library((l) => l.toggle(id))}
          onHold={(id) => library((l) => l.startSelection(id))} onDrag={(anchor, id) => library((l) => l.dragTo(anchor, id))} onPinch={(wider) => library((l) => l.pinch(wider))} />
      )}

      {browse.tab !== "AlbumsTab" && (browse.tab === "TrashTab" ? catalog.trash.continueAt : catalog.main.continueAt) !== "" && (
        <Button variant="ghost" className="mx-auto mb-2" onClick={() => library((l) => (browse.tab === "TrashTab" ? l.moreTrash() : l.more()))}>Show more</Button>
      )}

      {browse.selecting && (
        <footer className="flex items-center justify-around border-t border-border p-2" aria-label="Selection">
          <span className="font-mono text-xs uppercase">{browse.selection.length}</span>
          <Button variant="ghost" disabled={!can({ type: "selectAll" })} onClick={() => library((l) => l.selectAll())}>Select all</Button>
          {browse.tab === "TrashTab" ? (
            <>
              <Button variant="ghost" disabled={!can({ type: "beginChange", change: "RestoreChange", count: 1 })} onClick={() => library((l) => l.restore())}><Undo2 />Restore</Button>
              <Button variant="ghost" disabled={!can({ type: "prepareDelete" })} onClick={() => library((l) => l.prepareDelete())}><Trash2 />Delete</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" aria-label="Share" disabled={!can({ type: "beginShare" })} onClick={() => library((l) => l.share())}><Share2 /></Button>
              <Button variant="ghost" size="icon" aria-label="Favorite" disabled={browse.selection.length === 0 || browse.work !== "NoWork"} onClick={() => library((l) => l.favorite())}><Heart /></Button>
              <Button variant="ghost" size="icon" aria-label="Add to album" disabled={browse.selection.length === 0} onClick={() => { setName(""); library((l) => l.openAlbumDialog("", true)); }}><Images /></Button>
              <Button variant="ghost" size="icon" aria-label="Move to trash" disabled={!can({ type: "beginChange", change: "TrashChange", count: 1 })} onClick={() => library((l) => l.trash())}><Trash2 /></Button>
            </>
          )}
        </footer>
      )}

      {browse.undo.length > 0 && !browse.selecting && (
        <Button variant="secondary" className="mx-auto mb-2" onClick={() => library((l) => l.undo())}><Undo2 />Undo</Button>
      )}

      <Sheet open={viewer !== undefined} onOpenChange={(open) => { if (!open) library((l) => l.closeViewer()); }}>
        <SheetContent side="full" title={viewer === undefined ? "Photo" : `${viewerTitle(viewer.rank, now).day} ${viewerTitle(viewer.rank, now).time}`}>
          {viewer !== undefined && (
            <>
              <div className="flex flex-1 touch-pan-y items-center justify-center bg-foreground" tabIndex={-1}
                onKeyDown={(event) => { if (event.key === "ArrowLeft") step(-1); else if (event.key === "ArrowRight") step(1); }}
                onPointerDown={(event) => { swipeFrom.current = event.clientX; }}
                onPointerUp={(event) => {
                  const from = swipeFrom.current;
                  swipeFrom.current = null;
                  if (from !== null && Math.abs(event.clientX - from) > 48) step(event.clientX < from ? 1 : -1);
                }}>
                {viewer.video ? (browse.playable === "" ? <img src={viewer.image} alt="" className="max-h-full max-w-full object-contain" /> : <video src={browse.playable} poster={viewer.image === "" ? undefined : viewer.image} controls playsInline className="max-h-full max-w-full" />) : <img src={viewer.image} alt="" className="max-h-full max-w-full object-contain" />}
              </div>
              <p className="px-4 font-mono text-xs uppercase text-muted-foreground">
                {[viewer.width > 0 ? `${viewer.width} × ${viewer.height}` : "", formatBytes(viewer.size), viewer.expiresAt > 0 ? `${daysLeft(viewer.expiresAt, now)} days left` : ""].filter((part) => part !== "").join(" · ")}
              </p>
              <footer className="flex justify-around p-2">
                {browse.tab !== "TrashTab" && <Button variant="ghost" size="icon" aria-label="Share" onClick={() => library((l) => l.shareOne(viewer.id))}><Share2 /></Button>}
                {browse.tab !== "TrashTab" && !viewer.video && <Button variant="ghost" size="icon" aria-label="Ask Alpha" onClick={() => media((m) => m.askAboutPhoto(viewer.id))}><Sparkles /></Button>}
                {browse.tab !== "TrashTab" && !viewer.video && <Button variant="ghost" size="icon" aria-label="Email" onClick={() => media((m) => m.emailPhoto(viewer.id))}><Mail /></Button>}
                {browse.tab !== "TrashTab" && !viewer.video && messages && viewer.size > 0 && viewer.size <= messagesPictureLimit && <Button variant="ghost" size="icon" aria-label="Send in Messages" onClick={() => media((m) => m.messagePhoto(viewer.id))}><MessageSquare /></Button>}
                {browse.tab === "TrashTab" ? (
                  <>
                    <Button variant="ghost" size="icon" aria-label="Recover" onClick={() => library((l) => l.viewerChange("restore"))}><Undo2 /></Button>
                    <Button variant="ghost" size="icon" aria-label="Delete forever" onClick={() => library((l) => l.viewerChange("delete"))}><Trash2 /></Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => edit((e) => (viewer.video ? e.beginVideo(viewer.id) : e.begin(viewer.id)))}><Pencil /></Button>
                    <Button variant="ghost" size="icon" aria-label={viewer.favorite ? "Remove from favorites" : "Favorite"} aria-pressed={viewer.favorite} onClick={() => library((l) => l.viewerChange("favorite"))}><Heart className={viewer.favorite ? "fill-current" : undefined} /></Button>
                    <Button variant="ghost" size="icon" aria-label="Add to album" onClick={() => { setName(""); library((l) => l.viewerChange("album")); }}><Images /></Button>
                    <Button variant="ghost" size="icon" aria-label="Move to trash" onClick={() => library((l) => l.viewerChange("trash"))}><Trash2 /></Button>
                  </>
                )}
              </footer>
            </>
          )}
        </SheetContent>
      </Sheet>

      {card !== undefined && (
        <div role="dialog" aria-label={card.title} className="fixed inset-x-4 bottom-24 z-40 flex flex-col gap-2 rounded-xl bg-card p-4 text-card-foreground shadow-lg">
          <strong>{card.title}</strong>
          <p className="text-sm text-muted-foreground">{card.detail}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => agent((a) => a.cancel())}>Cancel</Button>
            <Button onClick={() => agent((a) => a.confirm())}>Confirm</Button>
          </div>
        </div>
      )}

      {albums !== undefined && (
        <Dialog open={albums.stage !== "DialogClosed"} onOpenChange={(open) => { if (!open) library((l) => l.albumEvent({ type: "closeDialog", gen: albums.generation })); }}>
          <DialogContent>
            <DialogTitle>{albums.stage === "CreateAlbum" ? "New album" : albums.stage === "ChooseAlbum" ? "Add to album" : albums.stage === "ConfirmDelete" ? "Delete album?" : "Album"}</DialogTitle>
            {(albums.stage === "CreateAlbum" || albums.stage === "ManageAlbum") && (
              <Input aria-label="Album name" maxLength={80} value={name === "" ? albums.name : name}
                onChange={(event) => { setName(event.target.value); const trimmed = event.target.value.trim(); library((l) => l.albumEvent({ type: "rename", gen: albums.generation, name: trimmed, nameOk: trimmed.length >= 1 && trimmed.length <= 80 && !/[\u0000-\u001f\u007f]/.test(trimmed) })); }} />
            )}
            {albums.stage === "ChooseAlbum" && (
              <ul className="flex flex-col gap-1">
                {albums.albums.map((album) => (
                  <li key={album.id}><Button variant="ghost" className="w-full justify-start" disabled={!canAlbum({ type: "chooseAlbum", gen: albums.generation, target: album.id })} onClick={() => library((l) => l.albumEvent({ type: "chooseAlbum", gen: albums.generation, target: album.id }))}>{album.name}</Button></li>
                ))}
                <li><Button variant="outline" className="w-full" onClick={() => library((l) => l.albumEvent({ type: "chooseCreate", gen: albums.generation }))}>New album</Button></li>
              </ul>
            )}
            {albums.stage === "ConfirmDelete" && <p className="text-sm text-muted-foreground">The photos stay in your library.</p>}
            <div className="flex justify-end gap-2">
              {albums.stage === "ManageAlbum" && <Button variant="ghost" disabled={!canAlbum({ type: "askDelete", gen: albums.generation })} onClick={() => library((l) => l.albumEvent({ type: "askDelete", gen: albums.generation }))}>Delete</Button>}
              {albums.stage === "ConfirmDelete" && <Button variant="destructive" loading={albums.busy} onClick={() => library((l) => l.albumEvent({ type: "confirmDelete", gen: albums.generation }))}>Delete album</Button>}
              {(albums.stage === "CreateAlbum" || albums.stage === "ManageAlbum") && <Button loading={albums.busy} disabled={!canAlbum({ type: "save", gen: albums.generation })} onClick={() => library((l) => l.albumEvent({ type: "save", gen: albums.generation }))}>Save</Button>}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={browse.work === "Deleting"} onOpenChange={(open) => { if (!open) library((l) => l.cancelDelete()); }}>
        <DialogContent>
          <DialogTitle>{`Delete ${browse.deleting.length} ${browse.deleting.length === 1 ? "item" : "items"} permanently?`}</DialogTitle>
          <p className="text-sm text-muted-foreground">This removes the media from the device for every app and cannot be undone by Alpha.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => library((l) => l.cancelDelete())}>Cancel</Button>
            <Button variant="destructive" onClick={() => library((l) => l.confirmDelete())}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {photoEdit !== undefined && <PhotoEditor state={photoEdit} can={canEdit} editor={edit} />}
      {editing && videoEdit !== undefined && <VideoEditor state={videoEdit} can={canVideo} source={browse.playable} editor={edit} />}
      {dialogs !== undefined && scan !== undefined && <ScanReview dialogs={dialogs} scan={scan} can={canDialog} canScan={canScan} searchLines={searchLines} scanner={scanner} />}
    </div>
  );
}
