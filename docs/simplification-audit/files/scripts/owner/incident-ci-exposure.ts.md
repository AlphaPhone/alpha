# scripts/owner/incident-ci-exposure.ts
- Lines: 159 | Kind: one-off owner incident tool (#658 step 1: CI runs on forged commits and secret names to rotate) | Verdict: DELETE (after the owner confirms #658 is closed and rotation is done)
- Covers: finds workflow runs whose head is or descends from a forged commit in the incident window; lists secret/variable/environment names with an UPDATED-AFTER-INCIDENT / NOT-ROTATED-YET state. Duplicates: none. Callers/importers: only `test/owner-incident-response.test.mjs` (`exposureCutoff`, `forgedPrefixes`, `matchRuns`, `rotationState`, `auditRepository`). No npm script or workflow.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 | One-incident forensics, test-only caller. | Delete with IOC file and test. | Low, provided the owner has finished rotation; ask first (a NOT-ROTATED-YET secret is a live security fact). |
| 2 | 78-129 | D9 | 50-line `auditRepository` doing three phases; fine for a throwaway tool. | n/a. | — |

## Proposed end state
Deleted once the owner confirms every listed secret has been rotated. No product or CI coverage is affected.
