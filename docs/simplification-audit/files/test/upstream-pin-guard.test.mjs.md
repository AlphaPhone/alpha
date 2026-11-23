# test/upstream-pin-guard.test.mjs
- Lines: 131 | Kind: tooling with real git fixtures and a spawned preflight (`scripts/android-build-preflight.ts`) | Verdict: KEEP, MERGE into `test/tooling/upstream-pin.test.mjs`
- Covers: the Android preflight refuses an upstream pin older than or diverged from `origin/main`'s pin (exit 2 with a runnable fix), allows it only with `--allow-older-upstream-pin`, asks to fetch an unknown main pin, to unshallow a shallow checkout, and skips with a note in a CI clone without `origin/main`. Duplicates: none. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 115-131 | T9, B3 | Copies a hand-maintained list of 13 scripts (including `removed-profile-flags.ts`, which the scripts review deletes) into the fixture so the entry point can run; any new import in the preflight breaks this test. | Give the preflight a `--root <dir>` option (or `ALPHA_ROOT`) and run the real script from the repository against the fixture root. | low |
| 2 | 101-113 | — | Copies four committed metadata JSON files for `strictBuildInputs`. | Same `--root`/root parameter removes the copy. | none |
| 3 | 21-53 | C3 | Its git fixture builder repeats `upstream-native-source.test.mjs`'s. | One shared builder in the merged file. | none |
| 4 | — | cost | 7 fixtures, each `git init` + clone (+ shallow clone), one Node spawn: a few seconds. | Fine. | none |

## Proposed end state
Merged into `test/tooling/upstream-pin.test.mjs`; one git-fixture builder; the preflight is run in place against a fixture
root instead of copying scripts.
