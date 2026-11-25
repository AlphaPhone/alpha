// spec/app/photos/index.md, "Story: Browse the library"; spec/app/photos/index.md, "Story: Select photos"; spec/app/photos/index.md, "Story: Change albums from what I am looking at"
import { Effect } from "effect";
import { Album, ChevronLeft, ChevronRight, Ellipsis, Folder, Heart, Image, Images, ListChecks, Plus, ScanText, Search, Share2, Trash2, Undo2, X } from "lucide-react";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { Alert, AppHeader, Button, Chip, ConfirmDialog, Dialog, DialogContent, DialogTitle, EmptyState, Input, ListRow, Menu, MenuContent, MenuItem, MenuTrigger, Sheet, SheetContent, Spinner, cn, dockClearance } from "@repo/ui";
import { useMachine as useLibrary } from "../../gen/app__photos.react.ts";
import { useMachine as useTrash } from "../../gen/app__photos__trash.react.ts";
import { useMachine as useAgent } from "../../gen/app__photos__agent.react.ts";
import { useMachine as useViewer } from "../../gen/app__photos__viewer.react.ts";
import type { Event, Filter } from "../../gen/app__photos.ts";
import type { Event as TrashEvent } from "../../gen/app__photos__trash.ts";
import type { Shown, Resident } from "../runtime/area.tsx";
import { Time } from "../runtime/time.vibe";
import { Catalog } from "./catalog.vibe";
import { MediaGrid } from "./Grid.tsx";
import { MediaViewer } from "./Viewer.tsx";
import type { agentPhotos } from "./agent.vibe";
import { consumeImageChoice, importImageChoice, PhotoChooser, type library } from "./photos.vibe";
import { native } from "../platform/device.vibe";
import { renderBrowserPhoto, type BrowserEditFrame } from "../platform/photoCanvas.vibe";
import type { trash } from "./trash.vibe";
import type { viewer } from "./viewer.vibe";
import type { Layer } from "effect";
import { Scan } from "../files/Scan.tsx";
import { scanSelectedImage, type imageScan } from "../files/scan.vibe";
import { useMachine as useScan } from "../../gen/app__files__scan.react.ts";

type PhotosRuntime = Layer.Success<typeof agentPhotos> | Layer.Success<typeof library> | Layer.Success<typeof viewer> | Layer.Success<typeof trash> | Layer.Success<typeof imageScan> | Resident;

interface Tool {
  readonly icon: ReactNode;
  readonly label: string;
  readonly run: () => void;
}

function ToolBar({ tools }: { tools: readonly Tool[] }) {
  return (
    <div role="toolbar" aria-label="Selection actions" className={cn("flex shrink-0 justify-around gap-1 border-t border-border bg-background px-2 pt-2", dockClearance)}>
      {tools.map(({ icon, label, run }) => <Button key={label} variant="ghost" className="h-auto min-h-12 flex-col gap-1 px-2 py-1 text-xs" onClick={run}>{icon}{label}</Button>)}
    </div>
  );
}

type PhotosProps = Shown<PhotosRuntime>;

const imageTypes = "image/jpeg,image/png,image/webp";

type ImagePreview = { readonly source: File; readonly frame: BrowserEditFrame; readonly reading: AbortSignal };

interface ImageChoiceProps {
  readonly runtime: PhotosProps["runtime"];
  readonly choice: number;
  readonly canScan: boolean;
  readonly close: () => void;
  readonly focusTools: () => void;
}

