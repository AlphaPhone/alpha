import type { PluginListenerHandle } from '@capacitor/core';
import { registerPlugin } from '../platform-plugins';

/** Android's media grant: full library, the owner's selection, or none. */
export type LibraryAccess = { scope: 'full' | 'partial' | 'selected' | 'denied'; images: 'full' | 'selected' | 'denied'; videos: 'full' | 'selected' | 'denied' };
/** One library item. `image` is a thumbnail data URL; revisions bind every change to what was shown. */
export type SavedPhoto = { name?: string; owned?: boolean; folder?: string; taken?: number; size?: number; kind?: 'image' | 'video'; duration?: number; path?: string; id: string; image: string; width: number; height: number; date: number; revision: string; mutationRevision?: string; contentRevision?: string; trashed?: boolean; expiresAt?: number; favorite?: boolean };
/** canReplace: the native edit pipeline can overwrite this original (owned, or Android allows a write request). */
export type EditPreview = { sessionId: string; operationId: string; image: string; width: number; height: number; reduced: boolean; maxEdge: number; filter: string; canReplace?: boolean };
export type EditReceipt = { status: string; operationId: string; id?: string; replaced?: boolean; revision?: string; message?: string };
export type OwnedAlbum = { id: string; name: string; revision: string; count: number; memberIds: string[] };
type ItemRef = { id: string; revision: string };
type Outcome = { id: string; status: string };
type Edit = { sessionId: string; rotation: number; crop: boolean; filter: string };

/** The shared PhotosPlugin under Alpha's name: the permitted library, edits, Trash, albums and sharing. */
export interface AlphaPhotosPlugin {
  libraryAccess(): Promise<LibraryAccess>;
  requestLibraryAccess(): Promise<LibraryAccess>;
  openLibrarySettings(): Promise<void>;
  /** The native MediaStore observer runs only while the Photos grid is open and visible. */
  watchLibrary(options: { active: boolean }): Promise<unknown>;
  listPermitted(options: { before?: string; query?: string; kind?: 'all' | 'image' | 'video'; thumbnails?: boolean; filter?: 'all' | 'favorites' | 'trash' }): Promise<{ items: SavedPhoto[]; next: string; access: LibraryAccess }>;
  list(options: { before?: string; trashed?: boolean; album?: string; limit?: number; thumbnails?: boolean }): Promise<{ items: SavedPhoto[]; next: string }>;
  read(options: { id: string; includeTrashed?: boolean }): Promise<SavedPhoto>;
  thumbnails(options: { ids: string[] }): Promise<{ items: { id: string; image: string }[] }>;
  beginEdit(options: ItemRef): Promise<EditPreview>;
  previewEdit(options: Edit): Promise<EditPreview>;
  saveEdit(options: Edit & { replace?: boolean }): Promise<EditReceipt>;
  editResult(options: { operationId: string }): Promise<EditReceipt>;
  cancelEdit(options: { sessionId: string }): Promise<void>;
  beginVideoEdit(options: ItemRef): Promise<{ sessionId: string; operationId: string; duration: number; width: number; height: number }>;
  saveVideoEdit(options: { sessionId: string; start: number; end: number; rotation: number; crop: boolean }): Promise<EditReceipt>;
  cancelVideoEdit(options: { sessionId?: string }): Promise<void>;
  setTrashed(options: ItemRef & { trashed: boolean }): Promise<SavedPhoto & { status: string }>;
  setFavorite(options: ItemRef & { favorite: boolean }): Promise<SavedPhoto>;
  share(options: { id: string; revision?: string }): Promise<{ status: string; message?: string }>;
  shareMany(options: { items: ItemRef[] }): Promise<{ status: string; count: number; message?: string }>;
  changeMany(options: { operation: 'favorite' | 'unfavorite' | 'trash' | 'restore'; items: ItemRef[] }): Promise<{ status: string; outcomes: (Outcome & { item?: SavedPhoto })[] }>;
  deletePermittedTrash(options: { items: ItemRef[] }): Promise<{ status: string; outcomes: Outcome[] }>;
  prepareDeleteTrash(options: { items: ItemRef[] } | { all: true }): Promise<{ confirmation: string; count: number }>;
  cancelDeleteTrash(options: { confirmation: string }): Promise<void>;
  deletePreparedTrash(options: { confirmation: string }): Promise<{ status: string; deletedIds: string[]; skippedIds: string[]; failedIds: string[] }>;
  albums(): Promise<{ items: OwnedAlbum[] }>;
  changeAlbum(options: Record<string, unknown>): Promise<{ status: string; id: string; revision: string }>;
  summary(): Promise<{ favorites: number; videos: number; camera?: number; screenshots?: number; trash: number; canFavorite: boolean }>;
  keepCapture(options: { dataBase64: string; operationId: string }): Promise<{ status: string; id?: string; message?: string }>;
  addListener(event: 'libraryChanged', listener: () => void): Promise<PluginListenerHandle>;
}
export const alphaPhotos = registerPlugin<AlphaPhotosPlugin>('AlphaPhotos');
