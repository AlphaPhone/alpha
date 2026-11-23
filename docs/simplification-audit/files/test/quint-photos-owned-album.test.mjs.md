# test/quint-photos-owned-album.test.mjs
- Lines: 54 | Kind: Quint wrapper (application index) + three scenarios on the compiled Photos fixture (`createOwnedAlbumFixture` over `compilePhotosWindow`) | Verdict: DELETE (fold the three scenarios into the driver)
- Covers: a retained Save/name/close control of a closed or confirming album dialog cannot act on the replacement dialog; rendered album controls refine scoped mutation admission (10 traces). Duplicates: application index runs `checkPhotosOwnedAlbumDialog`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 48-54 | T4 | Aggregate duplicate. | Delete. | None |
| 2 | 11-46 | — | Three concrete stale-control regressions on the real compiled `camera-adapter.ts`; the aggregate does not run them. | Add them as named sequences in `checkPhotosOwnedAlbumDialog`, or as steps of `journeys/camera-photos.spec.ts`. | Low |

## Proposed end state
Deleted; the scenarios run inside the driver campaign.
