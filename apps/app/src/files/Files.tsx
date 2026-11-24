// spec/app/files/index.md, "Story: Browse my storage"; spec/app/files/index.md, "Story: Arrange and filter what I see"; spec/app/files/index.md, "Story: Change my files"; spec/app/files/index.md, "Folders come before files in every sort: by name in the phone's order of names, by date the newest first, by size the largest first; choosing the sort again turns the order within the folders and within the files"; spec/app/files/index.md, "The owner sees a listed item's details: what it is, how big it is, when it last changed and where it is; they close when the owner closes them or moves, or when the item is no longer listed"
import { Alert, Button, Checkbox, Chip, Dialog, DialogContent, DialogTitle, EmptyState, Input, ListGroup, ListRow, Progress, SearchField, Sheet, SheetContent, Spinner } from "@repo/ui";
import { Effect, Option, type ManagedRuntime } from "effect";
import { useState } from "react";
import type { Machine, Order } from "../../gen/app__files.effect.vibe";
import { ahead, browse, chosen, detailed, empty, filled } from "../../gen/app__files.ts";
import { useMachine } from "../../gen/app__files.react.ts";
import type { Dest, Work } from "../../gen/app__files__change.ts";
import { finding } from "../../gen/app__files__search.ts";
import type { Filter } from "../../gen/app__files__search.ts";
import type { Item, Kind } from "../../gen/app__files__shared.ts";
import type { Machine as TrashMachine } from "../../gen/app__files__trash.effect.vibe";
import type { Time } from "../runtime/time.vibe";
import { Handles } from "./handles.vibe";
import type { Machine as PreviewMachine } from "../../gen/app__files__preview.effect.vibe";
import type { Machine as RecentMachine } from "../../gen/app__files__recent.effect.vibe";
import type { Opened } from "./preview.vibe";
import { Preview, RecentFiles } from "./Preview.tsx";
import { Trash, Undo } from "./Trash.tsx";

