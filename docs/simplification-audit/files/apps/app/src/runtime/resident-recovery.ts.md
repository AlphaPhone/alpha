# apps/app/src/runtime/resident-recovery.ts
- Lines: 74 | Role: resident-agent startup refusal reasons and copy, recovery review/archive parsers, boot-loss predicate and a rate-limited liveness check. | Verdict: KEEP (minor)
- Importers: `runtime/connection-ui.tsx:15`, `runtime/local-agent.ts:6`, `prototype/settings-adapter.ts:3`, `scripts/test-connection-history.ts:5`.
- Text/path pins: `LemmaScript-files.txt:20` (`//@ verify` / `//@ ensures` on `residentBootStateLost`, L44-48), Quint `specs/quint/refinement/application/resident-liveness.mjs:6,12`, application/native manifests; tests `resident-recovery`, `recovery-restart-presentation`, `notice-owner-startup`, `connection-background-restore`; `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-23 | C6 | `residentRecoveryMessage` and `residentRecoveryCopy` return the same strings for the same reasons ('Restart needed', 'Startup check failed'); differ only in the default ('Couldn’t start' vs 'Restart phone') and view steps. `RESIDENT_RECOVERY_PENDING` repeats 'Couldn’t start'. | One `const REASON_COPY:Record<ResidentRecoveryReason,string>` used by both. Keep strings exactly. | Low |
| 2 | 33 | C3 | lowercase UUID regex. | `isUuid` (lowercase). | None |
| 3 | 71 | B1 | `catch{return;}` — a failed liveness read reports "not lost". Specified by rate-limited design? | Add a comment, or report to crash log. | Low |
| 4 | 25-27, 42, 50 | A7 | `RecoveryReview`, `RecoveryArchive`, `ResidentBootStatus`, `residentBootLost` exported, 0 external users (`residentBootLost` is used internally). | Unexport. | None |
| 5 | 44-48 | — | `residentBootStateLost` exists for the LemmaScript proof; do not inline. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `count` | helper | 28 | — | keep |
| UUID regex | const | 33 | 5 copies | `lib/ids.ts` |

## Proposed end state
~65 lines; one copy table, shared UUID check, unexported internals; LemmaScript block unchanged.

## Verification
`test/resident-recovery.test.mjs`, `test/recovery-restart-presentation.test.mjs`, Quint `resident-liveness`, LemmaScript run.
