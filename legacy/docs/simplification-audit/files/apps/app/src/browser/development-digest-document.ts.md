# apps/app/src/browser/development-digest-document.ts
- Lines: 20 | Role: per-namespace development digest document (sources, loops, receipts, results, acks, delegation). | Verdict: SIMPLIFY (dev module)
- Importers: 2 (`development-digests.ts:4`, `runtime/connection-ui.tsx`). Text/path pins: `test/browser/dev-digest-delegation.spec.ts`, `dev-digest-live.spec.ts`, `dev-digest-schedule.spec.ts`, `digest-execution-migration.spec.ts` (A1), `digest-source-renewal.spec.ts`, `journey-d-digests.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15 | C3 | Namespace regex copy (also `development-agent-document.ts:12`, `development-execution-document.ts:10`) and `!browserDevProfile` guard. | `assertDevelopmentNamespace`. | None |
| 2 | 16 | A1 | Legacy `localStorage` reader. | Drop. | Low |
| 3 | 19 | B3 (P6) | `throwIfAborted → verify → assert → read → throwIfAborted → verify → assert`. | One verify at entry. | Low |
| 4 | 11-13 | B3 (P7) | 600-character `validateDevelopmentDigests` on own writes. | Delete (dev-only), or keep only the size caps if the specs assert them. | Low |
| 5 | 9 | A7 | `DevelopmentDigestState` exported, unused outside. | Drop export. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DevelopmentDigestLoop` | type | 8 | `OccurrenceLoop` (`development-digest-occurrence.ts:13`) overlaps | derive from `DigestLoop & OccurrenceLoop` |

## Proposed end state
~12 lines in `dev/`.

## Verification
`test/browser/journey-d-digests.spec.ts`, `dev-digest-*.spec.ts`.
