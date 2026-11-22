// spec/assistant/attachments.md, "At most four attachments, each within its cap, and a batch within 19 MiB of base64"

/** The image as base64 JPEG within `cap` characters, trying each edge and quality in order, or undefined when none fits. */
export async function reencodeImage(blob: Blob, edges: readonly number[], qualities: readonly number[], cap: number): Promise<string | undefined> {
  const bitmap = await createImageBitmap(blob);
  try {
    for (const edge of edges) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
      const context = canvas.getContext("2d");
      if (context === null) return undefined;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of qualities) {
        const encoded = await base64Of(await canvas.convertToBlob({ type: "image/jpeg", quality: quality / 100 }));
        if (encoded.length <= cap) return encoded;
      }
    }
    return undefined;
  } finally {
    bitmap.close();
  }
}

/** A JPEG thumbnail of at most 512 px, as a data URL. */
export async function thumbnailOf(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return `data:image/jpeg;base64,${await base64Of(await canvas.convertToBlob({ type: "image/jpeg", quality: 0.72 }))}`;
  } finally {
    bitmap.close();
  }
}

/** The bytes of a blob as base64, without a data URL prefix. */
export async function base64Of(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let at = 0; at < bytes.length; at += 32768) binary += String.fromCharCode(...bytes.subarray(at, at + 32768));
  return btoa(binary);
}
