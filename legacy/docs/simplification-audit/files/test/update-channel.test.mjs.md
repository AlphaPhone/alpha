# test/update-channel.test.mjs
- Lines: 64 | Kind: tooling (release gate) with real temp files, permissions and symlinks; imports `scripts/update-channel.ts`, `build-android.ts` (`consumerBuildOptions`), `apk.ts` (`parseXmlTree`) | Verdict: KEEP, MERGE into `test/tooling/app-update.test.mjs`
- Covers: public builds keep their source URL; a private QA manifest URL is read only from a 0600 file outside the checkout with a matching digest, never echoed, never in build records; private builds must be packaged with test mocks off; compiled APK metadata has exactly one channel and digest. Duplicates: `update-channel-gradle.test.py` (orphan, DELETE); channel metadata case overlaps `update-apk-admission.test.mjs:23-32`. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41-46 | — | Writes a fixture directory inside the working tree (`process.cwd()`); cleaned in `t.after`, but a crash leaves `.qa-channel-fixture-*` in the checkout. | Acceptable (it is the rule under test); add the prefix to `.gitignore`. | low |
| 2 | 47-49 | — | Seven URL refusal cases as separate tests; fine. | Keep as a table in the merged file. | none |
| 3 | 11-18 | C3 | Local `hash` and temp-file helper repeat those in `update-apk-admission.test.mjs`. | Share in the merged file. | none |
| 4 | 50-56 | T4 | Overlaps admission test 1. | Keep one. | none |

## Proposed end state
Merged with `update-apk-admission.test.mjs` into `test/tooling/app-update.test.mjs`; one hash and one fixture helper;
the Gradle duplicate removed.
