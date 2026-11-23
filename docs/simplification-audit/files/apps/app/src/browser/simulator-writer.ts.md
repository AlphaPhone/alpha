# apps/app/src/browser/simulator-writer.ts
- Lines: 38 | Role: dev: Web-Locks writer lease for synchronous simulator localStorage writes | Verdict: MOVE to apps/app/src/dev/
- Importers: 1 (simulated-apps.ts). Text/path pins: test/browser/simulator-concurrency.spec.ts, simulator-recovery.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 18 | D5/B2 | `!devSurfacesEnabled\|\|!navigator.locks?.request` — dev gate plus Web Locks probe. | Drop the dev gate; keep the Locks probe only if dev browsers lack it (they do not). | Low. |
| 2 | 27, 33 | B3 | Read-back after `localStorage.setItem/removeItem`. | Delete read-backs. | Low. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Dev module, no gate, no read-back. Estimated lines after: 32 (current 38).

## Verification
simulator-concurrency.spec.ts, simulator-recovery.spec.ts.
