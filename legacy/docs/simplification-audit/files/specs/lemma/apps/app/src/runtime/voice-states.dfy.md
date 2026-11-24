# specs/lemma/apps/app/src/runtime/voice-states.dfy
- Lines: 16 | Kind: Lemma proof companion (generated, identical to `.dfy.gen`) | Verdict: KEEP
- Covers: Dafny proof that the "Open app settings" choice appears only on native, after a `denied` failure, in `ready` stage, and never while busy. Models live product code `apps/app/src/runtime/voice-states.ts` (exists; functions `deniedSettingsChoice` still exported/used). Duplicates: `specs/lemma/apps/app/src/runtime/voice-states.dfy.gen` (byte-identical). Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | B5 | Byte-identical to `.dfy.gen`; first ensures restates the body, the other two are its corollaries. | As for every identical pair. | Low |

## Proposed end state
Unchanged generated companion.
