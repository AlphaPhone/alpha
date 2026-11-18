# test/browser/managed-maps-unavailable.production.spec.ts
- Lines: 46 | Kind: Playwright production journey, project `production` (skips elsewhere), 6 tests (3 refusals x 2 orientations), no `/src` imports | Verdict: **MERGE** into `journeys/maps.spec.ts` (production block)
- Covers: Maps search under managed-Cloud refusals (503 not configured, 403 subscription, 401 unauthorized) shows the matching recovery text, never offers "Connect a Maps provider", never requests places/routes, and retries capabilities on a new search. Duplicates: none for the refusal mapping. Callers/importers: none; imports `flag-off-android.ts`, `resident-stub.ts`, `helpers/settled.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-10 | T4 / T7 | The orientation loop doubles the matrix; nothing in the assertions depends on orientation (only the screenshot does). | Run the three refusals in portrait; keep one landscape screenshot in the a11y/layout sweep if wanted. 6 tests become 3 (or one parameterised test). | none |
| 2 | 40-42 | B5 | Injects a "UI FIXTURE" badge into the DOM and writes a screenshot no test or script reads. | Drop the badge and the screenshot, or use Playwright's trace on failure. | none |
| 3 | 19, 22 | C3 | The `ElizaSense` header push and its fixed "Listening off" answer are copied verbatim in `maps-legacy-provenance.production.spec.ts`. | Make it a default of `residentStub` / the shared bridge. | none |
| 4 | 35 | T6 (minor) | Reads `data-map-diagnostics` JSON from the Maps root to assert the internal diagnostic code. | Keep only if the diagnostics attribute is a supported contract; otherwise assert the visible status only. | Low |

## Proposed end state
One parameterised "managed Maps refusal" test (three cases) in the production block of `journeys/maps.spec.ts`, using
`flagOffAndroid` + `residentStub` with the `ElizaSense` default moved into the stub. No badge, no unread screenshots,
no orientation loop.
