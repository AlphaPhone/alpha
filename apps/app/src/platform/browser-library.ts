// spec/app/files/recent.md, "Story: Pick a file with the system picker"; spec/app/files/preview.md, "Open elsewhere hands the file over to read only"
import type { DocumentHandoff, PdfPage } from "@elizaos/os-bridges";
import type { PdfRaster } from "./browser-pdf.ts";

/** The file the owner selected, or nothing when the browser chooser closed. */
export function selectedFile(signal: AbortSignal): Promise<File | undefined> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(undefined);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.hidden = true;
    const finish = (picked?: File) => {
      signal.removeEventListener("abort", cancel);
      input.remove();
      resolve(picked);
    };
    const cancel = () => finish();
    signal.addEventListener("abort", cancel, { once: true });
    input.addEventListener("cancel", cancel, { once: true });
    input.addEventListener("change", () => finish(input.files?.[0]), { once: true });
    document.body.append(input);
    input.click();
  });
}

/** Save a copy and return its browser address for the shell to release. @throws {never} */
export function downloadCopy(name: string, blob: Blob): string {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.download = name;
    link.href = url;
    link.click();
    return url;
  } catch (error) {
    releasePreview(url);
    throw error;
  }
}

/** Opens the browser or operating system's share picker for this exact file. */
export async function shareCopy(name: string, blob: Blob): Promise<DocumentHandoff> {
  const item = { files: [new File([blob], name, { type: blob.type })] };
  if (!navigator.canShare?.(item) || !navigator.share) return { status: "unavailable", message: "Sharing is unavailable in this browser." };
  try {
    await navigator.share(item);
    return { status: "opened", message: "" };
  } catch (error) {
    return { status: "failed", message: error instanceof DOMException && error.name === "AbortError" ? "Sharing was cancelled." : "The file could not be shared." };
  }
}

/** Read the chosen file into the format of the local library. @throws {never} */
export async function bytesOf(file: Blob): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Address an immutable local blob for the Files viewer. @throws {never} */
export function previewOf(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/** Release the address when the document is no longer selected. @throws {never} */
export function releasePreview(url: string): void {
  URL.revokeObjectURL(url);
}


/** Load the PDF worker only when a reviewed page needs rendering. @throws {never} */
export async function pdfRaster(blob: Blob, page: number, signal?: AbortSignal): Promise<PdfRaster> {
  try {
    const { drawPdf } = await import("./browser-pdf.ts");
    return await drawPdf(blob, page, signal);
  } catch {
    return { status: "failed", message: "This PDF could not be read." };
  }
}

/** Give the Files viewer a browser address for the rendered page. @throws {never} */
export async function pdfPage(blob: Blob, page: number): Promise<PdfPage> {
  const raster = await pdfRaster(blob, page);
  return raster.status === "rendered"
    ? { status: "rendered", message: "", page: raster.page, pageCount: raster.pageCount, imageUri: previewOf(raster.image) }
    : raster;
}
