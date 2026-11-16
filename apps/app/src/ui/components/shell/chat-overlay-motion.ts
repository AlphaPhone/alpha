/**
 * Pure geometry for the chat capsule-to-composer transition. Keeping this math
 * outside the overlay lets gesture and visual tests exercise the motion
 * contract without loading the complete chat surface.
 */

export const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, value));

export const PILL_MORPH_MIN_SCALE = 0.45;

/** Panel scale for a pill-to-input progress value from zero to one. */
export function pillMorphScale(progress: number): number {
  return PILL_MORPH_MIN_SCALE + (1 - PILL_MORPH_MIN_SCALE) * clamp01(progress);
}

/** Shared opacity easing for sheet content and composer controls. */
export const OVERLAY_EASE: [number, number, number, number] = [
  0.22, 1, 0.36, 1,
];
