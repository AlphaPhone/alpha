// spec/app/photos/index.md, "Story: Browse the library"
import type { FlagChange, LibraryAccess, MediaItem, PhotosPlugin, Reviewed, RowStatus } from "@elizaos/os/bridges/definitions/media";
import { type Faked, plugin, rejection } from "./phone.ts";

/** One photo or video the fake library holds, as `MediaStore` and Alpha's own catalog describe it. */
export interface Held {
  readonly id: string;
  readonly kind: "image" | "video";
  readonly date: number;
  revision: number;
  favorite: boolean;
  trashed: boolean;
  /** Whether Alpha's camera took it, which the phone lists without library access. */
  readonly owned: boolean;
  /** A video's length, in milliseconds. */
  readonly duration?: number;
  readonly hue: number;
}

/** What the fake phone's photo library holds, and how it behaves; a journey changes it between steps. */
export interface PhotosScene {
  access: LibraryAccess;
  readonly held: Held[];
  /** The ids each share handed to Android's chooser. */
  readonly shared: string[][];
  /** Every call the page made, by method: what a journey asks of the phone's side. */
  readonly calls: string[];
  /** The most items one page holds, as `PermittedMediaCatalog` pages them. */
  pageMost: number;
  /** What `requestLibraryAccess` grants once Android's dialog is answered. */
  granting: LibraryAccess;
  /** Tell the page the library changed, as the plugin's `libraryChanged` event does. */
  changed: () => void;
}

const day = 86_400_000;
const held = (id: string, date: number, hue: number, extra: Partial<Held> = {}): Held => ({ id, kind: "image", date, revision: 1, favorite: false, trashed: false, owned: false, hue, ...extra });

const none: LibraryAccess = { scope: "denied", images: "denied", videos: "denied" };
const full: LibraryAccess = { scope: "full", images: "full", videos: "full" };

/** A library of a week of photos and a video, two of Alpha's own captures among them, before Alpha asked for access. */
export function photosScene(now = Date.UTC(2026, 10, 24, 12)): PhotosScene {
  return {
    access: none,
    granting: full,
    held: [
      held("p1", now - 1_000, 200, { owned: true }),
      held("p2", now - 60_000, 30, { favorite: true }),
      held("v1", now - day, 140, { kind: "video", duration: 42_000 }),
      held("p3", now - day - 5_000, 280, { owned: true }),
      held("p4", now - 3 * day, 10),
      held("p5", now - 40 * day, 90, { favorite: true }),
    ],
    shared: [], calls: [], pageMost: 100, changed: () => {},
  };
}

/** A square of one colour, as the phone's thumbnail of an item: what the grid and the Viewer draw. */
const picture = (hue: number, edge: number) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${edge}" height="${edge}"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 62%)"/><stop offset="1" stop-color="hsl(${hue + 40} 60% 38%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`)}`;

const outcomes: Record<FlagChange, RowStatus> = { favorite: "favorited", unfavorite: "unfavorited", trash: "trashed", restore: "restored" };

