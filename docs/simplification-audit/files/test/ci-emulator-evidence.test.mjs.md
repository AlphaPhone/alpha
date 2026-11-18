# test/ci-emulator-evidence.test.mjs
- Lines: 410 | Kind: mixed: tooling integration (`scripts/ci/emulator-suite.ts` `runSuite`/`suitePlan` with injected executors in temp dirs; `speech-candidate.ts` over synthetic APK zips; CLI refusal outside a hosted runner) + source-text (regexes over `android-emulator.yml`, every workflow file, and `androidTest` Java) | Verdict: SPLIT: KEEP tooling cases in `test/tooling/emulator-suite.test.ts`; MOVE the all-workflow action-pin and permission rules (lines 97-130) to a workflow lint script; DELETE the rest
- Covers: emulator workflow is dispatch-only and its jobs run their suite; every action in every workflow is pinned to a 40-char commit with a release comment, third-party actions are an allow-list, only signing/publication workflows get write/id-token; suite plans, preparation-failure stop, skipped/missing classes are failures, network-off proof before speech classes; speech candidate refuses APKs with wrong voice bytes. Duplicates: `test/owner-emulator-campaign-check.test.mjs` (also uses `emulator-suite.ts`), `ci-affected.test.mjs` (line 131-134 duplicate). Callers/importers: `npm test` glob; scripts run by `.github/workflows/android-emulator.yml` (dispatch-only).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-94 | T1 | Workflow-shape regexes for `android-emulator.yml` (triggers, job needs, upload steps, `sha256sum` lines). Tests the YAML text, which CI itself exercises when dispatched. | Delete. | Low |
| 2 | 97-130 | T1 (real rule) | Supply-chain policy for all workflows: commit-pinned actions, allow-listed third-party actions, write permissions only in three named workflows with exact `if` guards. This is the only enforcement of that policy in the repo. | Move to `scripts/ci/check-workflows.ts` (YAML-parsed, run in `verify` when `.github/**` changes), or replace with `zizmor`/`actionlint` plus a short pin check. Do not delete without a replacement. | High if dropped |
| 3 | 131-134 | T4 | `affected([WORKFLOW])` duplicate of the CI-selection table. | Move the case to `ci-affected`. | None |
| 4 | 172-209 | T1/B5 | Exact command arrays, `SERIAL`/`AVD` constants, `read(CANONICAL_TEST).includes('"1".equals(…localSpeech…)')` Java text check. | Keep one plan assertion per suite (classes and gates); drop constants and the Java text check. | Low |
| 5 | 210-224 | T1 | Splits `androidTest` Java on `@Test` and regexes for `assumeTrue(BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS)` to prove a default class can pass flag-off. A real CI-correctness invariant, done by text. | Replace by the runner's own check: a class whose every method is skipped counts as failed (already enforced at 254-258), so drop the static scan. | Low |
| 6 | 233-299, 300-360 | - | Real tooling integration: a skipped/missing class is not a pass; network proven off; speech candidate byte checks. Gates emulator evidence. | Keep. | - |
| 7 | 361-410 | - | CLI refuses to run outside a GitHub-hosted runner (protects a developer's emulator-5554). | Keep. | - |

## Proposed end state
About 180 lines of `emulator-suite`/`speech-candidate` integration remain in the tooling folder. The workflow
supply-chain rule becomes a YAML-parsing lint run whenever `.github/**` changes. Workflow-text and Java-text checks go.
