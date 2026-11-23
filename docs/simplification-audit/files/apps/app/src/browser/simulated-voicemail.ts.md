# apps/app/src/browser/simulated-voicemail.ts
- Lines: 31 | Role: dev: reads seed voicemail transcripts with local speech | Verdict: MOVE to apps/app/src/dev/
- Importers: 1 (simulated-apps.ts). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | D5/B4 | Inner devSurfacesEnabled guard. | Delete. | None. |
| 2 | 28-30 | C4 | Retire listeners. | Shared onRetire. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Dev module. Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 28 (current 31).

## Verification
dev phone specs.
