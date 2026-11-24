# test/resident-attachment.test.mjs
- Lines: 92 | Kind: mixed: JVM run of upstream `ResidentAttachment.java` + fixture; spawn of `scripts/test-resident-reuse.ts`; source-text of `AlphaLocalAgentPlugin.java`/`connection-ui.tsx`; Java method transplant | Verdict: DELETE
- Covers: a second surface attaches to an admitted running resident without re-pairing; attach admission precedes retirement; attach diagnostics are content-free. Duplicates: `specs/quint/refinement/native/resident-coordinator.mjs` (compiles `AlphaLocalAgentPlugin.java` and runs attach/start traces), `specs/quint/native/ResidentStartCancel.qnt`. Callers/importers: `npm test` glob; fixtures `test/fixtures/ResidentAttachmentTest.java`, `ResidentAttachDiagnosticTest.java`, `jvm-tools.mjs`; script `scripts/test-resident-reuse.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-20 | T5 | Runs `vendor/eliza/.../ResidentAttachment.java` (upstream code) with an Alpha fixture. | Delete; upstream follow-up (D14). | Low |
| 2 | 21-23 | T9 | Spawns `scripts/test-resident-reuse.ts` (a test living in `scripts/`, uses `loadBrowserModule`). Only caller (git grep). | Delete script with this file. | Low |
| 3 | 24-68 | T1 | ~20 `indexOf`/`includes`/regex assertions on plugin and renderer source, including an exact multi-line string at 50-54. Breaks on any reformat (D9). | Delete. | Low |
| 4 | 70-92 | T2/T1 | Slices `ResidentAttachDiagnostic` out of the plugin into a generated class, then regexes the worker body. | Delete. | Low |

## Proposed end state
File deleted with `scripts/test-resident-reuse.ts`, `test/fixtures/ResidentAttachmentTest.java` and
`ResidentAttachDiagnosticTest.java` (no other importers). Attach-vs-restart ordering stays modelled by the resident
Quint refinement; a two-surface attach case belongs in the emulator instrumentation suite, not a host test.