export interface FilesProps {
  /** Provides Files and its Trash, `files` of files.vibe, the numbers of the phone's storage and Alpha's time. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | TrashMachine | PreviewMachine | RecentMachine | Opened | Handles | Time, unknown>;
}

const categories: readonly [Kind, string][] = [["Download", "Downloads"], ["Image", "Images"], ["Video", "Videos"], ["Audio", "Audio"], ["Document", "Documents"]];
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
  return `${at === 0 ? value : value.toFixed(1)} ${units[at]}`;
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
export function Files({ runtime }: FilesProps) {
  const { state, cause, can, send } = useMachine(runtime);
  const [text, setText] = useState("");
  const [naming, setNaming] = useState<{ work: Work; name: string } | undefined>(undefined);
  const [kind, setKind] = useState<Kind | undefined>(undefined);
  if (cause) return <Alert variant="destructive" className="m-4">Alpha could not open Files</Alert>;
  if (!state) return null;
  const owner = <E extends Parameters<typeof can>[0]>(event: E) => can(event, "Owner");
  const tell = <E extends Parameters<typeof send>[0]>(event: E) => void send(event, "Owner");
  const shown = browse(state);
  const label = (handle: number) => labelOf(runtime, handle);
  if (shown === "Closed") return null;
  if (shown === "Unsupported") return <EmptyState className="m-4" title="This phone's storage cannot be reached" />;
  if (shown === "NotAsked" || shown === "NoAccess") {
    return (
      <EmptyState className="m-4" title={shown === "NotAsked" ? "Alpha may not read your files yet" : "Alpha may not read your files"}>
        {owner({ type: "allow" }) && <Button onClick={() => tell({ type: "allow" })}>{shown === "NotAsked" ? "Allow" : "Open Settings"}</Button>}
      </EmptyState>
    );
  }
  if (state.trash) return <Trash runtime={runtime} onBack={owner({ type: "closeTrash" }) ? () => tell({ type: "closeTrash" }) : undefined} />;
  const looked = finding(state.search);
  const picked = chosen(state);
  const sorted = [...state.items].sort((a, b) => (ahead(state.order, state.reversed, a, b) ? -1 : ahead(state.order, state.reversed, b, a) ? 1 : 0));
  const wanted: Filter = { text: text.trim(), kind: kind ?? "Other", anyKind: kind === undefined };
  const [details] = detailed(state);
  const row = (item: Item) => {
    const toggle = { type: "toggle", target: item.id } as const;
    const open = item.kind === "Folder" ? ({ type: "openFolder", target: item.id } as const) : ({ type: "view", file: item } as const);
    return (
      <div key={item.id} className="flex items-center pr-4">
        <ListRow
          className="flex-1"
          title={item.name}
          selected={state.picked.includes(item.id)}
          onClick={owner(open) && state.picked.length === 0 ? () => tell(open) : owner(toggle) && state.picked.length > 0 ? () => tell(toggle) : undefined}
        />
        {owner(toggle) && <Checkbox aria-label={`Select ${item.name}`} checked={state.picked.includes(item.id)} onCheckedChange={() => tell(toggle)} />}
      </div>
    );
  };
  const { change } = state;
  const ended = change.attempt.outcome;
  return (
    <section aria-label="Files" className="flex flex-col gap-3 p-4">
      {state.missing && <Alert variant="warn">That folder is no longer there</Alert>}
      {(ended === "Refused" || ended === "Unknown") && <Alert variant="warn">{ended === "Unknown" ? `Alpha cannot tell whether the phone could ${changeWords[change.work]}` : `The phone could not ${changeWords[change.work]}`}</Alert>}
      {change.sending.outcome === "Refused" && <Alert variant="warn">Android could not open sharing</Alert>}
      {change.stale && <Alert variant="info">The selection changed, so nothing was shared</Alert>}
      <Undo runtime={runtime} />
      {shown === "AtTop" ? (
        <>
          {state.storage.status === "Loading" && <Spinner label="Reading your storage" />}
          {state.storage.status === "Failed" && <Alert variant="destructive">Your storage cannot be read now</Alert>}
          <ListGroup heading="Storage">
            {state.volumes.map((volume) => (
              <ListRow
                key={volume.id}
                title={label(volume.id)}
                detail={volume.total > 0 && <Progress aria-label={`${label(volume.id)} used`} value={filled(volume.used, volume.total)} />}
                onClick={owner({ type: "openVolume", target: volume.id }) ? () => tell({ type: "openVolume", target: volume.id }) : undefined}
              />
            ))}
          </ListGroup>
          <ListGroup heading="Categories">
            {categories.map(([kind, name]) => {
              const counted = state.tally.counts.find((count) => count.kind === kind);
              const told = counted && `${counted.items} · ${sized(counted.bytes)}`;
              return <ListRow key={kind} title={name} aria-label={name} aria-description={told} detail={told} onClick={owner({ type: "openCategory", kind }) ? () => tell({ type: "openCategory", kind }) : undefined} />;
            })}
            {owner({ type: "openTrash" }) && <ListRow title="Trash" aria-label="Trash" aria-description={state.tally.trashed > 0 ? String(state.tally.trashed) : undefined} trailing={state.tally.trashed > 0 && state.tally.trashed} onClick={() => tell({ type: "openTrash" })} />}
          </ListGroup>
          <RecentFiles runtime={runtime} />
        </>
      ) : (
        <>
          <nav aria-label="Path" className="flex flex-wrap items-center gap-1">
            {owner({ type: "openTop" }) && <Button variant="ghost" size="sm" onClick={() => tell({ type: "openTop" })}>Files</Button>}
            {state.inCategory
              ? <span className="px-2 font-semibold">{categories.find(([kind]) => kind === state.category)?.[1]}</span>
              : state.trail.map((handle, at) => {
                  const crumb = { type: "openCrumb", depth: at + 1 } as const;
                  return owner(crumb) && at < state.trail.length - 1
                    ? <Button key={handle} variant="ghost" size="sm" onClick={() => tell(crumb)}>{label(handle)}</Button>
                    : <span key={handle} className="px-2 font-semibold">{label(handle)}</span>;
                })}
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            {orders.map(([order, name]) => (
              owner({ type: "sortBy", order }) && <Button key={order} variant={state.order === order ? "secondary" : "ghost"} size="sm" aria-pressed={state.order === order} onClick={() => tell({ type: "sortBy", order })}>{name}</Button>
            ))}
            {owner({ type: "showAs", layout: state.layout === "Rows" ? "Grid" : "Rows" }) && (
              <Button variant="ghost" size="sm" onClick={() => tell({ type: "showAs", layout: state.layout === "Rows" ? "Grid" : "Rows" })}>{state.layout === "Rows" ? "Grid" : "List"}</Button>
            )}
            {owner({ type: "refresh" }) && <Button variant="ghost" size="sm" onClick={() => tell({ type: "refresh" })}>Refresh</Button>}
            {owner({ type: "begin", work: "NewFolder", name: unnamed }) && <Button variant="ghost" size="sm" onClick={() => setNaming({ work: "NewFolder", name: "" })}>New folder</Button>}
          </div>
          <form className="flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); tell({ type: "searchFor", wanted }); }}>
            <div className="flex gap-2">
              <SearchField aria-label="Filter" value={text} onValueChange={setText} className="flex-1" />
              {owner({ type: "searchFor", wanted }) && <Button type="submit" variant="outline">Filter</Button>}
            </div>
            {owner({ type: "searchFor", wanted }) && (
              <div role="group" aria-label="Kind" className="flex flex-wrap gap-1">
                {kinds.map(([one, name]) => <Button key={name} type="button" variant={kind === one ? "secondary" : "ghost"} size="sm" aria-pressed={kind === one} onClick={() => setKind(one)}>{name}</Button>)}
              </div>
            )}
          </form>
          {looked !== "NoFilter" && (
            <div className="flex flex-col gap-2">
              <Chip onClear={owner({ type: "clearFilter" }) ? () => tell({ type: "clearFilter" }) : undefined} clearLabel="Clear the filter">
                {[state.search.filter.anyKind ? "" : kinds.find(([one]) => one === state.search.filter.kind)?.[1] ?? "", state.search.filter.text === "" ? "" : `“${state.search.filter.text}”`].filter(Boolean).join(" · ") || "Everything"}
              </Chip>
              {looked === "Looking" && <Spinner label="Looking" />}
              {looked === "Nothing" && <EmptyState title="Nothing matches" />}
              {looked === "Trouble" && <Alert variant="warn">The search could not finish</Alert>}
              {looked === "Unfinished" && <Alert variant="info">Nothing found in what the phone could search</Alert>}
              {looked === "Found" && (
                <ListGroup heading="Found">
                  {state.search.hits.map((hit) => (
                    <ListRow key={hit.id} title={hit.name} onClick={owner({ type: "view", file: hit }) ? () => tell({ type: "view", file: hit }) : undefined} />
                  ))}
                </ListGroup>
              )}
            </div>
          )}
          {shown === "Reading" && state.items.length === 0 && <Spinner label="Reading the folder" />}
          {shown === "Unreachable" && <Alert variant="destructive">This place cannot be read now</Alert>}
          {empty(state) && <EmptyState title="Nothing here" />}
          {shown === "Showing" && state.partial && <Alert variant="info">Only part of this place could be read</Alert>}
          {sorted.length > 0 && <ListGroup aria-label="Listed" className={state.layout === "Grid" ? "grid grid-cols-2" : undefined}>{sorted.map(row)}</ListGroup>}
          {state.picked.length > 0 && (
            <div role="toolbar" aria-label="Selection" className="flex flex-wrap gap-2">
              {owner({ type: "selectAll" }) && <Button variant="ghost" size="sm" onClick={() => tell({ type: "selectAll" })}>Select all</Button>}
              {owner({ type: "askToDelete" }) && <Button variant="outline" size="sm" onClick={() => tell({ type: "askToDelete" })}>Delete</Button>}
              {owner({ type: "openMoveTo" }) && <Button variant="outline" size="sm" onClick={() => tell({ type: "openMoveTo" })}>Move or copy</Button>}
              {owner({ type: "openShare", mail: false }) && <Button variant="outline" size="sm" onClick={() => tell({ type: "openShare", mail: false })}>Share</Button>}
              {owner({ type: "begin", work: "Rename", name: unnamed }) && <Button variant="outline" size="sm" onClick={() => setNaming({ work: "Rename", name: picked[0]?.name ?? "" })}>Rename</Button>}
              {picked.length === 1 && picked[0] && owner({ type: "showDetails", target: picked[0].id }) && <Button variant="outline" size="sm" onClick={() => picked[0] && tell({ type: "showDetails", target: picked[0].id })}>Details</Button>}
              {owner({ type: "cancelSelection" }) && <Button variant="ghost" size="sm" onClick={() => tell({ type: "cancelSelection" })}>Cancel</Button>}
            </div>
          )}
        </>
      )}
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
