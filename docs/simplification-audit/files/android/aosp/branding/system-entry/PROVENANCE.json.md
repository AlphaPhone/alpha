# android/aosp/branding/system-entry/PROVENANCE.json
- Lines: 69 | Role: Narrative provenance for the system-entry packet: base commits, review corrections, local evidence scope, OS17 runtime override history, "not established" lists. | Verdict: DELETE
- Importers: none (grep `PROVENANCE.json` outside the packet: 0; nothing parses it; README does not name it).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-69 | B5 | Provenance file no tool reads. | Delete. | None. |
| 2 | 2-12, 34-44 | C6 | Duplicates `manifest.json` (`platformRevision` = `revision`, `reviewedPatchSHA256` = `patchSha256`, `nextImageProductOverlay` = `productOverlay.resources`) and `prepare.py:384-393`. | Goes with the file; `manifest.json` stays the single record. | None. |
| 3 | 13-18, 45-68 | A8 | History: "reviewCorrections", "OS17RuntimeOverride ... ownerReported", "priorIdentityEvidence", `productBaseCommit` 522fb360. | Goes with the file; README keeps current behaviour only. | None. |
| 4 | 10, 59 | pin | Repeats the patch hash, so it would otherwise need updating on every regeneration (see prepare.py report). | Deleting removes one manual hash copy. | - |

## Local types and helpers
None.

## Proposed end state
Deleted.

## Verification
None needed.
