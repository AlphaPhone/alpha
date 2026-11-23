// spec/camera/scan.md, "Pages meet every image, count and size limit"; spec/camera/scanDialogs.md, "Story: Correct a page's perspective before it replaces the page"; spec/camera/scanDialogs.md, "Story: Make a searchable PDF of the pages I reviewed"
import type { TextLine } from "./scanText.ts";

/** Clockwise normalized page corners from the top left. */
export type Corner = { x: number; y: number };
export type Corners = [Corner, Corner, Corner, Corner];

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 16 * 1024 * 1024;
const MAX_PIXELS = 32_000_000;

/**
 * The whole page: no correction.
 * @throws {never}
 */
export function fullPage(): Corners {
  return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
}

function admitted(image: Blob): void {
  if (!IMAGE_TYPES.includes(image.type) || image.size <= 0 || image.size > MAX_BYTES) throw new Error("Choose a JPEG, PNG or WebP photo up to 16 MB.");
}

async function bounded(image: Blob, longSide: number): Promise<HTMLCanvasElement> {
  admitted(image);
  const bitmap = await createImageBitmap(image);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > MAX_PIXELS) throw new Error("Choose a photo with at most 32 million pixels.");
    const scale = Math.min(1, longSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(2, Math.round(bitmap.width * scale));
    canvas.height = Math.max(2, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is unavailable on this device.");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}

/** The decoded size of an image, refused past 32 million pixels. */
export async function imageSize(image: Blob): Promise<{ width: number; height: number }> {
  admitted(image);
  const bitmap = await createImageBitmap(image);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > MAX_PIXELS) throw new Error("A page photo is larger than 32 million pixels.");
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

/** Read the text of a page on the device with the pinned English model; lines carry their page positions when asked. */
export async function recognizeText(image: Blob, signal: AbortSignal = new AbortController().signal, onProgress: (progress: number) => void, layout = false): Promise<{ text: string; lines?: TextLine[] }> {
  signal.throwIfAborted();
  const canvas = await bounded(image, 2048);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "/ocr/worker.min.js", corePath: "/ocr/", langPath: "/ocr/", cacheMethod: "none", gzip: true,
    logger: (message: { status: string; progress: number }) => { if (message.status === "recognizing text") onProgress(Math.max(0, Math.min(1, message.progress))); },
  });
  const stop = () => void worker.terminate();
  signal.addEventListener("abort", stop, { once: true });
  try {
    const result = await worker.recognize(canvas, {}, { text: true, blocks: layout });
    signal.throwIfAborted();
    const text = result.data.text.trim();
    if (text.length > 100_000) throw new Error("The recognized text is invalid or too long.");
    if (!layout) return { text };
    const lines: TextLine[] = [];
    for (const block of result.data.blocks ?? []) for (const paragraph of block.paragraphs) for (const line of paragraph.lines) {
      lines.push({ text: line.text.trim(), x: line.bbox.x0 / canvas.width, y: line.bbox.y0 / canvas.height, width: (line.bbox.x1 - line.bbox.x0) / canvas.width, height: (line.bbox.y1 - line.bbox.y0) / canvas.height });
      if (lines.length > 2000) throw new Error("Too many lines were recognized on this page.");
    }
    return { text, lines };
  } finally {
    signal.removeEventListener("abort", stop);
    await worker.terminate().catch(() => undefined);
  }
}

const cross = (a: Corner, b: Corner, c: Corner) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

/**
 * Whether corners are inside the page, clockwise without crossing, and cover a usable area.
 * @throws {never}
 */
export function cornersValid(corners: Corners): boolean {
  if (corners.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)) return false;
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const a = corners[i]!, b = corners[(i + 1) % 4]!, c = corners[(i + 2) % 4]!;
    area += a.x * b.y - b.x * a.y;
    if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) <= 0.0001 || Math.hypot(b.x - a.x, b.y - a.y) < 0.02) return false;
  }
  return area >= 0.02;
}

