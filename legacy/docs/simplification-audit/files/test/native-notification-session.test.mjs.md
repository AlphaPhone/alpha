# test/native-notification-session.test.mjs
- Lines: 17 | Kind: host-JVM integration: compiles 8 real Alpha classes, upstream `SecureSlotPolicy`, the notice sources staged by `test/fixtures/native-source.mjs`, and committed `test/fixtures/NativeNotificationSessionTest.java` | Verdict: KEEP, MERGE into `test/integration/android-jvm.test.mjs`
- Covers: native notifications restore only an existing verified machine owner session. Duplicates: none found. Callers/importers: `npm test` glob; sole importer of `NativeNotificationSessionTest.java`; `native-source.mjs` is shared with 9 other tests and survives.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | T8 | `assert.ok(jsonJar)` fails rather than skips; other JVM files use `jsonJarSkip`. | One policy in the merged suite (require the jar in CI). | None |
| 2 | 14 | C3 | Own javac/java command lines instead of `runJvm`. | Use `runJvm`. | None |

## Proposed end state
One android-jvm case calling `runJvm([...classes, fixture], 'NativeNotificationSessionTest')`.
