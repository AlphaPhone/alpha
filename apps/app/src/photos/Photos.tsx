// spec/app/photos/index.md, "Story: Give Photos access"; spec/app/photos/index.md, "Story: See what Alpha took without library access"; spec/app/photos/index.md, "Story: Browse the library"; spec/app/photos/index.md, "Story: Select photos"
import { Alert, Banner, Button, Chip, EmptyState, MediaTile, SearchField, Spinner, Tabs, TabsList, TabsTrigger } from "@repo/ui";
import { Heart, ImageOff, Share2, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Tab } from "../../gen/app__photos.effect.vibe";
import { useMachine } from "../../gen/app__photos.react.ts";
import { useMachine as useViewer } from "../../gen/app__photos__viewer.react.ts";
import { running } from "../../gen/app__photos__changes.ts";
import { type PhotosProps, albumOf, lengthOf, seenOf } from "./shown.ts";
import { Viewer } from "./Viewer.tsx";

const counted = (n: number) => (n === 1 ? "1 item" : `${n} items`);

/**
 * Photos: the Library grid narrowed by a filter or a search, the Albums tab and an album open, a selection and the
 * one run of changes it starts, and the Viewer over them; each control offered exactly when the rules take it.
 * @model spec/app/photos/index.md
 */
export function Photos({ runtime }: PhotosProps) {
  const { state, cause, can, send } = useMachine(runtime);
  const viewer = useViewer(runtime);
  const [query, setQuery] = useState("");
  if (cause) return <Alert variant="destructive" className="m-4">Alpha could not open Photos</Alert>;
  if (!state) return null;
  const owner = <E extends Parameters<typeof can>[0]>(event: E) => can(event, "Owner");
  const tell = <E extends Parameters<typeof send>[0]>(event: E) => void send(event, "Owner");
  const { access, job } = state;
  const rows = [...state.rows].sort((a, b) => b - a);
  const items = state.tab === "Library" || state.album !== 0;
  const search = query.trim();
  const narrowing = { type: "narrow", narrowing: search === "" ? "Everything" : "Matching", query: search, person: 0 } as const;
  const filter = (to: "Everything" | "Favorites" | "Videos") => ({ type: "narrow", narrowing: to, query: "", person: 0 }) as const;
  const busy = running(job);
  const ended = !busy && job.requests > 0;
  return (
    <section aria-label="Photos" className="flex flex-col gap-3 p-4">
      {state.selecting ? (
        <div className="flex items-center gap-2">
          {owner({ type: "endSelect" }) && <Button variant="ghost" size="icon" aria-label="Cancel selection" onClick={() => tell({ type: "endSelect" })}><X /></Button>}
          <h2 className="flex-1 text-lg font-semibold">{state.selected.length === 0 ? "Select items" : `${counted(state.selected.length)} selected`}</h2>
          {owner({ type: "selectAll" }) && state.selected.length < state.rows.length && <Button variant="ghost" size="sm" onClick={() => tell({ type: "selectAll" })}>Select all</Button>}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Tabs value={state.tab} onValueChange={(tab) => tell({ type: "showTab", tab: tab as Tab })} className="flex-1">
            <TabsList aria-label="Photos sections">
              <TabsTrigger value="Library" disabled={!owner({ type: "showTab", tab: "Library" }) && state.tab !== "Library"}>Library</TabsTrigger>
              <TabsTrigger value="Albums" disabled={!owner({ type: "showTab", tab: "Albums" }) && state.tab !== "Albums"}>Albums</TabsTrigger>
            </TabsList>
          </Tabs>
          {owner({ type: "startSelect" }) && <Button variant="ghost" size="sm" onClick={() => tell({ type: "startSelect" })}>Select</Button>}
        </div>
      )}

      {access.grant === "Unasked" && owner({ type: "askAccess" }) && (
        <Banner action={<Button size="sm" onClick={() => tell({ type: "askAccess" })}>Allow</Button>}>Allow Alpha to see your photos. Until then Photos shows what Alpha's camera took.</Banner>
      )}
      {access.grant === "Denied" && (
        <Banner variant="warn" action={owner({ type: "openSettings" }) ? <Button size="sm" onClick={() => tell({ type: "openSettings" })}>Open settings</Button> : undefined}>
          Alpha may not see your photos. Photos shows what Alpha's camera took.
        </Banner>
      )}
      {access.grant === "Limited" && !state.selecting && (
        <Banner action={<div className="flex gap-1">
          {owner({ type: "pickItems" }) && <Button size="sm" variant="ghost" onClick={() => tell({ type: "pickItems" })}>Choose items</Button>}
          {owner({ type: "openSettings" }) && <Button size="sm" onClick={() => tell({ type: "openSettings" })}>Allow all</Button>}
        </div>}>Alpha sees only the photos you chose.</Banner>
      )}

      {state.selecting && (
        <div role="toolbar" aria-label="Change the selection" className="flex gap-2">
          {owner({ type: "favouriteSelected" }) && <Button variant="secondary" size="sm" onClick={() => tell({ type: "favouriteSelected" })}><Heart />{state.selected.every((photo) => state.starred.includes(photo)) ? "Unfavourite" : "Favourite"}</Button>}
          {owner({ type: "shareSelected" }) && <Button variant="secondary" size="sm" onClick={() => tell({ type: "shareSelected" })}><Share2 />Share</Button>}
          {owner({ type: "trashSelected" }) && <Button variant="destructive" size="sm" onClick={() => tell({ type: "trashSelected" })}><Trash2 />Delete</Button>}
        </div>
      )}

      {state.tab === "Library" && !state.selecting && (
        <div className="flex flex-col gap-2">
          <form className="contents" onSubmit={(submitted) => { submitted.preventDefault(); if (owner(narrowing)) tell(narrowing); }}>
            <SearchField aria-label="Search photos" placeholder="Search photos" value={query} onValueChange={(text) => {
              setQuery(text);
              const cleared = filter("Everything");
              if (text.trim() === "" && owner(cleared)) tell(cleared);
            }} />
          </form>
          <div className="flex gap-2">
            {([["Favorites", "Favourites"], ["Videos", "Videos"]] as const).map(([to, name]) => {
              const on = state.filter === to;
              const event = filter(on ? "Everything" : to);
              return <Chip key={to} pressed={on} disabled={!owner(event)} onPressedChange={() => tell(event)}>{name}</Chip>;
            })}
          </div>
        </div>
      )}

      {busy && (
        <Banner action={owner({ type: "cancelRun" }) ? <Button size="sm" variant="ghost" onClick={() => tell({ type: "cancelRun" })}>Stop</Button> : undefined}>
          <span className="flex items-center gap-2"><Spinner size="sm" aria-hidden />Changing {counted(job.left.length + job.sending.length + job.done.length)}</span>
        </Banner>
      )}
      {ended && job.change === "Share" && job.done.length === 0 && !busy && <Alert variant="warn">Android couldn't open sharing</Alert>}
      {ended && job.stale.length > 0 && <Alert variant="warn">{counted(job.stale.length)} changed since you chose them, so they were left as they were</Alert>}
      {ended && job.unsure.length > 0 && <Alert variant="warn">Alpha can't tell whether {counted(job.unsure.length)} changed. Photos was read again.</Alert>}

      {state.album !== 0 && (
        <div className="flex items-center gap-2">
          {owner({ type: "closeAlbum" }) && <Button variant="ghost" size="sm" onClick={() => tell({ type: "closeAlbum" })}>Albums</Button>}
          <h2 className="text-lg font-semibold">{albumOf(runtime, state.album)?.name ?? "Album"}</h2>
        </div>
      )}

      {state.locked ? (
        <EmptyState title="Unlock the phone, then reopen Photos" />
      ) : state.library.status === "Failed" ? (
        <Alert variant="destructive" className="items-center">
          <span className="flex-1">Photos couldn't be read</span>
          {owner({ type: "retry" }) && <Button size="sm" variant="outline" onClick={() => tell({ type: "retry" })}>Try again</Button>}
        </Alert>
      ) : state.library.status === "Loading" && rows.length === 0 ? (
        <Spinner label="Loading photos" className="self-center" />
      ) : rows.length === 0 && state.library.status === "Loaded" ? (
        <EmptyState icon={<ImageOff />} title={!items ? "No albums yet" : state.filter === "Matching" ? "Nothing matches" : state.filter === "Favorites" ? "No favourites yet" : state.filter === "Videos" ? "No videos yet" : "No photos yet"} />
      ) : !items ? (
        <ul aria-label="Albums" className="grid grid-cols-2 gap-3">
          {rows.map((album) => {
            const found = albumOf(runtime, album);
            const open = { type: "openAlbum", album } as const;
            return (
              <li key={album}>
                <Button variant="secondary" className="h-auto w-full flex-col items-start rounded-lg p-3" disabled={!owner(open)} onClick={() => tell(open)}>
                  <span>{found?.name ?? "Album"}</span>
                  <span className="text-sm font-normal text-muted-foreground">{counted(found?.count ?? 0)}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul aria-label="Listed" className="-mx-4 grid grid-cols-4 gap-0.5">
          {rows.map((photo) => {
            const seen = seenOf(runtime, photo)?.item;
            const toggle = { type: "toggle", photo } as const;
            const view = { type: "openItem", photo, listed: true, secure: state.secure, only: state.only, reviewing: false } as const;
            const video = seen?.kind === "video";
            const tap = state.selecting ? (owner(toggle) ? () => tell(toggle) : undefined) : viewer.state && viewer.can(view, "Owner") ? () => void viewer.send(view, "Owner") : undefined;
            const taken = seen ? new Date(seen.date).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "";
            return (
              <li key={photo}>
                <MediaTile
                  src={seen?.image}
                  label={`${video ? "Video" : "Photo"}${taken ? `, ${taken}` : ""}`}
                  duration={video ? lengthOf(Math.round((seen?.duration ?? 0) / 100)) : undefined}
                  favourite={state.starred.includes(photo)}
                  selected={state.selecting ? state.selected.includes(photo) : undefined}
                  onClick={tap}
                  disabled={tap === undefined}
                />
              </li>
            );
          })}
        </ul>
      )}
      {owner({ type: "loadMore" }) && <Button variant="outline" className="self-center" onClick={() => tell({ type: "loadMore" })}>Show more</Button>}
      <Viewer runtime={runtime} rows={rows} />
    </section>
  );
}