/** A conservative suggestion of the page's corners by local contrast; never an applied crop. */
export async function detectEdges(image: Blob, signal: AbortSignal = new AbortController().signal): Promise<Corners | undefined> {
  const canvas = await bounded(image, 320);
  const w = canvas.width, h = canvas.height, n = w * h;
  const pixels = canvas.getContext("2d")!.getImageData(0, 0, w, h).data;
  const gray = new Uint8Array(n), border: number[] = [];
  for (let i = 0; i < n; i++) {
    gray[i] = Math.round(0.2126 * pixels[i * 4]! + 0.7152 * pixels[i * 4 + 1]! + 0.0722 * pixels[i * 4 + 2]!);
    if (i < w || i >= n - w || i % w === 0 || i % w === w - 1) border.push(gray[i]!);
  }
  border.sort((a, b) => a - b);
  const background = border[Math.floor(border.length / 2)]!;
  const candidates: { corners: Corners; size: number }[] = [];
  for (const direction of [1, -1]) {
    const seen = new Uint8Array(n), queue = new Int32Array(n);
    for (let start = 0; start < n; start++) {
      if (start % 2048 === 0) {
        await new Promise<void>((resolve) => queueMicrotask(resolve));
        signal.throwIfAborted();
      }
      if (seen[start] || direction * (gray[start]! - background) < 30) continue;
      let head = 0, tail = 1, touches = false;
      queue[0] = start;
      seen[start] = 1;
      const edge: Corner[] = [];
      while (head < tail) {
        const at = queue[head++]!, x = at % w, y = Math.floor(at / w);
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) touches = true;
        let boundary = false;
        for (const next of [x ? at - 1 : -1, x < w - 1 ? at + 1 : -1, y ? at - w : -1, y < h - 1 ? at + w : -1]) {
          if (next < 0 || direction * (gray[next]! - background) < 30) { boundary = true; continue; }
          if (!seen[next]) { seen[next] = 1; queue[tail++] = next; }
        }
        if (boundary) edge.push({ x, y });
      }
      if (touches || tail < n * 0.15) continue;
      edge.sort((a, b) => a.x - b.x || a.y - b.y);
      const lower: Corner[] = [], upper: Corner[] = [];
      for (const p of edge) { while (lower.length > 1 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop(); lower.push(p); }
      for (const p of [...edge].reverse()) { while (upper.length > 1 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop(); upper.push(p); }
      const outline = [...lower.slice(0, -1), ...upper.slice(0, -1)];
      while (outline.length > 4) {
        let smallest = Infinity, index = 0;
        for (let i = 0; i < outline.length; i++) {
          const loss = Math.abs(cross(outline[(i + outline.length - 1) % outline.length]!, outline[i]!, outline[(i + 1) % outline.length]!));
          if (loss < smallest) { smallest = loss; index = i; }
        }
        outline.splice(index, 1);
      }
      if (outline.length !== 4) continue;
      let first = 0;
      for (let i = 1; i < 4; i++) if (outline[i]!.x + outline[i]!.y < outline[first]!.x + outline[first]!.y) first = i;
      const corners = [...outline.slice(first), ...outline.slice(0, first)].map((p) => ({ x: p.x / (w - 1), y: p.y / (h - 1) })) as Corners;
      if (cornersValid(corners)) candidates.push({ corners, size: tail });
    }
  }
  signal.throwIfAborted();
  candidates.sort((a, b) => b.size - a.size);
  if (candidates.length === 0 || (candidates[1] !== undefined && candidates[1].size > candidates[0]!.size * 0.5)) return undefined;
  return candidates[0]!.corners;
}

/** The page warped to its four corners, as a JPEG within the image limits. */
export async function correctPage(image: Blob, corners: Corners, signal: AbortSignal = new AbortController().signal): Promise<Blob> {
  if (!cornersValid(corners)) throw new Error("Keep corners in clockwise order without crossing the page edges.");
  const source = await bounded(image, 2048);
  const points = corners.map((p) => ({ x: p.x * (source.width - 1), y: p.y * (source.height - 1) })) as Corners;
  const [p0, p1, p2, p3] = points;
  const distance = (a: Corner, b: Corner) => Math.hypot(a.x - b.x, a.y - b.y);
  const rawWidth = (distance(p0, p1) + distance(p3, p2)) / 2, rawHeight = (distance(p0, p3) + distance(p1, p2)) / 2;
  const scale = Math.min(1, 2048 / Math.max(rawWidth, rawHeight));
  const output = document.createElement("canvas");
  output.width = Math.max(2, Math.round(rawWidth * scale));
  output.height = Math.max(2, Math.round(rawHeight * scale));
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x, dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  const det = dx1 * dy2 - dx2 * dy1, g = (dx3 * dy2 - dx2 * dy3) / det, hh = (dx1 * dy3 - dx3 * dy1) / det;
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + hh * p3.x, d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + hh * p3.y;
  const pixels = source.getContext("2d")!.getImageData(0, 0, source.width, source.height).data;
  const context = output.getContext("2d")!;
  const result = context.createImageData(output.width, output.height);
  for (let y = 0; y < output.height; y++) {
    if (y % 32 === 0) {
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      signal.throwIfAborted();
    }
    for (let x = 0; x < output.width; x++) {
      const u = x / (output.width - 1), v = y / (output.height - 1), den = g * u + hh * v + 1;
      const sx = Math.max(0, Math.min(source.width - 1, (a * u + b * v + p0.x) / den)), sy = Math.max(0, Math.min(source.height - 1, (d * u + e * v + p0.y) / den));
      const left = Math.floor(sx), top = Math.floor(sy), right = Math.min(left + 1, source.width - 1), bottom = Math.min(top + 1, source.height - 1), fx = sx - left, fy = sy - top;
      const at = (y * output.width + x) * 4;
      for (let c = 0; c < 3; c++) {
        result.data[at + c] = (pixels[(top * source.width + left) * 4 + c]! * (1 - fx) + pixels[(top * source.width + right) * 4 + c]! * fx) * (1 - fy)
          + (pixels[(bottom * source.width + left) * 4 + c]! * (1 - fx) + pixels[(bottom * source.width + right) * 4 + c]! * fx) * fy;
      }
      result.data[at + 3] = 255;
    }
  }
  context.putImageData(result, 0, 0);
  return new Promise<Blob>((resolve, reject) => output.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("A page could not be converted."))), "image/jpeg", 0.92));
}

