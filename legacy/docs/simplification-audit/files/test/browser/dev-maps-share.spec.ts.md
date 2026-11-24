# test/browser/dev-maps-share.spec.ts
- Lines: 15 (3 tests + 4 loop arms = 7) | Kind: Playwright `chromium`, dev build; UI journeys with `navigator.share`/`clipboard` stubbed in an init script | Verdict: **MERGE** into `journeys/maps.spec.ts` (1 case)
- Covers: Maps Share opens the common share panel; Copy link writes the exact OpenStreetMap link only on explicit choice; a cancelled external share never writes the clipboard; an unavailable share says so and never falls back to copying; the panel retires on `pagehide`, Home, device state change and an incoming call. Duplicates: `maps-share-layout.spec.ts` (layout of the same panel). Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-12 | — | Three real journeys at a real boundary (Web Share and Clipboard APIs). | Carry as steps of one "share a place" case. | none |
| 2 | 13-15 | T6 | Four arms dispatch synthetic window events. | Keep one arm (Home via the harness navigation); drop the other three. | Low |
| 3 | 2 | C3 | `pin()` boots the app inside each test after the `beforeEach` init script. | Harness boot plus a maps nav helper. | none |

## Proposed end state
One "share a place" case in the maps journey: drop a pin, Share shows Email/Share/Copy link without copying, Copy link writes the exact URL, a cancelled share writes nothing, an unavailable share shows the alert, Home closes the panel. Delete the file.
