// spec/inbox/attachments.md, "A file is attached only as the bytes that were reviewed"; spec/inbox/reader.md, "An attachment is read at the message's revision and belongs to the open message"

/** A file's checked facts: its exact size and digest, and its text when it is plain text. */
export interface CheckedFile {
  readonly name: string;
  readonly mimeType: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly text?: string;
}

/** Why a file cannot be attached or opened here. */
export type FileRefusal = "name-or-encoding" | "too-large" | "unsupported-type";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, { extensions: string[]; matches: (bytes: Uint8Array) => boolean }> = {
  "text/plain": { extensions: [".txt"], matches: (b) => !b.includes(0) && utf8(b) !== null },
  "application/pdf": { extensions: [".pdf"], matches: (b) => starts(b, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  "image/png": { extensions: [".png"], matches: (b) => starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  "image/jpeg": { extensions: [".jpg", ".jpeg"], matches: (b) => starts(b, [0xff, 0xd8, 0xff]) },
  "image/webp": { extensions: [".webp"], matches: (b) => starts(b, [0x52, 0x49, 0x46, 0x46]) && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
};

function starts(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function utf8(bytes: Uint8Array): string | null {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return text.startsWith("\ufeff") ? text.slice(1) : text;
  } catch {
    return null;
  }
}

function decode(dataBase64: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(dataBase64);
    if (btoa(binary) !== dataBase64) return null;
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function digest(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validName(name: string): boolean {
  return name.length > 0 && name.length <= 120 && name !== "." && name !== ".." && !/[\\/\u0000-\u001f\u007f]/.test(name);
}

/** The supported types, as their MIME names. */
export const supportedMimeTypes: readonly string[] = Object.keys(TYPES);

/** Checks a supported file: its name ends in its type's extension and its content is that type, up to 5 MiB. */
export async function checkMailFile(name: string, mimeType: string, dataBase64: string): Promise<CheckedFile | FileRefusal> {
  if (!validName(name) || dataBase64.length > 7 * 1024 * 1024) return "name-or-encoding";
  const bytes = decode(dataBase64);
  if (!bytes) return "name-or-encoding";
  if (bytes.length > MAX_BYTES) return "too-large";
  const type = TYPES[mimeType];
  if (!type || !type.extensions.some((ext) => name.toLowerCase().endsWith(ext)) || !type.matches(bytes)) return "unsupported-type";
  const text = mimeType === "text/plain" ? utf8(bytes) ?? undefined : undefined;
  return { name, mimeType, bytes: bytes.length, sha256: await digest(bytes), text };
}

/** Checks a file of any type for an exact-copy save: name and encoding only; an invalid type becomes octet-stream. */
export async function checkOpaqueFile(name: string, mimeType: string, dataBase64: string): Promise<CheckedFile | FileRefusal> {
  if (!validName(name.trim()) || dataBase64.length > 7 * 1024 * 1024) return "name-or-encoding";
  const bytes = decode(dataBase64);
  if (!bytes) return "name-or-encoding";
  if (bytes.length > MAX_BYTES) return "too-large";
  const type = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,63}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,63}$/i.test(mimeType) ? mimeType.toLowerCase() : "application/octet-stream";
  return { name, mimeType: type, bytes: bytes.length, sha256: await digest(bytes) };
}

/** Whether a value is a refusal rather than a checked file. @throws {never} */
export function isRefusal(value: CheckedFile | FileRefusal): value is FileRefusal {
  return typeof value === "string";
}
