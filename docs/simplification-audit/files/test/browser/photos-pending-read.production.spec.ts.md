# test/browser/photos-pending-read.production.spec.ts
- Lines: 68 | Kind: Playwright, production project (flag-off bundle); UI over `helpers/photos-bridge` with held/slow `AlphaPhotos.read` and a paged `list`/`thumbnails` fake | Verdict: MERGE into `journeys/camera-photos.spec.ts` (production half)
- Covers: the native viewer opens and stays open with immediate or delayed reads; a store change during a pending read keeps the viewer; deep paging by scroll loads 24-row pages to 384, a catalog event keeps the deep window, and scrolling back reloads evicted thumbnails in batches of ≤24. Duplicates: `photo-order.spec.ts` (browser-store paging), `photos-grid-density.spec.ts`. Callers: production project only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16, 27, 29, 58, 61 | T8 | Fixed sleeps of 700, 300, 300, 180, 180 ms to show "stays open" / let events settle. | Wait on the held read's release and the next render (`settled()`); assert viewer still visible after that. | Low. |
| 2 | 5, 22, 52 | C3 | "Not now" prompt dismissal written three ways. | One harness helper. | None. |
| 3 | 7-31 | T4 | Delayed-read and held-read-with-store-change both prove the viewer survives a slow read. | One case: hold the read, emit a store change, release; viewer stays. | None. |
| 4 | 26 | A8 | "FixPatch:" comment label. | Plain sentence. | None. |
| 5 | 57 | T7 | 15 sequential scroll-and-wait steps to reach 384. | Fine; or reduce rows to 120 to make the eviction window kick in sooner if the window size allows. | Low. |

## Proposed end state
Two production cases in `journeys/camera-photos.spec.ts`: (1) viewer survives a held read and a store change, no page errors; (2) deep paging to the window limit, a catalog event keeps it, scrolling back reloads evicted thumbnails in ≤24-id batches. No fixed sleeps.
