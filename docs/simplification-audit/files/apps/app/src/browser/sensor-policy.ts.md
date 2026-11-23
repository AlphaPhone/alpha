# apps/app/src/browser/sensor-policy.ts
- Lines: 22 | Role: sensor-enabled check and microphone lease tied to device preferences | Verdict: KEEP
- Importers: 5 (audio-capture, calendar-meeting, location, video-capture, workflow-trigger-runtime). Text/path pins: test/browser/device-storage-migration.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | A7 | `export type BrowserSensor` — no importer outside (git grep -w: 0). | Unexport. | None. |
| 2 | 13 | D11 | Product error copy "Turn it on in device controls." while location.ts product copy says "quick settings". | Use the product wording (quick settings); confirm with copy owner. | User-visible copy change — owner. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Unchanged apart from unexported type. Estimated lines after: 22 (current 22).

## Verification
browser-audio.spec.ts, dev-sensors.spec.ts.
