// spec/files/browser.md, "Story: Open Files and see my storage"; spec/files/browser.md, "Story: Walk my folders and categories"; spec/files/browser.md, "Story: Select files and act on them together"; spec/files/mutations.md, "Story: Change many files and be told truthfully what changed"; spec/files/preview.md, "Story: Do something with the file I am looking at"; spec/files/trash.md, "Story: Restore or delete several Trash items together"; spec/files/filter.md, "Story: Let the agent show me the files I asked about"
import { Effect } from "effect";
import { ArrowLeft, FolderPlus, FolderUp } from "lucide-react";
import { useCallback, useState } from "react";
import type { Browser, Event as BrowserEvent } from "../../../gen/files__browser.ts";
import type { Event as TrashEvent, TrashView as Trash } from "../../../gen/files__trash.ts";
import type { Event as FilterEvent, Filtering } from "../../../gen/files__filter.ts";
import type { PreviewState } from "../../../gen/files__preview.ts";
import type { PdfPages } from "../../../gen/files__pdf.ts";
import type { Destination, SharePanel } from "../../../gen/files__share.ts";
import type { Place, Row } from "../../../gen/files__storage.ts";
import type { BuildInfo } from "../../platform/build.vibe";
import { FilesBack } from "../../files/back.vibe";
import { Navigation } from "../../shell/navigation.vibe";
import { FilesBrowser } from "../../files/browser.vibe";
import { FilesChanges, type ChangeResult, type ShareResult } from "../../files/changes.vibe";
import { FilesPreview, previewActions } from "../../files/preview.vibe";
import { FileShareTargets, FilesShare } from "../../files/share.vibe";
import { FilesDownloads } from "../../files/downloads.vibe";
import { LibraryImport } from "../../files/library.vibe";
import { keyPath, parentOf } from "../../files/paths.vibe";
import type { ScreenProps } from "../app-screen.ts";
import type { perform as runPerform, start as runStart } from "../shell/services.ts";
import type { useLayer } from "../shell/useLayer.ts";
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
import { StorageAccess } from "./StorageAccess.tsx";
import { TrashItemSheet } from "./TrashItemSheet.tsx";
import { TrashView } from "./TrashView.tsx";
import { batchSummary, CATEGORY_LABELS, locationLabel, selectedDocumentText, storageResultText } from "./format.ts";

type Dest = { op: "move" | "copy"; keys: readonly string[]; paths: readonly string[]; at: string; folders: readonly Row[] | undefined; fromPreview: boolean };
type Naming = { op: "create" | "rename"; initial: string; key?: string; parent: string; volume: string; error?: string; returnTo?: Dest };
type Notice = { text: string; undo?: boolean };

/** The navigation layers of Files' destination, name and details dialogs. */
export const filesDialogLayers = ["files-destination", "files-name", "files-details"] as const;

/** A dialog listed in the shell's navigation, so Back and HOME close it. */
export type FilesLayer = ReturnType<typeof useLayer>;

/** Files' machine states, the build and share targets, its dialogs' navigation layers, and how its controls reach Files' services. */
export interface FilesScreenViewProps extends ScreenProps {
  /** Browse, the open place, its rows, the selection and storage access. */
  browser: Browser;
  /** Trash, its selection and the review of an erase. */
  trash: Trash;
  /** The agent's filter and its results. */
  filter: Filtering;
  /** The file preview. */
  preview: PreviewState;
  /** The PDF page shown in the preview. */
  pages: PdfPages;
  /** The share panel. */
  panel: SharePanel;
  /** Which build is running. */
  info: BuildInfo;
  /** Whether Messages and the assistant can take a shared file. */
  targets: { readonly messages: boolean; readonly ask: boolean };
  /** The clock time Trash counts its days from. */
  now: number;
  /** Whether the browser Machine allows an event now. */
  can: (event: BrowserEvent) => boolean;
  /** Sends an event to the browser Machine. */
  send: (event: BrowserEvent) => unknown;
  /** Sends an event to the Trash Machine. */
  sendTrash: (event: TrashEvent) => unknown;
  /** Sends an event to the filter Machine. */
  sendFilter: (event: FilterEvent) => unknown;
  /** The destination dialog's navigation layer. */
  destLayer: FilesLayer;
  /** The name dialog's navigation layer. */
  nameLayer: FilesLayer;
  /** The details dialog's navigation layer. */
  detailsLayer: FilesLayer;
  /** Runs one Files effect and resolves with its answer. */
  perform: typeof runPerform;
  /** Starts one long-running Files effect and returns how to stop it. */
  start: typeof runStart;
}

