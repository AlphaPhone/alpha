# apps/app/src/runtime/service-read-cache-store.ts
- Lines: 42 | Role: opens a `ServiceReadCache` per verified account (and per mail service) over an Android slot or browser document named by SHA-256 of the identity; retires old shared mail entries. | Verdict: SIMPLIFY
- Importers: `prototype/agent-calendar-adapter.ts:12`, `prototype/inbox-cloud-adapter.ts:3`.
- Text/path pins: Quint `specs/quint/refinement/services/service-read-cache-replay.mjs:18` (loads this path with replacements), `specs/quint/services/manifest.json`; tests `inbox-operation-guards`, `native-secure-slots` (reads text); browser specs `gmail-mvp-scope`, `home-inbox`; `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-9, 23-27, 28, 38-40 | A1 | `sharedMailKeys`/`retireSharedMail` erase mail snapshots "the account document held before mail had its own document", started on every first mail open per app start. | Delete (~10 lines) after owner confirms no shipped build wrote `gmail:mailbox`/`gmail:home` into the account document. | Medium |
| 2 | 18 | C3 | SHA-256→hex copy. | `sha256Hex(identity)`. Slot name `connected-read-cache:v1:<hash>` unchanged. | None |
| 3 | 19-21 | C4/P3 | another CAS adapter; the browser branch emulates CAS with `editJson` + JSON compare. | Build on `durableSlot` (`compareExchange`). | Medium (installed names) |
| 4 | 19 | P8 | `Capacitor.isNativePlatform()` here vs `getPlatform()==='android'` in the sibling stores. | `isAndroid`. | None |
| 5 | 31 | B3 | owner field validation on a typed, verified account. Cheap; keep only the empty check. | Trim. | Low |
| 6 | 7, 9 | A7 | `ReadCacheService` (test-only), `sharedMailKeys` (0/0). | Unexport / delete with #1. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ReadCacheOwner` | type | 5 | Cloud account identity tuple in `cloud-protocol.ts` (check) | keep |
| `platformStore` | helper | 17-22 | `reminder-journal-store.ts` and 4 other slot adapters | `runtime/durable-slot.ts` |

## Proposed end state
~25 lines: `readCacheIdentity`, `serviceReadCache` with an `opened` map, durable slot store; no retirement pass.

## Verification
Quint `service-read-cache-replay`, `test/inbox-operation-guards.test.mjs`, `test/native-secure-slots.test.mjs`, browser specs `gmail-mvp-scope`, `home-inbox`; Android update-retention for the cache slot prefix.
