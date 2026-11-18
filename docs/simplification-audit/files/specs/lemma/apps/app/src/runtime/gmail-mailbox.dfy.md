# specs/lemma/apps/app/src/runtime/gmail-mailbox.dfy
- Lines: 39 | Kind: Lemma proof companion (generated, identical to `.dfy.gen`) | Verdict: KEEP
- Covers: Dafny proof that `newestWithinBudget` returns the longest suffix of rows whose summed size fits the byte budget. Models live product code `apps/app/src/runtime/gmail-mailbox.ts` (exists; functions `sizeFrom` (spec function), `newestWithinBudget` (method with loop invariants) still exported/used). Duplicates: `specs/lemma/apps/app/src/runtime/gmail-mailbox.dfy.gen` (byte-identical). Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | B5 | Byte-identical to `.dfy.gen`. | As for every identical pair. | Low |
| 2 | — | D4 | Product report: the file's upstream re-export block goes; the verified helper stays. `sizeFrom` exists only as proof vocabulary (`//@` pinned). | No change here; if the helper moves to another file, move both companions and edit `LemmaScript-files.txt`. | Low |

## Proposed end state
Unchanged generated companion.
