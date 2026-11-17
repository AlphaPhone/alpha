/** The Photos view review card: the change itself, nothing else. The operation contract, its
 * validation and where it may run stay in the shared Photos view contract. */
import { libraryKindOf } from "@elizaos/plugin-assistant/device-actions/photo-library-contract";
import type {
  PHOTOS_FILTER_ALBUMS,
  PhotosViewOperation,
} from "@elizaos/plugin-assistant/device-actions/photos-view-contract";

const quoted = (value: string) => `“${value}”`;
const items = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;
const ALBUM_LABELS: Record<(typeof PHOTOS_FILTER_ALBUMS)[number], string> = {
  favorites: "Favorites",
  videos: "Videos",
  camera: "Camera",
  screenshots: "Screenshots",
};
export function describePhotosViewOperation(op: PhotosViewOperation): {
  title: string;
  description: string;
} {
  if (op.type === "photos_filter")
    return {
      title: "Filter Photos",
      description:
        [
          op.kind === "image" ? "Photos" : op.kind === "video" ? "Videos" : "",
          op.favorite === true
            ? "Favorites"
            : op.favorite === false
              ? "Not favorites"
              : "",
          op.album
            ? op.album.startsWith("custom:")
              ? "In an album"
              : `In ${ALBUM_LABELS[op.album as keyof typeof ALBUM_LABELS]}`
            : "",
          op.text ? quoted(op.text) : "",
          op.from !== undefined || op.to !== undefined
            ? "In the requested dates"
            : "",
        ]
          .filter(Boolean)
          .join(" · ") || "Everything",
    };
  if (op.type === "photos_open")
    return {
      title: libraryKindOf(op.id) === "video" ? "Open video" : "Open photo",
      description: "",
    };
  if (op.type === "photos_album_create")
    return {
      title: `Create album ${quoted(op.name)}`,
      description: items(op.ids.length),
    };
  return {
    title: `Share ${items(op.ids.length)}`,
    description: "Android share sheet",
  };
}