/** Choose one source, then use either its prepared copy or the original in scan review. */
function ImageChoice({ runtime, choice, canScan, close, focusTools }: ImageChoiceProps) {
  const readingRef = useRef<AbortController | undefined>(undefined);
  const ownsPickerRef = useRef(false);
  const [picture, show] = useState<ImagePreview>();
  const [status, describe] = useState("");
  const finishPick = useCallback(() => {
    if (!ownsPickerRef.current) return false;
    ownsPickerRef.current = false;
    return runtime.runSync(Effect.flatMap(PhotoChooser, (picker) => picker.finish()));
  }, [runtime]);
  const connect = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    return () => { readingRef.current?.abort(); finishPick(); };
  }, [finishPick]);
  const pickerInput = useCallback((node: HTMLInputElement | null) => {
    if (!node) return;
    const cancel = () => { finishPick(); };
    node.addEventListener("cancel", cancel);
    return () => node.removeEventListener("cancel", cancel);
  }, [finishPick]);
  function beginPick(event: React.MouseEvent<HTMLInputElement>) {
    if (ownsPickerRef.current) return;
    if (runtime.runSync(Effect.flatMap(PhotoChooser, (picker) => picker.begin()))) ownsPickerRef.current = true;
    else event.preventDefault();
  }
  async function prepare(source: File | undefined) {
    if (!finishPick() || source === undefined) return;
    readingRef.current?.abort();
    const reading = new AbortController();
    readingRef.current = reading;
    show(undefined);
    if (!imageTypes.split(",").includes(source.type) || source.size === 0 || source.size > 16 * 1024 * 1024) {
      describe("Choose a JPEG, PNG or WebP image up to 16 MB.");
      return;
    }
    describe("Checking image…");
    const prepared = await runtime.runPromiseExit(Effect.tryPromise(() => renderBrowserPhoto(source, { turns: 0, look: "none", whiteBackground: true })), { signal: reading.signal });
    if (reading.signal.aborted) return;
    if (prepared._tag !== "Success") { describe("Unsupported image."); return; }
    show({ source, frame: prepared.value, reading: reading.signal });
    describe(`${source.name} · ${prepared.value.width} × ${prepared.value.height} copy`);
  }
  async function scan() {
    if (!picture || picture.reading.aborted) return;
    finishPick();
    const chosen = await runtime.runPromiseExit(consumeImageChoice(choice));
    if (chosen._tag !== "Success" || !chosen.value) return;
    await runtime.runPromiseExit(Effect.flatMap(PhotoChooser, (picker) => picker.begin()).pipe(Effect.flatMap((began) =>
      began ? scanSelectedImage(picture.source) : Effect.void)));
  }
  function save() {
    if (!picture || picture.reading.aborted) return;
    finishPick();
    void runtime.runPromiseExit(importImageChoice(choice, picture.frame, `${picture.source.name.replace(/\.[^.]+$/, "") || "Photo"}.jpg`));
  }
  return <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
    <DialogContent ref={connect} aria-describedby={undefined} onCloseAutoFocus={(event) => { event.preventDefault(); focusTools(); }}>
      <DialogTitle>Choose an image</DialogTitle>
      <Input ref={pickerInput} type="file" aria-label="Image file" accept={imageTypes} onClick={beginPick} onChange={(event) => {
        const selected = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        void prepare(selected);
      }} />
      {picture && <img src={picture.frame.thumbnail} alt="Selected image preview" className="max-h-56 w-full object-contain" />}
      {status && <p role="status" aria-label="Image import status" className="text-sm text-muted-foreground">{status}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button disabled={!picture} onClick={save}>Save to Photos</Button>
        <Button variant="secondary" disabled={!picture || !canScan} onClick={() => { void scan(); }}>Scan text</Button>
        <Button variant="ghost" onClick={close}>Cancel</Button>
      </div>
    </DialogContent>
  </Dialog>;
}

