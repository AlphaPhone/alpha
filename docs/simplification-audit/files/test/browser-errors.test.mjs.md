# test/browser-errors.test.mjs
- Lines: 19 | Kind: unit (T3; imports real `apps/app/src/browser/browser-errors.ts`) | Verdict: DELETE
- Covers: `browserErrorMessage` maps a Capacitor Unimplemented exception to "Unavailable", the isolated-profile refusal to "Update WebView", passes other messages through. Duplicates: `test/browser/browser-profile-unsupported.production.spec.ts` (shows "Update WebView" through the UI). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-12 | T1-like | Asserts three literal messages pass through unchanged: a copy pin, not behaviour. | Delete. | none |
| 2 | 6-9, 16-18 | T3 | Exception classification; only reachable on Android when a plugin is missing, which a shipped APK cannot do (B2 in product: phantom "unimplemented" handling). | Delete test; flag product branch for B2 review. | low |

## Proposed end state
Delete. The one user-visible mapping ("Update WebView") stays covered by `browser-profile-unsupported.production.spec.ts`; fold that spec into `journeys/browser.spec.ts` (production project) when the journey is built.
