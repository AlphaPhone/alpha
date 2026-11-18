# test/dev-speech-settings.test.mjs
- Lines: 37 | Kind: tooling (imports `developmentSpeechEnvironment` from `scripts/dev-speech-settings.ts`; real temp profile, chmod, symlink) | Verdict: DELETE (T5) together with the retired-key refusals in the script (A8)
- Covers: saved `local-speech.json` speech settings load into the dev environment, explicit env overrides them, earlier `ALPHA_*` keys and retired Whisper/Kokoro keys are refused with a rename hint, invalid/oversized/shared/symlinked files are refused without echoing values. Duplicates: none. Callers/importers: `npm test` glob. `scripts/dev-speech-settings.ts` is imported by `scripts/dev-local.ts` (`npm run dev`) and by `test/dev-local-launcher.test.mjs`, `test/client-feature-preparation.test.mjs`, `test/llama-cpp-only.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-23 | A8 | Five renamed `ALPHA_*` keys and five retired keys each get a refusal message: the "refusal stub for removed flags" pattern. The package starts fresh (D1); no developer profile needs a migration hint. | Scripts review: drop the rename/retired tables; unknown keys are refused by the allowlist anyway. Delete these cases. | Low |
| 2 | 8-14, 24-37 | T5 | Remaining cases test a developer-only helper. | Delete, or keep in a single `test/tooling/dev-launchers.test.ts` (see `dev-cartesia` report). | Low |
| 3 | 28-29 | — | "Values are never echoed in errors" is the one property worth keeping if any of this stays. | Carry if the owner keeps a dev-launcher test. | Low |

## Proposed end state
File deleted; the script loses its retired-key tables. Check that `test/client-feature-preparation.test.mjs` and
`test/llama-cpp-only.test.mjs` (other chunks) do not depend on the retired-key behaviour.