/** `AlphaPhotos`, Alpha's fork of eliza's `PhotosPlugin`, over `scene`: it answers as `AlphaPhotosPlugin.java` does. */
export function alphaPhotos(scene: PhotosScene): Faked {
  return plugin<PhotosPlugin, { libraryChanged: undefined }>((emit) => {
    scene.changed = () => emit("libraryChanged", undefined);
    const called = (method: string) => scene.calls.push(method);
    const item = (one: Held, edge = 256): MediaItem => ({
      id: one.id as MediaItem["id"], kind: one.kind, width: 4_000, height: 3_000, date: one.date, size: 2_400_000,
      revision: String(one.revision) as MediaItem["revision"], favorite: one.favorite, owned: one.owned, trashed: one.trashed,
      image: picture(one.hue, edge), ...(one.duration === undefined ? {} : { duration: one.duration }),
    });
    const sees = (one: Held) => one.owned || scene.access.scope === "full" || scene.access.scope === "partial";
    function page(rows: Held[], before: string | undefined) {
      const sorted = rows.filter((one) => !one.trashed).sort((a, b) => b.date - a.date);
      const from = before === undefined ? 0 : sorted.findIndex((one) => one.id === before) + 1;
      const shown = sorted.slice(from, from + scene.pageMost);
      const next = from + scene.pageMost < sorted.length ? shown.at(-1)?.id ?? "" : "";
      return Promise.resolve({ items: shown.map((one) => item(one)), next });
    }
    const find = (id: string) => scene.held.find((one) => one.id === id);
    const unsupported = () => Promise.reject(rejection("Unsupported in this fake"));
    return {
      libraryAccess: () => { called("libraryAccess"); return Promise.resolve(scene.access); },
      requestLibraryAccess: () => { called("requestLibraryAccess"); scene.access = scene.granting; return Promise.resolve(scene.access); },
      watchLibrary: ({ active }) => Promise.resolve({ active }),
      openLibrarySettings: () => { called("openLibrarySettings"); return Promise.resolve(); },
      listPermitted: ({ before, kind, filter }) => {
        called("listPermitted");
        return page(scene.held.filter((one) => sees(one) && (kind === undefined || kind === "all" || one.kind === kind) && (filter !== "favorites" || one.favorite)), before);
      },
      list: ({ before, album }) => {
        called("list");
        return page(scene.held.filter((one) => one.owned && (album !== "favorites" || one.favorite) && (album !== "videos" || one.kind === "video")), before);
      },
      readPermitted: ({ id, edge }) => {
        called("readPermitted");
        const found = find(id);
        return found && sees(found) ? Promise.resolve(item(found, edge ?? 2_048)) : Promise.reject(rejection("This media changed or could not be verified. Refresh Photos before trying again."));
      },
      read: ({ id }) => {
        called("read");
        const found = find(id);
        return found?.owned ? Promise.resolve(item(found, 2_048)) : Promise.reject(rejection("Media is no longer available"));
      },
      changeMany: ({ operation, items }) => {
        called(`changeMany ${operation}`);
        const rows = items.map(({ id, revision }: Reviewed) => {
          const found = find(id);
          if (!found || String(found.revision) !== revision) return { id, status: "stale" as const };
          if (operation === "favorite" || operation === "unfavorite") found.favorite = operation === "favorite";
          else found.trashed = operation === "trash";
          found.revision += 1;
          return { id, status: outcomes[operation], item: item(found) };
        });
        return Promise.resolve({ status: rows.every((row) => row.status !== "stale") ? "complete" : "partial", outcomes: rows });
      },
      shareMany: ({ items }) => {
        called("shareMany");
        scene.shared.push(items.map((one) => one.id));
        return Promise.resolve({ status: "opened", count: items.length });
      },
      share: ({ id }) => {
        called("share");
        scene.shared.push([id]);
        return Promise.resolve({ status: "opened" });
      },
      albums: () => { called("albums"); return Promise.resolve({ items: [] }); },
      thumbnails: ({ ids }) => Promise.resolve({ items: ids.flatMap((id) => { const found = find(id); return found ? [{ id, image: picture(found.hue, 256) }] : []; }) }),
      summary: () => Promise.resolve({ favorites: scene.held.filter((one) => one.favorite).length, videos: scene.held.filter((one) => one.kind === "video").length, trash: scene.held.filter((one) => one.trashed).length, canFavorite: true }),
      changeAlbum: unsupported,
      beginEdit: unsupported,
      previewEdit: unsupported,
      saveEdit: unsupported,
      editResult: unsupported,
      cancelEdit: unsupported,
      beginVideoEdit: unsupported,
      saveVideoEdit: unsupported,
      cancelVideoEdit: unsupported,
      reviewRemovedVideoCopy: unsupported,
      keepCapture: unsupported,
      setTrashed: unsupported,
      setFavorite: unsupported,
      deletePermittedTrash: unsupported,
      prepareDeleteTrash: unsupported,
      cancelDeleteTrash: unsupported,
      deletePreparedTrash: unsupported,
    };
  });
}
