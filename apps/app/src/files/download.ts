// spec/files/downloads.md, "A download takes one to 100 distinct selected files, read again before it is handed over"; spec/files/downloads.md, "An archive holds exactly the selected bytes, in selection order, under distinct names"

/** One file of a download: its name and bytes. */
export interface DownloadFile {
  readonly name: string;
  readonly mimeType: string;
  readonly bytes: Uint8Array;
}

/** The bytes of base64 text. */
export function fromBase64(data: string): Uint8Array {
  const raw = atob(data);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A stored (uncompressed) zip whose entries are the files in order, each named by its position and its own name. */
export function storedZip(files: readonly DownloadFile[]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  files.forEach((file, index) => {
    const name = encoder.encode(`${index + 1} ${file.name}`);
    const crc = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true);
    lv.setUint32(14, crc, true); lv.setUint32(18, file.bytes.length, true); lv.setUint32(22, file.bytes.length, true);
    lv.setUint16(26, name.length, true); local.set(name, 30);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, file.bytes.length, true); cv.setUint32(24, file.bytes.length, true);
    cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46);
    locals.push(local, file.bytes);
    centrals.push(central);
    offset += local.length + file.bytes.length;
  });
  const size = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, size, true); ev.setUint32(16, offset, true);
  const parts = [...locals, ...centrals, end];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}

/** Whether the page is on screen now. */
export function pageVisible(): boolean {
  return typeof document !== "undefined" && !document.hidden;
}

/** Hands the bytes to the browser's downloads; the browser never says where, or whether, they were saved. */
export function handOver(name: string, mimeType: string, bytes: Uint8Array): void {
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** The browser's own estimate of this app's storage use, when it gives one. */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | undefined> {
  const estimate = await navigator.storage?.estimate?.();
  return estimate && Number.isFinite(estimate.usage) && Number.isFinite(estimate.quota) && (estimate.quota ?? 0) > 0
    ? { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 } : undefined;
}
