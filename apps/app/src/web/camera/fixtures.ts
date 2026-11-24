// States Camera and Photos reach, for the stories (`*.meta.tsx`).
import type { Camera } from "../../../gen/camera__viewfinder.ts";
import { initial } from "../../../gen/camera__viewfinder.ts";
import { initial as catalogInitial, type Catalog, type Row } from "../../../gen/camera__library.ts";
import { initial as browseInitial, type Browse } from "../../../gen/camera__browse.ts";
import { initial as editInitial, type Edit } from "../../../gen/camera__edit.ts";
import { initial as videoInitial, type VideoEditor } from "../../../gen/camera__videoEdit.ts";
import { initial as dialogsInitial, type Dialogs } from "../../../gen/camera__scanDialogs.ts";
import { initial as scanInitial, type Scan } from "../../../gen/camera__scan.ts";
import { initial as albumsInitial, type Dialogs as Albums } from "../../../gen/camera__albums.ts";
import { initial as reviewsInitial, type Reviews } from "../../../gen/camera__libraryReview.ts";
import { initial as hostInitial, type Host } from "../../../gen/camera__agentLibrary.ts";

/** A ready back camera in Photo mode with a flash and a 5× lens. */
export const readyPhoto: Camera = { ...initial, phase: "PreviewReady", epoch: 1, hasFlash: true, widest: 5, longest: 50, flash: "FlashAuto" };

/** Counting down the self-timer. */
export const countingDown: Camera = { ...readyPhoto, timer: 10, countdown: 7 };

/** Recording a video with the light on, near its limit. */
export const recording: Camera = { ...readyPhoto, mode: "VideoMode", bound: "VideoMode", light: true, recording: "RecordingActive", elapsed: 560, recordedBytes: 90_000_000 };

/** Stopped on a camera denial, offering Allow and Retry. */
export const denied: Camera = { ...initial, notice: "CameraNotice" };

/** A refused microphone in Video mode, offering Retry and No sound. */
export const microphone: Camera = { ...readyPhoto, mode: "VideoMode", micDenied: true, notice: "MicrophoneNotice" };

/** The day the Photos fixtures are seen on. */
export const today = Date.UTC(2026, 10, 20, 12);

const tile = (id: string, hoursAgo: number, extra: Partial<Row> = {}): Row => ({
  id, rank: today - hoursAgo * 3_600_000, revision: "1", video: false, favorite: false, image: "", width: 4000, height: 3000,
  duration: 0, size: 2_000_000, folder: "DCIM/Camera/", expiresAt: 0, ...extra,
});

/** A few photos and a video over two days. */
export const rows: Row[] = [tile("m:1", 1), tile("m:2", 3, { favorite: true }), tile("m:3", 30, { video: true, duration: 12 }), tile("m:4", 31, { size: 800_000 })];

/** The loaded library with full access. */
export const library: Catalog = { ...catalogInitial, scope: "ScopeFull", main: { ...catalogInitial.main, rows, loaded: true } };

/** Only the items the owner chose are readable. */
export const selectedAccess: Catalog = { ...library, scope: "ScopeSelected" };

/** The grid showing every row. */
export const grid: Browse = { ...browseInitial, pool: rows.map((row) => row.id), favorites: ["m:2"] };

/** Two items selected. */
export const selecting: Browse = { ...grid, selecting: true, selection: ["m:1", "m:2"] };

/** The viewer on a small photo. */
export const viewing: Browse = { ...grid, viewer: "m:4" };

/** A photo open in the editor, rotated and in Vivid. */
export const editing: Edit = { ...editInitial, status: "Editing", session: 1, source: "m:1", rotation: 90, look: "Vivid", canReplace: true };

/** A save that could not be confirmed. */
export const editUncertain: Edit = { ...editing, status: "EditUncertain", writes: 1 };

