# specs/quint/refinement/services/gmail-agent-mailbox-recovery.mjs
- Lines: 37 | Kind: Quint refinement runner (spawns probe, maps `s.durable` to a Quint map, calls `checkTraces`) | Verdict: KEEP, SIMPLIFY
- Covers: runner for `GmailAgentMailboxRecovery.qnt`. Duplicates: runner shape of `development-digest-pending.mjs` (C5). Callers: `services/index.mjs`, `test/quint-gmail-agent-mailbox-recovery.test.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-20 | B5 | esbuild metafile pass + `serviceInputs` (which also re-runs `prepareClientFeatures({check:true})` and digests every staged file) only to build a hash list. | Drop once receipts go; keep `prepareClientFeatures` check in the lane's setup step instead. | Low |
| 2 | 21-27 | C5 | Same spawn/assert/parse block as the digest runner. | Shared `runProbe`. | Low |
| 3 | — | T4 | Aggregate + own test. | Own test only. | Low |

## Proposed end state
~12 lines: `runProbe`, map `s.durable`, `checkTraces`.
