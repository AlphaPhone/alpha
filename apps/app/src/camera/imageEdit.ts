// spec/camera/edit.md, "Rotate turns the photo and its crop a quarter clockwise; a look and the crop are previewed before they count"

/** A crop area in fractions of the rotated photo. */
export type CropRect = { x: number; y: number; width: number; height: number };
/** Which crop proportions the crop step offers. */
export type CropAspect = "free" | "square" | "4:3" | "16:9";
/** What part of the crop frame a drag holds. */
export type CropHandle = "move" | "nw" | "ne" | "sw" | "se";

/** The looks the editor offers, by the bridge's filter id. */
export const LOOKS = {
  Original: { id: "none", css: "none" },
  Vivid: { id: "vivid", css: "saturate(1.55) contrast(1.08)" },
  Warm: { id: "warm", css: "sepia(.3) saturate(1.35) hue-rotate(-8deg)" },
  Cool: { id: "cool", css: "saturate(1.1) hue-rotate(14deg) brightness(1.03)" },
  Mono: { id: "mono", css: "grayscale(1) contrast(1.05)" },
  Fade: { id: "fade", css: "contrast(.78) brightness(1.12) saturate(.75)" },
  Noir: { id: "noir", css: "grayscale(1) contrast(1.55) brightness(.88)" },
} as const;

/** The crop proportions, as width over height for a landscape photo. */
export const CROP_ASPECTS: readonly { id: CropAspect; label: string; ratio?: number }[] = [
  { id: "free", label: "Free" }, { id: "square", label: "Square", ratio: 1 }, { id: "4:3", label: "4:3", ratio: 4 / 3 }, { id: "16:9", label: "16:9", ratio: 16 / 9 },
];

/** The whole photo: no crop. */
export const WHOLE_PHOTO: CropRect = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });
/** The smallest side a dragged crop keeps. */
export const MIN_CROP_SIDE = 0.05;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * The ratio of fractions an aspect keeps on a photo of this rotated size; a preset follows the photo's orientation.
 * @throws {never}
 */
export function aspectFraction(aspect: CropAspect, photoWidth: number, photoHeight: number): number | undefined {
  const ratio = CROP_ASPECTS.find((choice) => choice.id === aspect)?.ratio;
  if (!ratio || photoWidth < 1 || photoHeight < 1) return undefined;
  return ((photoHeight > photoWidth ? 1 / ratio : ratio) * photoHeight) / photoWidth;
}

/**
 * The largest area of a ratio, centred on `within`, that fits inside it.
 * @throws {never}
 */
export function fitAspect(fraction: number, within: CropRect = WHOLE_PHOTO): CropRect {
  let width = within.width, height = within.height;
  if (width / height > fraction) width = height * fraction;
  else height = width / fraction;
  return { x: within.x + (within.width - width) / 2, y: within.y + (within.height - height) / 2, width, height };
}

/**
 * The area after a drag of (dx, dy): `move` slides it inside the photo, a corner resizes against the opposite one.
 * @throws {never}
 */
export function dragCrop(start: CropRect, handle: CropHandle, dx: number, dy: number, fraction?: number): CropRect {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return start;
  if (handle === "move") return { ...start, x: clamp(start.x + dx, 0, 1 - start.width), y: clamp(start.y + dy, 0, 1 - start.height) };
  const east = handle === "ne" || handle === "se", south = handle === "sw" || handle === "se";
  const anchorX = east ? start.x : start.x + start.width, anchorY = south ? start.y : start.y + start.height;
  const maxWidth = east ? 1 - anchorX : anchorX, maxHeight = south ? 1 - anchorY : anchorY;
  let width = clamp(start.width + (east ? dx : -dx), MIN_CROP_SIDE, maxWidth);
  let height = clamp(start.height + (south ? dy : -dy), MIN_CROP_SIDE, maxHeight);
  if (fraction) {
    if (Math.abs(width - start.width) / fraction >= Math.abs(height - start.height)) height = width / fraction;
    else width = height * fraction;
    const grow = Math.max(1, MIN_CROP_SIDE / width, MIN_CROP_SIDE / height);
    width *= grow;
    height *= grow;
    const shrink = Math.min(1, maxWidth / width, maxHeight / height);
    width *= shrink;
    height *= shrink;
  }
  return { x: east ? anchorX : anchorX - width, y: south ? anchorY : anchorY - height, width, height };
}

/**
 * The area the arrow keys give: a step moves it, or with `resize` moves its far corner.
 * @throws {never}
 */
export function nudgeCrop(rect: CropRect, key: string, resize: boolean, fraction?: number, step = 0.02): CropRect | undefined {
  const delta = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, [number, number]>)[key];
  return delta ? dragCrop(rect, resize ? "se" : "move", delta[0], delta[1], fraction) : undefined;
}

/**
 * Fractions to the spec's thousandths, kept inside the photo with at least 5% a side.
 * @throws {never}
 */
export function toArea(rect: CropRect): { x: number; y: number; width: number; height: number } {
  const x = clamp(Math.round(rect.x * 1000), 0, 950), y = clamp(Math.round(rect.y * 1000), 0, 950);
  return { x, y, width: clamp(Math.round(rect.width * 1000), 50, 1000 - x), height: clamp(Math.round(rect.height * 1000), 50, 1000 - y) };
}

/**
 * The spec's thousandths as fractions for the bridge.
 * @throws {never}
 */
export function fromArea(area: { x: number; y: number; width: number; height: number }): CropRect {
  return { x: area.x / 1000, y: area.y / 1000, width: area.width / 1000, height: area.height / 1000 };
}

async function bitmapOf(dataUrl: string): Promise<ImageBitmap> {
  return createImageBitmap(await (await fetch(dataUrl)).blob());
}

/** Render an edit on the device: quarter turns, then the look, then the crop of the rotated photo. */
export async function renderPhotoEdit(dataUrl: string, request: { rotation: number; filter: string; cropRect?: CropRect }): Promise<{ dataUrl: string; thumbnail: string; width: number; height: number }> {
  if (![0, 90, 180, 270].includes(request.rotation)) throw new Error("Use a quarter-turn rotation");
  const bitmap = await bitmapOf(dataUrl);
  try {
    const turned = request.rotation % 180 !== 0;
    const width = turned ? bitmap.height : bitmap.width, height = turned ? bitmap.width : bitmap.height;
    const crop = request.cropRect ?? WHOLE_PHOTO;
    const left = Math.round(crop.x * width), top = Math.round(crop.y * height);
    const keptWidth = Math.max(1, Math.round(crop.width * width)), keptHeight = Math.max(1, Math.round(crop.height * height));
    const look = Object.values(LOOKS).find((entry) => entry.id === request.filter)?.css ?? "none";
    const canvas = document.createElement("canvas");
    canvas.width = keptWidth;
    canvas.height = keptHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Preview unavailable");
    context.filter = look;
    context.translate(-left, -top);
    context.translate(width / 2, height / 2);
    context.rotate((request.rotation * Math.PI) / 180);
    context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    const scale = Math.min(1, 256 / Math.max(keptWidth, keptHeight));
    const small = document.createElement("canvas");
    small.width = Math.max(1, Math.round(keptWidth * scale));
    small.height = Math.max(1, Math.round(keptHeight * scale));
    small.getContext("2d")?.drawImage(canvas, 0, 0, small.width, small.height);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.92), thumbnail: small.toDataURL("image/jpeg", 0.8), width: keptWidth, height: keptHeight };
  } finally {
    bitmap.close();
  }
}
