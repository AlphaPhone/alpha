# specs/quint/verification.md
- Lines: 206 | Kind: historical verification record (Markdown, no executable content) | Verdict: DELETE
- Covers: the 2026-11-07 TLA+->Quint migration run (58 models, 396 scenarios), receipts under gitignored `test-results/`, a failed `npm run verify` (32 failures), and a 2026-11-10 registry note (335 models) that itself says none of the counts or receipts describe the present manifests. Duplicates: `specs/quint/README.md` "Verification record" paragraph; `docs/formal-model-audit-2026-11/08-infra-lemmascript.md` (also historical). Callers/importers: none in code. References: `specs/quint/README.md:111-113` ("recorded in `verification.md`"), `docs/formal-model-audit-2026-11/*` (historical audit, same retirement).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-5, 187-206 | A8 | Self-declared historical; the closing section states it describes no current manifest. | Delete file. | None |
| 2 | 27-31, 65-104, 116, 136-144 | B5 | ~17 receipt paths under gitignored `test-results/` (exist on one machine only), hash provenance, "receipts" taxonomy: evidence ceremony with no consumer. | Delete. | None |
| 3 | 33-57 | P6 | TLC state counts for the seven legacy designs (`SignIn`, `Calendar`, ...): belong to `specs/quint/legacy`, which is being retired. | Delete with legacy. | None |
| 4 | 106-109, 158-160 | A8 | Claims the scan adapter "reproduced the current explicit-save-after-autosave defect" and that the defect "remains present". False today: `ScanDocument.qnt:158` includes `ExplicitlySavedDraftPreserved` in `safety` and `scan-source-conformance.mjs` asserts preservation. | Delete. | None |
| 5 | 113-149 | — | Records Android build attempts and acceptance-level distinctions; the rule itself is in AGENTS.md. | Delete. | None |
| 6 | README 111-113 | A7 | `specs/quint/README.md` points at this file. | Replace that paragraph with one line: results are produced by `npm run quint:check` / CI; no committed receipts. | Low |

## Proposed end state
File removed. `specs/quint/README.md` drops its pointer (and its stale "259 models and 1,841 scenarios" line, handled
in that file's report). Current evidence is the CI Quint lane result, not a committed narrative.
