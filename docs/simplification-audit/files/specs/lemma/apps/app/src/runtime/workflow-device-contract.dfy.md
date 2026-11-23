# specs/lemma/apps/app/src/runtime/workflow-device-contract.dfy
- Lines: 72 | Kind: Lemma proof companion (generated + hand-written proof text) | Verdict: SIMPLIFY (delete restating hand lemmas)
- Covers: Dafny proof that a workflow notice tap opens a run only for a token not already opened, and the recheck decision is `after-operation` / `now` / `none` by priority. Models live product code `apps/app/src/runtime/workflow-device-contract.ts` (exists; functions `readyTapStep`, `tapRecheck` still exported/used). Duplicates: none (Quint models cover neighbouring behaviour, not these function contracts). Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41-72 | B5 | All four hand-written lemmas restate what the generated `readyTapStep_ensures` / `tapRecheck_ensures` already prove: `neverOpensTwice` is ensures 1 at `Some(token)`, `_total` is ensures 1 plus the two-valued body, `tapRecheck_table` and `_priority` are instances of `tapRecheck_ensures` 2-4. Empty bodies confirm Dafny needs nothing extra. | Delete lines 40-72. The file becomes byte-identical to `.dfy.gen`. Update `specs/lemma/README.md:202` ("Hand-written … never opened twice") to cite the generated ensures. | Low: `lemma:check` still proves the generated contracts; no source change. |
| 2 | 41 | A8 | Comment ties the lemmas to `services/WorkflowNoticeTaps.qnt` (exists), but nothing mechanically links them. | Goes with the deletion. | — |

## Proposed end state
Generated text only (39 lines, identical to `.dfy.gen`). The product file keeps its `//@` blocks; its unrelated local approval-poster fork is deleted by the product cleanup without touching this proof.
