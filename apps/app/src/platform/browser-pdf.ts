// spec/app/files/preview.md, "A page is shown only when the worker drew it in isolation and handed it over unwritable"
import type { PdfPage } from "@elizaos/os/bridges/definitions/media";
import { PDFWorker, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const inputLimit = 20 * 1024 * 1024;
const pixelLimit = 4096;
const malformed: PdfPage = { status: "failed", message: "This PDF could not be read. It may be malformed or encrypted." };

/** Render an owner-selected page to an immutable raster, using the bundled PDF worker. */
export async function drawPdf(blob: Blob, page: number): Promise<PdfPage> {
  if (blob.type !== "application/pdf") return { status: "unsupported", message: "This selection is not a PDF." };
  if (blob.size > inputLimit) return { status: "failed", message: "Choose a PDF smaller than 20 MiB to preview it." };
  const data = new Uint8Array(await blob.arrayBuffer());
  const worker = new Worker(workerUrl, { type: "module" });
  const isolated = PDFWorker.create({ port: worker });
  const failed = new Promise<never>((_, reject) => {
    worker.addEventListener("error", () => reject(new Error("The PDF worker could not start.")), { once: true });
  });
  const task = getDocument({ data, worker: isolated, useWasm: false });
  try {
    const pdf = await Promise.race([task.promise, failed]);
    if (!Number.isInteger(page) || page < 1 || page > pdf.numPages) return { status: "failed", message: "This PDF does not have that page." };
    const source = await pdf.getPage(page);
    const natural = source.getViewport({ scale: 1 });
    const scale = Math.min(1.5, pixelLimit / Math.max(natural.width, natural.height));
    const viewport = source.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) return malformed;
    await source.render({ canvas, canvasContext: context, viewport }).promise;
    const image = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!image) return malformed;
    return { status: "rendered", message: "", page, pageCount: pdf.numPages, imageUri: URL.createObjectURL(image) };
  } catch {
    return malformed;
  } finally {
    await task.destroy().catch(() => undefined);
    isolated.destroy();
    worker.terminate();
  }
}
