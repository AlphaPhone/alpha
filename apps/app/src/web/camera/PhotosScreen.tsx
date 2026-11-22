// spec/camera/library.md, "Story: See my whole permitted library, newest first"; spec/camera/library.md, "Story: Be told honestly what Android lets Alpha read"; spec/camera/browse.md, "Story: Look at one photo"; spec/camera/browse.md, "Story: Change my photos in batches I confirm"; spec/camera/albums.md, "Story: Keep my photos in albums"; spec/camera/agentLibrary.md, "Story: Let the assistant point at photos I can see"; spec/camera/media.md, "Story: Ask Alpha about the photo I am looking at"
import { Effect } from "effect";
import { ChevronLeft, Heart, Images, Mail, MessageSquare, Pencil, Share2, Sparkles, Trash2, Undo2, X } from "lucide-react";
import { useState } from "react";
import { useMachine as useCatalog } from "../../../gen/camera__library.react.ts";
import { useMachine as useBrowse } from "../../../gen/camera__browse.react.ts";
import { useMachine as useAlbums } from "../../../gen/camera__albums.react.ts";
import { useMachine as useReviews } from "../../../gen/camera__libraryReview.react.ts";
import { useMachine as useHost } from "../../../gen/camera__agentLibrary.react.ts";
import { useMachine as useNotices } from "../../../gen/camera__notices.react.ts";
import { scopeOffer, type Catalog, type Row } from "../../../gen/camera__library.ts";
import type { Browse, Tab } from "../../../gen/camera__browse.ts";
import { AgentPhotos, reviewText } from "../../camera/agentPhotos.vibe";
import { MediaEditor } from "../../camera/editor.vibe";
import { PhotoLibrary, type AlbumKey } from "../../camera/library.vibe";
import { MediaReview } from "../../camera/mediaReview.vibe";
import { daysLeft, viewerTitle } from "../../camera/photoGrid.vibe";
import { formatBytes } from "../../camera/messages.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { Alert, Button, Dialog, DialogContent, DialogTitle, EmptyState, Input, Sheet, SheetContent, Tabs, TabsList, TabsTrigger } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { PhotoEditor, VideoEditor } from "./Editors.tsx";
import { PhotoGrid } from "./PhotoGrid.tsx";
import { cameraRuntime, run } from "./runtime.ts";

const library = (use: (l: PhotoLibrary.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(PhotoLibrary), use));
const agent = (use: (a: AgentPhotos.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(AgentPhotos), use));
const media = (use: (m: MediaReview.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(MediaReview), use));
const edit = (use: (e: MediaEditor.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(MediaEditor), use));

/** Follow the Photos visit and the page's visibility while the grid is mounted. */
function mountPhotos(element: HTMLElement | null): void | (() => void) {
  if (element === null) return;
  library((l) => l.enter());
  agent((a) => a.visit(true));
  const visibility = () => {
    library((l) => l.visibility(document.hidden));
    agent((a) => a.page(document.hidden));
    media((m) => (document.hidden ? m.invalidate("AppPaused") : m.resume()));
  };
  document.addEventListener("visibilitychange", visibility);
  return () => {
    document.removeEventListener("visibilitychange", visibility);
    agent((a) => a.visit(false));
    library((l) => l.leave());
  };
}

