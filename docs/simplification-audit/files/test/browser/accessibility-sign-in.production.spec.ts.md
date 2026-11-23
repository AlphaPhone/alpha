# test/browser/accessibility-sign-in.production.spec.ts
- Lines: 148 | Kind: Playwright journey on the `production` project (flag-off bundle, synthetic Android bridge, network fenced), 6 tests | Verdict: **MERGE** into `journeys/connection-cloud.spec.ts` (production project)
- Covers: on a signed-out production phone, the Eliza Cloud sign-in page (P-43) is accessible at 100% and 200% text, in portrait and landscape. Nothing behind it is exposed, every control can be scrolled into view, it clears native inset bars, and the Cloud chooser stays usable after the resident agent fails to start. Duplicates: none in this chunk. `production-surface.spec.ts` covers production gating, not the sign-in page. The Android counterpart is `AccessibilityInstrumentedTest.requiredCloudSignInAtDoubleFontScale`. Importers: none. It imports `flag-off-android`, `resident-stub` and `accessibility-audit`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | C3 | A local `blocking()` re-implements the exported `blocking` from `accessibility-audit.ts` and drops the `appTitle` exception. | Import it. | none |
| 2 | 21-39 | C3 / T8 | `zoomText` is a second text-zoom emulation, separate from `setTextScale` (`accessibility-states.ts:224`). It exists because production cannot import `/src/browser/display.ts`. It ends with `waitForTimeout(400)`. | Move it to `harness/text-scale.ts` as the production variant. Replace the sleep with the poll already on line 100 (`--alpha-text-scale` equals the scale) and `settled(page)`. | Low |
| 3 | 50 | T8 | `waitForTimeout(300)` after `fonts.ready`. | Replace with `settled(page)`. | Low |
| 4 | 54-64 | – | "Cloud chooser usable after resident start fails" is a connection behaviour test, not an accessibility one. | Move it next to the other resident-start cases in `journeys/connection-cloud.spec.ts`. | none |
| 5 | 130-148 | T6-lite | The native-inset test injects CSS variables and a fake `.alpha-connection-scrim` element, then reads computed padding. This is a CSS rule check, not a journey. | Keep it as one assertion inside the sign-in journey (set the insets through the bridge fixture, which is how the launcher delivers them), or delete it if the launcher sign-in is covered on the emulator. | Low |
| 6 | 12 | – | `StubAccount` uses a synthetic `example.invalid` address and no real credential. This complies with AGENTS.md. | Keep. | none |

## Proposed end state
In `journeys/connection-cloud.spec.ts` (production project), one `describe('signed-out sign-in page')` holds: an accessibility
test parametrised over `[{scale:1},{scale:2}] × [portrait, landscape]`, which collapses the four tests into a loop sharing one
`signedOut()` fixture; the resident-failure case; and the inset assertion. It uses the shared `blocking` and the production
text-scale helper. The fixed sleeps are gone.
