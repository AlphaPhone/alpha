# test/update-channel-gradle.test.py
- Lines: 81 | Kind: transplant (slices `android/app/product.gradle` from `// One-tap app update` to `\nandroid {` and runs it with Groovy) | Verdict: DELETE
- Covers: the Gradle-side update channel input validation (public vs `private-qa`, digest, 0600 file, no symlink, outside checkout, no duplicate query, refused with test mocks or unpackaged runtime). Duplicates: the same rules in TypeScript, `scripts/update-channel.ts` `readUpdateChannel`, tested by `test/update-channel.test.mjs`. Callers/importers: none. `git grep update-channel-gradle` finds nothing; no workflow or package script runs `test/*.py` generically; it also needs `JAVA_HOME` and `GRADLE_LIB` that nothing sets.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-81 | A7, T9 | Orphan: never run. | Delete. | none |
| 2 | 10-11 | T2, T10 | Text slice of `product.gradle` between two markers. | Goes with the file. | none |
| 3 | — | C7 | The private-channel rules exist twice: Groovy in `product.gradle:39-80` and TS in `scripts/update-channel.ts`. `build-android.ts` already calls `readUpdateChannel`. | Owner/Android chunk: have Gradle consume the validated record that `build-android.ts` passes (property or generated file) instead of re-validating; then one implementation, one test. | low |

## Proposed end state
Deleted. Update-channel rules are tested once, in `test/tooling/app-update.test.mjs`, against the single TypeScript
implementation; Gradle receives the already-validated record.
