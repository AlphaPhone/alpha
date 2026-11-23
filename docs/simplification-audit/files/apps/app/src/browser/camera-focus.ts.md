# apps/app/src/browser/camera-focus.ts
- Lines: 47 | Role: tap-to-focus reticle and serialized `applyConstraints` writes per track, with a local fallback state when no lens driver exists. | Verdict: KEEP
- Importers: 2 (`prototype/browser-camera.ts`, `prototype/camera-adapter.ts`). Text/path pins: `specs/quint/application/manifest.json:7542-7562` (symbols `BrowserCameraFocus`, `cameraFocusTarget`, `applyConstraints`, `writes`, `epoch`), `specs/quint/refinement/application/camera-focus-writes.mjs`, `test/quint-camera-focus-writes.test.mjs`, `test/browser-camera-storage.test.mjs`, `test/camera-preview-recovery.test.mjs`, `test/browser/dev-camera-focus.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19, 44-45 | D5 | `development` option changes the aria-label to 'Development focus target' and adds an animation — dev copy inside a product module. | Pass the label/animation from the dev caller, or keep and confirm the string is absent from the production bundle audit. | Low |
| 2 | 38 | B1 | `catch{if(!alive())return;}` — falling back to a local target when the driver refuses is the documented behaviour (lines 42-43). | Keep. | — |
| 3 | 6 | D12 | Inline reticle `style.cssText`. | CSS class (keep `left/top` inline). | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Point` | type | 1 | point types in `prototype/browser-camera.ts` | keep |
| `FocusSettings` | type | 2 | none | keep |

## Proposed end state
Unchanged logic (manifest pins symbol names); styles to CSS. Do not rename `writes`/`epoch`.

## Verification
`test/quint-camera-focus-writes.test.mjs`, Quint `camera-focus-writes`, `test/browser/dev-camera-focus.spec.ts`.
