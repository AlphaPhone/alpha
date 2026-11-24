// spec/app/files/index.md, "Story: Browse my storage"
import type { ElizaFilesPlugin, FileOutcomeRow, FilesAccess, StorageEntry, StorageVolume, TrashEntry } from "@elizaos/os/bridges/definitions/files";
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
  /** Tell the page the storage changed, as the plugin's `storageChanged` event does; set once the page listens. */
  changed: () => void;
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
    trash: [], shared: [], opened: [], calls: [], gate: Promise.resolve(), now: 10, changed: () => {},
  };
}

const parent = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf("/")));
const leaf = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const join = (folder: string, name: string) => (folder === "" ? name : `${folder}/${name}`);
const entry = (one: Stored): StorageEntry => ({ path: one.path, name: leaf(one.path), directory: one.directory, mimeType: one.mimeType, size: one.size, modified: one.modified });

/** `ElizaFiles`, the phone's storage plugin of eliza's Android package, over `scene`: it answers as `FilesPlugin.java` does. */
export function elizaFiles(scene: FilesScene): Faked {
  return plugin<ElizaFilesPlugin, { storageChanged: undefined }>((emit) => {
    scene.changed = () => emit("storageChanged", undefined);
    const denied = () => scene.access !== "granted";
    const refused = () => ({ status: scene.access === "unsupported" ? "unavailable" as const : "denied" as const, access: scene.access });
    const on = (volume: string | undefined) => volume ?? "primary";
    const find = (volume: string, path: string) => scene.stored.find((one) => one.volume === volume && one.path === path);
    const inside = (volume: string, path: string) => scene.stored.filter((one) => one.volume === volume && (one.path === path || one.path.startsWith(`${path}/`)));
    const called = (method: string) => scene.calls.push(method);
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
        return { status: "ready", entries: scene.stored.filter((one) => one.volume === there && one.path !== path && parent(one.path) === path).map(entry), truncated: false };
      },
      storageCategory({ category }) {
        called("storageCategory");
        if (denied()) return Promise.resolve(refused());
        const of = (one: Stored) => category === "downloads" ? parent(one.path) === "Download"
          : category === "documents" ? one.mimeType === "application/pdf" || one.mimeType.startsWith("text/")
          : one.mimeType.startsWith(`${category.replace(/s$/, "")}/`);
        const entries = scene.stored.filter((one) => one.volume === "primary" && !one.directory && of(one)).map(entry);
        return Promise.resolve({ status: "ready", entries, count: entries.length, truncated: false });
      },
      storageQuery({ text, mimePrefix, documents, folder }) {
        called("storageQuery");
        if (denied()) return Promise.resolve(refused());
        const entries = scene.stored.filter((one) => !one.directory
          && (folder === undefined || parent(one.path) === folder)
          && (text === undefined || leaf(one.path).toLowerCase().includes(text.toLowerCase()))
          && (mimePrefix === undefined || one.mimeType.startsWith(mimePrefix))
          && (!documents || one.mimeType === "application/pdf" || one.mimeType.startsWith("text/"))).map(entry);
        return Promise.resolve({ status: "ready", entries, truncated: false });
      },
      storageReviewedIdentities({ paths }) {
        return Promise.resolve({ status: "ready", reviewed: paths.map((path) => `${path}@1`) });
      },
      storageTransfer({ volume, paths, dest, copy }) {
        called(copy ? "copy" : "move");
        return Promise.resolve({ status: "ready", outcomes: paths.map((path) => moved(on(volume), path, dest, copy)) });
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
      storageTrash({ volume, paths }) {
        called("trash");
        return Promise.resolve({ status: "ready", outcomes: paths.map((path): FileOutcomeRow => {
          const found = find(on(volume), path);
          if (!found) return { path, status: "missing" };
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
      storageWatch: () => Promise.resolve({ status: "ready" }),
      storageUnwatch: () => Promise.resolve({ status: "ready" }),
    };
  });
}
