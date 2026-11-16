/**
 * The single definition site for every tuned pointer/touch gesture threshold
 * in the UI (#12188). Two kinds of value live here: shared DEFAULTS
 * (`TAP_SLOP`, `AXIS_COMMIT_SLOP`, `DEFAULT_*`, the hold table) that every
 * surface gets unless it passes explicit options, and named PER-SURFACE
 * overrides (`COPY_HOLD_MS`, `SHEET_DETENT_OVERSHOOT_SCALE`) where a surface deliberately tunes away from
 * the default — centralized so each divergence is visible and documented
 * instead of drifting silently inside its hook.
 */

/** Movement (px) under which a release is treated as a tap, not a drag. Also the
 *  slop the pull-gesture and axis-commit checks share. */
export const TAP_SLOP = 8;

/** Movement (px) at which a gesture commits to a single (x or y) axis. */
export const AXIS_COMMIT_SLOP = 8;

/**
 * Fraction of the vertical travel the horizontal travel must reach to count as a
 * horizontal-dominant swipe (#10715). At 1.0 a swipe had to STRICTLY beat the
 * vertical (a 45° cone), which rejected clearly-horizontal swipes with moderate
 * vertical drift; 0.8 widens the cone to ~51° so a deliberate diagonal commits
 * while a mostly-vertical scroll/pull (horizontal well under 0.8× vertical) does
 * not.
 */
export const HORIZONTAL_DOMINANCE_RATIO = 0.8;

/** Default minimum vertical travel (px) to count as a pull. */
export const DEFAULT_PULL_DISTANCE = 56;
/** Default minimum vertical speed (px/ms) to count as a flick. */
export const DEFAULT_PULL_VELOCITY = 0.5;
/** Default minimum horizontal travel (px) to count as a swipe. */
export const DEFAULT_SWIPE_DISTANCE = 64;
/** Default minimum horizontal speed (px/ms) to count as a swipe flick. */
export const DEFAULT_SWIPE_VELOCITY = 0.4;

// ---------------------------------------------------------------------------
// Press-and-hold durations — the full long-press timer table.
// ---------------------------------------------------------------------------

/**
 * iOS-style long-press threshold: a still press held this long opens a menu,
 * enters edit mode or starts a selection (conversation items, launcher Home and
 * Apps drawer, Notes folder chips, Photos tiles).
 */
export const DEFAULT_HOLD_MS = 450;
/**
 * Per-surface override (chat thread copy-hold): a still hold on a message past
 * this copies its text. Deliberately kept at its shipped 420ms tuning, a touch
 * quicker than {@link DEFAULT_HOLD_MS}.
 */
export const COPY_HOLD_MS = 420;
/**
 * Per-surface override (launcher Home grid and Apps drawer): movement in CSS px
 * that turns a press into a scroll or a drag.
 */
export const LAUNCHER_PRESS_SLOP = 10;

// ---------------------------------------------------------------------------
// Overscroll damping.
// ---------------------------------------------------------------------------

/**
 * Linear resistance applied to travel past a rubber-band's soft cap (see
 * recognizers.rubberBand). Used by the pager's past-the-edge drag.
 */
export const OVERSHOOT_RESISTANCE = 0.35;
/**
 * Per-surface scale for the chat sheet's detent overscroll, which uses
 * square-root damping (recognizers.sqrtRubberBand) instead of the linear
 * {@link OVERSHOOT_RESISTANCE}: the sheet tracks a long over-drag with
 * progressively stiffer give rather than a constant fraction.
 */
export const SHEET_DETENT_OVERSHOOT_SCALE = 6;
