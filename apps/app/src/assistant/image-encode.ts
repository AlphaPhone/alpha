// spec/app/assistant/attachments.md, "Each file is checked against its limits: an image is made to fit, audio and video never go, and the message's files fit together"

/** Constrain a selected image to a JPEG the resident can accept. */
export async function reencodeImage(blob: Blob, edges: readonly number[], qualities: readonly number[], cap: number): Promise<string | undefined> {
  const bitmap = await createImageBitmap(blob);
  try {
    for (const edge of edges) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
      const context = canvas.getContext("2d");
      if (!context) return undefined;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
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
    bitmap.close();
  }
}
