// spec/app/photos/index.md, "Story: Browse the library"; spec/app/photos/viewer.md, "Story: Look at a photo or video"
import type { LibraryAccess, PhotosPlugin, Reviewed } from "@elizaos/os-bridges";
import { plugin, type Faked } from "./phone.ts";

const photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+T5XQAAAAASUVORK5CYII=";

function row(id: number, name: string, owned: boolean) {
  return { id: `m:external_primary:i:${id}`, name, owned, kind: "image", image: photo, date: 1795400000000 + id * 60_000, width: 1, height: 1, size: 68, revision: `rev-image-${id}` };
}

type FixtureRow = ReturnType<typeof row> & { duration?: number; path?: string; mutationRevision?: string };
type ListedRow = Omit<FixtureRow, "owned"> & { owned?: boolean };

function ownedKey(row: Pick<FixtureRow, "id" | "kind">): string {
  const id = row.id.slice(row.id.lastIndexOf(":") + 1);
  return row.kind === "video" ? "v:" + id : id;
}

export interface FixturePicture {
  readonly name: string;
  readonly mimeType: "image/png" | "image/jpeg";
  readonly size: number;
  readonly dataBase64: string;
}

export interface PhotosScene {
  access: LibraryAccess;
  readonly rows: FixtureRow[];
  watching: boolean;
  changed(): void;
  promptCount: number;
  readCount: number;
  readonly saves: string[];
  readonly editLookups: string[];
  messagePicture?: (picture: Reviewed) => Promise<FixturePicture>;
}

export function photosScene(): PhotosScene {
  return {
    access: { scope: "denied", images: "denied", videos: "denied" },
    rows: [row(3, "Park.jpg", false), row(2, "Camera.jpg", true), row(1, "Original.jpg", false)],
    watching: false, changed: () => {}, promptCount: 0, readCount: 0, saves: [], editLookups: [],
  };
}

/** The native Photos plugin fixture talks to the real Eliza media bridge. */
export function alphaPhotos(scene: PhotosScene): Faked {
  type Used = "libraryAccess" | "requestLibraryAccess" | "watchLibrary" | "list" | "listPermitted" | "read" | "readPermitted"
    | "thumbnails" | "beginEdit" | "previewEdit" | "saveEdit" | "editResult" | "cancelEdit" | "albums" | "openLibrarySettings";
  return plugin<Pick<PhotosPlugin, Used> & { readMessagePicture(input: Reviewed): Promise<FixturePicture> }, { libraryChanged: undefined }>((emit) => {
    scene.changed = () => { if (scene.watching) emit("libraryChanged", undefined); };
    const listed = (rows: readonly ListedRow[], thumbnails?: boolean) => rows.map(({ image, ...row }) => thumbnails ? { ...row, image } : row);
    const owned = () => scene.rows.filter((item) => item.owned).map(({ owned: _owned, ...item }) => ({
      ...item,
      id: ownedKey(item),
    }));
    const available = () => scene.access.scope === "denied" ? owned() : scene.rows;
    const session = "alpha-test-photo-edit";
    const preview = { sessionId: session, operationId: session, image: photo, width: 1, height: 1, reduced: false, maxEdge: 1024, filter: "none", canReplace: true };
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
      list: ({ album, limit, thumbnails }) => {
        const permittable = album === "camera" ? scene.rows.filter((item) => item.owned) : scene.rows;
        const availableOwned = album === "camera" ? owned().slice(0, limit) : owned();
        return Promise.resolve(scene.access.scope === "denied"
          ? { items: listed(availableOwned, thumbnails), next: "" }
          : { items: listed(permittable.slice(0, limit), thumbnails), next: "", access: scene.access });
      },
      listPermitted({ before, query, thumbnails }: Parameters<PhotosPlugin["listPermitted"]>[0] = {}) {
        const rows = scene.rows.filter((item) => query === undefined || item.name.toLowerCase().includes(query.toLowerCase()));
        return Promise.resolve({ items: listed(before === undefined ? rows.slice(0, 2) : rows.slice(2), thumbnails), next: before === undefined && rows.length > 2 ? "next" : "", access: scene.access });
      },
      thumbnails: ({ ids }) => Promise.resolve({ items: ids.flatMap((id) => available().filter((row) => row.id === id).map((row) => ({ id, image: row.image }))) }),
      readPermitted({ id, pixels }) {
        const item = scene.access.scope === "denied" ? undefined : scene.rows.find((row) => row.id === id);
        if (item === undefined) return Promise.reject(new Error("This item is unavailable"));
        return Promise.resolve(listed([item], pixels)[0]);
      },
      readMessagePicture(input) {
        const item = scene.access.scope === "denied" ? undefined : scene.rows.find((row) => row.id === input.id && row.mutationRevision === input.revision);
        return item && scene.messagePicture ? scene.messagePicture(input) : Promise.reject(new Error("This picture is unavailable"));
      },
      read({ id }) {
        scene.readCount++;
        const candidates = /^(?:v:)?[1-9][0-9]*$/.test(id) ? owned() : scene.access.scope === "denied" ? [] : scene.rows;
        return Promise.resolve(candidates.find((item) => item.id === id));
      },
      beginEdit: ({ id, revision }) => scene.rows.some((item) => item.id === id && item.revision === revision)
        ? Promise.resolve(preview) : Promise.reject(new Error("This item changed")),
      previewEdit: ({ sessionId, filter }) => sessionId === session
        ? Promise.resolve({ ...preview, filter }) : Promise.reject(new Error("The session closed")),
      saveEdit({ sessionId, filter }) {
        if (sessionId !== session) return Promise.reject(new Error("The session closed"));
        const copy = row(scene.rows.length + 1, "Edited copy.jpg", true);
        scene.rows.unshift(copy);
        scene.saves.push(filter);
        return Promise.resolve({ status: "saved", operationId: session, id: copy.id, revision: copy.revision, replaced: false });
      },
      editResult({ operationId }) {
        scene.editLookups.push(operationId);
        const saved = owned()[0];
        return Promise.resolve(operationId === session && saved !== undefined
          ? { status: "saved", operationId, id: saved.id, revision: saved.revision, replaced: false }
          : { status: "not-started" });
      },
      cancelEdit: () => Promise.resolve(),
      albums: () => Promise.resolve({ items: [] }),
      openLibrarySettings: () => Promise.resolve(undefined),
    };
  });
}
