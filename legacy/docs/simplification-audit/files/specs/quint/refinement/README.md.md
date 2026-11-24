# specs/quint/refinement/README.md
- Lines: 77 | Kind: documentation of the refinement-harness method | Verdict: KEEP, REWRITE shorter
- Covers: what a refinement adapter is, the trace shape `check-traces.mjs` accepts, evidence levels, external-contract caveats. Duplicates: `specs/quint/refinement/application/README.md` (adapter-boundary prose), `specs/quint/README.md`. Callers/importers: none by tools; humans only (`git grep "refinement/README"`: only `docs/formal-model-audit-2026-11/08-infra-lemmascript.md`, `specs/quint/README.md`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-5 | A8 | "The migration PR preserves the first model-verification baseline. This phase…" is history. | Delete. | None |
| 2 | 15-18, 47-53 | B5 | Documents hashing of source/adapter/model inputs, "retains input traces", stale-receipt rejection, `captureInputs(sources)` + `driverHashes` before execution. The audit removes mid-run input hashing and receipts (§2.8). | Rewrite once receipts go: harness returns pass/fail and the trace count. | Low |
| 3 | 18 | T5 | "The harness test includes a deliberately wrong observation" (self-test canary). | Drop with the canary. | None |
| 4 | 20-23 | P1 | Describes `node scripts/check-quint-refinement.ts --families=...` and `--require-complete`; after the path-matrix change the documented entry point is the single manifest-driven runner. | Update the command. | None |
| 5 | 25-45 | (keep) | Trace shape (`init`, `expect`, `steps`, `action: null`, `reject: true`, `qset`/`qmap`, string-escape caveat) is the useful part. | Keep verbatim. | – |
| 6 | 55-77 | (trim) | Evidence-level taxonomy and external-contract caveats are fine but long. | Keep 5-8 lines. | – |
| 7 | – | (new) | Missing the rule the cleanup needs: harnesses import the module under test (`bundledSource`/`tsImport`), never slice text. | Add one paragraph naming the allowed loading techniques and forbidding `between`/marker slicing. | – |

## Proposed end state
A ~35-line README: the relation checked, trace format, how to run one model or all (single runner), the "import, do
not slice" rule, and the external-contract caveat. Fold the useful paragraph of `application/README.md` into it and
delete that file.
