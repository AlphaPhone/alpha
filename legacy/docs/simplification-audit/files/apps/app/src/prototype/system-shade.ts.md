# apps/app/src/prototype/system-shade.ts
- Lines: 133 | Role: Binds the shared `@elizaos/capacitor-system/shade` policy to Alpha (copy, Home selector), keeps Home's `data-alpha-home-fits` mark current, installs the overflow pull while Home shows, and asks Android to expand its shade with a 5 s bound. | Verdict: SIMPLIFY
- Importers: `apps/app/src/main.tsx:48` (`installSystemShade`, `shadeSurface`), `apps/app/src/prototype/model.js:20` (`emptyHomeShadePull`, `pullStart`, `shadeFallback`). Text/path pins: `test/system-shade.test.mjs` (12 `assert.match`/`doesNotMatch` on source, incl. `export const ALPHA_SHADE_COPY = defaultShadeFallbackCopy('Alpha');` and `home: '[data-alpha-layer="home"]'`), `test/system-shade-timeout.test.mjs` (slices from `/** Reads what a pull started on.`, `export const SHADE_REQUEST_TIMEOUT`, `  p.expandAndroidShade = async function () {`, strips types and runs the fragment — T2), `test/quint-shade-pull.test.mjs`, `test/gesture-zones-single-instance.test.mjs`, `specs/quint/application/manifest.json` (10 refs; pins `installSystemShade`, `expandAndroidShade`, `alphaShadeAsking`, `shadePortWithin`, `SHADE_REQUEST_TIMEOUT`, `alphaOverflowPull`, `installOverflowPull`), `SystemShadeInstrumentedTest.java`, `scripts/test-canonical-notification-navigation.ts` (uses `shadeSurface`), `test/support/feature-parity.mjs:429`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30-31 | A7 / D4 | Re-exports `overflowPullDecision`, `PULL_SLOP`, `STATUS_BAND` and types `PullContext`, `PullStart`, `ShadeSurface`: 0 importers through this module (`test/system-shade.test.mjs` imports the shared module directly). `emptyHomeShadePull`/`shadeSurface` are used (model.js, main.tsx) but are pure upstream re-exports. | Delete the unused re-exports; have `model.js` and `main.tsx` import `emptyHomeShadePull`/`shadeSurface` from `@elizaos/capacitor-system/shade` directly. | Low (`system-shade.test.mjs` asserts only that the policy is *not* copied here). |
| 2 | 87 | C6 | `document.querySelector('[data-alpha-layer="home"]')` repeats `HOME.home` from L35. | Use `HOME.home`. | None |
| 3 | 93, 100, 116, 121 | B2 | `typeof ResizeObserver !== 'undefined'` with a fallback branch, `document.fonts?.addEventListener` — WebView and every supported browser have both. | Use them directly; delete the `else markHomeFits()` fallback. | Low (Node tests do not run this path) |
| 4 | 79, 114, 120-121 | B2 | `mount?.call`, `update?.apply`, `unmount?.call` on base methods that always exist. | Call directly. | Low |
| 5 | 75 | C2 | `registerPlugin<{ openNotificationShade(): Promise<{ status?: string }> }>('AlphaDevice')` — 18th inline AlphaDevice typing. | Import the shared typed AlphaDevice module. | Low |
| 6 | 82-112, 113-121 | D3 | Seven ad-hoc shell fields (`alphaHomeFitFrame`, `alphaHomeWatched`, `alphaHomeLayoutWatched`, `alphaHomeClearanceWatched`, `alphaHomeObserver`, `alphaOverflowPull`, `alphaHomeFits`) + `alphaShadeAsking`. | One `homeFit` state object per shell (WeakMap); keep `alphaOverflowPull`/`alphaShadeAsking` names until the Quint pins move. | Low |
| 7 | 38, 60 | D4 | `shadeFallback(outcome)` and `pullStart(target)` are one-line bindings of shared functions to Alpha constants — this is the file's legitimate job. | Keep. | — |
| 8 | 14-26 | A8 | Comment cites "issues #416 and #417". | Keep the policy text, drop the issue numbers. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ALPHA_SHADE_COPY` | const | 34 | — | stays |
| `HOME` selectors | const | 35 | literal `'[data-alpha-layer="home"]'` at L87 and elsewhere in model.js/CSS | stays; reuse |
| `SHADE_REQUEST_TIMEOUT`, `shadePortWithin` | const/helper | 41-57 | generic promise-timeout race (C3 "abort/timeout race" family) | stays (Quint-pinned) |
| `device` plugin typing | const | 75 | AlphaDevice ×18 | `native/alpha-device.ts` |
| `markHomeFits` | helper | 68-73 | — (exported, 0 external importers; `phone.css:69` comment only) | drop `export` |

## Proposed end state
~115 lines: Alpha copy + Home selector + `shadeFallback`/`pullStart` bindings, `shadePortWithin`, Home-fit observation without capability fallbacks, and `installSystemShade`. Upstream policy symbols imported where used, not re-exported.

## Verification
`test/system-shade.test.mjs`, `test/system-shade-timeout.test.mjs` (source slices — markers must stay or the test must import the module), `test/quint-shade-pull.test.mjs`, `test/gesture-zones-single-instance.test.mjs`, Quint application manifest; `SystemShadeInstrumentedTest` on an emulator for the Android request (separate evidence).
