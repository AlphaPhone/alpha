# scripts/owner/incident-2026-10-27-iocs.json
- Lines: 695 | Kind: incident data (IOCs of the 2026-10-27 forged-commit compromise: actor, window, 26 repositories, 102 forged branches, marker patterns, CI run counts) | Verdict: DELETE (with the incident tools, once the owner confirms #658/#659 are closed; git history keeps it)
- Covers: input data for `forged-branch-scan.ts`, `incident-access-audit.ts`, `incident-ci-exposure.ts`, `merge-review.ts`; `read-branch-integrity.ts` reads it only for the default repository owner. Duplicates: none. Callers/importers: `scripts/owner/gh-readonly.ts:16` (`IOC_FILE`/`loadIocs`) and the four incident tools above; `test/owner-incident-response.test.mjs:15-27` asserts its exact counts (102 branches, 26 repos, 18 repos with runs, 117 runs). Not read by any product code, build, workflow or Quint model.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 | Data for one-off incident response tools that nothing in build, CI or the product runs. | Delete together with the four incident tools and `test/owner-incident-response.test.mjs`. | Low: purely owner forensics; recoverable from git. |
| 2 | test | T1/B5 | The only automated consumer is a test that asserts exact counts of this file's rows (a test of a constant). | Goes with the file. | None |
| 3 | content | privacy | Contains a named external actor login and other organisations' repository names in the product repository. | Owner decision whether it should live in this repository at all (an incident tracker or private repo may be the better home). | — |

## Proposed end state
Removed from the repository. If the owner wants the scanners kept for future incidents, the IOCs become a CLI argument (`--iocs <file>`) supplied from outside the repo.