/**
 * Files' whole screen: Browse, folders and categories, Trash, the agent's filter and the file preview.
 * @model spec/files/browser.md
 */
export function FilesScreenView({
  route, onClose, browser, trash, filter, preview, pages, panel, info, targets, now, can, send, sendTrash, sendFilter, destLayer, nameLayer, detailsLayer, perform, start,
}: FilesScreenViewProps) {
  const [dest, setDest] = useState<Dest>();
  const [naming, setNaming] = useState<Naming>();
  const [details, setDetails] = useState<Row>();
  const showDest = (next: Dest) => { setDest(next); if (!destLayer.open) destLayer.show(); };
  const closeDest = () => { setDest(undefined); destLayer.hide(); };
  const showNaming = (next: Naming) => { setNaming(next); if (!nameLayer.open) nameLayer.show(); };
  const closeNaming = () => { setNaming(undefined); nameLayer.hide(); };
  const showDetails = (row: Row | undefined) => { if (!row) return; setDetails(row); if (!detailsLayer.open) detailsLayer.show(); };
  const closeDetails = () => { setDetails(undefined); detailsLayer.hide(); };
  const [notice, setNotice] = useState<Notice>();
  const [shareTitle, setShareTitle] = useState("Selected files");
  const [shareKeys, setShareKeys] = useState<readonly string[]>([]);
  const busy = browser.mutations > 0;
  const actions = previewActions(preview, info.variant === "aosp", targets);
  const browserBuild = info.variant === "browser";
  const volumeName = (volume: string) => volume ? browser.volumes.find((v) => v.id === volume)?.name ?? "Storage" : browser.volumes.find((v) => v.primary)?.name ?? "Internal storage";
  const say = (text: string, undo = false) => text && setNotice({ text, undo });
  const settled = () => perform(FilesChanges.use((c) => c.batch())).then((b) => say(batchSummary(b), b.op === "TrashFiles" && b.undo > 0));

  const navigate = (place: Place) => void perform(FilesBrowser.use((b) => b.navigate(place)));
  const openRow = (row: Row) => {
    if (row.kind === "KindFolder") return navigate({ tag: "InFolder", path: row.path, volume: keyPath(row.key).volume });
    void perform(FilesPreview.use((p) => p.openRow(row))).then((result) => {
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
    void perform(Effect.gen(function* () {
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
    void perform(Effect.gen(function* () {
      const previews = yield* FilesPreview;
      const changes = yield* FilesChanges;
      const share = yield* FilesShare;
      const downloads = yield* FilesDownloads;
      const destinations = yield* FileShareTargets;
      const deliver = Effect.gen(function* () {
        if (destination === "SystemSheet") {
          if (keys.length === 0) {
            const handed = yield* previews.shareSelected();
            if (handed.status !== "opened" && handed.status !== "cancelled") say(selectedDocumentText(handed.message, "Android could not open sharing for this item."));
            return handed.status === "opened" ? "Delivered" as const : "DeliveryFailed" as const;
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

  const beginDest = (op: "move" | "copy", keys: readonly string[], fromPreview = false) => {
    const paths = keys.map((k) => keyPath(k).path);
    const volume = keys.length ? keyPath(keys[0]!).volume : "";
    const here = browser.place.tag === "InFolder" && paths.every((p) => parentOf(p) === (browser.place.tag === "InFolder" ? browser.place.path : "")) ? browser.place.path : "";
    const next: Dest = { op, keys, paths, at: here, folders: undefined, fromPreview };
    showDest(next);
    void perform(FilesChanges.use((c) => c.folders(here, volume))).then((folders) => {
      if (folders !== undefined || here === "") return setDest({ ...next, folders: folders ?? [] });
      setDest({ ...next, at: "" });
      void perform(FilesChanges.use((c) => c.folders("", volume))).then((root) => setDest({ ...next, at: "", folders: root ?? [] }));
    });
  };
  const openDest = (from: Dest, at: string) => {
    const volume = from.keys.length ? keyPath(from.keys[0]!).volume : "";
    showDest({ ...from, at, folders: undefined });
    void perform(FilesChanges.use((c) => c.folders(at, volume))).then((folders) => {
      if (folders === undefined) say("This folder could not be read.");
      setDest({ ...from, at: folders === undefined ? from.at : at, folders: folders ?? from.folders ?? [] });
    });
  };
  const confirmDest = () => {
    if (!dest) return;
    const { keys, at, op, fromPreview } = dest;
    closeDest();
    void perform(Effect.gen(function* () {
      yield* FilesChanges.use((c) => c.transfer(keys, at, op === "copy"));
      const batch = yield* FilesChanges.use((c) => c.batch());
      if (fromPreview && op === "move" && batch.done > 0) yield* FilesPreview.use((p) => p.close(false));
    })).then(settled);
  };
  const confirmName = (name: string) => {
    if (!naming) return;
    if (naming.op === "rename" && preview.shown && !naming.key) {
      void perform(FilesPreview.use((p) => p.rename(name))).then((renamed) => renamed.answer === "RenameRefused"
        ? setNaming({ ...naming, error: selectedDocumentText(renamed.message, "The app that stores this document did not rename it.") })
        : closeNaming());
      return;
    }
    const work = naming.op === "create"
      ? FilesChanges.use((c) => c.createFolder(naming.parent, naming.volume, name))
      : FilesChanges.use((c) => c.rename(naming.key ?? "", name));
    void perform(work).then((result) => {
      const error = changed(result, "Choose another name.");
      if (error) return setNaming({ ...naming, error });
      const back = naming.returnTo;
      closeNaming();
      if (back && result.kind === "done" && result.path !== undefined) openDest(back, result.path);
    });
  };
  const trashKeys = (keys: readonly string[]) => void perform(FilesChanges.use((c) => c.trash(keys))).then(settled);
  const title = browser.place.tag === "InTrash" ? "Trash" : browser.place.tag === "InCategory" ? CATEGORY_LABELS[browser.place.category]
    : browser.place.tag === "InFolder" ? (browser.place.path ? browser.place.path.slice(browser.place.path.lastIndexOf("/") + 1) : browser.place.volume ? volumeName(browser.place.volume) : "All files") : "Files";
  const creatable = browser.access === "AccessGranted" && (browser.place.tag === "InFolder" || browser.place.tag === "Browse" || (browser.place.tag === "InCategory" && browser.place.category === "Downloads"));
  const newFolder = () => {
    const parent = browser.place.tag === "InFolder" ? browser.place.path : browser.place.tag === "InCategory" ? "Download" : "";
    if (browser.place.tag === "Browse") navigate({ tag: "InFolder", path: "", volume: "" });
    showNaming({ op: "create", initial: "", parent, volume: browser.place.tag === "InFolder" ? browser.place.volume : "" });
  };
  // One visit per stretch on screen, or per route Files is opened at: a callback ref React sees as new on every render
  // would leave and re-enter Files on each render, and each enter's state change renders again, without end.
  const visit = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const stop = start(Effect.gen(function* () {
      yield* FilesPreview.use((p) => p.enter());
      yield* FilesPreview.use((p) => p.restoreOpen());
      yield* Effect.all([FilesBrowser.use((b) => b.visit(route)), FilesShare.use((s) => s.followVisibility())], { concurrency: "unbounded", discard: true });
    }));
    return () => {
      stop();
      void perform(FilesPreview.use((p) => p.leave()));
      void perform(FilesShare.use((s) => s.retire()));
      void perform(Navigation.use((n) => Effect.forEach(filesDialogLayers, (id) => n.closeLayer(id), { discard: true })));
    };
  }, [route, start, perform]);
  const back = () => void perform(FilesBack.use((b) => b.back())).then((handled) => !handled && onClose());
  const clearFilter = () => void sendFilter({ type: "clearFilter" });
  const allow = () => void perform(FilesBrowser.use((b) => b.requestAccess()));
  const retry = () => void perform(FilesBrowser.use((b) => b.refresh()));

  return (
    <ToastProvider>
      <main ref={visit} aria-label="Files" className="flex h-full flex-col bg-background text-foreground">
        <header className="flex items-center gap-1 px-2 pt-2">
          <Button variant="ghost" size="icon" aria-label="Back" onClick={back} disabled={busy && browser.selecting}><ArrowLeft className="size-5" /></Button>
          <h1 className="min-w-0 flex-1 truncate font-display text-2xl">{title}</h1>
          {browserBuild && browser.place.tag === "Browse" && (
            <Button variant="ghost" size="icon" aria-label="Import a folder" disabled={busy}
              onClick={() => void perform(LibraryImport.use((l) => l.folder())).then((path) => path ? navigate({ tag: "InFolder", path, volume: "" }) : undefined)}>
              <FolderUp className="size-5" />
            </Button>
          )}
          {creatable && <Button variant="ghost" size="icon" aria-label="New folder" disabled={busy} onClick={newFolder}><FolderPlus className="size-5" /></Button>}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filter.shown !== 0 && browser.place.tag === "Browse" ? (
            <FilterResults filter={filter} busy={busy} onOpen={openRow} onClear={clearFilter} />
          ) : browser.place.tag === "Browse" ? (
            <BrowseView browser={browser}
              onAllFiles={() => navigate({ tag: "InFolder", path: "", volume: "" })}
              onCategory={(category) => navigate({ tag: "InCategory", category })}
              onVolume={(volume) => navigate({ tag: "InFolder", path: "", volume: volume.primary ? "" : volume.id })}
              onTrash={() => navigate({ tag: "InTrash" })}
              onAllow={allow} onRetry={retry} />
          ) : browser.access !== "AccessGranted" ? (
            <StorageAccess access={browser.access} legacy={browser.legacyAccess} loading={browser.loading} onAllow={allow} onRetry={retry} />
          ) : browser.place.tag === "InTrash" ? (
            <TrashView trash={trash} now={now} volumeName={volumeName} busy={busy}
              onShow={(key) => void sendTrash({ type: "showItem", key })}
              onToggle={(key) => void sendTrash({ type: "toggleItem", key })}
              onBeginSelecting={() => void sendTrash({ type: "beginSelectingItems" })}
              onSelectAll={() => void sendTrash({ type: "selectAllItems" })}
              onEndSelecting={() => void sendTrash({ type: "endSelectingItems" })}
              onRestore={(keys) => void perform(FilesChanges.use((c) => c.restore(keys))).then(settled)}
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
            onRename={() => { const key = browser.selected[0]!; const row = browser.rows.find((r) => r.key === key); showNaming({ op: "rename", initial: row?.name ?? "", key, parent: "", volume: keyPath(key).volume }); }}
            onDetails={() => showDetails(browser.rows.find((r) => r.key === browser.selected[0]))}
            onTrash={() => trashKeys(browser.selected)}
            {...(browserBuild ? { onDownload: () => void perform(FilesDownloads.use((d) => d.download(browser.selected))).then((result) => result !== "handed" && say(result === "changed" ? "A selected item changed. Refresh and select it again." : result === "busy" ? "Files is still finishing the last download." : "The download could not start.")) } : {})} />
        )}
        <PreviewSheet preview={preview} pages={pages} actions={actions} busy={busy}
          elsewhereLabel={browserBuild ? "Download file" : "Open in Android"}
          location={preview.doc.path ? locationLabel(volumeName(preview.doc.volume), parentOf(preview.doc.path)) : ""}
          onClose={() => void perform(FilesPreview.use((p) => p.close(false)))}
          onPage={(page) => void perform(FilesPreview.use((p) => p.page(page)))}
          onShare={() => openShare([], preview.doc.name)}
          onEmail={() => openShare([], preview.doc.name)}
          onMessage={() => openShare([], preview.doc.name)}
          onAsk={() => void perform(Effect.gen(function* () {
            const file = yield* FilesPreview.use((p) => p.sharedFile());
            return file ? yield* FileShareTargets.use((t) => t.attachToChat(file, "Explain this file")) : false;
          })).then((ok) => !ok && say("The file changed. Reopen it before attaching."))}
          onMove={() => beginDest("move", [`${preview.doc.volume || "primary"}\n${preview.doc.path}`], true)}
          onRename={() => showNaming({ op: "rename", initial: preview.doc.name, parent: "", volume: preview.doc.volume })}
          onDetails={() => showDetails({ key: `${preview.doc.volume || "primary"}\n${preview.doc.path}`, path: preview.doc.path, folder: parentOf(preview.doc.path), name: preview.doc.name, kind: preview.doc.kind, mimeType: preview.doc.mimeType, size: preview.doc.size, modified: preview.doc.modified, children: -1 })}
          onTrash={() => { void perform(FilesPreview.use((p) => p.close(false))); trashKeys([`${preview.doc.volume || "primary"}\n${preview.doc.path}`]); }}
          onElsewhere={() => void perform(FilesPreview.use((p) => p.openElsewhere())).then((handed) => handed.status !== "opened" && handed.status !== "cancelled" && say(selectedDocumentText(handed.message, handed.status === "unsupported" ? "No installed app can open this document." : "Android could not open the selected document.")))}
          onReselect={() => void perform(FilesPreview.use((p) => p.openPicked())).then((r) => r.kind === "refused" && say(selectedDocumentText(r.message, "Access to this file ended. Select it again.")))}
          onMediaError={() => { const serial = preview.serial; void perform(FilesPreview.use((p) => p.mediaFailed(serial))); }}
          onForget={() => void perform(FilesPreview.use((p) => p.close(true)))}
          onViewer={(open) => void perform(FilesPreview.use((p) => (open ? p.openViewer() : p.closeViewer())))} />
        <SharePanelSheet panel={panel} title={shareTitle} canSave={browserBuild} onChoose={choose} />
        <TrashItemSheet trash={trash} volumeName={volumeName} busy={busy}
          onRestore={(key) => void perform(FilesChanges.use((c) => c.restore([key]))).then(settled)}
          onDelete={() => void sendTrash({ type: "reviewOne" })}
          onConfirmDelete={() => void perform(FilesChanges.use((c) => c.erase())).then(settled)}
          onClose={() => void sendTrash({ type: "hideItem" })} />
        {trash.confirm !== "NoConfirm" && trash.confirm !== "DeleteOne" && (
          <EraseDialog trash={trash} busy={busy} onConfirm={() => void perform(FilesChanges.use((c) => c.erase())).then(settled)} onCancel={() => void sendTrash({ type: "cancelReview" })} />
        )}
        {dest && destLayer.open && (
          <DestinationDialog op={dest.op} paths={dest.paths} at={dest.at} folders={dest.folders} busy={busy}
            volumeName={volumeName(dest.keys.length ? keyPath(dest.keys[0]!).volume : "")}
            onOpenFolder={(at) => openDest(dest, at)} onConfirm={confirmDest} onCancel={closeDest}
            onNewFolder={() => { closeDest(); showNaming({ op: "create", initial: "", parent: dest.at, volume: keyPath(dest.keys[0] ?? "").volume, returnTo: dest }); }} />
        )}
        {naming && nameLayer.open && (
          <NameDialog op={naming.op} initial={naming.initial} keepExtension={naming.op === "rename"} busy={busy} error={naming.error}
            onConfirm={confirmName} onCancel={() => { const back = naming.returnTo; closeNaming(); if (back) showDest(back); }} />
        )}
        {details && detailsLayer.open && (
          <DetailsDialog name={details.name} path={details.path} volumeName={volumeName(keyPath(details.key).volume)} kind={details.kind}
            mimeType={details.mimeType} size={details.size} modified={details.modified} children={details.children} onClose={closeDetails} />
        )}
        {notice && (
          <Toast open title={notice.text} onOpenChange={(open) => !open && setNotice(undefined)}
            {...(notice.undo ? { action: { label: "Undo", onAction: () => void perform(FilesChanges.use((c) => c.undo())).then(settled) } } : {})} />
        )}
        <ToastViewport />
      </main>
    </ToastProvider>
  );
}
