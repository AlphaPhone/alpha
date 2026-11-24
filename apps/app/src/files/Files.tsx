// spec/app/files/index.md, "Story: Browse my storage"; spec/app/files/index.md, "Story: Arrange and filter what I see"; spec/app/files/index.md, "Story: Change my files"; spec/app/files/index.md, "Folders come before files in every sort: by name in the phone's order of names, by date the newest first, by size the largest first; choosing the sort again turns the order within the folders and within the files"; spec/app/files/index.md, "The owner sees a listed item's details: what it is, how big it is, when it last changed and where it is; they close when the owner closes them or moves, or when the item is no longer listed"
import { Alert, AppHeader, Button, Checkbox, Chip, Dialog, DialogContent, DialogTitle, EmptyState, Input, ListGroup, ListRow, Menu, MenuContent, MenuItem, MenuTrigger, Progress, SearchField, Sheet, SheetContent, Spinner } from "@repo/ui";
import { Effect, Option, type ManagedRuntime } from "effect";
import { ArrowDown, ArrowDownWideNarrow, ArrowUp, AudioLines, ChevronRight, Download, Ellipsis, File, FileText, Folder, FolderInput, FolderOpen, HardDrive, Image, Info, LayoutGrid, List, Pencil, Plus, RefreshCw, Search, Share2, Trash2, Video, X, type LucideIcon } from "lucide-react";
import { Fragment, useMemo, useState, type MouseEvent } from "react";
import type { Machine, Order } from "../../gen/app__files.effect.vibe";
import { ahead, browse, chosen, detailed, empty, filled } from "../../gen/app__files.ts";
import { useMachine } from "../../gen/app__files.react.ts";
import type { Dest, Work } from "../../gen/app__files__change.ts";
import { finding } from "../../gen/app__files__search.ts";
import type { Filter } from "../../gen/app__files__search.ts";
import type { Item, Kind } from "../../gen/app__files__shared.ts";
import type { Machine as TrashMachine } from "../../gen/app__files__trash.effect.vibe";
import type { Alpha } from "../runtime/area.tsx";
import { AppBack } from "../shell/AppBack.tsx";
import type { Time } from "../runtime/time.vibe";
import { Handles } from "./handles.vibe";
import type { Machine as PreviewMachine } from "../../gen/app__files__preview.effect.vibe";
import type { Machine as RecentMachine } from "../../gen/app__files__recent.effect.vibe";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { useMachine as useRecent } from "../../gen/app__files__recent.react.ts";
import type { Opened } from "./preview.vibe";
import { Preview, RecentFiles } from "./Preview.tsx";
import { Trash, Undo } from "./Trash.tsx";

export interface FilesProps {
  /** Provides Files and its Trash, `files` of files.vibe, the numbers of the phone's storage and Alpha's time. */
  alpha: Alpha;
  runtime: ManagedRuntime.ManagedRuntime<Machine | TrashMachine | PreviewMachine | RecentMachine | Opened | Handles | Time | Shell, unknown>;
}

const categories: readonly [Kind, string][] = [["Download", "Downloads"], ["Image", "Images"], ["Video", "Videos"], ["Audio", "Audio"], ["Document", "Documents"]];
const icons: Record<Kind, LucideIcon> = { Folder, Download, Image, Video, Audio: AudioLines, Document: FileText, Other: File };
const orders: readonly [Order, string][] = [["ByName", "Name"], ["ByDate", "Date"], ["BySize", "Size"]];
const shares: readonly [Dest, string][] = [["Chooser", "Share to an app"], ["Email", "Email"], ["Copy", "Copy"]];
const kinds: readonly [Kind | undefined, string][] = [[undefined, "Any kind"], ["Image", "Images"], ["Video", "Videos"], ["Audio", "Audio"], ["Document", "Documents"]];
const kindNames: Record<Kind, string> = { Folder: "Folder", Image: "Image", Video: "Video", Audio: "Audio", Document: "Document", Download: "Download", Other: "File" };
/** A name no folder holds, since it is a path's separator: what asks whether a new name would be taken at all. */
const unnamed = "/";
/** A size in the units the owner reads, to one decimal above a kilobyte. */
function sized(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let at = 0;
  let value = bytes;
  while (value >= 1024 && at < units.length - 1) { value /= 1024; at += 1; }
  return `${at === 0 || value >= 100 ? Math.round(value) : Math.round(value * 10) / 10} ${units[at]}`;
}
const changeWords: Record<Work, string> = { NewFolder: "make the folder", Rename: "rename it", MoveTo: "move them", CopyTo: "copy them" };

