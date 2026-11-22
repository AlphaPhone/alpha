// spec/files/browser.md, "Story: Open Files and see my storage"; spec/files/browser.md, "Story: Walk my folders and categories"; spec/files/browser.md, "Story: Select files and act on them together"; spec/files/mutations.md, "Story: Change many files and be told truthfully what changed"; spec/files/preview.md, "Story: Do something with the file I am looking at"; spec/files/trash.md, "Story: Restore or delete several Trash items together"; spec/files/filter.md, "Story: Let the agent show me the files I asked about"
import { Effect } from "effect";
import { ArrowLeft, FolderPlus, FolderUp } from "lucide-react";
import { useState } from "react";
import { useMachine as useBrowser } from "../../../gen/files__browser.react.ts";
import { useMachine as useTrash } from "../../../gen/files__trash.react.ts";
import { useMachine as useFilter } from "../../../gen/files__filter.react.ts";
import { useMachine as usePreview } from "../../../gen/files__preview.react.ts";
import { useMachine as usePages } from "../../../gen/files__pdf.react.ts";
import { useMachine as useRecent } from "../../../gen/files__recent.react.ts";
import { useMachine as usePanel } from "../../../gen/files__share.react.ts";
import { initial as browserInitial } from "../../../gen/files__browser.ts";
import { initial as trashInitial } from "../../../gen/files__trash.ts";
import { initial as filterInitial } from "../../../gen/files__filter.ts";
import { initial as previewInitial } from "../../../gen/files__preview.ts";
import { initial as pagesInitial } from "../../../gen/files__pdf.ts";
import { initial as recentInitial } from "../../../gen/files__recent.ts";
import { initial as panelInitial } from "../../../gen/files__share.ts";
import type { Destination } from "../../../gen/files__share.ts";
import type { Place, Row } from "../../../gen/files__storage.ts";
import { Build } from "../../platform/build.vibe";
import { FilesBrowser } from "../../files/browser.vibe";
import { FilesChanges, type ChangeResult, type ShareResult } from "../../files/changes.vibe";
import { FilesPreview, previewActions } from "../../files/preview.vibe";
import { FileShareTargets, FilesShare } from "../../files/share.vibe";
import { FilesDownloads } from "../../files/downloads.vibe";
import { LibraryImport } from "../../files/library.vibe";
import { keyPath, parentOf } from "../../files/paths.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { Button, Toast, ToastProvider, ToastViewport } from "../components/ui/index.ts";
import { BrowseView } from "./BrowseView.tsx";
import { DestinationDialog } from "./DestinationDialog.tsx";
import { DetailsDialog } from "./DetailsDialog.tsx";
import { EraseDialog } from "./EraseDialog.tsx";
import { FilterResults } from "./FilterResults.tsx";
import { ListingView } from "./ListingView.tsx";
import { NameDialog } from "./NameDialog.tsx";
import { PreviewSheet } from "./PreviewSheet.tsx";
import { SelectionBar } from "./SelectionBar.tsx";
import { SharePanelSheet } from "./SharePanelSheet.tsx";
import { TrashItemSheet } from "./TrashItemSheet.tsx";
import { TrashView } from "./TrashView.tsx";
import { batchSummary, CATEGORY_LABELS, locationLabel, storageResultText } from "./format.ts";
import { filesRuntime, run, start } from "./runtime.ts";

type Dest = { op: "move" | "copy"; keys: readonly string[]; paths: readonly string[]; at: string; folders: readonly Row[] | undefined };
type Naming = { op: "create" | "rename"; initial: string; key?: string; parent: string; volume: string; error?: string; returnTo?: Dest };
type Notice = { text: string; undo?: boolean };

const info = filesRuntime.runSync(Build.use((b) => Effect.succeed(b.info)));
const targets = filesRuntime.runSync(FileShareTargets.use((t) => Effect.succeed({ messages: t.messages, ask: t.ask })));

/**
 * Files: Browse, folders and categories, Trash, the agent's filter and the file preview.
 * @model spec/files/browser.md
 */
