# specs/lemma/apps/app/src/runtime/workflow-device-contract.dfy.gen
- Lines: 39 | Kind: Lemma generated output (`lsc gen` snapshot) | Verdict: KEEP
- Covers: Pristine `lsc gen --backend=dafny` output for `apps/app/src/runtime/workflow-device-contract.ts`; `lemma:check` diffs a fresh generation against it to detect source/annotation drift. Duplicates: `specs/lemma/apps/app/src/runtime/workflow-device-contract.dfy` = this file + hand-written proof text. Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
None.

## Proposed end state
Unchanged; regenerated only by `npm run lemma:regen` when the annotated source changes.