/** The name the phone's storage gives a number: its volume's name at a volume's root, else the last step of its path. */
function labelOf(runtime: FilesProps["runtime"], handle: number): string {
  return Option.getOrElse(runtime.runSync(Effect.flatMap(Handles, (handles) => handles.label(handle))), () => "…");
}

/**
 * Files: the top with its volumes and categories, a folder with its path, what it lists and the filter, a selection
 * and one change, each control offered exactly when the rules take it from the owner.
 * @model spec/app/files/index.md
 */
export function Files({ runtime, alpha }: FilesProps) {
  const { state, cause, can, send } = useMachine(runtime);
  const recent = useRecent(runtime);
  const [text, setText] = useState("");
  const [naming, setNaming] = useState<{ work: Work; name: string } | undefined>(undefined);
  const [kind, setKind] = useState<Kind | undefined>(undefined);
  const [filtering, setFiltering] = useState(false);
  const items = state?.items;
  const order = state?.order;
  const reversed = state?.reversed;
  const sorted = useMemo(() => {
    if (!items || order === undefined || reversed === undefined) return [];
    return items.toSorted((a, b) => (ahead(order, reversed, a, b) ? -1 : ahead(order, reversed, b, a) ? 1 : 0));
  }, [items, order, reversed]);
  const marked = state?.picked;
  const marks = useMemo(() => new Set(marked), [marked]);
  const back = <AppBack alpha={alpha} />;
  const header = (title: string) => <AppHeader title={title} leading={back} />;
  if (cause) return <>{header("Files")}<Alert variant="destructive" className="m-4">Alpha could not open Files</Alert></>;
  if (!state) return null;
  const owner = <E extends Parameters<typeof can>[0]>(event: E) => can(event, "Owner");
  const tell = <E extends Parameters<typeof send>[0]>(event: E) => void send(event, "Owner");
  const shown = browse(state);
  const label = (handle: number) => labelOf(runtime, handle);
  if (shown === "Closed") return null;
  if (shown === "Unsupported") return <>{header("Files")}<EmptyState className="m-4" title="This phone's storage cannot be reached" /></>;
  if (shown === "NotAsked" || shown === "NoAccess") {
    return (
      <>
        {header("Files")}
        <EmptyState className="m-4" title={shown === "NotAsked" ? "Alpha may not read your files yet" : "Alpha may not read your files"}>
          {owner({ type: "allow" }) && <Button onClick={() => tell({ type: "allow" })}>{shown === "NotAsked" ? "Allow" : "Open Settings"}</Button>}
        </EmptyState>
      </>
    );
  }
  if (state.trash) return <Trash runtime={runtime} onBack={owner({ type: "closeTrash" }) ? () => tell({ type: "closeTrash" }) : undefined} />;
  const atTop = shown === "AtTop";
  const looked = finding(state.search);
  const picked = chosen(state);
  const [firstPicked] = picked;
  const selecting = marks.size > 0;
  const grid = state.layout === "Grid";
  const category = categories.find(([kind]) => kind === state.category)?.[1];
  const place = state.inCategory ? category : label(state.trail.at(-1) ?? 0);
  const title = selecting ? `${marks.size} selected` : atTop ? "Files" : (place ?? "Files");
  const wanted: Filter = { text: text.trim(), kind: kind ?? "Other", anyKind: kind === undefined };
  const [details] = detailed(state);
  const primary = state.volumes[0];
  const iconBox = "flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground";
  const rowClass = "min-h-15 gap-3.5 rounded-xl px-2";
  const row = (item: Item) => {
    const toggle = { type: "toggle", target: item.id } as const;
    const open = item.kind === "Folder" ? ({ type: "openFolder", target: item.id } as const) : ({ type: "view", file: item } as const);
    const selectable = owner(toggle);
    const selected = marks.has(item.id);
    const Icon = icons[item.kind];
    const action = selecting ? toggle : open;
    const onClick = owner(action) ? () => tell(action) : undefined;
    const onContextMenu = selectable ? (event: MouseEvent) => {
      event.preventDefault();
      if (!selected) tell(toggle);
    } : undefined;
    return (
      <div key={item.id} className="group relative min-w-0">
        {grid ? (
          <Button variant="ghost" aria-label={item.name} aria-pressed={selecting ? selected : undefined} disabled={!onClick} className="h-auto w-full flex-col items-stretch gap-1.5 rounded-xl p-1.5 text-left" onClick={onClick} onContextMenu={onContextMenu}>
            <span aria-hidden className="grid aspect-square place-items-center rounded-lg bg-muted"><Icon className="size-7" /></span>
            <span className="line-clamp-2 min-h-9 text-wrap text-xs break-words">{item.name}</span>
          </Button>
        ) : (
          <ListRow
            className={`${rowClass} pr-11`}
            aria-label={item.name}
            aria-pressed={selecting ? selected : undefined}
            title={item.name}
            leading={<span className={iconBox}><Icon className="size-5" /></span>}
            detail={item.kind === "Folder" ? undefined : sized(item.bytes)}
            selected={selected}
            onClick={onClick}
            onContextMenu={onContextMenu}
          />
        )}
        {selectable && <Checkbox aria-label={`Select ${item.name}`} checked={selected} className={`absolute right-2 min-h-6 min-w-6 rounded-full ${grid ? "top-3" : "top-1/2 -translate-y-1/2"} ${selecting ? "" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`} onCheckedChange={() => tell(toggle)} />}
      </div>
    );
  };
  const { change } = state;
  const ended = change.attempt.outcome;
  const changeLayout = { type: "showAs", layout: grid ? "Rows" : "Grid" } as const;
  const showFilter = owner({ type: "searchFor", wanted });
  const refresh = owner({ type: "refresh" });
  const makeFolder = owner({ type: "begin", work: "NewFolder", name: unnamed });
  const pickFile = { type: "openPicker", replacing: 0 } as const;
  const canPick = atTop && recent.can(pickFile, "Owner");
  const showTools = showFilter || refresh || makeFolder || owner(changeLayout) || canPick;
  const canDetails = firstPicked !== undefined && picked.length === 1 && owner({ type: "showDetails", target: firstPicked.id });
  return (
    <section aria-label="Files" className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <AppHeader title={title} leading={selecting && owner({ type: "cancelSelection" }) ? <Button variant="ghost" size="icon" aria-label="Cancel" onClick={() => tell({ type: "cancelSelection" })}><X /></Button> : back}>
          {selecting && canDetails && <Button variant="ghost" size="icon" aria-label="Details" onClick={() => tell({ type: "showDetails", target: firstPicked.id })}><Info /></Button>}
          {selecting && owner({ type: "selectAll" }) && <Button variant="ghost" size="sm" onClick={() => tell({ type: "selectAll" })}>Select all</Button>}
          {!selecting && showTools && (
            <Menu>
              <MenuTrigger asChild><Button variant="ghost" size="icon" aria-label={atTop ? "Files tools" : "Files options"}><Ellipsis /></Button></MenuTrigger>
              <MenuContent>
                {canPick && <MenuItem onSelect={() => void recent.send(pickFile, "Owner")}><FolderOpen />Open and remember a file</MenuItem>}
                {makeFolder && <MenuItem onSelect={() => setNaming({ work: "NewFolder", name: "" })}><Plus />New folder</MenuItem>}
                {owner(changeLayout) && <MenuItem onSelect={() => tell(changeLayout)}>{grid ? <List /> : <LayoutGrid />}{grid ? "List" : "Grid"}</MenuItem>}
                {orders.map(([order, name]) => owner({ type: "sortBy", order }) && (
                  <MenuItem key={order} onSelect={() => tell({ type: "sortBy", order })}>
                    <ArrowDownWideNarrow />{name}{state.order === order && (state.reversed ? <ArrowUp className="ml-auto size-4" /> : <ArrowDown className="ml-auto size-4" />)}
                  </MenuItem>
                ))}
                {showFilter && <MenuItem onSelect={() => setFiltering(true)}><Search />Filter files</MenuItem>}
                {refresh && <MenuItem onSelect={() => tell({ type: "refresh" })}><RefreshCw />Refresh</MenuItem>}
              </MenuContent>
            </Menu>
          )}
        </AppHeader>
        {!atTop && (
          <nav aria-label="Folder path" className="flex shrink-0 items-center gap-1 overflow-x-auto px-3 pb-1 text-xs whitespace-nowrap text-muted-foreground">
            {owner({ type: "openTop" }) && <Button variant="ghost" size="sm" onClick={() => tell({ type: "openTop" })}>Files</Button>}
            {state.inCategory
              ? <><ChevronRight aria-hidden className="size-3 shrink-0" /><span aria-current="location" className="px-2 text-foreground">{category}</span></>
              : state.trail.map((handle, at) => {
                  const crumb = { type: "openCrumb", depth: at + 1 } as const;
                  return (
                    <Fragment key={handle}>
                      <ChevronRight aria-hidden className="size-3 shrink-0" />
                      {owner(crumb) && at < state.trail.length - 1
                        ? <Button variant="ghost" size="sm" onClick={() => tell(crumb)}>{label(handle)}</Button>
                        : <span aria-current="location" className="px-2 text-foreground">{label(handle)}</span>}
                    </Fragment>
                  );
                })}
          </nav>
        )}
        {filtering && showFilter && (
          <form className="flex shrink-0 flex-col gap-2 px-4 pb-2" onSubmit={(event) => { event.preventDefault(); tell({ type: "searchFor", wanted }); }}>
            <div className="flex gap-2">
              <SearchField aria-label="Filter" value={text} onValueChange={setText} className="flex-1" />
              <Button type="submit" variant="outline">Filter</Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Close filter controls" onClick={() => setFiltering(false)}><X /></Button>
            </div>
            <div role="group" aria-label="Kind" className="flex flex-wrap gap-1">
              {kinds.map(([one, name]) => <Button key={name} type="button" variant={kind === one ? "secondary" : "ghost"} size="sm" aria-pressed={kind === one} onClick={() => setKind(one)}>{name}</Button>)}
            </div>
          </form>
        )}
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto px-2 pb-28">
          {state.missing && <Alert variant="warn">That folder is no longer there</Alert>}
          {(ended === "Refused" || ended === "Unknown") && <Alert variant="warn">{ended === "Unknown" ? `Alpha cannot tell whether the phone could ${changeWords[change.work]}` : `The phone could not ${changeWords[change.work]}`}</Alert>}
          {change.sending.outcome === "Refused" && <Alert variant="warn">Android could not open sharing</Alert>}
          {change.stale && <Alert variant="info">The selection changed, so nothing was shared</Alert>}
          <Undo runtime={runtime} />
          {looked !== "NoFilter" && (
            <div className="flex flex-col gap-2">
              <div className="px-2"><Chip onClear={owner({ type: "clearFilter" }) ? () => tell({ type: "clearFilter" }) : undefined} clearLabel="Clear the filter">
                {[state.search.filter.anyKind ? "" : kinds.find(([one]) => one === state.search.filter.kind)?.[1] ?? "", state.search.filter.text === "" ? "" : `“${state.search.filter.text}”`].filter(Boolean).join(" · ") || "Everything"}
              </Chip></div>
              {looked === "Looking" && <Spinner label="Looking" />}
              {looked === "Nothing" && <EmptyState icon={<Search />} title="Nothing matches" />}
              {looked === "Trouble" && <Alert variant="warn">The search could not finish</Alert>}
              {looked === "Unfinished" && <Alert variant="info">Nothing found in what the phone could search</Alert>}
              {looked === "Found" && !state.search.complete && <Alert variant="info">Only part of this place could be searched</Alert>}
              {looked === "Found" && (
                <ListGroup aria-label="Found" surface="plain">
                  {state.search.hits.map((hit) => {
                    const Icon = icons[hit.kind];
                    return <ListRow key={hit.id} className={rowClass} title={hit.name} aria-label={hit.name} leading={<span className={iconBox}><Icon className="size-5" /></span>} detail={sized(hit.bytes)} onClick={owner({ type: "view", file: hit }) ? () => tell({ type: "view", file: hit }) : undefined} />;
                  })}
                </ListGroup>
              )}
            </div>
          )}
          {atTop ? (
            <>
              {state.storage.status === "Loading" && <Spinner label="Reading your storage" />}
              {state.storage.status === "Failed" && <Alert variant="destructive"><span>Your storage cannot be read now</span>{refresh && <Button variant="ghost" size="sm" onClick={() => tell({ type: "refresh" })}>Retry</Button>}</Alert>}
              {(state.storage.status === "Loaded" || state.volumes.length > 0) && (
                <>
                  <ListGroup aria-label="Categories" surface="plain">
                    {primary && owner({ type: "openVolume", target: primary.id }) && <ListRow className={rowClass} title="All files" leading={<span className={iconBox}><Folder className="size-5" /></span>} onClick={() => tell({ type: "openVolume", target: primary.id })} />}
                    {categories.map(([kind, name]) => {
                      const counted = state.tally.counts.find((count) => count.kind === kind);
                      const total = counted && `${counted.items} · ${sized(counted.bytes)}`;
                      const Icon = icons[kind];
                      return <ListRow key={kind} className={rowClass} title={name} aria-label={name} aria-description={total} leading={<span className={iconBox}><Icon className="size-5" /></span>} trailing={counted?.items} onClick={owner({ type: "openCategory", kind }) ? () => tell({ type: "openCategory", kind }) : undefined} />;
                    })}
                  </ListGroup>
                  <ListGroup heading="Storage" surface="plain" className="mt-3">
                    {state.volumes.map((volume) => {
                      const name = label(volume.id);
                      return (
                        <ListRow
                          key={volume.id}
                          className={rowClass}
                          title={name}
                          aria-label={name}
                          leading={<span className={iconBox}><HardDrive className="size-5" /></span>}
                          detail={volume.total > 0 && <><span className="block">{sized(Math.max(0, volume.total - volume.used))} free of {sized(volume.total)}</span><Progress className="mt-2 h-1.5" aria-label={`${name} used`} value={filled(volume.used, volume.total)} /></>}
                          onClick={owner({ type: "openVolume", target: volume.id }) ? () => tell({ type: "openVolume", target: volume.id }) : undefined}
                        />
                      );
                    })}
                    {owner({ type: "openTrash" }) && <ListRow className={rowClass} title="Trash" aria-label="Trash" leading={<span className={iconBox}><Trash2 className="size-5" /></span>} trailing={state.tally.trashed || undefined} onClick={() => tell({ type: "openTrash" })} />}
                  </ListGroup>
                </>
              )}
              <RecentFiles runtime={runtime} />
            </>
          ) : looked === "NoFilter" && (
            <>
              {shown === "Reading" && state.items.length === 0 && <Spinner label="Reading the folder" />}
              {shown === "Unreachable" && <Alert variant="destructive">This place cannot be read now</Alert>}
              {empty(state) && <EmptyState icon={<Folder />} title="Nothing here" />}
              {shown === "Showing" && state.partial && <Alert variant="info">Only part of this place could be read</Alert>}
              {sorted.length > 0 && <div role="group" aria-label="Listed" className={grid ? "grid grid-cols-3 gap-2" : undefined}>{sorted.map(row)}</div>}
            </>
          )}
        </div>
        {selecting && (
          <div role="toolbar" aria-label="Selection" className="mx-3 mb-2 flex shrink-0 items-stretch justify-around gap-1 rounded-xl border border-border bg-background p-1.5 shadow-md">
            {owner({ type: "openShare", mail: false }) && <Button variant="ghost" className="h-13 flex-col gap-0.5 px-2 text-xs" onClick={() => tell({ type: "openShare", mail: false })}><Share2 />Share</Button>}
            {owner({ type: "openMoveTo" }) && <Button variant="ghost" className="h-13 flex-col gap-0.5 px-2 text-xs" onClick={() => tell({ type: "openMoveTo" })}><FolderInput />Move or copy</Button>}
            {owner({ type: "begin", work: "Rename", name: unnamed }) && <Button variant="ghost" className="h-13 flex-col gap-0.5 px-2 text-xs" onClick={() => setNaming({ work: "Rename", name: firstPicked?.name ?? "" })}><Pencil />Rename</Button>}
            {owner({ type: "askToDelete" }) && <Button variant="ghost" className="h-13 flex-col gap-0.5 px-2 text-xs" onClick={() => tell({ type: "askToDelete" })}><Trash2 />Delete</Button>}
          </div>
        )}
      </div>
      <Dialog open={state.deleting.showing} onOpenChange={(open) => { if (!open && owner({ type: "keepFiles" })) tell({ type: "keepFiles" }); }}>
        <DialogContent>
          <DialogTitle>{`Move ${picked.length === 1 ? `“${picked[0]?.name}”` : `${picked.length} items`} to the Trash?`}</DialogTitle>
          {!owner({ type: "confirmDelete" }) && <Alert variant="warn">What is selected changed</Alert>}
          <div className="flex gap-2 *:flex-1">
            {owner({ type: "keepFiles" }) && <Button variant="secondary" onClick={() => tell({ type: "keepFiles" })}>Keep</Button>}
            {owner({ type: "confirmDelete" }) && <Button variant="destructive" onClick={() => tell({ type: "confirmDelete" })}>Delete</Button>}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={details !== undefined} onOpenChange={(open) => { if (!open && owner({ type: "closeDetails" })) tell({ type: "closeDetails" }); }}>
        <DialogContent closeLabel="Close">
          <DialogTitle>{details?.name}</DialogTitle>
          {details && (
            <dl aria-label="Details" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt>Kind</dt><dd>{kindNames[details.kind]}</dd>
              {details.kind !== "Folder" && <><dt>Size</dt><dd>{sized(details.bytes)}</dd></>}
              <dt>Changed</dt><dd><time dateTime={new Date(details.revision).toISOString()}>{new Date(details.revision).toLocaleString()}</time></dd>
              <dt>Where</dt><dd>{state.trail.map(label).join(" › ")}</dd>
            </dl>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={naming !== undefined} onOpenChange={(open) => { if (!open) setNaming(undefined); }}>
        <DialogContent closeLabel="Cancel">
          <DialogTitle>{naming?.work === "Rename" ? "Rename" : "New folder"}</DialogTitle>
          <form className="flex flex-col gap-3" onSubmit={(event) => {
            event.preventDefault();
            if (!naming) return;
            const begin = { type: "begin", work: naming.work, name: naming.name.trim() } as const;
            if (owner(begin)) { tell(begin); setNaming(undefined); }
          }}>
            <Input aria-label="Name" value={naming?.name ?? ""} invalid={naming !== undefined && naming.name.trim() !== "" && !owner({ type: "begin", work: naming.work, name: naming.name.trim() })} onChange={(event) => setNaming(naming && { ...naming, name: event.target.value })} />
            <Button type="submit" disabled={!naming || !owner({ type: "begin", work: naming.work, name: naming.name.trim() })}>{naming?.work === "Rename" ? "Rename" : "Make"}</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={change.clash.showing}>
        <DialogContent>
          <DialogTitle>Some names are already there</DialogTitle>
          <div className="flex flex-col gap-2">
            {owner({ type: "keepBoth" }) && <Button onClick={() => tell({ type: "keepBoth" })}>Keep both</Button>}
            {owner({ type: "replaceThem" }) && <Button variant="destructive" onClick={() => tell({ type: "replaceThem" })}>Replace</Button>}
            {owner({ type: "goBack" }) && <Button variant="secondary" onClick={() => tell({ type: "goBack" })}>Back</Button>}
          </div>
        </DialogContent>
      </Dialog>
      <Sheet open={state.sheet.open} onOpenChange={(open) => { if (!open && owner({ type: "closeMoveTo" })) tell({ type: "closeMoveTo" }); }}>
        <SheetContent
          title="Move or copy to"
          actions={(
            <>
              {owner({ type: "begin", work: "CopyTo", name: "" }) && <Button variant="outline" onClick={() => tell({ type: "begin", work: "CopyTo", name: "" })}>Copy here</Button>}
              {owner({ type: "begin", work: "MoveTo", name: "" }) && <Button onClick={() => tell({ type: "begin", work: "MoveTo", name: "" })}>Move here</Button>}
            </>
          )}
        >
          <nav aria-label="Destination path" className="flex flex-wrap gap-1">
            {state.sheet.trail.map((handle, at) => (
              <Button key={handle} variant="ghost" size="sm" disabled={!owner({ type: "moveUp", depth: at })} onClick={() => tell({ type: "moveUp", depth: at })}>{at === 0 ? "Storage" : label(state.sheet.trail[at - 1] ?? 0)}</Button>
            ))}
            {state.sheet.trail.length > 0 && <span className="px-2 font-semibold">{label(state.sheet.trail[state.sheet.trail.length - 1] ?? 0)}</span>}
          </nav>
          {state.sheet.reading.status === "Loading" && <Spinner label="Reading the folder" />}
          {state.sheet.reading.status === "Failed" && <Alert variant="warn">This folder cannot be read now</Alert>}
          <ListGroup surface="plain">
            {(state.sheet.trail.length === 0 ? state.volumes.map((volume) => volume.id) : state.sheet.folders).map((target) => (
              <ListRow key={target} title={label(target)} onClick={owner({ type: "moveInto", target }) ? () => tell({ type: "moveInto", target }) : undefined} />
            ))}
          </ListGroup>
        </SheetContent>
      </Sheet>
      <Preview runtime={runtime} />
      <Sheet open={change.panel !== 0} onOpenChange={(open) => { if (!open && owner({ type: "closeShare" })) tell({ type: "closeShare" }); }}>
        <SheetContent title="Share">
          <ListGroup surface="plain">
            {shares.map(([channel, name]) => owner({ type: "shareTo", channel }) && <ListRow key={channel} title={name} onClick={() => tell({ type: "shareTo", channel })} />)}
          </ListGroup>
        </SheetContent>
      </Sheet>
    </section>
  );
}
