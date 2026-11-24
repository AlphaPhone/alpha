# test/fixtures/CloudVoiceLimitTest.java
- Lines: 32 | Kind: Java fixture, unit of `CloudVoiceLimit` | Verdict: MERGE into the Gradle JVM voice suite
- Covers: 429 Retry-After (seconds and HTTP date), limit code, reset time parsing with bounds; only Cloud's pre-admission cache-warming 503s are replayed, capped at 2 s. Duplicates: none. Callers/importers: `test/cloud-voice-limit.test.mjs:103` (which resolves `JAVA_HOME` itself, bypassing `jvmSkip`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-29 | T3 | Pure parser, but the replay rule decides whether a speech request is sent twice; that is not observable from a journey. | Keep the replay table; fold the 429 parsing rows into the same method. | Medium if deleted |
| 2 | importer | P6 | The importer has its own javac/mkdtemp and `JAVA_HOME` resolution. | Goes away with the Gradle move. | Low |

## Proposed end state
One table-driven method in the voice suite. Fixture and the javac part of the importer deleted.
