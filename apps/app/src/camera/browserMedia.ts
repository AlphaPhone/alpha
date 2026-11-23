// spec/camera/browse.md, "Sharing in the browser build hands the exact stored files to the browser's share sheet, or refuses before anything is sent"; spec/camera/videoEdit.md, "The browser build edits a video only where it can decode and encode it, and refuses before any write otherwise"

/** One stored file to share. */
export interface SharedFile { readonly name: string; readonly type: string; readonly dataUrl: string }

/** The browser's share sheet over the exact stored files: opened, cancelled by the owner, or unavailable here. */
export async function shareFiles(files: readonly SharedFile[]): Promise<"opened" | "cancelled" | "unavailable"> {
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return "unavailable";
  const payload = await Promise.all(files.map(async (file) => new File([await (await fetch(file.dataUrl)).blob()], file.name, { type: file.type })));
  if (!navigator.canShare({ files: payload })) return "unavailable";
  try {
    await navigator.share({ files: payload });
    return "opened";
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "unavailable";
  }
}

/**
 * Whether this browser can decode and encode video on the device.
 * @throws {never}
 */
export function videoEditingAvailable(): boolean {
  return typeof VideoEncoder !== "undefined" && typeof VideoDecoder !== "undefined" && typeof AudioEncoder !== "undefined" && typeof AudioDecoder !== "undefined";
}

/** A trimmed, quarter-turned, optionally centre-cropped WebM copy of a stored video, at most 100 MB; every track is kept or the copy is refused. */
export async function renderVideoEdit(dataUrl: string, edit: { start: number; end: number; rotation: number; crop: boolean }, size: { width: number; height: number }): Promise<{ dataBase64: string; mimeType: string; duration: number; width: number; height: number }> {
  if (!videoEditingAvailable()) throw new Error("This video cannot be edited.");
  if (!(edit.end - edit.start >= 0.1) || edit.start < 0 || ![0, 90, 180, 270].includes(edit.rotation)) throw new Error("Choose a video range of at least 0.1 seconds.");
  const { Input, BlobSource, ALL_FORMATS, Output, WebMOutputFormat, BufferTarget, Conversion } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(await (await fetch(dataUrl)).blob()), formats: ALL_FORMATS });
  const target = new BufferTarget();
  const output = new Output({ target, format: new WebMOutputFormat() });
  try {
    const turned = edit.rotation % 180 !== 0;
    const width = turned ? size.height : size.width, height = turned ? size.width : size.height;
    const cropWidth = Math.floor(width / 1.3), cropHeight = Math.floor(height / 1.3);
    const conversion = await Conversion.init({
      input, output, showWarnings: false, trim: { start: edit.start, end: edit.end },
      video: { codec: "vp8", forceTranscode: true, rotate: edit.rotation as 0 | 90 | 180 | 270, allowTransformationMetadata: false, ...(edit.crop ? { crop: { left: Math.floor((width * (1 - 1 / 1.3)) / 2), top: Math.floor((height * (1 - 1 / 1.3)) / 2), width: cropWidth, height: cropHeight } } : {}) },
      audio: { codec: "opus", forceTranscode: true },
    });
    if (!conversion.isValid || conversion.discardedTracks.length > 0) throw new Error("This video cannot be edited.");
    await conversion.execute();
    const buffer = target.buffer;
    if (!buffer || buffer.byteLength === 0 || buffer.byteLength > 100 * 1024 * 1024) throw new Error("Video copy is empty or exceeds 100 MB");
    const bytes = new Uint8Array(buffer);
    let raw = "";
    for (let at = 0; at < bytes.length; at += 16384) raw += String.fromCharCode(...bytes.subarray(at, at + 16384));
    return { dataBase64: btoa(raw), mimeType: "video/webm", duration: edit.end - edit.start, width: edit.crop ? cropWidth : width, height: edit.crop ? cropHeight : height };
  } finally {
    input.dispose();
  }
}
