import type { ComponentMeta } from "vibestack/stories";
import type { PhotosViewProps } from "./PhotosView.tsx";
import {
  albumAsk, albumCreate, albumsClosed, albumsTab, confirmingDelete, grid, hostIdle, largeGrid, largeLibrary, library, libraryFailed, libraryLoading,
  libraryWithTrash, manyRows, noReview, rows, selectedAccess, selecting, today, trashRows, trashTab, undoable, viewing,
} from "./fixtures.ts";

const none = () => undefined;
const allowed = () => true;

export const meta: ComponentMeta<PhotosViewProps> = {
  args: {
    catalog: library, browse: grid, rows, said: "", now: today, messages: false, browser: false, onClose: none,
    can: allowed, albums: albumsClosed, canAlbum: allowed, reviews: noReview, host: hostIdle,
    photoEdit: undefined, canEdit: allowed, videoEdit: undefined, canVideo: allowed,
    dialogs: undefined, scan: undefined, canDialog: allowed, canScan: allowed, searchLines: [],
    visit: none, library: none, agent: none, media: none, scanner: none, edit: none,
  },
  examples: {
    Loading: { catalog: libraryLoading, browse: { ...grid, pool: [] }, rows: [] },
    LoadFailed: { catalog: libraryFailed, browse: { ...grid, pool: [] }, rows: [] },
    ChosenItemsOnly: { catalog: selectedAccess },
    ManyPhotos: { catalog: largeLibrary, browse: largeGrid, rows: manyRows },
    Selecting: { browse: selecting },
    ViewerWithMessages: { browse: viewing, messages: true },
    Trashed: { browse: undoable, said: "Moved to Recently deleted" },
    RecentlyDeleted: { catalog: libraryWithTrash, browse: trashTab, rows: trashRows },
    ConfirmPermanentDelete: { catalog: libraryWithTrash, browse: confirmingDelete, rows: trashRows },
    NewAlbum: { browse: albumsTab, albums: albumCreate },
    AssistantAlbumReview: { host: albumAsk },
  },
};
