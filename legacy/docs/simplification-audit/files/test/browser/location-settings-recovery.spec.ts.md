# test/browser/location-settings-recovery.spec.ts
- Lines: 42 | Kind: Playwright spec, `chromium` + `firefox`/`webkit` (listed in `scripts/storage-specs.ts:20`), 8 tests; drives the development "Device controls → Location" dialog (`/?mode=dev&tools=1`), patches `Storage.prototype.setItem` and `SavedPlaces.prototype.read` in-page | Verdict: DELETE
- Covers: the dev location simulator's recovery when its `alpha.dev.location.v1` bytes are unreadable: download the exact bytes, confirmed replacement, stale cross-tab write refused, quota failure keeps bytes, leaving cancels, invalid coordinates refused, unavailable saved places keep Home/Work ids. Duplicates: none. Callers/importers: `scripts/storage-specs.ts` (runs it in three browsers).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-42 | D6 | Everything tested is a development simulator's own storage hygiene; no product build reaches it. Running it in Firefox and WebKit triples the cost. | Delete; remove the entry from `scripts/storage-specs.ts`. | Low. |
| 2 | 10-11 | A3-ish | "Download location settings backup" is a recovery download in a dev tool. | Owner/implementer: simplify the dev location dialog to "reset unreadable settings" when its recovery code is next touched. | Low. |
| 3 | 25, 38 | T6 | Monkey-patches `Storage.prototype.setItem` and `SavedPlaces.prototype.read`. | Gone. | - |

## Proposed end state
File deleted and dropped from `storage-specs.ts`. Location-dependent product behaviour (Maps origin, saved places) is covered in `journeys/maps.spec.ts` through the ElizaLocation bridge stub.
