# apps/app/src/browser/display.ts
- Lines: 15 | Role: scales pixel font sizes and applies brightness filter for browser text-scale/brightness settings | Verdict: KEEP
- Importers: 1 (device.ts). Text/path pins: specs/quint/application/manifest.json, specs/quint/refinement/application/cloud-connection-notices.mjs (page import), test/browser/large-text-overlap.spec.ts, notifications-handle.spec.ts, accessibility-states.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | B1 | `catch{/* Cross-origin sheets ... */}` — specified fallback with comment. | Keep. | - |
| 2 | 2-11 | D8 | Dense one-line lambdas. | Formatter only. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Unchanged apart from formatting. Estimated lines after: 15 (current 15).

## Verification
large-text-overlap.spec.ts, cloud-connection-notices Quint harness.
