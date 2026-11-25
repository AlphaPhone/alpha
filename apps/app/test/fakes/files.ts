// spec/app/files/index.md, "Story: Browse my storage"
import type { ElizaFilesPlugin, FileOutcomeRow, FilesAccess, StorageEntry, StorageVolume, TrashEntry } from "@elizaos/os/bridges/definitions/files";
import type { SelectedDocumentsPlugin } from "@elizaos/os/bridges/definitions/media";
import { type Faked, plugin } from "./phone.ts";

/** One file or folder the fake storage holds, by its volume and its path from that volume's root. */
export interface Stored {
  readonly volume: string;
  path: string;
  readonly directory: boolean;
  readonly mimeType: string;
  readonly size: number;
  modified: number;
}

/** A file in a volume's Trash: what it was, and the id the phone gave it. */
interface Binned {
  readonly id: string;
  readonly was: Stored;
  readonly deletedAt: number;
}

/** What the fake phone's storage holds, and how it behaves; a journey changes it between steps. */
export interface FilesScene {
  access: FilesAccess;
  readonly volumes: StorageVolume[];
  readonly stored: Stored[];
  readonly trash: Binned[];
  /** The paths each share handed to Android's chooser, and each file opened in another app. */
  readonly shared: string[][];
  readonly opened: string[];
  /** Every call the page made, by method: what a journey asks of the phone's side. */
  readonly calls: string[];
  /** A listing waits for this before it answers. */
  gate: Promise<unknown>;
  /** The time the phone's clock says, for what it writes. */
  now: number;
  /** The most rows a listing and a search give, as `StorageBrowser.LIST_MAX` and `StorageCatalog.QUERY_MAX` are. */
  listMost: number;
  queryMost: number;
  /** Tell the page the storage changed, as the plugin's `storageChanged` event does: only while it watches a place, as `storageWatch` registers one. */
  changed: () => void;
  /** The place the page asked the phone to watch, if any: a folder as `volume:path`, or a category. */
  watching: string | undefined;
  /** Methods the phone refuses outright, answering `failed`. */
  readonly refusing: string[];
  /** The selections Alpha gave back. */
  readonly forgotten: string[];
  /** What a text file says, by path, where it is not its default words. */
  readonly texts: Record<string, string>;
  selectedByPicker: string | undefined;
}

const file = (volume: string, path: string, mimeType: string, size = 100, modified = 1): Stored => ({ volume, path, directory: false, mimeType, size, modified });
const folder = (volume: string, path: string, modified = 1): Stored => ({ volume, path, directory: true, mimeType: "", size: 0, modified });

export function filesScene(): FilesScene {
  return {
    access: "granted",
    volumes: [{ id: "primary", name: "Internal storage", primary: true, free: 40, total: 100 }, { id: "card", name: "SD card", primary: false, free: 5, total: 10 }],
    stored: [
      folder("primary", "Download"),
      file("primary", "Download/lease.pdf", "application/pdf", 2_000, 5),
      file("primary", "Download/beach.jpg", "image/jpeg", 3_000, 6),
      folder("primary", "Documents"),
      file("primary", "Documents/notes.txt", "text/plain", 10, 3),
      folder("primary", "Documents/Old"),
      file("card", "song.mp3", "audio/mpeg", 4_000, 2),
    ],
    trash: [], shared: [], opened: [], calls: [], gate: Promise.resolve(), now: 10, listMost: 5_000, queryMost: 500, changed: () => {}, watching: undefined, refusing: [], forgotten: [], texts: {}, selectedByPicker: undefined,
  };
}

const parent = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf("/")));
const leaf = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const join = (folder: string, name: string) => (folder === "" ? name : `${folder}/${name}`);
const entry = (one: Stored): StorageEntry => ({ path: one.path, name: leaf(one.path), directory: one.directory, mimeType: one.mimeType, size: one.size, modified: one.modified });

