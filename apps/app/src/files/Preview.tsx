// spec/app/files/preview.md, "Story: Look at a file"; spec/app/files/preview.md, "Story: Act on the file I am looking at"; spec/app/files/preview.md, "Story: Get a file back when access was lost"; spec/app/files/recent.md, "Story: Find what I opened lately"; spec/app/files/preview.md, "The caption and Details show facts for the exact document held"
import { validName } from "@elizaos/plugin-files-client";
import { Alert, Button, Dialog, DialogContent, DialogTitle, FilesRow, Input, Menu, MenuContent, MenuItem, MenuTrigger, Spinner } from "@repo/ui";
import { Effect, Option, type ManagedRuntime } from "effect";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Ellipsis, ExternalLink, FileText, FolderInput, Info, Mail, MessageCircle, Pause, Pencil, Play, Share2, Sparkles, Trash2, X } from "lucide-react";
import type { Machine as Browser } from "../../gen/app__files.effect.vibe";
import { previewActionReady } from "../../gen/app__files.ts";
import { useMachine as useFiles } from "../../gen/app__files.react.ts";
import type { Machine } from "../../gen/app__files__preview.effect.vibe";
import { loaded, showing, showsFileFacts, usable } from "../../gen/app__files__preview.ts";
import { useMachine } from "../../gen/app__files__preview.react.ts";
import type { Machine as RecentMachine } from "../../gen/app__files__recent.effect.vibe";
import { useMachine as useRecent } from "../../gen/app__files__recent.react.ts";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Machine as Inbox } from "../../gen/app__inbox.effect.vibe";
import { useMachine as useInbox } from "../../gen/app__inbox.react.ts";
import type { Machine as Drafts } from "../../gen/app__inbox__drafts.effect.vibe";
import { useMachine as useDrafts } from "../../gen/app__inbox__drafts.react.ts";
import { changedOn, folderLocation, parentPath, sized } from "./entries.vibe";
import { Handles } from "./handles.vibe";
import { Opened, emailAccount, pictureFits } from "./preview.vibe";

/** Develop's File actions: a 220px panel under the header, ringed, with 44px rows and 20px icons. */
const actionsPanel = "w-55 min-w-0 rounded-tile p-1.5 ring-1 ring-border shadow-popup dark:shadow-popup-dark";
const actionRow = "min-h-11 rounded-lg px-3.5 py-2 [&_svg]:size-5";
export interface PreviewProps {
  /** Provides the preview and Recent machines, and what the viewer read, of preview.vibe. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | Browser | RecentMachine | Opened | Handles | Shell | Inbox | Drafts, unknown>;
  /** Files' current date, used to show the same short date as its list. */
  today: Date;
}

/** What the owner calls the document a grant names. */
function nameOf(runtime: PreviewProps["runtime"], grant: number): string | undefined {
  return Option.getOrUndefined(Option.map(runtime.runSync(Effect.flatMap(Opened, (opened) => opened.grant(grant))), (given) => given.name));
}

/**
 * The viewer: one file full screen, its text, picture, recording or PDF page, while it loads or why it cannot be
 * shown, and what the owner can do with it, each offered exactly when the rules take it.
 * @model spec/app/files/preview.md
 */