/** The Library, Albums and Recently deleted, with the viewer and edit surfaces over the grid. */
export function Photos({ runtime, alpha }: PhotosProps) {
  const library = useLibrary(runtime);
  const trash = useTrash(runtime);
  const viewer = useViewer(runtime);
  const agent = useAgent(runtime);
  const scan = useScan(runtime);
  const scanInput = useRef<HTMLInputElement>(null);
  const scanPicker = useCallback((node: HTMLInputElement | null) => {
    scanInput.current = node;
    if (!node) return;
    const cancel = () => { runtime.runSync(Effect.flatMap(PhotoChooser, (picker) => picker.finish())); };
    node.addEventListener("cancel", cancel);
    return () => node.removeEventListener("cancel", cancel);
  }, [runtime]);
  const toolsRef = useRef<HTMLButtonElement>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const state = library.state;
  const bin = trash.state;
  if (library.cause || viewer.cause || trash.cause) return <Alert variant="destructive" className="m-4">Photos could not open.</Alert>;
  if (!state || !bin) return <Spinner className="m-auto" aria-label="Opening Photos" />;
  const content = runtime.runSync(Effect.flatMap(Catalog, (catalog) => catalog.displayed()));
  const inTrash = bin.open;
  const secure = state.secure;
  const secureItems = state.only;
  const selection = inTrash ? bin.selecting : state.selecting;
  const selected = inTrash ? bin.selected : state.selected;
  const opened = viewer.state?.open ?? 0;
  const album = content.albums.get(state.album);
  const albumList = state.tab === "Albums" && state.album === 0 && !inTrash;
  const ids = [...(inTrash ? bin.rows : state.rows)].sort((a, b) => b - a);
  const rows = ids.flatMap((number) => {
    const row = content.rows.get(number);
    return row === undefined ? [] : [{ number, row }];
  });
  const index = ids.indexOf(opened);
  const starred = new Set(state.starred);
  const favourites = selected.length > 0 && selected.every((number) => starred.has(number));
  const title = selection ? `${selected.length} selected` : inTrash ? "Recently deleted" : album?.title ?? (albumList ? "Albums" : "Photos");
  const owner = (event: Event) => library.can(event, "Owner");
  const binOwner = (event: TrashEvent) => trash.can(event, "Owner");
  const talk = (event: Event) => { if (owner(event)) void library.send(event, "Owner"); };
  const binTalk = (event: TrashEvent) => { if (binOwner(event)) void trash.send(event, "Owner"); };
  const openBin = { type: "enter", allowed: state.access.grant === "Granted" || state.access.grant === "Limited", secure: state.secure } satisfies TrashEvent;
  const narrow = (filter: Filter, words = "") => ({ type: "narrow", narrowing: filter, query: words, person: 0 } satisfies Event);
  const canStart = inTrash ? binOwner({ type: "startSelect" }) : owner({ type: "startSelect" });
  const canMore = inTrash ? binOwner({ type: "loadMore" }) : owner({ type: "loadMore" });
  const start = () => inTrash ? binTalk({ type: "startSelect" }) : talk({ type: "startSelect" });
  const open = (number: number) => {
    if (selection) {
      if (inTrash) binTalk({ type: "toggle", photo: number }); else talk({ type: "toggle", photo: number });
      return;
    }
    const event = { type: "openItem", photo: number, listed: ids.includes(number), secure, only: secureItems, reviewing: false } as const;
    if (viewer.can(event, "Owner")) void viewer.send(event, "Owner");
  };
  const select = async (photo: number): Promise<boolean> => {
    if (!canStart) return false;
    if (inTrash) {
      const sent = await trash.send({ type: "startSelect" }, "Owner");
      return sent._tag === "Success" && (await trash.send({ type: "toggle", photo }, "Owner"))._tag === "Success";
    }
    const sent = await library.send({ type: "startSelect" }, "Owner");
    return sent._tag === "Success" && (await library.send({ type: "toggle", photo }, "Owner"))._tag === "Success";
  };
  const viewerSelection = async (kind: "add" | "recover" | "delete") => {
    if (opened === 0 || !viewer.can({ type: "close" }, "Owner")) return;
    const closed = await viewer.send({ type: "close" }, "Owner");
    if (closed._tag !== "Success" || !await select(opened)) return;
    if (kind === "add") void library.send({ type: "chooseAlbum" }, "Owner");
    else void trash.send({ type: kind === "recover" ? "recoverSelected" : "deleteForever" }, "Owner");
  };
  const actions: Tool[] = [];
  const menu: Tool[] = [];
  function add(label: string, event: Event, icon: ReactNode, group = actions) {
    if (owner(event)) group.push({ icon, label, run: () => talk(event) });
  }
  function binAdd(label: string, event: TrashEvent, icon: ReactNode, group = actions) {
    if (binOwner(event)) group.push({ icon, label, run: () => binTalk(event) });
  }
  if (selection && inTrash) {
    binAdd("Recover", { type: "recoverSelected" }, <Undo2 />);
    binAdd("Delete", { type: "deleteForever" }, <Trash2 />);
  } else if (selection) {
    add("Share", { type: "shareSelected" }, <Share2 />);
    add(favourites ? "Unfavorite" : "Favorite", { type: "favouriteSelected" }, <Heart />);
    add("Add to album", { type: "chooseAlbum" }, <Album />);
    if (album?.owned) add("Remove from album", { type: "removeSelected" }, <X />);
    add("Delete", { type: "trashSelected" }, <Trash2 />);
  } else {
    if (canStart) menu.push({ label: "Select", icon: <ListChecks />, run: start });
    if (owner(narrow("Matching", "photo"))) menu.push({ label: "Search", icon: <Search />, run: () => setSearching(true) });
    add("Favorites", narrow("Favorites"), <Heart />, menu);
    add("Videos", narrow("Videos"), <Images />, menu);
    if (owner({ type: "newAlbum" })) menu.push({ label: "New album", icon: <Plus />, run: () => { setName(""); talk({ type: "newAlbum" }); } });
    if (album?.owned && owner({ type: "renameAlbum" })) menu.push({ label: "Rename album", icon: <Album />, run: () => { setName(album.title); talk({ type: "renameAlbum" }); } });
    if (album?.owned) add("Delete album", { type: "deleteAlbum" }, <Trash2 />, menu);
  }
  const canScan = scan.state !== undefined && scan.can({ type: "startImage", frame: scan.state.images + 1 }, "Phone");
  const browser = !native();
  const chooseImage = { type: "openImageChoice", browser } satisfies Event;
  if (!inTrash && opened === 0 && browser && (state.choosingImage || owner(chooseImage))) {
    menu.push({ label: "Choose image", icon: <Image />, run: () => talk(chooseImage) });
  } else if (!browser && !selection && !inTrash && opened === 0 && state.visible && !secure && canScan) {
    menu.push({ label: "Scan image text", icon: <ScanText />, run: () => {
      if (scanInput.current && runtime.runSync(Effect.flatMap(PhotoChooser, (picker) => picker.begin()))) scanInput.current.click();
    } });
  }
  const status = inTrash ? bin.read.status : state.library.status;
  const dialog = state.shelf.dialog;
  const request = agent.state?.stage === "Shown" ? agent.state.request : undefined;
  const reviewTitle = request?.ask === "Collect" ? `Create album ${request.name}?`
    : request?.change === "Trash" ? "Move photos to Recently deleted?"
    : request?.change === "Share" ? "Share photos?"
    : request?.change === "Unfavorite" ? "Remove from Favorites?" : "Favorite photos?";
  const allow = owner({ type: "askAccess" }) ? { label: "Allow access", event: { type: "askAccess" } as const }
    : owner({ type: "pickItems" }) ? { label: "Choose items or allow all", event: { type: "pickItems" } as const }
    : owner({ type: "openSettings" }) ? { label: "Open settings", event: { type: "openSettings" } as const } : undefined;
  const albumName = { type: "saveAlbum", name: name.trim(), letters: Array.from(name.trim()).length } satisfies Event;
  const cancelSelection = () => inTrash ? binTalk({ type: "endSelect" }) : talk({ type: "endSelect" });
  const header = <AppHeader title={title} detail={Boolean(selection) || inTrash || album !== undefined} className="shrink-0"
    leading={<Button variant="ghost" size="icon" aria-label={selection ? "Cancel selection" : inTrash || album ? "Back to albums" : "Back to apps"}
      onClick={() => selection ? cancelSelection() : void alpha.back()}>{selection ? <X /> : <ChevronLeft />}</Button>}>
    {selection && (inTrash ? binOwner({ type: "selectAll" }) : owner({ type: "selectAll" })) && <Button variant="ghost" onClick={() => inTrash ? binTalk({ type: "selectAll" }) : talk({ type: "selectAll" })}>Select all</Button>}
    {!selection && menu.length > 0 && <Menu><MenuTrigger asChild><Button variant="ghost" size="icon" ref={toolsRef} aria-label="Photos tools"><Ellipsis /></Button></MenuTrigger>
      <MenuContent>{menu.map(({ icon, label, run }) => <MenuItem key={label} onSelect={run}>{icon}{label}</MenuItem>)}</MenuContent></Menu>}
  </AppHeader>;
  return (
    <section aria-label="Photos" className="relative flex min-h-0 flex-1 flex-col bg-background">
      <input ref={scanPicker} type="file" accept={imageTypes} hidden onChange={(event) => {
        const source = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (source) void runtime.runPromiseExit(scanSelectedImage(source));
        else runtime.runSync(Effect.flatMap(PhotoChooser, (picker) => picker.finish()));
      }} />
      {browser && state.choosingImage && <ImageChoice key={state.imageChoice} runtime={runtime} choice={state.imageChoice} canScan={canScan}
        close={() => talk({ type: "closeImageChoice", choice: state.imageChoice })} focusTools={() => toolsRef.current?.focus({ preventScroll: true })} />}
      <Scan runtime={runtime} alpha={alpha} />
      <div inert={opened !== 0} aria-hidden={opened !== 0 || undefined} className="flex min-h-0 flex-1 flex-col" data-alpha-subview="photos-list">
        {header}
        {!selection && !inTrash && !album && (owner({ type: "showTab", tab: "Library" }) || owner({ type: "showTab", tab: "Albums" })) &&
          <div role="group" aria-label="Photos sections" className={cn("mx-4 grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-secondary p-1", state.tab === "Library" && allow === undefined ? "mb-7" : "mb-3")}>
            {([{ tab: "Library", icon: <Images /> }, { tab: "Albums", icon: <Folder /> }] as const).map(({ tab, icon }) => <Button key={tab}
              variant="ghost" className={cn("h-11 rounded-lg", state.tab === tab && "bg-foreground text-background hover:bg-foreground/90")} aria-pressed={state.tab === tab}
              onClick={() => { setSearching(false); talk({ type: "showTab", tab }); }}>{icon}{tab}</Button>)}
          </div>}
        {!inTrash && !selection && !album && !browser && state.tab === "Library" && allow && <Button variant="secondary" aria-label={allow.label} className="mx-4 mb-2 justify-start rounded-xl px-4" onClick={() => talk(allow.event)}>
          <Image className="text-alpha" />{allow.event.type === "openSettings" ? allow.label : "Allow all"}<ChevronRight className="ml-auto size-4.5 text-muted-foreground" />
        </Button>}
        {!inTrash && state.tab === "Library" && searching && <form className="mx-4 mb-2 flex shrink-0 gap-2" onSubmit={(event) => { event.preventDefault(); talk(narrow(query.trim() ? "Matching" : "Everything", query.trim())); setSearching(false); }}>
          <Input type="search" aria-label="Search photos" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
          <Button type="submit" variant="secondary" aria-label="Search"><Search /></Button>
        </form>}
        {!inTrash && state.filter !== "Everything" && owner(narrow("Everything")) &&
          <div className="mx-4 mb-2 self-start"><Chip clearLabel="Clear filter" onClear={() => { setQuery(""); talk(narrow("Everything")); }}>{state.query || state.filter}</Chip></div>}
        {albumList && <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto px-4 pb-28" data-alpha-app-scroll="photos">
          <div className="grid grid-cols-2 gap-3 pt-2">
            {state.albums.map((number) => {
              const card = content.albums.get(number);
              const event = { type: "openAlbum", album: number } satisfies Event;
              if (!card || !owner(event)) return null;
              const Symbol = card.target === "favorites" ? Heart : card.target === "videos" ? Images : card.target === "camera" ? Image : Album;
              return <Button key={number} variant="ghost" aria-label={card.title} className="h-auto min-w-0 flex-col items-stretch gap-1 rounded-xl p-0 text-left hover:bg-transparent" onClick={() => talk(event)}>
                <span className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-secondary">
                  {card.cover ? <img src={card.cover} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" /> : <Symbol className="size-7 text-muted-foreground" />}
                </span>
                <span className="mt-1.5 flex min-w-0 items-center gap-1 text-base font-semibold"><Symbol className="size-4" /><span className="truncate">{card.title}</span></span>
                <span className="text-caption font-normal text-muted-foreground">{card.count}</span>
              </Button>;
            })}
          </div>
          {binOwner(openBin) && <ListRow title="Recently deleted" leading={<Trash2 />} trailing={<span className="flex items-center gap-3 text-sm text-muted-foreground">{content.trashCount}<ChevronRight /></span>} className="mt-5" onClick={() => binTalk(openBin)} />}
        </div>}
        {!albumList && (rows.length > 0 || canMore) &&
          <MediaGrid rows={rows} runtime={runtime} revision={inTrash ? bin.revision : state.revision} trash={inTrash} density={state.density} resize={(density) => { void library.send({ type: "setDensity", density }, "Owner"); }} selection={selection ? new Set(selected) : undefined} grouped={!album && !inTrash} now={runtime.runSync(Time.use((time) => time.latest()))} open={open} start={!selection && canStart ? (number) => { void select(number); } : undefined}
            more={canMore ? () => inTrash ? binTalk({ type: "loadMore" }) : talk({ type: "loadMore" }) : undefined} />}
        {status === "Loading" && <div role="status" aria-label="Loading photos" className="grid place-items-center p-5"><Spinner /></div>}
        {status === "Loaded" && !albumList && rows.length === 0 && <EmptyState className="m-4" icon={<Images />} title={inTrash ? "Recently deleted is empty" : state.filter !== "Everything" ? "No matches" : "No photos"} />}
        {status === "Failed" && <EmptyState className="m-4" title={state.locked ? "Unlock the phone, then reopen Photos" : "Couldn’t load photos"}>
          {(inTrash ? binOwner({ type: "retry" }) : owner({ type: "retry" })) && <Button variant="secondary" onClick={() => inTrash ? binTalk({ type: "retry" }) : talk({ type: "retry" })}>Try again</Button>}
        </EmptyState>}
        {actions.length > 0 && <ToolBar tools={actions} />}
        {!inTrash && owner({ type: "cancelRun" }) && <Button variant="secondary" className="self-center" onClick={() => talk({ type: "cancelRun" })}>Stop remaining changes</Button>}
        {inTrash && binOwner({ type: "cancelRecovery" }) && <Button variant="secondary" className="self-center" onClick={() => binTalk({ type: "cancelRecovery" })}>Stop recovery</Button>}
      </div>
      <ConfirmDialog open={request !== undefined} title={reviewTitle}
        confirmLabel={request?.change === "Share" ? "Share" : "Confirm"} destructive={request?.change === "Trash"}
        onConfirm={() => { const event = { type: "confirm", revision: state.revision } as const; if (agent.can(event, "Owner")) void agent.send(event, "Owner"); }}
        onCancel={() => { if (agent.can({ type: "decline" }, "Owner")) void agent.send({ type: "decline" }, "Owner"); }}>
        {request !== undefined && <span className="flex flex-col gap-1">
          <span>{request.items.length} {request.items.length === 1 ? "item" : "items"}</span>
          <span className="max-h-28 overflow-y-auto">{request.items.map((number) => content.rows.get(number)?.item.name ?? "Photo").join(" · ")}</span>
        </span>}
      </ConfirmDialog>
      <MediaViewer runtime={runtime} row={content.rows.get(opened)} before={index > 0 ? ids[index - 1] : undefined} after={index >= 0 ? ids[index + 1] : undefined} inTrash={inTrash}
        onAddToAlbum={!inTrash && canStart ? () => { void viewerSelection("add"); } : undefined}
        onRecover={inTrash && canStart ? () => { void viewerSelection("recover"); } : undefined}
        onDelete={inTrash && canStart ? () => { void viewerSelection("delete"); } : undefined} />
      <Sheet open={dialog === "NewAlbum" || dialog === "RenameAlbum" || dialog === "ChooseAlbum"} onOpenChange={(open) => { if (!open) talk({ type: "closeDialog" }); }}>
        <SheetContent title={dialog === "NewAlbum" ? "New album" : dialog === "RenameAlbum" ? "Rename album" : "Add to album"}
          actions={dialog === "ChooseAlbum" ? owner({ type: "newAlbum" }) && <Button variant="secondary" onClick={() => { setName(""); talk({ type: "newAlbum" }); }}><Plus />New album</Button>
            : <><Button variant="secondary" onClick={() => talk({ type: "closeDialog" })}>Cancel</Button><Button disabled={!owner(albumName)} onClick={() => talk(albumName)}>Save</Button></>}>
          {dialog === "ChooseAlbum" ? [...content.albums].flatMap(([number, card]) => card.owned && owner({ type: "addTo", album: number })
            ? [<ListRow key={number} title={card.title} leading={<Album />} onClick={() => talk({ type: "addTo", album: number })} />] : [])
            : <Input aria-label="Album name" maxLength={80} value={name} onChange={(event) => setName(event.currentTarget.value)} />}
        </SheetContent>
      </Sheet>
      <ConfirmDialog open={dialog === "DeleteAlbum"} title={`Delete ${album?.title ?? "album"}?`} destructive confirmLabel="Delete"
        loading={!owner({ type: "confirmDelete" })} onConfirm={() => talk({ type: "confirmDelete" })} onCancel={() => talk({ type: "closeDialog" })} />
      <ConfirmDialog open={bin.confirm.showing} title="Delete photos forever" destructive confirmLabel="Delete forever"
        onConfirm={() => binTalk(binOwner({ type: "confirmForever" }) ? { type: "confirmForever" } : { type: "cancelForever" })} onCancel={() => binTalk({ type: "cancelForever" })}>
        {binOwner({ type: "confirmForever" }) ? `${bin.prepared.length} items` : "The selection changed. Review Recently deleted again."}
      </ConfirmDialog>
    </section>
  );
}
