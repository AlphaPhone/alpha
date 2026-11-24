# specs/quint/README.md
- Lines: 128 | Kind: Formal-spec documentation | Verdict: REWRITE (shorten, remove stale facts)
- Covers: Overview of Quint families, how to run the checker, interpretation of results. Duplicates: family READMEs (`application/README.md`, `services/`, `native/`, `legacy/`), `verification.md`. Callers/importers: Human readers; linked from root README/docs. `test/docs-links.test.mjs` may check its links (verify by grep before renaming).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | P6 | Lists the Legacy family (historical design comparisons), which D11 retires once live harnesses stop importing it. | Drop the row when `specs/quint/legacy` is removed. | Low |
| 2 | 24-30 | A7 | `quint:typecheck`, `quint:test`, `quint:simulate`, `quint:conformance` aliases are referenced only here (research §3 delete list); `quint:check` and `npm test` cover them. | Document only `npm run quint:check` and `npm run quint:verify`. | Low |
| 3 | 37-38, 66-67 | B5 | Describes canaries, evidence classes and receipts under `test-results/quint/`, which the B5 cleanup removes. | Rewrite to "the command exits non-zero on any failed invariant/run". | Low |
| 4 | 57-62 | P6 | `quint:temporal`/`quint:compare` examples use historical models only. | Delete with the legacy family. | Low |
| 5 | 98-107 | A8 | "Known modeled discrepancy" narrates a historical migration receipt and an older defect. | Delete or move to the scan/permission model READMEs as current behaviour. | Low |
| 6 | 109-128 | A8 / B5 | "Verification record", "Registry review" (says 259 models / 1,841 scenarios; actual 379 / 2,855), "Complementary audit models". | Delete; counts are derived from manifests. The floor test `quint-checker.test.mjs:32` is a T5 test and should go with it. | Low |

## Proposed end state
About 40 lines: what the families are, how a model is registered (manifest fields), the two commands (`quint:check`, `quint:verify`), what a passing check means and does not mean (not device acceptance), and how harnesses import real modules.
