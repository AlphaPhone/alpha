// spec/app/files/scan.md, "Story: Make the PDF, and keep the photo"
const limit = 64 * 1024 * 1024;
const writer = new TextEncoder();
const paper = { width: 595, height: 842, border: 24 };

function drawing(image: Uint8Array, width: number, height: number): Uint8Array[] {
  return [
    writer.encode(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),
    image,
    writer.encode("\nendstream"),
  ];
}

async function encode(image: Blob) {
  const bitmap = await createImageBitmap(image);
  try {
    const scale = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height), Math.sqrt(10_000_000 / (bitmap.width * bitmap.height)));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Document canvas is unavailable");
    context.drawImage(bitmap, 0, 0, width, height);
    const result = await canvas.convertToBlob({ type: "image/jpeg", quality: .87 });
    return { jpeg: new Uint8Array(await result.arrayBuffer()), width, height };
  } finally {
    bitmap.close();
  }
}

async function makeDocument(images: readonly Blob[]) {
  if (images.length === 0 || images.length > 20 || images.reduce((sum, image) => sum + image.size, 0) > limit) {
    throw new Error("Document exceeds its size limit");
  }
  const chunks: BlobPart[] = [];
  const offsets = [0];
  let size = 0;
  function append(part: string | Uint8Array) {
    const bytes = typeof part === "string" ? writer.encode(part) : part;
    size += bytes.byteLength;
    if (size > limit) throw new Error("Document exceeds its size limit");
    chunks.push(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  }
  function object(id: number, content: string | Uint8Array[]) {
    offsets[id] = size;
    append(`${id} 0 obj\n`);
    if (typeof content === "string") append(content);
    else for (const part of content) append(part);
    append("\nendobj\n");
  }
  append("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Count ${images.length} /Kids [${images.map((_, index) => `${index * 3 + 3} 0 R`).join(" ")}] >>`);
  for (const [index, input] of images.entries()) {
    const { jpeg, width, height } = await encode(input);
    const page = index * 3 + 3;
    const fields = { image: page + 1, paint: page + 2 };
    const scale = Math.min((paper.width - paper.border * 2) / width, (paper.height - paper.border * 2) / height);
    const w = Math.floor(width * scale);
    const h = Math.floor(height * scale);
    const paint = `q ${w} 0 0 ${h} ${(paper.width - w) / 2} ${(paper.height - h) / 2} cm /PageImage Do Q\n`;
    object(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${paper.width} ${paper.height}] /Resources << /XObject << /PageImage ${fields.image} 0 R >> >> /Contents ${fields.paint} 0 R >>`);
    object(fields.image, drawing(jpeg, width, height));
    object(fields.paint, `<< /Length ${writer.encode(paint).length} >>\nstream\n${paint}endstream`);
  }
  const ref = size;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map((one) => `${one.toString().padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${ref}\n%%EOF\n`);
  return new Blob(chunks, { type: "application/pdf" });
}

self.addEventListener("message", ({ data }: MessageEvent<readonly Blob[]>) => {
  void makeDocument(data).then(
    (pdf) => self.postMessage({ pdf }),
    (cause: unknown) => self.postMessage({ problem: cause instanceof Error && cause.message.includes("size limit") ? "TooLarge" : "NotDrawn" }),
  );
});
