# specs/lemma/apps/app/src/runtime/hosted-digests.dfy
- Lines: 125 | Kind: Lemma proof companion (generated + hand-written proof text) | Verdict: KEEP
- Covers: Dafny proof that only a `review` digest is discardable, the missing-calendar list is exactly the selected ids the phone does not offer (order kept), and the tap notice text depends only on `bound` and `other-account`. Models live product code `apps/app/src/runtime/hosted-digests.ts` (exists; functions `digestPhaseDiscardable`, `digestMissingCalendars`, `digestTapNotice` still exported/used). Duplicates: none (Quint models cover neighbouring behaviour, not these function contracts). Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39-110 | — | Hand-written `Offered`, `Subsequence`, `_unfold`, `_facts`, `_subsequence` and the body of `digestMissingCalendars_ensures` are needed to prove the `SeqFilter` ensures; they are real proof work, not restatement. | Keep. | — |
| 2 | 27-31 | A1 | `digestPhaseDiscardable(None) == false` encodes "a record from an older build has no phase". Product report (hosted-digests.ts #2, delete-candidates B297) makes `DigestPending.phase` required. | When B297 lands: move the contract to `digestPendingDiscardable(p) = p.phase === "review"` (or keep `digestPhaseDiscardable(string)`), drop the `None` ensures, `npm run lemma:regen`, re-apply hand-written block. | Medium: `.dfy`, `.dfy.gen`, `specs/lemma/README.md:195` and Quint abstraction text change together. |
| 3 | 117 | — | `digestTapNotice` proves exact user copy (curly apostrophe `\u2019`). Copy changes need a regen. | Keep. | Low |

## Proposed end state
Kept: the module is live (13 product importers; hosted digests are reachable, not part of the D5 pairing deletion). Only the optional-phase ensures changes with B297.
