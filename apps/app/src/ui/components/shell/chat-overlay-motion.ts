/**
 * Pure geometry for the chat capsule-to-composer transition. Keeping this math
 * outside the overlay lets gesture and visual tests exercise the motion
 * contract without loading the complete chat surface.
 */

export const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, value));

/** Shared opacity easing for sheet content and composer controls. */
export const OVERLAY_EASE: [number, number, number, number] = [
  0.22, 1, 0.36, 1,
];
