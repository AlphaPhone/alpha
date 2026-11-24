# apps/app/src/runtime/automation-completion.ts
- Lines: 11 | Role: true when a reply's effect receipts durably changed a record kind the Automations list shows; exports the window event name | Verdict: MERGE into `apps/app/src/runtime/app-record-completion.ts`
- Importers: prototype/automations-adapter.ts (`AUTOMATIONS_COMMITTED_EVENT`), runtime/connection-ui.tsx. Text/path pins: `test/automation-completion.test.mjs`, `test/automations-unified.test.mjs:73` (literal event string), `scripts/test-connection-history.ts`, feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-11 | C5 | Same receipt walk as app-record-completion.ts:23-53 (`normalizeEffectReceipts` in try/catch, `outcome==='applied'&&commit.kind==='durable'`). | One shared walk returning all three invalidations. | Low. |
| 2 | 8 | note | Unlike app-record-completion, this requires `result.success===true`. | Preserve per-domain rule in the merged function. | Low. |
| 3 | 9 | B1 (keep) | `catch{return false;}` — hint only. | Keep. | — |
| 4 | 9 | B4 | `(AUTOMATION_RESOURCE_KINDS as readonly string[]).includes(...)` cast. | Use a `Set<string>`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `AUTOMATIONS_COMMITTED_EVENT` | const | 3 | literal in test/automations-unified.test.mjs:73 | merged module |

## Proposed end state
File removed; constant and predicate live in the merged `effect-invalidations` module (see app-record-completion report).

## Verification
`test/automation-completion.test.mjs`, `test/automations-unified.test.mjs`, automations Playwright refresh.
