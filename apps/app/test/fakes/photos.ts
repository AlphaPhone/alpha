// spec/app/photos/index.md, "Story: Browse the library"; spec/app/photos/viewer.md, "Story: Look at a photo or video"
import type { LibraryAccess, PhotosPlugin } from "@elizaos/os/bridges/definitions/media";
import { plugin, type Faked } from "./phone.ts";

const photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+T5XQAAAAASUVORK5CYII=";

function row(id: number, name: string, owned: boolean) {
  return { id: `lib:i:${id}:1`, name, owned, kind: "image", image: photo, date: 1795400000000 + id * 60_000, width: 1, height: 1, size: 68, revision: `rev-image-${id}` };
}

export interface PhotosScene {
  access: LibraryAccess;
  readonly rows: ReturnType<typeof row>[];
  watching: boolean;
  changed(): void;
  promptCount: number;
  readCount: number;
}

export function photosScene(): PhotosScene {
  return {
    access: { scope: "denied", images: "denied", videos: "denied" },
    rows: [row(3, "Park.jpg", false), row(2, "Camera.jpg", true), row(1, "Original.jpg", false)],
    watching: false, changed: () => {}, promptCount: 0, readCount: 0,
  };
}

/** The native Photos plugin fixture talks to the real Eliza media bridge. */
export function alphaPhotos(scene: PhotosScene): Faked {
  return plugin<Partial<PhotosPlugin>, { libraryChanged: undefined }>((emit) => {
    scene.changed = () => { if (scene.watching) emit("libraryChanged", undefined); };
    const owned = () => scene.rows.filter((item) => item.owned);
    return {
      libraryAccess: () => Promise.resolve(scene.access),
      requestLibraryAccess() {
        scene.promptCount++;
        scene.access = { scope: "full", images: "full", videos: "denied" };
        return Promise.resolve(scene.access);
      },
      watchLibrary({ active }) {
        scene.watching = active;
        return Promise.resolve({ active });
      },
      list: () => Promise.resolve({ items: owned(), next: "", access: scene.access }),
      listPermitted({ before, query } = {}) {
        const rows = scene.rows.filter((item) => query === undefined || item.name.toLowerCase().includes(query.toLowerCase()));
        return Promise.resolve({ items: before === undefined ? rows.slice(0, 2) : rows.slice(2), next: before === undefined && rows.length > 2 ? "next" : "", access: scene.access });
      },
      read({ id }) {
        scene.readCount++;
        return Promise.resolve(scene.rows.find((item) => item.id === id));
      },
      albums: () => Promise.resolve({ items: [] }),
      openLibrarySettings: () => Promise.resolve(undefined),
    };
  });
}
