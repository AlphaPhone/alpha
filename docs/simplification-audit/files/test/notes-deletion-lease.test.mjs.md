# test/notes-deletion-lease.test.mjs
- Lines: 46 | Kind: test 1 host-JVM of real `NotesDeletionLease.java` with committed `test/fixtures/NotesDeletionLeaseTest.java`; tests 2-3 source-text over `AlphaNoteAudioPlugin.java`, `permanent-voice-deletion.ts`, `voice-adapter.ts`, plus a child `tsx` process to read a renderer constant | Verdict: MERGE test 1 into `test/integration/android-jvm.test.mjs`; DELETE tests 2-3
- Covers: the native Trash pass leaves a leased deletion row untouched and finishes an expired one; renderer and native lease lengths agree (20 min). Duplicates: upstream `plugin-notes` recording-deletion tests (named in the file). Callers/importers: `npm test` glob; sole importer of `NotesDeletionLeaseTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-13 | - | Real class, committed fixture. | Keep. | None |
| 2 | 15-25, 35-45 | T1 | Regex/indexOf over plugin and adapter text. | Delete. | Low |
| 3 | 31-34 | T1, T9 | Spawns `node --import=tsx` to read one constant and compares it with a Java literal regex. | Delete; constants test (owner brief). | Low: lease drift between sides would go unnoticed. |

## Proposed end state
One android-jvm case running `NotesDeletionLeaseTest`.
