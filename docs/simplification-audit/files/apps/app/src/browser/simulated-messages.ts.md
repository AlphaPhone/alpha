# apps/app/src/browser/simulated-messages.ts
- Lines: 44 | Role: dev: local Messages attachments/drafts overrides | Verdict: MOVE to apps/app/src/dev/
- Importers: 1 (simulated-apps.ts). Text/path pins: specs/quint/application/manifest.json; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | D5/B4 | Inner `if(!devSurfacesEnabled)return ()=>{}`. | Delete. | None. |
| 2 | 5-6 | C1/C2 | Bag + `registerPlugin<any>`. | Shared types. | None. |
| 3 | 12-13, 43 | C4 | Retire listeners (pagehide, device-state, visibilitychange). | Shared onRetire. | None. |
| 4 | 33 | C3 | Message ordering key `k` computation duplicated in incoming-simulation.ts:29. | Shared `nextMessageKey(threads,now)`. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| k computation | helper | 33 | incoming-simulation.ts:29 | dev/simulated-messages |

## Proposed end state
Dev module, no inner gate, shared helpers. Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 40 (current 44).

## Verification
image-sms / dev messages specs.