/** The characters the searchable PDF's Helvetica text layer can draw: printable Latin-1. */
const PDF_TEXT = /^[\x20-\x7e\xa0-\xff]$/;

/** A reviewed text line holds a character the searchable PDF cannot write; nothing was exported. */
export class UnsupportedPdfText extends Error {
  readonly code = "unsupported-text";
  readonly character: string;
  constructor(character: string) {
    super(`“${character}” can’t be written into a searchable PDF. Correct the text, then export again.`);
    this.character = character;
  }
}

/** One PDF of the reviewed pages, each page's reviewed text placed invisibly behind its own image; at most 8 MB. A line holding a character the text layer cannot draw refuses the whole export. */
export async function buildPdf(pages: readonly Blob[], layers: readonly (readonly TextLine[] | null)[], signal: AbortSignal = new AbortController().signal): Promise<string> {
  if (pages.length < 1 || pages.length > 20 || pages.reduce((sum, page) => sum + page.size, 0) > 64 * 1024 * 1024) throw new Error("Choose 1 to 20 pages, up to 64 MB in total.");
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle("Alpha scan");
  pdf.setCreator("Alpha Phone");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const [index, page] of pages.entries()) {
    signal.throwIfAborted();
    const canvas = await bounded(page, 2048);
    const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("A page could not be converted to PDF."))), "image/jpeg", 0.85));
    const embedded = await pdf.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
    const sheet = pdf.addPage([canvas.width, canvas.height]);
    sheet.drawImage(embedded, { x: 0, y: 0, width: canvas.width, height: canvas.height });
    for (const line of layers[index] ?? []) {
      const size = Math.max(1, line.height * canvas.height * 0.8);
      const text = line.text;
      if (text.trim() === "") continue;
      // A reviewed line the PDF font cannot draw is refused, never silently cut: the owner corrects it before exporting.
      const unsupported = [...text].find((character) => !PDF_TEXT.test(character));
      if (unsupported !== undefined) throw new UnsupportedPdfText(unsupported);
      sheet.drawText(text, { x: line.x * canvas.width, y: canvas.height - (line.y + line.height) * canvas.height, size, font, opacity: 0 });
    }
  }
  const bytes = await pdf.save();
  if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("The PDF is over the 8 MB limit.");
  let raw = "";
  for (let at = 0; at < bytes.length; at += 16384) raw += String.fromCharCode(...bytes.subarray(at, at + 16384));
  return btoa(raw);
}

/** A blob's bytes as base64. */
export async function base64Of(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let raw = "";
  for (let at = 0; at < bytes.length; at += 16384) raw += String.fromCharCode(...bytes.subarray(at, at + 16384));
  return btoa(raw);
}

/**
 * Base64 JPEG bytes as a blob.
 * @throws {never}
 */
export function jpegBlob(dataBase64: string): Blob {
  return new Blob([Uint8Array.from(atob(dataBase64), (char) => char.charCodeAt(0))], { type: "image/jpeg" });
}

/**
 * A preview URL for a page or frame the review shows.
 * @throws {never}
 */
export function objectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Release a preview URL once its page leaves the review.
 * @throws {never}
 */
export function revokeUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/** Copy text to the clipboard; false when the page may not. */
export async function copyText(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text).then(() => true, () => false);
}

/**
 * Stored base64 bytes as a typed blob.
 * @throws {never}
 */
export function blobFromBase64(dataBase64: string, type: string): Blob {
  return new Blob([Uint8Array.from(atob(dataBase64), (char) => char.charCodeAt(0))], { type });
}
