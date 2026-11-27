// spec/app/assistant/attachments.md, "Each file is checked against its limits: an image is made to fit, audio and video never go, and the message's files fit together"

interface DecodedImage {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
  readonly close: () => void;
}

async function decodeImage(blob: Blob): Promise<DecodedImage | undefined> {
  try {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {
    if (typeof Image === "undefined" || typeof URL === "undefined") return undefined;
    const url = URL.createObjectURL(blob);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Could not decode image"));
        element.src = url;
      });
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (width <= 0 || height <= 0) {
        URL.revokeObjectURL(url);
        return undefined;
      }
      return { source: image, width, height, close: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      return undefined;
    }
  }
}

/** Constrain a selected image to a JPEG the resident can accept. */
export async function reencodeImage(blob: Blob, edges: readonly number[], qualities: readonly number[], cap: number): Promise<string | undefined> {
  const decoded = await decodeImage(blob);
  if (!decoded) return undefined;
  try {
    for (const edge of edges) {
      const scale = Math.min(1, edge / Math.max(decoded.width, decoded.height));
      const canvas = new OffscreenCanvas(Math.max(1, Math.round(decoded.width * scale)), Math.max(1, Math.round(decoded.height * scale)));
      const context = canvas.getContext("2d");
      if (!context) return undefined;
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
      for (const quality of qualities) {
        const encoded = await canvas.convertToBlob({ type: "image/jpeg", quality: quality / 100 });
        if (Math.ceil(encoded.size / 3) * 4 > cap) continue;
        const bytes = new Uint8Array(await encoded.arrayBuffer());
        let binary = "";
        for (let at = 0; at < bytes.length; at += 32768) binary += String.fromCharCode(...bytes.subarray(at, at + 32768));
        return btoa(binary);
      }
    }
    return undefined;
  } finally {
    decoded.close();
  }
}
