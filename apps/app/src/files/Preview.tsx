// spec/app/files/preview.md, "Story: Look at a file"; spec/app/files/preview.md, "Story: Act on the file I am looking at"; spec/app/files/preview.md, "Story: Get a file back when access was lost"; spec/app/files/recent.md, "Story: Find what I opened lately"
import { Alert, Button, Dialog, DialogContent, DialogTitle, ListGroup, ListRow, Menu, MenuContent, MenuItem, MenuTrigger, Spinner } from "@repo/ui";
import { Effect, Option, type ManagedRuntime } from "effect";
import { ChevronLeft, ChevronRight, Ellipsis, ExternalLink, FileText, Pause, Play, Sparkles, X } from "lucide-react";
import type { Machine } from "../../gen/app__files__preview.effect.vibe";
import { loaded, showing, usable } from "../../gen/app__files__preview.ts";
import { useMachine } from "../../gen/app__files__preview.react.ts";
import type { Machine as RecentMachine } from "../../gen/app__files__recent.effect.vibe";
import { useMachine as useRecent } from "../../gen/app__files__recent.react.ts";
import { Handles } from "./handles.vibe";
import { Opened } from "./preview.vibe";

export interface PreviewProps {
  /** Provides the preview and Recent machines, and what the viewer read, of preview.vibe. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | RecentMachine | Opened | Handles, unknown>;
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
export function Preview({ runtime }: PreviewProps) {
  const { state, can, send } = useMachine(runtime);
  const recent = useRecent(runtime);
  if (!state || !recent.state || !showing(state)) return null;
  const owner = <E extends Parameters<typeof can>[0]>(event: E) => can(event, "Owner");
  const tell = <E extends Parameters<typeof send>[0]>(event: E) => void send(event, "Owner");
  const content = runtime.runSync(Effect.flatMap(Opened, (opened) => opened.content()));
  const mine = content.viewer === state.viewer && loaded(state);
  const grant = recent.state.shown.key === state.item ? recent.state.shown.grant : 0;
  const file = Option.getOrUndefined(runtime.runSync(Effect.flatMap(Opened, (opened) => opened.grant(grant))));
  const name = file?.name ?? Option.getOrUndefined(runtime.runSync(Effect.flatMap(Handles, (handles) => handles.label(state.item)))) ?? "File";
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
  return (
    <Dialog open onOpenChange={(open) => { if (!open && owner({ type: "close" })) tell({ type: "close" }); }}>
      <DialogContent aria-label="Preview" aria-describedby={undefined} className="inset-x-0 top-0 flex h-dvh max-h-none w-full max-w-none translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 text-foreground shadow-none sm:pointer-fine:max-w-103">
        <div className="flex min-h-14 shrink-0 items-center gap-1 px-2 pt-[env(safe-area-inset-top)]">
          {owner({ type: "close" }) && <Button variant="ghost" size="icon" aria-label="Close" onClick={() => tell({ type: "close" })}><ChevronLeft /></Button>}
          <div className="flex-1" />
          {(askAlpha || openElsewhere || forget) && (
            <Menu>
              <MenuTrigger asChild><Button variant="ghost" size="icon" aria-label="File actions"><Ellipsis /></Button></MenuTrigger>
              <MenuContent>
                {askAlpha && <MenuItem onSelect={() => tell({ type: "askAlpha" })}><Sparkles />Ask Alpha</MenuItem>}
                {openElsewhere && <MenuItem onSelect={() => tell({ type: "openElsewhere" })}><ExternalLink />Open elsewhere</MenuItem>}
                {forget && <MenuItem onSelect={() => tell({ type: "forget" })}><X />Forget</MenuItem>}
              </MenuContent>
            </Menu>
          )}
        </div>
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto px-6 pb-12">
          <DialogTitle className="mb-2 font-display text-3xl font-light break-words">{name}</DialogTitle>
          {file && <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><FileText aria-hidden className="size-4.5" />{file.mimeType === "application/pdf" ? "PDF" : { Media: "Media", Photo: "Image", Text: "Text", Archive: "Archive", Pdf: "PDF" }[state.kind]}</p>}
          {!usable(state) && <Alert variant="warn">Alpha can no longer read this file</Alert>}
          {state.content.status === "Loading" && <Spinner label="Opening the file" />}
          {state.content.status === "Failed" && <Alert variant="warn">{state.why === "Locked" ? "This PDF is locked" : state.why === "TooLarge" ? "This file is too large to show" : "This file cannot be shown here"}</Alert>}
          {state.drawing.status === "Failed" && <Alert variant="warn">This page cannot be shown</Alert>}
          {mine && content.text !== undefined && <pre className="font-mono text-sm whitespace-pre-wrap break-words">{content.text}</pre>}
          {mine && state.kind === "Photo" && content.uri && <img alt={name} src={content.uri} decoding="async" className="mx-auto w-full max-h-[55dvh] object-contain" />}
          {mine && state.kind === "Media" && content.uri && (file?.mimeType.startsWith("audio/") ? <audio {...mediaProps} src={content.uri} className="w-full" /> : <video {...mediaProps} src={content.uri} className="mx-auto w-full max-h-[55dvh]" />)}
          {owner({ type: "play" }) && <Button variant="ghost" size="icon" aria-label={state.playing ? "Pause" : "Play"} className="mx-auto mt-2 flex" onClick={() => tell({ type: "play" })}>{state.playing ? <Pause /> : <Play />}</Button>}
          {mine && state.kind === "Pdf" && state.drawing.status === "Loaded" && content.page && <img alt={`Page ${state.page} of ${state.pages}`} src={content.page} decoding="async" className="w-full rounded-sm border border-border shadow-sm" />}
          {state.kind === "Pdf" && state.pages > 1 && (
            <div className="mt-2 flex items-center justify-between gap-2 text-sm text-muted-foreground">
              {owner({ type: "turnTo", page: state.page - 1 }) ? <Button variant="ghost" size="icon" aria-label="Previous page" onClick={() => tell({ type: "turnTo", page: state.page - 1 })}><ChevronLeft /></Button> : <span className="size-11" />}
              <span>{`${state.page} / ${state.pages}`}</span>
              {owner({ type: "turnTo", page: state.page + 1 }) ? <Button variant="ghost" size="icon" aria-label="Next page" onClick={() => tell({ type: "turnTo", page: state.page + 1 })}><ChevronRight /></Button> : <span className="size-11" />}
            </div>
          )}
          {owner({ type: "selectAgain" }) && <Button size="sm" className="mt-3" onClick={() => tell({ type: "selectAgain" })}>Select again</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Recent: the files opened lately, newest first, each opened again when the phone still lets Alpha read it, and
 * otherwise named as one to select again.
 * @model spec/app/files/recent.md
 */
export function RecentFiles({ runtime }: PreviewProps) {
  const { state, can, send } = useRecent(runtime);
  if (!state || state.rows.length === 0) return null;
  return (
    <ListGroup heading="Recent" surface="plain" className="mt-3">
      {state.rows.map((row) => {
        const reopen = { type: "reopen", row } as const;
        const name = nameOf(runtime, row.grant) ?? Option.getOrElse(runtime.runSync(Effect.flatMap(Handles, (handles) => handles.label(row.key))), () => "A file to select again");
        return <ListRow className="min-h-15 gap-3.5 rounded-xl px-2" key={`${row.origin} ${row.key}`} title={name} aria-label={name} leading={<span className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-foreground"><FileText className="size-5" /></span>} detail={row.grant === 0 ? "Select it again to open it" : undefined} onClick={can(reopen, "Owner") ? () => void send(reopen, "Owner") : undefined} />;
      })}
    </ListGroup>
  );
}
