# specs/quint/application/PermanentVoiceDeletion.qnt
- Lines: 92 | Kind: Quint model + Contract module (live; decision-table harness) | Verdict: KEEP (absorb AuditLease) + PORT import
- Covers: Recovery planning for an interrupted permanent voice-note deletion (240-row decision table) and lease/ownership rules so recovery never erases unowned or referenced audio. Duplicates: specs/quint/application/PermanentVoiceDeletionAuditLease.qnt is a strict superset (same recoveryPlan/decisionRows copied verbatim, plus startOwn/loseOwnership). Callers/importers: manifest row (runtime/permanent-voice-deletion.ts, note-audio-deletions.ts, note-audio-lock.ts, android NotesDeletionLease.java); harness specs/quint/refinement/application/portable.mjs `permanentVoiceDeletion` (bundles the runtime module, enumerates the 240 rows) and test/quint-conformance.test.mjs:130-141 (same table again); index.mjs maps receipt model PermanentVoiceDeletionContract→PermanentVoiceDeletion (index.mjs:162)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-15 | D4 | `planInterruptedPermanentDeletion` in runtime/permanent-voice-deletion.ts is a re-export of upstream `.eliza/.../plugin-notes/src/client/notes-recording-effects.ts`; product reaches it only through `createNotesRecordingEffects().reconcile` in voice-adapter.ts:938-998. | Harness imports the upstream module directly; drop the re-export once no product importer remains (only tests use it today). | L |
| 2 | harness | T4 | The 240-row table is checked twice: portable.mjs and test/quint-conformance.test.mjs:130-141. | Keep one (portable.mjs). | L |
| 3 | whole | A1? | Product caller `restoreDeletion`/`refreshDeletionStatus` in voice-adapter.ts reads legacy Notes Trash (`readNotesTrash`); C1 deletes the legacy voice-note deletion path. If C1 removes every caller of `reconcile`, this models upstream code the product no longer uses. | Check after stage A; if no caller, DELETE model + both harness checks. | M |
| 4 | AuditLease twin | C5/P6 | AuditLease duplicates this module and adds live-own-row and lost-ownership transitions. | Merge `startOwn`, `loseOwnership`, `UnownedNeedsReview`, the 3 witnesses and 2 runs here; delete the twin. | L |

## Proposed end state
One PermanentVoiceDeletion module (plus its Contract view) carrying the AuditLease additions; one harness check that imports the upstream planner; conformance duplicate removed.
Deleted entirely if stage A leaves no product caller of the recording-effects reconcile.