/** `ElizaFiles`, the phone's storage plugin of eliza's Android package, over `scene`: it answers as `FilesPlugin.java` does. */
export function elizaFiles(scene: FilesScene): Faked {
  return plugin<ElizaFilesPlugin, { storageChanged: undefined }>((emit) => {
    scene.changed = () => { if (scene.watching !== undefined) emit("storageChanged", undefined); };
    const denied = () => scene.access !== "granted";
    const refused = () => ({ status: scene.access === "unsupported" ? "unavailable" as const : "denied" as const, access: scene.access });
    const on = (volume: string | undefined) => volume ?? "primary";
    const find = (volume: string, path: string) => scene.stored.find((one) => one.volume === volume && one.path === path);
    const inside = (volume: string, path: string) => scene.stored.filter((one) => one.volume === volume && (one.path === path || one.path.startsWith(`${path}/`)));
    const called = (method: string) => scene.calls.push(method);
    const identity = (one: Stored) => `${one.path}@${one.modified}:${one.size}`.padEnd(43, "_").slice(0, 43).replace(/[^A-Za-z0-9_-]/g, "_");
    const unchanged = (volume: string, paths: readonly string[], reviewed: readonly string[] | undefined) =>
      (path: string) => { const found = find(volume, path); return reviewed === undefined || (found !== undefined && reviewed[paths.indexOf(path)] === identity(found)); };
    function moved(volume: string, path: string, dest: string, copy: boolean): FileOutcomeRow {
      const found = find(volume, path);
      if (!found) return { path, status: "missing" };
      if (parent(path) === dest && !copy) return { path, status: "unchanged" };
      let name = leaf(path);
      for (let n = 2; find(volume, join(dest, name)); n++) name = `${leaf(path)} (${n})`;
      const to = join(dest, name);
      for (const one of inside(volume, path)) {
        const there = `${to}${one.path.slice(path.length)}`;
        if (copy) scene.stored.push({ ...one, path: there, modified: scene.now });
        else one.path = there;
      }
      return { path, status: copy ? "copied" : "moved", to };
    }
    return {
      async storageState() {
        called("storageState");
        await scene.gate;
        return denied() ? refused() : { status: "ready", access: "granted", volumes: scene.volumes };
      },
      storageRequestAccess(input) {
        called(input?.settings ? "storageRequestAccess settings" : "storageRequestAccess");
        return Promise.resolve(denied() ? refused() : { status: "ready", access: "granted" });
      },
      async storageList({ volume, path }) {
        called("storageList");
        await scene.gate;
        if (denied()) return refused();
        const there = on(volume);
        if (path !== "" && !find(there, path)?.directory) return { status: "missing" };
        const rows = scene.stored.filter((one) => one.volume === there && one.path !== path && parent(one.path) === path).map(entry);
        return { status: "ready", entries: rows.slice(0, scene.listMost), truncated: rows.length > scene.listMost };
      },
      storageCategory({ category }) {
        called("storageCategory");
        if (denied()) return Promise.resolve(refused());
        const of = (one: Stored) => category === "downloads" ? parent(one.path) === "Download"
          : category === "documents" ? one.mimeType === "application/pdf" || one.mimeType.startsWith("text/")
          : one.mimeType.startsWith(`${category.replace(/s$/, "")}/`);
        const entries = scene.stored.filter((one) => one.volume === "primary" && !one.directory && of(one)).map(entry);
        return Promise.resolve({ status: "ready", entries, count: entries.length, bytes: entries.reduce((sum, one) => sum + one.size, 0), truncated: false });
      },
      storageQuery({ text, mimePrefix, documents, folder }) {
        called("storageQuery");
        if (denied()) return Promise.resolve(refused());
        const entries = scene.stored.filter((one) => one.volume === "primary" && !one.directory
          && (folder === undefined || parent(one.path) === folder)
          && (text === undefined || leaf(one.path).toLowerCase().includes(text.toLowerCase()))
          && (mimePrefix === undefined || one.mimeType.startsWith(mimePrefix))
          && (!documents || one.mimeType === "application/pdf" || one.mimeType.startsWith("text/"))).map(entry);
        return Promise.resolve({ status: "ready", entries: entries.slice(0, scene.queryMost) });
      },
      storageReviewedIdentities({ volume, paths }) {
        called("reviewed");
        const found = paths.map((path) => find(on(volume), path));
        return Promise.resolve(found.every((one) => one !== undefined) ? { status: "ready", reviewed: found.map((one) => identity(one as Stored)) } : { status: "missing" });
      },
      storageTransfer({ volume, paths, dest, copy, reviewed }) {
        called(copy ? "copy" : "move");
        const same = unchanged(on(volume), paths, reviewed);
        return Promise.resolve({ status: "ready", outcomes: paths.map((path): FileOutcomeRow => (same(path) ? moved(on(volume), path, dest, copy) : { path, status: "changed" })) });
      },
      storageRename({ volume, path, name }) {
        called("rename");
        const found = find(on(volume), path);
        if (!found) return Promise.resolve({ status: "missing" });
        const to = join(parent(path), name);
        if (find(on(volume), to)) return Promise.resolve({ status: "exists" });
        for (const one of inside(on(volume), path)) one.path = `${to}${one.path.slice(path.length)}`;
        return Promise.resolve({ status: "ready", path: to });
      },
      storageCreateFolder({ volume, parent: where, name }) {
        called("createFolder");
        const path = join(where, name);
        if (find(on(volume), path)) return Promise.resolve({ status: "exists" });
        scene.stored.push(folder(on(volume), path, scene.now));
        return Promise.resolve({ status: "ready", path });
      },
      storageTrash({ volume, paths, reviewed }) {
        called("trash");
        const same = unchanged(on(volume), paths, reviewed);
        return Promise.resolve({ status: "ready", outcomes: paths.map((path): FileOutcomeRow => {
          const found = find(on(volume), path);
          if (!found) return { path, status: "missing" };
          if (!same(path)) return { path, status: "changed" };
          const id = String(scene.trash.length + 1);
          for (const one of inside(on(volume), path)) scene.stored.splice(scene.stored.indexOf(one), 1);
          scene.trash.push({ id, was: found, deletedAt: scene.now });
          return { path, status: "trashed", to: id };
        }) });
      },
      storageTrashList(input) {
        called("trashList");
        if (denied()) return Promise.resolve(refused());
        const items: TrashEntry[] = scene.trash.filter((one) => input?.volume === undefined || one.was.volume === input.volume)
          .map(({ id, was, deletedAt }) => ({ id, name: leaf(was.path), origin: parent(was.path), directory: was.directory, mimeType: was.mimeType, size: was.size, deletedAt }));
        return Promise.resolve({ status: "ready", items });
      },
      storageRestore({ ids }) {
        called("restore");
        if (scene.refusing.includes("storageRestore")) return Promise.resolve({ status: "failed" });
        return Promise.resolve({ status: "ready", outcomes: ids.map((id): FileOutcomeRow => {
          const found = scene.trash.find((one) => one.id === id);
          if (!found) return { path: id, status: "missing" };
          scene.trash.splice(scene.trash.indexOf(found), 1);
          scene.stored.push(found.was);
          return { path: id, status: "restored", to: found.was.path };
        }) });
      },
      storageEmptyTrash({ ids }) {
        called("erase");
        const gone = scene.trash.filter((one) => ids.includes(one.id));
        for (const one of gone) scene.trash.splice(scene.trash.indexOf(one), 1);
        return Promise.resolve({ status: "ready", count: gone.length });
      },
      storageShare({ paths }) {
        called("share");
        scene.shared.push([...paths]);
        return Promise.resolve({ status: "opened", count: paths.length });
      },
      storageOpen({ path }) {
        called("open");
        scene.opened.push(path);
        return Promise.resolve({ status: "opened", count: 1 });
      },
      storageSelect({ path }) {
        const found = find("primary", path);
        return Promise.resolve(found ? { status: "selected", action: "files", selectionId: `selection:${path}`, name: leaf(path), mimeType: found.mimeType, canRename: true } : { status: "missing" });
      },
      storageWatch(input) {
        called("storageWatch");
        scene.watching = input.category ?? `${on(input.volume)}:${input.path ?? ""}`;
        return Promise.resolve({ status: "ready" });
      },
      storageUnwatch() {
        called("storageUnwatch");
        scene.watching = undefined;
        return Promise.resolve({ status: "ready" });
      },
    };
  });
}

