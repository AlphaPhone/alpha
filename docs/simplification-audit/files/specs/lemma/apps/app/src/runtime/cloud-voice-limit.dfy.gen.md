# specs/lemma/apps/app/src/runtime/cloud-voice-limit.dfy.gen
- Lines: 28 | Kind: Lemma generated output (`lsc gen` snapshot) | Verdict: KEEP
- Covers: Pristine `lsc gen --backend=dafny` output for `apps/app/src/runtime/cloud-voice-limit.ts`; `lemma:check` diffs a fresh generation against it to detect source/annotation drift. Duplicates: `specs/lemma/apps/app/src/runtime/cloud-voice-limit.dfy` is byte-identical. Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | B5 | Identical twin of the `.dfy`. The pair exists because the checker always expects both; only one carries information. | Optional (cross-file): teach `scripts/check-lemma.ts` to accept a missing `.dfy` and verify the `.gen` directly; then delete the 8 identical `.dfy` files (keep the `.gen`). Not required for the simplification goal. | Low |

## Proposed end state
Unchanged; regenerated only by `npm run lemma:regen` when the annotated source changes.
