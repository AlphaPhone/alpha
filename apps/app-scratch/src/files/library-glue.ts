// spec/files/pdf.md, "Story: Read a PDF page by page on the phone"; spec/files/picker.md, "Story: Choose a file from my phone for another app on Alpha"
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

const PDF_LIMIT = 20 * 1024 * 1024;

/** One page of a PDF rendered by pdf.js in its own worker, as an image address this page owns. */
export async function renderPdfPage(blob: Blob, page: number): Promise<{ status: "rendered" | "unsupported" | "failed"; page?: number; pageCount?: number; imageUri?: string; text?: string; message?: string }> {
  if (blob.type !== "application/pdf") return { status: "unsupported", message: "This selection is not a PDF." };
  if (blob.size > PDF_LIMIT) return { status: "failed", message: "PDF preview is unavailable. It may be malformed, encrypted, or larger than 20 MiB." };
  const task = getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    if (page < 0 || page >= pdf.numPages) return { status: "failed", message: "PDF preview is unavailable." };
    const shown = await pdf.getPage(page + 1);
    const viewport = shown.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) return { status: "failed" };
    await shown.render({ canvas, canvasContext: context, viewport }).promise;
    const text = (await shown.getTextContent()).items.map((item) => ("str" in item ? item.str : "")).join(" ");
    const image = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!image) return { status: "failed" };
    return { status: "rendered", page, pageCount: pdf.numPages, imageUri: URL.createObjectURL(image), text };
  } catch {
    return { status: "failed", message: "This PDF is encrypted or access expired. Open it in a compatible app or select it again." };
  } finally {
    await task.destroy();
  }
}

/** An address for bytes this page holds, for a picture, recording or sandboxed document. */
export function objectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/** The SHA-256 of base64 bytes, lower-case hex. */
export async function sha256(dataBase64: string): Promise<string> {
  const raw = atob(dataBase64);
  const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A file or folder the owner chose from this computer, with each file's path inside it. */
export interface ChosenFile {
  readonly path: string;
  readonly name: string;
  readonly mimeType: string;
  readonly bytes: Uint8Array<ArrayBuffer>;
}

/** Files the owner chooses from this computer: one or several, or every file of one folder; none when cancelled. */
export function chooseFromComputer(options: { readonly folder?: boolean; readonly multiple?: boolean; readonly accept?: string } = {}): Promise<{ folder: string; files: ChosenFile[] }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.hidden = true;
    input.multiple = options.multiple === true || options.folder === true;
    if (options.accept) input.accept = options.accept;
    if (options.folder) input.setAttribute("webkitdirectory", "");
    const finish = async () => {
      input.remove();
      const picked = Array.from(input.files ?? []);
      const files = await Promise.all(picked.map(async (file) => {
        const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        return { path: options.folder ? relative.split("/").slice(1).join("/") : file.name, name: file.name, mimeType: file.type || "application/octet-stream", bytes: new Uint8Array(await file.arrayBuffer()) };
      }));
      const first = (picked[0] as (File & { webkitRelativePath?: string }) | undefined)?.webkitRelativePath ?? "";
      resolve({ folder: options.folder ? first.split("/")[0] ?? "" : "", files });
    };
    input.onchange = () => void finish().catch(reject);
    input.oncancel = () => { input.remove(); resolve({ folder: "", files: [] }); };
    document.body.append(input);
    input.click();
  });
}