/** The documents the fake phone holds for Alpha, as eliza's `SelectedDocuments` host answers: a text's words, a picture's address, a PDF's pages. */
export function selectedDocuments(scene: FilesScene): Faked {
  return plugin<SelectedDocumentsPlugin & {
    pickSelected(): Promise<unknown>;
    attachmentSelected(options: { selectionId: string }): Promise<unknown>;
  }, Record<string, never>>(() => {
    const held = (selectionId: string) => scene.stored.find((one) => `selection:${one.path}` === selectionId && !scene.forgotten.includes(selectionId));
    return {
      restoreSelected: () => Promise.resolve({ status: "unavailable", message: "" }),
      pickSelected() {
        const path = scene.selectedByPicker;
        scene.selectedByPicker = undefined;
        return Promise.resolve({ selectionId: path ? `selection:${path}` : "" });
      },
      attachmentSelected({ selectionId }) {
        const found = held(selectionId);
        if (!found) return Promise.reject(new Error("Access ended"));
        return Promise.resolve({ name: leaf(found.path), mimeType: found.mimeType, dataBase64: btoa(scene.texts[found.path] ?? `The words of ${leaf(found.path)}`) });
      },
      describeSelected({ selectionId }) {
        const found = held(selectionId);
        return Promise.resolve(found ? { status: "selected", selectionId, name: leaf(found.path), mimeType: found.mimeType, uri: `content://${found.path}`, size: found.size, modified: found.modified } : { status: "renamed-reselect", message: "" });
      },
      renameSelected: () => Promise.resolve({ status: "unsupported", message: "" }),
      pdfSelected({ selectionId, page }) {
        const found = held(selectionId);
        return Promise.resolve(found?.mimeType === "application/pdf" ? { status: "rendered", message: "", page, pageCount: 3, imageUri: `page://${found.path}/${page}` } : { status: "unsupported", message: "" });
      },
      readSelected({ selectionId }) {
        const found = held(selectionId);
        return Promise.resolve(found ? { status: "read", message: "", text: scene.texts[found.path] ?? `The words of ${leaf(found.path)}`, mimeType: found.mimeType, bytes: found.size } : { status: "unavailable", message: "" });
      },
      openSelected({ selectionId }) {
        scene.opened.push(selectionId);
        return Promise.resolve({ status: "opened", message: "" });
      },
      shareSelected: () => Promise.resolve({ status: "opened", message: "" }),
      forgetSelected({ selectionId }) {
        scene.forgotten.push(selectionId);
        return Promise.resolve();
      },
    };
  });
}
