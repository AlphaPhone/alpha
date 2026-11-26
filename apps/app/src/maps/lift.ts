// spec/app/maps/credits.md, "The camera goes to what the owner picked, on every map"

/** Where the search field ends: 8px down and 52px high, or on the launcher 52px down and 54px high (MapsSearchBar, `top-2`/`top-13`). */
const fieldBottom = (launcher: boolean) => (launcher ? 106 : 60);

/**
 * Where a place's pin stands above the centre, given the credits' `bottom`: in the middle of the map left between 60px
 * under the search field and the credits, as v119 measured its header (maps/map-plane.ts:770-776, top = header.bottom + 60,
 * so 166 on the launcher) and offset the place (:586-593), not from MapPlane's 100px no-header fallback.
 */
export const liftOver = (bottom: number, launcher: boolean) => Math.max(0, (bottom + 46 - (fieldBottom(launcher) + 60)) / 2);
