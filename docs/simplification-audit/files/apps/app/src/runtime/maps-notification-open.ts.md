# apps/app/src/runtime/maps-notification-open.ts
- Lines: 25 | Role: pulls a pending "open Maps" notification intent only when the shell can show Maps, with epoch/revision fencing so a cancel or newer request wins. | Verdict: KEEP
- Importers: 1 (`prototype/maps-adapter.ts`). Text/path pins: `scripts/test-maps-reroute-freshness.ts:5`, refinement `map-plane-ownership.mjs:20`, `maps-event-return.mjs:11`, `test/maps-notification-open.test.mjs:7`, `test/support/feature-parity.mjs:41,555`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16, 22 | B1 | `catch { … requested = true; }` (specified retry) and `port.clear().catch(() => {})` (best-effort). | Keep. | — |
| 2 | 8-17 | C3 | Single-flight + re-request idiom; twin of `hostedTapResolver` (hosted-notice-question.ts:40). | Keep local; the epoch/revision semantics are richer than the twin. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| port type (inline) | type | 2-7 | — | local |

## Proposed end state
Unchanged (~25 lines). Small, formally referenced, single purpose.

## Verification
Quint `map-plane-ownership` refinement, Maps notification Playwright/Android journey.