const ALBUMS: readonly { key: AlbumKey; label: string; match: (row: Row) => boolean }[] = [
  { key: "favorites", label: "Favorites", match: (row) => row.favorite },
  { key: "videos", label: "Videos", match: (row) => row.video },
  { key: "camera", label: "Camera", match: (row) => /(^|\/)DCIM\/Camera\//i.test(row.folder) },
  { key: "screenshots", label: "Screenshots", match: (row) => /Screenshots\//i.test(row.folder) },
];

export interface PhotosViewProps {
  catalog: Catalog;
  browse: Browse;
  /** The rows the open list shows, in grid order. */
  rows: readonly Row[];
  /** The one short line over Photos. */
  said: string;
  now: number;
  onClose: () => void;
}

/**
 * Photos: the permitted library, albums and Recently deleted, the viewer and every reviewed change.
 * @model spec/camera/browse.md
 * @design design.md
 */
export function PhotosView({ catalog, browse, rows, said, now, onClose }: PhotosViewProps) {
  const { can } = useBrowse(cameraRuntime);
  const { state: albums, can: canAlbum } = useAlbums(cameraRuntime);
  const { state: reviews } = useReviews(cameraRuntime);
  const { state: host } = useHost(cameraRuntime);
  const [name, setName] = useState("");
  const [openedAlbum, setOpenedAlbum] = useState<AlbumKey | undefined>(undefined);
  const offer = scopeOffer(catalog.scope, false, true, false);
  const viewer = rows.find((row) => row.id === browse.viewer);
  const editing = viewer !== undefined && viewer.video;
  const card = reviews !== undefined && reviews.review !== 0 && reviews.reviewAction !== ""
    ? { ...reviewText(reviews.reviewAction as "trash" | "share" | "favorite" | "unfavorite", reviews.reviewCount), count: reviews.reviewCount }
    : host !== undefined && host.albumReview.length > 0 ? { title: "Create album from the assistant?", detail: `${host.albumReview.length} ${host.albumReview.length === 1 ? "item" : "items"}`, count: host.albumReview.length }
    : host !== undefined && host.shareReview.length > 0 ? { title: `Share ${host.shareReview.length} ${host.shareReview.length === 1 ? "item" : "items"}?`, detail: "Android share sheet", count: host.shareReview.length }
    : undefined;
  return (
    <div ref={mountPhotos} className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-2 py-2">
        <Button variant="ghost" size="icon" aria-label="Back to apps" onClick={onClose}><ChevronLeft /></Button>
        <h1 className="flex-1 font-serif text-2xl">Photos</h1>
        {browse.selecting ? (
          <Button variant="ghost" onClick={() => library((l) => l.cancelSelection())}>Done</Button>
        ) : (
          <Button variant="ghost" disabled={!can({ type: "startSelection", id: rows[0]?.id ?? "" })} onClick={() => rows[0] !== undefined && library((l) => l.startSelection(rows[0]!.id))}>Select</Button>
        )}
      </header>

      <Tabs value={browse.tab} onValueChange={(tab) => { setOpenedAlbum(undefined); library((l) => l.switchTab(tab as Tab)); }}>
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

      {browse.tab === "AlbumsTab" && openedAlbum === undefined ? (
        <ul className="grid grid-cols-2 gap-3 p-4" aria-label="Albums">
          {[...ALBUMS.map((album) => ({ key: album.key, label: album.label, count: catalog.main.rows.filter(album.match).length })),
            ...(albums?.albums ?? []).map((album) => ({ key: `custom:${album.id}` as AlbumKey, label: album.name, count: -1 }))].map((album) => (
            <li key={album.key}>
              <button type="button" onClick={() => { setOpenedAlbum(album.key); library((l) => l.openAlbum(album.key)); }}
                className={cn("flex w-full flex-col items-start gap-1 rounded-xl bg-card p-4 text-left", focusRing)}>
                <Images aria-hidden />
                <span className="font-serif">{album.label}</span>
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
        <EmptyState title={catalog.main.loading ? "Loading" : browse.tab === "TrashTab" ? (catalog.trash.failed ? "Couldn’t load" : "Empty") : "No photos"} icon={<Images />}>
          {browse.tab === "TrashTab" && catalog.trash.failed && <Button onClick={() => library((l) => l.retryTrash())}>Try again</Button>}
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
              <div className="flex flex-1 items-center justify-center bg-foreground">
                {viewer.video ? <video src={viewer.image} controls className="max-h-full max-w-full" /> : <img src={viewer.image} alt="" className="max-h-full max-w-full object-contain" />}
              </div>
              <p className="px-4 font-mono text-xs uppercase text-muted-foreground">
                {[viewer.width > 0 ? `${viewer.width} × ${viewer.height}` : "", formatBytes(viewer.size), viewer.expiresAt > 0 ? `${daysLeft(viewer.expiresAt, now)} days left` : ""].filter((part) => part !== "").join(" · ")}
              </p>
              <footer className="flex justify-around p-2">
                <Button variant="ghost" size="icon" aria-label="Share" onClick={() => library((l) => l.shareOne(viewer.id))}><Share2 /></Button>
                {!viewer.video && <Button variant="ghost" size="icon" aria-label="Ask Alpha" onClick={() => media((m) => m.askAboutPhoto(viewer.id))}><Sparkles /></Button>}
                {!viewer.video && <Button variant="ghost" size="icon" aria-label="Email" onClick={() => media((m) => m.emailPhoto(viewer.id))}><Mail /></Button>}
                {!viewer.video && <Button variant="ghost" size="icon" aria-label="Send in Messages" onClick={() => media((m) => m.messagePhoto(viewer.id))}><MessageSquare /></Button>}
                <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => edit((e) => (viewer.video ? e.beginVideo(viewer.id) : e.begin(viewer.id)))}><Pencil /></Button>
                <Button variant="ghost" size="icon" aria-label="Info" onClick={() => { setName(""); library((l) => l.openAlbumDialog("", false)); }}><Images /></Button>
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

      <PhotoEditor />
      {editing && <VideoEditor source={viewer.image} />}
    </div>
  );
}

/**
 * The Photos app.
 * @model spec/camera/library.md
 */
export function PhotosScreen({ onClose }: ScreenProps) {
  const { state: catalog } = useCatalog(cameraRuntime);
  const { state: browse } = useBrowse(cameraRuntime);
  const { state: notices } = useNotices(cameraRuntime);
  if (catalog === undefined || browse === undefined) return null;
  const now = Date.now();
  const pool = new Set(browse.pool);
  const rows = (browse.tab === "TrashTab" ? catalog.trash.rows : catalog.main.rows).filter((row) => pool.has(row.id));
  return <PhotosView catalog={catalog} browse={browse} rows={rows} said={notices?.said ?? ""} now={now} onClose={onClose} />;
}
