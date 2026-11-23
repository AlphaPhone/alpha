import type { MailAttachment } from '../../../../.eliza/client-features/plugins/plugin-files/src/browser/attachment.ts';

/** A file the owner selected, read whole with its size and digest. */
export type SelectedFile = MailAttachment & { size: number; sha256: string };
/** A selected document; version 1 means a source reference can be retained for it. */
export type SelectedDocument = SelectedFile & { sourceReferenceVersion?: 1 };
/** A file the owner reviewed before Android opens or saves it. `opaque` saves bytes the app could not preview. */
export type ReviewedFile = MailAttachment & { reviewed: boolean; sha256?: string; opaque?: boolean };

/**
 * AlphaMailAttachmentsPlugin: selected files and photos read for attachment, and reviewed files
 * opened or saved through Android. The browser host registers BrowserMailAttachments under the same
 * name (browser/register.ts), so this module exports no singleton.
 */
export interface AlphaMailAttachmentsPlugin {
  readSelected(input: { selectionId: string }): Promise<SelectedDocument>;
  readPhotoSelected(input: { id: string; revision: string }): Promise<SelectedFile>;
  cancelPhotoSelected(): Promise<void>;
  retainSourceReference(input: { selectionId: string; sha256: string }): Promise<{ reference?: string }>;
  openReviewed(input: ReviewedFile): Promise<{ message: string }>;
  saveReviewed(input: ReviewedFile & { reviewed: true }): Promise<{ status: string; message: string }>;
  cancel(): Promise<void>;
}
