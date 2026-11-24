# apps/app/src/runtime/owner-reminder-notification-protocol.ts
- Lines: 53 | Role: owner-reminder notification wire boundary: routes, strict parser of `/api/notifications` responses, row digest. | Verdict: SIMPLIFY
- Importers: `runtime/connection-ui.tsx:11`, `runtime/owner-reminder-notification-port.ts:3`.
- Text/path pins: `specs/quint/application/manifest.json`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 8 | C3 | UUID pattern defined at L5 and written out again inline at L8. | Use `uuid.source` (or `isUuid`) in L8. | None |
| 2 | 24 | C3 | `record()` plain-object guard. | `asRecord`. | None |
| 3 | 28 | C3 | `canonical()` JSON (sorted keys) — twin of upstream canonical encoders (`workflowBytes`). | Shared `canonicalJson` in `lib/`. | Low (digest must stay byte-identical) |
| 4 | 29 | C3 | SHA-256→hex copy. | `sha256Hex(canonical(value))`. | None |
| 5 | 39-40, 47 | D8/D9 | 15-condition `if` lines. | Split into named field checks (`optionalText(row.body,4096)` etc.). | Low |
| 6 | 4, 10, 29 | A7 | `OWNER_REMINDER_BYTES`, `ReminderOwner`, `reminderDigest` exported, 0 external users. | Unexport. | None |
| 7 | — | B3 | Validation is at the network boundary: correct place; keep strictness. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `uuid` | const | 5 | `remote-protocol.ts:316`, `resident-recovery.ts:33`, `power-launch-state.ts:9` | `lib/ids.ts` `isUuid` |
| `record` | helper | 24 | ~35 copies | `lib/records.ts` |
| `canonical` | helper | 28 | upstream `workflowBytes` | `lib/json.ts` |
| `reminderDigest` | helper | 29 | sha256 copies | `lib/hash.ts` |

## Proposed end state
~45 lines, shared helpers, readable validators, three internal-only exports removed.

## Verification
Owner-reminder Quint refinements (via the port), connection-ui route admission tests.