export function Preview({ runtime, today }: PreviewProps) {
  const { state, can, send } = useMachine(runtime);
  const recent = useRecent(runtime);
  const shell = useShell(runtime);
  const inbox = useInbox(runtime);
  const drafts = useDrafts(runtime);
  const files = useFiles(runtime);
  const [details, setDetails] = useState<{ readonly viewer: number; readonly revision: number }>();
  const [rename, setRename] = useState<{ readonly viewer: number; readonly revision: number; readonly name: string }>();
  if (!state || !recent.state || !showing(state) || shell.state?.assistant === "Sheet" || shell.state?.assistant === "Full") return null;
  const owner = <E extends Parameters<typeof can>[0]>(event: E) => can(event, "Owner");
  const tell = <E extends Parameters<typeof send>[0]>(event: E) => void send(event, "Owner");
  const content = runtime.runSync(Effect.flatMap(Opened, (opened) => opened.content()));
  const mine = content.viewer === state.viewer && loaded(state);
  const grant = recent.state.shown.key === state.item ? recent.state.shown.grant : 0;
  const file = Option.getOrUndefined(runtime.runSync(Effect.flatMap(Opened, (opened) => opened.grant(grant))));
  const lapsedName = !usable(state) ? runtime.runSync(Effect.flatMap(Opened, (opened) => opened.nameAt(state.item))) : undefined;
  const name = file?.name ?? lapsedName ?? Option.getOrUndefined(runtime.runSync(Effect.flatMap(Handles, (handles) => handles.label(state.item)))) ?? "File";
  const mediaProps = {
    "aria-label": name,
    preload: "metadata",
    onEnded: () => { if (state.playing && owner({ type: "play" })) tell({ type: "play" }); },
    ref: (node: HTMLMediaElement | null) => {
      if (node && state.playing && node.paused) {
        void node.play().catch(() => { if (owner({ type: "play" })) tell({ type: "play" }); });
      }
      else if (node && !state.playing && !node.paused) node.pause();
    },
  } as const;
  const askAlpha = owner({ type: "askAlpha" });
  const openElsewhere = owner({ type: "openElsewhere" });
  const forget = owner({ type: "forget" });
  const share = file !== undefined && owner({ type: "shareFile" });
  const picture = { type: "useInMessages", fitsPicture: pictureFits(file) } as const;
  const facts = file !== undefined && showsFileFacts(state, file.key, file.revision) ? file : undefined;
  const showDetails = facts !== undefined;
  const detailsOpen = showDetails && details?.viewer === state.viewer && details.revision === state.revision;
  const ownFile = file !== undefined && recent.state.shown.origin === "InFolder" && files.state !== undefined && previewActionReady(files.state);
  const move = { type: "actOnStoredFile", operation: "MoveFile", name: "", stored: ownFile } as const;
  const trash = { type: "actOnStoredFile", operation: "TrashFile", name: "", stored: ownFile } as const;
  const pickedRename = !ownFile && recent.state.shown.origin === "Picked" && file?.canRename === true;
  const nextName = rename?.name.trim() ?? "";
  const editName = pickedRename
    ? { type: "renamePicked", name: nextName, renameable: true } as const
    : { type: "actOnStoredFile", operation: "RenameFile", name: nextName, stored: ownFile } as const;
  const renaming = (ownFile || pickedRename) && rename?.viewer === state.viewer && rename.revision === state.revision;
  const showRename = owner({ ...editName, name: "/" });
  const place = facts?.storage;
  const location = place === undefined ? undefined : folderLocation(place.label, parentPath(place.path));
  const revision = facts?.revision ?? 0;
  const changed = changedOn(revision, today);
  const modified = changed === "" ? undefined : new Date(revision);
  const bytes = facts?.bytes;
  const kind = { Media: "Media", Photo: "Image", Text: "Text", Archive: "Archive", Pdf: "PDF", Receipt: "Receipt" }[state.kind];
  const caption = [kind, bytes === undefined ? "" : sized(bytes), changed, location].filter(Boolean).join(" · ");
  const destination = inbox.state && drafts.state ? emailAccount(inbox.state, drafts.state) : undefined;
  const offer = { type: "useInEmail", account: destination?.account ?? 0 } as const;
  const email = file !== undefined && destination !== undefined && owner(offer);
  return (
    <Dialog open onOpenChange={(open) => { if (!open && owner({ type: "close" })) tell({ type: "close" }); }}>
      <DialogContent aria-label="Preview" aria-describedby={undefined} className="inset-x-0 top-0 flex h-dvh max-h-none w-full max-w-none translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 text-foreground shadow-none sm:pointer-fine:max-w-103">
        <div className="flex min-h-13 shrink-0 items-center gap-0.5 px-2 pt-[env(safe-area-inset-top)] [&_button]:size-13">
          {owner({ type: "close" }) && <Button variant="ghost" size="icon" aria-label="Close" onClick={() => tell({ type: "close" })}><ChevronLeft /></Button>}
          <div className="flex-1" />
          {(askAlpha || openElsewhere || forget || email || owner(picture) || share || showDetails || showRename || owner(move) || owner(trash)) && (
            <Menu>
              <MenuTrigger asChild><Button variant="ghost" size="icon" aria-label="File actions"><Ellipsis /></Button></MenuTrigger>
              <MenuContent sideOffset={44} alignOffset={4} className={actionsPanel}>
                {share && <MenuItem className={actionRow} onSelect={() => tell({ type: "shareFile" })}><Share2 />Share</MenuItem>}
                {owner(move) && <MenuItem className={actionRow} onSelect={() => tell(move)}><FolderInput />Add to folder</MenuItem>}
                {email && <MenuItem aria-label="Use in email" className={actionRow} onSelect={() => tell(offer)}><Mail />Email</MenuItem>}
                {askAlpha && <MenuItem className={actionRow} onSelect={() => tell({ type: "askAlpha" })}><Sparkles />Ask Alpha</MenuItem>}
                {owner(picture) && <MenuItem className={actionRow} onSelect={() => tell(picture)}><MessageCircle />Use in Messages</MenuItem>}
                {openElsewhere && <MenuItem className={actionRow} onSelect={() => tell({ type: "openElsewhere" })}><ExternalLink />Open elsewhere</MenuItem>}
                {showRename && <MenuItem className={actionRow} onSelect={() => setRename({ viewer: state.viewer, revision: state.revision, name })}><Pencil />Rename</MenuItem>}
                {forget && <MenuItem className={actionRow} onSelect={() => tell({ type: "forget" })}><X />Forget</MenuItem>}
                {showDetails && <MenuItem className={actionRow} onSelect={() => setDetails({ viewer: state.viewer, revision: state.revision })}><Info />Details</MenuItem>}
                {owner(trash) && <MenuItem className={actionRow} onSelect={() => tell(trash)}><Trash2 />Delete</MenuItem>}
              </MenuContent>
            </Menu>
          )}
        </div>
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto px-6 pt-1 pb-42">
          <DialogTitle className="font-display text-title font-light break-words">{name}</DialogTitle>
          {facts !== undefined && <p className="mt-2.5 mb-5 flex items-start gap-2.5 text-sm text-muted-foreground"><FileText aria-hidden className="size-4.5 shrink-0" /><span className="min-w-0 break-words">{caption}</span></p>}
          {state.attempt.outcome === "Unknown" && state.offered.item === state.item && state.offered.revision === state.revision && <Alert variant="warn">Check Inbox before offering this file again</Alert>}
          {!usable(state) && <Alert variant="warn">Alpha can no longer read this file</Alert>}
          {state.content.status === "Loading" && <Spinner label="Opening the file" />}
          {state.content.status === "Failed" && <Alert variant="warn">{state.why === "Locked" ? "This PDF is locked" : state.why === "TooLarge" ? "This file is too large to show" : state.why === "TooSlow" ? "This PDF took too long to open" : "This file cannot be shown here"}</Alert>}
          {state.drawing.status === "Failed" && <Alert variant="warn">This page cannot be shown</Alert>}
          {mine && content.text !== undefined && <pre className="font-mono text-base leading-normal whitespace-pre-wrap break-words">{content.text}</pre>}
          {mine && state.kind === "Photo" && content.uri !== undefined && <img alt={name} src={content.uri} decoding="async" className="mx-auto w-full max-h-[55dvh] object-contain" />}
          {mine && state.kind === "Media" && content.uri !== undefined && (file?.mimeType.startsWith("audio/") ? <audio {...mediaProps} src={content.uri} className="w-full" /> : <video {...mediaProps} src={content.uri} className="mx-auto w-full max-h-[55dvh]" />)}
          {owner({ type: "play" }) && <Button variant="ghost" size="icon" aria-label={state.playing ? "Pause" : "Play"} className="mx-auto mt-2 flex" onClick={() => tell({ type: "play" })}>{state.playing ? <Pause /> : <Play />}</Button>}
          {mine && state.kind === "Pdf" && state.drawing.status === "Loaded" && content.page !== undefined && <div className="overflow-hidden rounded-lg bg-alpha-foreground shadow-md ring-1 ring-border"><img alt={`Page ${state.page} of ${state.pages}`} src={content.page} decoding="async" className="block h-auto w-full" /></div>}
          {state.kind === "Pdf" && state.pages > 1 && (
            <div className="mt-3 flex items-center justify-between gap-2 text-muted-foreground">
              {owner({ type: "turnTo", page: state.page - 1 }) && <Button variant="ghost" size="icon" aria-label="Previous page" onClick={() => tell({ type: "turnTo", page: state.page - 1 })}><ChevronLeft /></Button>}
              <span className="text-base">{`Page ${state.page} of ${state.pages}`}</span>
              {owner({ type: "turnTo", page: state.page + 1 }) && <Button variant="ghost" size="icon" aria-label="Next page" onClick={() => tell({ type: "turnTo", page: state.page + 1 })}><ChevronRight /></Button>}
            </div>
          )}
          {owner({ type: "selectAgain" }) && <Button size="sm" className="mt-3" onClick={() => tell({ type: "selectAgain" })}>Select again</Button>}
        </div>
        <Dialog open={renaming} onOpenChange={(open) => { if (!open) setRename(undefined); }}>
          <DialogContent closeLabel="Cancel rename">
            <DialogTitle>Rename</DialogTitle>
            <form className="flex flex-col gap-3" onSubmit={(event) => {
              event.preventDefault();
              if (!owner(editName) || !validName(editName.name) || editName.name === name) return;
              tell(editName);
              setRename(undefined);
            }}>
              <Input aria-label="Name" value={rename?.name ?? ""} onChange={(event) => setRename(rename && { ...rename, name: event.target.value })} />
              <Button type="submit" disabled={!owner(editName) || !validName(editName.name) || editName.name === name}>Rename</Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={detailsOpen} onOpenChange={(open) => { if (!open) setDetails(undefined); }}>
          <DialogContent closeLabel="Close details">
            <DialogTitle>{name}</DialogTitle>
            <dl aria-label="File details" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt>Type</dt><dd>{kind}</dd>
              {bytes !== undefined && <><dt>Size</dt><dd>{new Intl.NumberFormat().format(bytes)} bytes</dd></>}
              {modified !== undefined && <><dt>Modified</dt><dd><time dateTime={modified.toISOString()}>{modified.toLocaleString()}</time></dd></>}
              {location !== undefined && <><dt>Location</dt><dd>{location}</dd></>}
            </dl>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Recent: the files opened lately, newest first, each opened again when the phone still lets Alpha read it, and
 * otherwise named as one to select again.
 * @model spec/app/files/recent.md
 */
export function RecentFiles({ runtime }: Pick<PreviewProps, "runtime">) {
  const { state, can, send } = useRecent(runtime);
  if (!state || state.rows.length === 0) return null;
  return (
    <div role="group" aria-labelledby="files-recent">
      <h2 id="files-recent" className="mx-2 mt-3.5 mb-1 text-meta font-semibold text-muted-foreground">Recent</h2>
      {state.rows.map((row) => {
        const reopen = { type: "reopen", row } as const;
        const remembered = row.origin === "Picked" ? runtime.runSync(Effect.flatMap(Opened, (opened) => opened.nameAt(row.key))) : undefined;
        const name = nameOf(runtime, row.grant) ?? remembered ?? Option.getOrElse(runtime.runSync(Effect.flatMap(Handles, (handles) => handles.label(row.key))), () => "A file to select again");
        const reselect = { type: "openPicker", replacing: row.key } as const;
        const action = row.grant === 0 ? reselect : reopen;
        return <FilesRow key={`${row.origin} ${row.key}`} size="place" name={name} aria-label={row.grant === 0 ? `Select again: ${name}` : name} icon={<FileText />} detail={row.grant === 0 ? "Select it again to open it" : undefined} disabled={!can(action, "Owner")} onClick={() => void send(action, "Owner")} />;
      })}
    </div>
  );
}