/** A loaded five-second video, trimmed. */
export const videoTrimmed: VideoEditor = { ...videoInitial, source: "v:1", duration: 50, loaded: true, closed: false, aborted: false, trim: { start: 5, end: 40, rotation: 0, crop: false }, submitted: { start: 0, end: 50, rotation: 0, crop: false } };

/** A video copy whose save was not confirmed. */
export const videoUnconfirmed: VideoEditor = { ...videoTrimmed, busy: true, saves: 1, submitted: videoTrimmed.trim, outcome: "VideoUnconfirmed" };

/** The text review with recognised text. */
export const textReview: Dialogs = { ...dialogsInitial, text: { ...dialogsInitial.text, shown: true, ocr: "OcrReady", body: "Receipt\nTotal 12.40\nwww.example.com" } };

/** A save to Notes that could not be confirmed. */
export const notesUnconfirmed: Dialogs = { ...textReview, text: { ...textReview.text, attempted: true, saveCalls: 1, note: "NoteUnconfirmed" } };

/** The searchable review with its text read. */
export const searchableReady: Dialogs = { ...dialogsInitial, document: true, searchable: { ...dialogsInitial.searchable, shown: true, ready: true } };

/** A two-page document. */
export const twoPages: Scan = { ...scanInitial, pages: { count: 2, bytes: 2048, validated: true }, pageIds: ["blob:p1", "blob:p2"], pageRevision: 1 };

/** The document dialog over two pages. */
export const documentOpen: Dialogs = { ...dialogsInitial, document: true };

/** Photos before its first page of the library came back. */
export const libraryLoading: Catalog = { ...catalogInitial, scope: "ScopeFull", main: { ...catalogInitial.main, loading: true } };

/** A first read of the library that failed. */
export const libraryFailed: Catalog = { ...catalogInitial, scope: "ScopeFull", main: { ...catalogInitial.main, loaded: true, failed: true } };

/** Many photos over a month, newest first. */
export const manyRows: Row[] = Array.from({ length: 60 }, (_, at) => tile(`m:${100 + at}`, at * 11, { favorite: at % 9 === 0, video: at % 13 === 0, duration: at % 13 === 0 ? 30 : 0 }));

/** The loaded library of many photos. */
export const largeLibrary: Catalog = { ...library, main: { ...library.main, rows: manyRows } };

/** The grid of many photos. */
export const largeGrid: Browse = { ...browseInitial, pool: manyRows.map((row) => row.id), columns: 3 };

/** Recently deleted, holding one photo with days left. */
export const trashRows: Row[] = [tile("m:9", 50, { expiresAt: today + 12 * 86_400_000 })];

/** The library with one item in Recently deleted. */
export const libraryWithTrash: Catalog = { ...library, trash: { ...catalogInitial.trash, rows: trashRows, loaded: true } };

/** Recently deleted open. */
export const trashTab: Browse = { ...browseInitial, tab: "TrashTab", pool: trashRows.map((row) => row.id) };

/** The Albums tab. */
export const albumsTab: Browse = { ...grid, tab: "AlbumsTab" };

/** A trash change that may be undone. */
export const undoable: Browse = { ...grid, undo: ["m:3"] };

/** One Recently deleted item reviewed for permanent deletion. */
export const confirmingDelete: Browse = { ...trashTab, selecting: true, selection: ["m:9"], work: "Deleting", deleting: ["m:9"] };

/** The owner's two albums, no dialog open. */
export const albumsClosed: Albums = { ...albumsInitial, albums: [{ id: "a", name: "Trip", revision: "r1" }, { id: "b", name: "Family", revision: "r1" }] };

/** Naming a new album. */
export const albumCreate: Albums = { ...albumsClosed, generation: 1, stage: "CreateAlbum", name: "Summer", nameOk: true };

/** No library change under review. */
export const noReview: Reviews = reviewsInitial;

/** The assistant's requests, none waiting. */
export const hostIdle: Host = hostInitial;

/** The assistant asked to make an album of two photos. */
export const albumAsk: Host = { ...hostInitial, albumReview: ["m:1", "m:2"] };

