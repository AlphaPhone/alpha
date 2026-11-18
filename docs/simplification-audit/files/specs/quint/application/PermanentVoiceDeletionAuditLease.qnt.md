# specs/quint/application/PermanentVoiceDeletionAuditLease.qnt
- Lines: 124 | Kind: Quint model (live in manifest; no harness) | Verdict: MERGE into PermanentVoiceDeletion.qnt
- Covers: Same recovery plan and lease rules as PermanentVoiceDeletion, plus a live view's own row and loss of note ownership. Duplicates: specs/quint/application/PermanentVoiceDeletion.qnt (recoveryPlan, decisionRows, State, 10 of 12 actions and 3 of 4 invariants verbatim). Callers/importers: manifest row only (same 4 sources); no harness, no test (grep: only manifest.json)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-4 | P6/C5 | Self-described "complementary audit scope" twin; ~80 lines copied verbatim from PermanentVoiceDeletion. | Move the deltas into PermanentVoiceDeletion; delete this file and its row. | L |
| 2 | 44-53, 89-96 | - | Deltas worth carrying: `startOwn`, `loseOwnership`, `UnownedNeedsReview`, `safeErase` also requiring `owned and recordingKnown`, runs `liveOwnRowNotRecoveredTest`, `lostOwnershipReviewTest`, strengthened `decisionTableTest` foralls. | Carry these. | L |
| 3 | whole | B5 | Unbound to code: nothing replays it. | - | L |

## Proposed end state
File deleted; its unique transitions/invariants live in PermanentVoiceDeletion.qnt.
