# specs/lemma/apps/app/src/runtime/cloud-voice-limit.dfy
- Lines: 28 | Kind: Lemma proof companion (generated, identical to `.dfy.gen`) | Verdict: KEEP
- Covers: Dafny proof that a Cloud speech 429 wait is either absent or in [1, 86400] seconds, and negative/oversized values are dropped. Models live product code `apps/app/src/runtime/cloud-voice-limit.ts` (exists; functions `finiteWaitSeconds` (`MAX_RETRY_AFTER_SECONDS`) still exported/used). Duplicates: `specs/lemma/apps/app/src/runtime/cloud-voice-limit.dfy.gen` (byte-identical). Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | B5 | Byte-identical to `.dfy.gen`. | As for every identical pair (chunk cross-file action). | Low |

## Proposed end state
Unchanged. `finiteWaitSeconds` is shared by the product path (`cloudVoiceLimitOf`) and the dev bridge, so the proof stays live.
