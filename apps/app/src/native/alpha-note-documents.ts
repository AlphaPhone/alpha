/** `bytes` is set when the destination confirmed the write. */
export type DocumentExportResult = { status: string; message: string; bytes?: number };

/**
 * AlphaNoteDocumentsPlugin: owner-chosen text import and text or PDF export through Android's document picker.
 * The browser host registers 'AlphaNoteDocuments' with its web implementation in
 * prototype/notes-document-adapter.ts and prototype/scan-pdf.ts, so this module exports no singleton.
 */
export interface AlphaNoteDocumentsPlugin {
  importText(): Promise<{ status: string; message: string; text?: string; name?: string }>;
  exportText(input: { title: string; text: string }): Promise<DocumentExportResult>;
  exportPdf(input: { title: string; dataBase64: string }): Promise<DocumentExportResult>;
}
