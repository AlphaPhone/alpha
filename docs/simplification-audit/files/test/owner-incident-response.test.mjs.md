# test/owner-incident-response.test.mjs
- Lines: 247 | Kind: tooling (imports five `scripts/owner/*` incident modules with injected GitHub readers; builds throwaway git repositories) + source-text (35-49 regex-scan every `scripts/owner/*.ts`) + data-count assertions on `incident-2026-10-27-iocs.json` and `scripts/owner/rulesets/*.json` | Verdict: DELETE (with the incident tools); move the `gh-readonly` cases to `test/tooling/owner-tools.test.ts` if `gh-readonly.ts` survives
- Covers: incident #658/#679 helpers: IOC transcription counts, GET-only GitHub access, arg parsing, pagination, CI-exposure matching and rotation state, access-audit rules, `compareIntegrity`, ruleset drafts, forged-marker detection, ls-remote tag peeling and a no-checkout branch scan. Duplicates: `test/owner-merge-review.test.mjs` (same IOC markers via `merge-review.ts`), `test/owner-branch-integrity.test.mjs` (`compareIntegrity`), `test/ci-ruleset-readback.test.mjs` (`gh-readonly` reader). Callers/importers: `npm test` glob only; the imported tools are called by nothing else (scripts reports for `scripts/owner/*`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-28 | B5 / T1 | Asserts exact counts of a committed data file (102 branches, 26 repos, 117 runs): a transcription check, not behaviour. | Delete. | None |
| 2 | 35-49 | T1 | Reads every `scripts/owner/*.ts` and regex-bans `POST`, `push`, `.value` etc. A source-text policy check that every owner-script edit must satisfy. | Delete; `assertReadOnlyEndpoint` (46-48) is the real guard and can keep one case. | Low |
| 3 | 51-63 | T3 | Unit cases of `parseArgs` and `ghGetAll`; `parseArgs` is one of ~14 arg parsers (C3). | Keep pagination + read-only endpoint cases only if `gh-readonly.ts` survives (scripts report: SIMPLIFY); move to `test/tooling/owner-tools.test.ts`. | Low |
| 4 | 65-158, 186-247 | T5 | One-off incident tooling (CI exposure, access audit, forged-branch scan) tested on every `npm test`, forever (scripts research item 21). | Delete with `incident-ci-exposure.ts`, `incident-access-audit.ts`, `forged-branch-scan.ts`, the IOC JSON. | Low (owner confirms #658/#679 closed) |
| 5 | 160-171 | T4 | `compareIntegrity` again; overlaps `owner-branch-integrity.test.mjs`. | Move classic-protection + evaluate-only cases there (if kept). | Low |
| 6 | 173-184 | T1 | Re-reads `scripts/owner/rulesets/*.json` and asserts its own constants; no script applies those files. | Delete (rulesets move to `docs/owner/rulesets/` per their reports). | None |
| 7 | 215-247 | - | Cost: creates and commits to a temp git repo; cheap but spawns ~10 git processes. | Gone with the file. | None |

## Proposed end state
File deleted with the incident tools after the owner confirms #658/#679 are closed (git history keeps both). If `gh-readonly.ts` survives as the shared read-only GitHub client, two cases move to `test/tooling/owner-tools.test.ts`: refusing mutating endpoints, and pagination stopping on a short page / reporting a failed page.