export function FilesScreen({ route, onClose }: ScreenProps) {
  const { state: browser = browserInitial, can, send } = useBrowser(filesRuntime);
  const { state: trash = trashInitial, send: sendTrash } = useTrash(filesRuntime);
  const { state: filter = filterInitial, send: sendFilter } = useFilter(filesRuntime);
  const { state: preview = previewInitial } = usePreview(filesRuntime);
  const { state: pages = pagesInitial } = usePages(filesRuntime);
  const { state: recent = recentInitial } = useRecent(filesRuntime);
  const { state: panel = panelInitial } = usePanel(filesRuntime);
  const [dest, setDest] = useState<Dest>();
  const [naming, setNaming] = useState<Naming>();
  const [details, setDetails] = useState<Row>();
  const [notice, setNotice] = useState<Notice>();
  const [shareTitle, setShareTitle] = useState("Selected files");
  const [shareKeys, setShareKeys] = useState<readonly string[]>([]);
  const busy = browser.mutations > 0;
  const actions = previewActions(preview, info.variant === "aosp", targets);
  const browserBuild = info.variant === "browser";
  const volumeName = (volume: string) => volume ? browser.volumes.find((v) => v.id === volume)?.name ?? "Storage" : browser.volumes.find((v) => v.primary)?.name ?? "Internal storage";
  const say = (text: string, undo = false) => text && setNotice({ text, undo });
  const settled = () => run(FilesChanges.use((c) => c.batch())).then((b) => say(batchSummary(b), b.op === "TrashFiles" && b.undo > 0));

  const navigate = (place: Place) => void run(FilesBrowser.use((b) => b.navigate(place)));
  const openRow = (row: Row) => {
    if (row.kind === "KindFolder") return navigate({ tag: "InFolder", path: row.path, volume: keyPath(row.key).volume });
    void run(FilesPreview.use((p) => p.openRow(row))).then((result) => {
      if (result.kind === "refused") say(storageResultText(result.status, result.message, "This file could not open."));
      if (result.kind === "elsewhere" && !result.opened && result.status) say(storageResultText(result.status, undefined, "No app can open this file."));
    });
  };
  const shared = (result: ShareResult) => result.kind === "refused" ? say(storageResultText(result.status, result.message, "Sharing could not open.", true)) : result.kind === "unknown" && say("Sharing could not open.");
  const changed = (result: ChangeResult, fallback: string) => result.kind === "refused" ? storageResultText(result.status, result.message, fallback) : result.kind === "unknown" ? "The operation could not be confirmed." : undefined;

  const openShare = (keys: readonly string[], title: string) => {
    setShareTitle(title);
    setShareKeys(keys);
    const fromPreview = keys.length === 0;
    const serial = preview.serial;
    const selection = browser.selected.join("\n");
    void run(Effect.gen(function* () {
      const previews = yield* FilesPreview;
      const files = yield* FilesBrowser;
      const share = yield* FilesShare;
      const same = fromPreview ? previews.stillShowing(serial) : Effect.map(files.get(), (now) => now.selected.join("\n") === selection);
      return yield* share.open(fromPreview && actions.email, fromPreview && actions.message, same);
    }));
  };
  const choose = (id: number, destination: Destination) => {
    const keys = shareKeys;
    const serial = preview.serial;
    void run(Effect.gen(function* () {
      const previews = yield* FilesPreview;
      const changes = yield* FilesChanges;
      const share = yield* FilesShare;
      const downloads = yield* FilesDownloads;
      const destinations = yield* FileShareTargets;
      const deliver = Effect.gen(function* () {
        if (destination === "SystemSheet") {
          if (keys.length === 0) {
            const status = yield* previews.shareSelected();
            return status === "opened" ? "Delivered" as const : "DeliveryFailed" as const;
          }
          const result = yield* changes.share(keys);
          shared(result);
          return result.kind === "opened" ? "Delivered" as const : "DeliveryFailed" as const;
        }
        if (destination === "EmailDraft") {
          const file = yield* previews.sharedFile();
          if (!file) return "DeliveryFailed" as const;
          const result = yield* share.email(file, previews.stillShowing(serial));
          if (result.kind === "failed") say(result.detail ?? (result.reason === "duplicate" ? "The unfinished draft already has this file." : result.reason === "changed" ? "The selected file changed. Select it again." : "Couldn’t attach the file."));
          return result.kind === "inserted" ? "Delivered" as const : "DeliveryFailed" as const;
        }
        if (destination === "MessagesPicture") {
          const file = yield* previews.sharedFile();
          const sent = file ? yield* destinations.message(file) : false;
          return sent ? "Delivered" as const : "DeliveryFailed" as const;
        }
        if (destination === "SaveCopy") {
          const result = yield* downloads.download(keys);
          if (result !== "handed") say(result === "changed" ? "A selected item changed. Refresh and select it again." : "The download could not start.");
          return result === "handed" ? "Delivered" as const : "DeliveryFailed" as const;
        }
        return "Delivered" as const;
      });
      return yield* share.choose(id, destination, deliver);
    }));
  };

  const beginDest = (op: "move" | "copy", keys: readonly string[]) => {
    const paths = keys.map((k) => keyPath(k).path);
    const volume = keys.length ? keyPath(keys[0]!).volume : "";
    const here = browser.place.tag === "InFolder" && paths.every((p) => parentOf(p) === (browser.place.tag === "InFolder" ? browser.place.path : "")) ? browser.place.path : "";
    const next: Dest = { op, keys, paths, at: here, folders: undefined };
    setDest(next);
    void run(FilesChanges.use((c) => c.folders(here, volume))).then((folders) => setDest({ ...next, folders: folders ?? [] }));
  };
  const openDest = (at: string) => {
    if (!dest) return;
    const volume = dest.keys.length ? keyPath(dest.keys[0]!).volume : "";
    setDest({ ...dest, at, folders: undefined });
    void run(FilesChanges.use((c) => c.folders(at, volume))).then((folders) => setDest({ ...dest, at, folders: folders ?? [] }));
  };
  const confirmDest = () => {
    if (!dest) return;
    const { keys, at, op } = dest;
    setDest(undefined);
    void run(FilesChanges.use((c) => c.transfer(keys, at, op === "copy"))).then(settled);
  };
  const confirmName = (name: string) => {
    if (!naming) return;
    const work = naming.op === "create"
      ? FilesChanges.use((c) => c.createFolder(naming.parent, naming.volume, name))
      : preview.shown && !naming.key ? Effect.map(FilesPreview.use((p) => p.rename(name)), (answer): ChangeResult => answer === "RenameRefused" ? { kind: "refused", status: "failed" } : { kind: "done" })
      : FilesChanges.use((c) => c.rename(naming.key ?? "", name));
    void run(work).then((result) => {
      const error = changed(result, "Choose another name.");
      if (error) return setNaming({ ...naming, error });
      const back = naming.returnTo;
      setNaming(undefined);
      if (back && result.kind === "done" && result.path !== undefined) {
        setDest(back);
        openDest(result.path);
      }
    });
  };
  const trashKeys = (keys: readonly string[]) => void run(FilesChanges.use((c) => c.trash(keys))).then(settled);
  const title = browser.place.tag === "InTrash" ? "Trash" : browser.place.tag === "InCategory" ? CATEGORY_LABELS[browser.place.category]
    : browser.place.tag === "InFolder" ? (browser.place.path ? browser.place.path.slice(browser.place.path.lastIndexOf("/") + 1) : browser.place.volume ? volumeName(browser.place.volume) : "All files") : "Files";
  const creatable = browser.access === "AccessGranted" && (browser.place.tag === "InFolder" || browser.place.tag === "Browse" || (browser.place.tag === "InCategory" && browser.place.category === "Downloads"));
  const newFolder = () => {
    const parent = browser.place.tag === "InFolder" ? browser.place.path : browser.place.tag === "InCategory" ? "Download" : "";
    setNaming({ op: "create", initial: "", parent, volume: browser.place.tag === "InFolder" ? browser.place.volume : "" });
  };
  const visit = (node: HTMLElement | null) => {
    if (!node) return;
    const stop = start(Effect.gen(function* () {
      yield* FilesPreview.use((p) => p.enter());
      yield* FilesPreview.use((p) => p.restoreOpen());
      yield* FilesBrowser.use((b) => b.visit(route));
    }));
    return () => {
      stop();
      void run(FilesPreview.use((p) => p.leave()));
      void run(FilesShare.use((s) => s.retire()));
    };
  };
  const back = () => {
    if (browser.selecting) return void send({ type: "endSelecting" });
    if (browser.place.tag !== "Browse") return void run(FilesBrowser.use((b) => b.goUp()));
    if (filter.shown !== 0) return clearFilter();
    onClose();
  };
  const clearFilter = () => void sendFilter({ type: "clearFilter" });

  return (
    <ToastProvider>
      <main ref={visit} aria-label="Files" className="flex h-full flex-col bg-background text-foreground">
        <header className="flex items-center gap-1 px-2 pt-2">
          <Button variant="ghost" size="icon" aria-label="Back" onClick={back} disabled={busy && browser.selecting}><ArrowLeft className="size-5" /></Button>
          <h1 className="min-w-0 flex-1 truncate font-serif text-2xl">{title}</h1>
          {browserBuild && browser.place.tag === "Browse" && (
            <Button variant="ghost" size="icon" aria-label="Import a folder" disabled={busy}
              onClick={() => void run(LibraryImport.use((l) => l.folder())).then((path) => path ? navigate({ tag: "InFolder", path, volume: "" }) : undefined)}>
              <FolderUp className="size-5" />
            </Button>
          )}
          {creatable && <Button variant="ghost" size="icon" aria-label="New folder" disabled={busy} onClick={newFolder}><FolderPlus className="size-5" /></Button>}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filter.shown !== 0 && browser.place.tag === "Browse" ? (
            <FilterResults filter={filter} busy={busy} onOpen={openRow} onClear={clearFilter} />
          ) : browser.place.tag === "Browse" ? (
            <BrowseView browser={browser} recent={recent}
              onCategory={(category) => navigate({ tag: "InCategory", category })}
              onVolume={(volume) => navigate({ tag: "InFolder", path: "", volume: volume.primary ? "" : volume.id })}
              onTrash={() => navigate({ tag: "InTrash" })}
              onAllow={() => void run(FilesBrowser.use((b) => b.requestAccess()))}
              onRetry={() => void run(FilesBrowser.use((b) => b.refresh()))}
              onRecent={(row) => void run(FilesPreview.use((p) => p.openRecent(row))).then((r) => r.kind === "refused" && say("Access to this file ended. Select it again."))}
              onPick={() => void run(FilesPreview.use((p) => p.openPicked())).then((r) => r.kind === "refused" && say("Couldn’t open the picker."))} />
          ) : browser.place.tag === "InTrash" ? (
            <TrashView trash={trash} now={Date.now()} volumeName={volumeName} busy={busy}
              onShow={(key) => void sendTrash({ type: "showItem", key })}
              onToggle={(key) => void sendTrash({ type: "toggleItem", key })}
              onBeginSelecting={() => void sendTrash({ type: "beginSelectingItems" })}
              onSelectAll={() => void sendTrash({ type: "selectAllItems" })}
              onEndSelecting={() => void sendTrash({ type: "endSelectingItems" })}
              onRestore={(keys) => void run(FilesChanges.use((c) => c.restore(keys))).then(settled)}
              onReviewEmpty={() => void sendTrash({ type: "reviewEmpty" })}
              onReviewChosen={() => void sendTrash({ type: "reviewChosen" })} />
          ) : (
            <ListingView browser={browser} volumeName={volumeName(browser.place.tag === "InFolder" ? browser.place.volume : "")}
              canSelect={!busy && browser.rows.length > 0}
              onOpen={openRow} onToggle={(key) => can({ type: "toggle", key }) && void send({ type: "toggle", key })}
              onGroup={(group) => navigate({ tag: "InFolder", path: group.folder, volume: "" })}
              onCrumb={(path) => navigate({ tag: "InFolder", path, volume: browser.place.tag === "InFolder" ? browser.place.volume : "" })}
              onSort={(mode) => void send({ type: "chooseSort", mode })} onGrid={() => void send({ type: "toggleGrid" })}
              onBeginSelecting={() => void send({ type: "beginSelecting" })} />
          )}
        </div>
        {browser.selecting && browser.place.tag !== "InTrash" && (
          <SelectionBar count={browser.selected.length} busy={busy}
            onCancel={() => void send({ type: "endSelecting" })} onSelectAll={() => void send({ type: "selectAll" })}
            onShare={() => openShare(browser.selected, "Selected files")} onMove={() => beginDest("move", browser.selected)} onCopy={() => beginDest("copy", browser.selected)}
            onRename={() => { const key = browser.selected[0]!; const row = browser.rows.find((r) => r.key === key); setNaming({ op: "rename", initial: row?.name ?? "", key, parent: "", volume: keyPath(key).volume }); }}
            onDetails={() => setDetails(browser.rows.find((r) => r.key === browser.selected[0]))}
            onTrash={() => trashKeys(browser.selected)}
            {...(browserBuild ? { onDownload: () => void run(FilesDownloads.use((d) => d.download(browser.selected))) } : {})} />
        )}
        <PreviewSheet preview={preview} pages={pages} actions={actions} busy={busy}
          elsewhereLabel={browserBuild ? "Download file" : "Open in Android"}
          location={preview.doc.path ? locationLabel(volumeName(preview.doc.volume), parentOf(preview.doc.path)) : ""}
          onClose={() => void run(FilesPreview.use((p) => p.close(false)))}
          onPage={(page) => void run(FilesPreview.use((p) => p.page(page)))}
          onShare={() => openShare([], preview.doc.name)}
          onEmail={() => openShare([], preview.doc.name)}
          onMessage={() => openShare([], preview.doc.name)}
          onAsk={() => void run(Effect.gen(function* () {
            const file = yield* FilesPreview.use((p) => p.sharedFile());
            return file ? yield* FileShareTargets.use((t) => t.attachToChat(file, "Explain this file")) : false;
          })).then((ok) => !ok && say("The file changed. Reopen it before attaching."))}
          onMove={() => beginDest("move", [`${preview.doc.volume || "primary"}\n${preview.doc.path}`])}
          onRename={() => setNaming({ op: "rename", initial: preview.doc.name, parent: "", volume: preview.doc.volume })}
          onDetails={() => setDetails({ key: "", path: preview.doc.path, folder: parentOf(preview.doc.path), name: preview.doc.name, kind: preview.doc.kind, mimeType: preview.doc.mimeType, size: preview.doc.size, modified: preview.doc.modified, children: -1 })}
          onTrash={() => { void run(FilesPreview.use((p) => p.close(false))); trashKeys([`${preview.doc.volume || "primary"}\n${preview.doc.path}`]); }}
          onElsewhere={() => void run(FilesPreview.use((p) => p.openElsewhere())).then((status) => status !== "opened" && status !== "cancelled" && say(status === "unsupported" ? "No installed app can open this document." : "Android could not open the selected document."))}
          onReselect={() => void run(FilesPreview.use((p) => p.openPicked()))}
          onForget={() => void run(FilesPreview.use((p) => p.close(true)))}
          onViewer={(open) => void run(FilesPreview.use((p) => (open ? p.openViewer() : p.closeViewer())))} />
        <SharePanelSheet panel={panel} title={shareTitle} canSave={browserBuild} onChoose={choose} />
        <TrashItemSheet trash={trash} volumeName={volumeName} busy={busy}
          onRestore={(key) => void run(FilesChanges.use((c) => c.restore([key]))).then(settled)}
          onDelete={() => void sendTrash({ type: "reviewOne" })}
          onConfirmDelete={() => void run(FilesChanges.use((c) => c.erase())).then(settled)}
          onClose={() => void sendTrash({ type: "hideItem" })} />
        {trash.confirm !== "NoConfirm" && trash.confirm !== "DeleteOne" && (
          <EraseDialog trash={trash} busy={busy} onConfirm={() => void run(FilesChanges.use((c) => c.erase())).then(settled)} onCancel={() => void sendTrash({ type: "cancelReview" })} />
        )}
        {dest && (
          <DestinationDialog op={dest.op} paths={dest.paths} at={dest.at} folders={dest.folders} busy={busy}
            volumeName={volumeName(dest.keys.length ? keyPath(dest.keys[0]!).volume : "")}
            onOpenFolder={openDest} onConfirm={confirmDest} onCancel={() => setDest(undefined)}
            onNewFolder={() => { setNaming({ op: "create", initial: "", parent: dest.at, volume: keyPath(dest.keys[0] ?? "").volume, returnTo: dest }); setDest(undefined); }} />
        )}
        {naming && (
          <NameDialog op={naming.op} initial={naming.initial} keepExtension={naming.op === "rename"} busy={busy} error={naming.error}
            onConfirm={confirmName} onCancel={() => { const back = naming.returnTo; setNaming(undefined); if (back) setDest(back); }} />
        )}
        {details && (
          <DetailsDialog name={details.name} path={details.path} volumeName={volumeName(keyPath(details.key).volume)} kind={details.kind}
            mimeType={details.mimeType} size={details.size} modified={details.modified} children={details.children} onClose={() => setDetails(undefined)} />
        )}
        {notice && (
          <Toast open title={notice.text} onOpenChange={(open) => !open && setNotice(undefined)}
            {...(notice.undo ? { action: { label: "Undo", onAction: () => void run(FilesChanges.use((c) => c.undo())).then(settled) } } : {})} />
        )}
        <ToastViewport />
      </main>
    </ToastProvider>
  );
}

