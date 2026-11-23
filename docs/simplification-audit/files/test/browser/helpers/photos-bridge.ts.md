# test/browser/helpers/photos-bridge.ts
- Lines: 47 | Kind: Playwright bridge fixture (AlphaPhotos/AlphaMailAttachments/ElizaSystem/DailyApps/notifications fake layered over a previous `Capacitor`) | Verdict: **MERGE** into `harness/plugins/photos.ts` on `harness/bridge.ts`
- Covers: permitted photo library with `full/partial/denied` scope, an owned favorite, library-changed events, photo bytes for mail attachment with SHA-256. Duplicates: bridge re-implementation (P6) in `flag-off-android.ts`, `delivery-fixture.ts`, etc.; sha256-hex helper (C3). Callers/importers: `native-video-library-change`, `permitted-photos`, `photo-email`, `photo-permitted-batch`, `photos-grid-density`, `photos-pending-read.production`, `shaw-ui-fixtures`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | D10 | Four positional parameters (`scope, openPhotos, authenticated, owned`), three booleans. | Options object. | none |
| 2 | 9-44 | P6 | Chains onto a previous `w.Capacitor`, filtering headers by name; unrelated plugins (`ElizaSystem`, `DailyApps`, notifications) answered here too. | Photos-only plugin module; shell plugins come from the harness defaults. | Low. |
| 3 | 28 | C3 | Inline SHA-256→hex. | Harness util. | none |
| 4 | 40 | D7 | `developmentBuild:true` from `DailyApps.surfaceInfo`. | Harness `build` option. | none |

## Proposed end state
`harness/plugins/photos.ts` with `{scope, owned, items}` and `emitLibraryChanged()`; `journeys/camera-photos.spec.ts` uses it.
