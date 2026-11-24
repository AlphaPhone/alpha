# test/cloud-qa-launcher.test.mjs
- Lines: 19 | Kind: tooling (imports real `cloudQaConfiguration` from `scripts/start-cloud-qa.ts`, real temp files, modes and symlinks) | Verdict: MERGE into `test/tooling/local-agent-launcher.test.mjs` if `start-cloud-qa.ts` survives; DELETE with the script otherwise
- Covers: the staging Cloud QA launcher builds the canonical staging authority and exact model, writes no profile, exposes no `VITE_*` credential; refuses existing personal profiles, protected ports, group-readable or symlinked keys and an unreviewed model. Duplicates: `specs/quint/refinement/services/cloud-qa-launcher-probe.mjs` and `cloud-qa-launcher.mjs` (copy and run the same launcher; `test/quint-cloud-qa-launcher.test.mjs` runs that harness), `test/cloud-deployment.test.mjs:142` (T1 regex on the script). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-19 | A7 | `scripts/start-cloud-qa.ts` has no npm script, workflow or doc caller (scripts research line 669 "owner decision"; `files/scripts/start-cloud-qa.ts.md` KEEP pending owner). | Decide with the script. If kept, two cases move into the launcher tooling file. | Low |
| 2 | 7 | D8 | Whole fixture on one 300-character line. | Reformat when merged. | None |
| 3 | 1-19 | T4 | Same launcher refusals are checked by the Quint probe harness. | Keep one: this direct import is simpler; the Quint probe should import the same function rather than copy the script. | Low |

## Proposed end state
Two cases ("builds staging authority without writing a profile", "refuses personal profiles, protected ports, unsafe keys, missing model") inside `test/tooling/local-agent-launcher.test.mjs`, or nothing if the owner retires the QA launcher.
