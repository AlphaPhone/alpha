# specs/lemma/apps/app/src/runtime/resident-recovery.dfy
- Lines: 14 | Kind: Lemma proof companion (generated, identical to `.dfy.gen`) | Verdict: KEEP
- Covers: Dafny proof that only `dead`, `restarting` and `booting` invalidate the renderer's resident binding. Models live product code `apps/app/src/runtime/resident-recovery.ts` (exists; functions `residentBootStateLost` still exported/used). Duplicates: `specs/lemma/apps/app/src/runtime/resident-recovery.dfy.gen` (byte-identical). Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | B5 | Byte-identical to `.dfy.gen`. | As for every identical pair. | Low |
| 2 | 11-14 | — | The single ensures is the function body verbatim: the proof certifies nothing beyond "the function exists and type-checks". It is the original admission example (`specs/lemma/README.md:9-13`). | Keep as the canonical minimal example, or (owner) drop the `//@ verify` from `resident-recovery.ts` and delete both companions and the inventory line; Quint `resident-liveness` already replays the real module. | Low |

## Proposed end state
Unchanged unless the owner drops the tautological contract.
