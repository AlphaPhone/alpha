# apps/app/src/runtime/service-read-cache.ts
- Lines: 39 | Role: bounded (24 entries, 4 MiB, 30 days) offline snapshot cache over a CAS store, serialised and epoch-fenced. | Verdict: KEEP (minor)
- Importers: `prototype/inbox-cloud-adapter.ts:4`, `runtime/agent-calendar.ts:4`, `runtime/service-read-cache-store.ts:4`, `scripts/test-inbox-cloud-flow.ts:5`.
- Text/path pins: Quint `specs/quint/refinement/services/cache.mjs:2,8`, `specs/quint/refinement/application/saved-service-read.mjs:13`, `specs/quint/services/manifest.json`; tests `service-read-cache`, `inbox-operation-guards`, `native-secure-slots`, `agent-calendar-refresh-state`; `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38 | C3 | `enqueue` serial queue, twin of `native-connection.ts:168,237`. | `serialQueue()` in `lib/`. | Low |
| 2 | 37 | B1 | `clear()` gives up silently after 3 CAS conflicts (resolves without clearing). Sign-out relies on clearing cached mail. | Throw after the third conflict, or document why a lost clear is acceptable (epoch already hides entries in this process). | Low |
| 3 | 8-9 | D8 | manual field assignment instead of parameter properties. | `constructor(private readonly owner:string, …)`. | None |
| 4 | 22 | — | oversized put silently skipped: specified by the bound; keep. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ReadCacheStore` | interface | 2 | slot CAS adapters | `runtime/durable-slot.ts` type |
| `enqueue` | helper | 38 | `native-connection.ts` `serialSlot`/`serial` | `lib/serial-queue.ts` |

## Proposed end state
~36 lines, unchanged behaviour, shared queue.

## Verification
`test/service-read-cache.test.mjs`, Quint `cache.mjs`, `saved-service-read.mjs`, `scripts/test-inbox-cloud-flow.ts`.
