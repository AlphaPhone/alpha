import { registerPlugin } from '../platform-plugins';
import type { LibraryChange } from '../runtime/photo-library';

type Items = { items: { id: string; revision: string }[] };

/**
 * The shared agent album facade (DeviceLibraryPlugin) under Alpha's name. Reads return identity-only
 * rows; every read result is untrusted until runtime/photo-library.ts parses it.
 */
export interface AlphaPhotoLibraryPlugin {
  scope(): Promise<unknown>;
  requestAccess(): Promise<unknown>;
  page(options: { before?: string; limit?: number; thumbnails?: boolean; thumbnailSize?: number; kind?: string; from?: number; to?: number; favorites?: boolean }): Promise<unknown>;
  inspect(options: { id: string; size?: number; pixels?: boolean }): Promise<unknown>;
  validate(options: Items): Promise<unknown>;
  requestChange(options: Items & { operation: LibraryChange }): Promise<{ status: string; operation?: string; outcomes?: { id: string; status: string }[] }>;
  share(options: Items): Promise<{ status: string; count: number }>;
}
export const alphaPhotoLibrary = registerPlugin<AlphaPhotoLibraryPlugin>('AlphaPhotoLibrary');
