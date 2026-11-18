# apps/app/src/browser/photo-filter.ts
- Lines: 22 | Role: pixel fallback for CSS colour filters on canvases | Verdict: KEEP
- Importers: 1 (prototype/browser-camera.ts). Text/path pins: test/browser-camera-storage.test.mjs, test/browser/photo-filter-fallback.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | C1 | Local `Transform` type — fine. | Keep. | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Unchanged (could move to prototype/camera with browser-camera). Estimated lines after: 22 (current 22).

## Verification
photo-filter-fallback.spec.ts.
