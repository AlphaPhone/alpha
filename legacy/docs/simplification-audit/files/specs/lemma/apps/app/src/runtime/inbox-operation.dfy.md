# specs/lemma/apps/app/src/runtime/inbox-operation.dfy
- Lines: 25 | Kind: Lemma proof companion (generated, identical to `.dfy.gen`) | Verdict: KEEP
- Covers: Dafny proof that a `prepared` receipt is refused exactly when the saved receipt for the same request is already `observed`. Models live product code `apps/app/src/runtime/inbox-operation.ts` (exists; functions `regressedReceipt` still exported/used). Duplicates: `specs/lemma/apps/app/src/runtime/inbox-operation.dfy.gen` (byte-identical). Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | B5 | Byte-identical to `.dfy.gen`. | As for every identical pair. | Low |
| 2 | 18-24 | — | The five ensures restate the function body (the first two are the definition). The proof is therefore close to a tautology; its value is pinning the guard rule against edits. | Keep (cheap); do not add more restating contracts of this kind. | — |

## Proposed end state
Unchanged generated companion.
