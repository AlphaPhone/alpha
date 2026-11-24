# scripts/instrumentation-result.ts
- Lines: 147 | Kind: release/test tooling (parses `am instrument -r` output per class; lists dry-run tests; writes emulator evidence records) | Verdict: KEEP, SIMPLIFY
- Covers: per-class pass/fail/missing/skipped from AndroidJUnitRunner status output, so one failing class does not hide others, and evidence records bound to commit and APK hashes. Duplicates: `requireInstrumentationSuccess` comes from `vendor/eliza/packages/app/scripts/lib/instrumentation-result.mjs` and is re-exported. Callers/importers: `scripts/android-instrumentation.ts` (all three functions), `scripts/android-workflow-native.ts`, `scripts/test-installed-upgrade.ts`, `scripts/test-native-calendar-deletion-restart.ts`, `scripts/test-native-restart.ts`, `scripts/test-native-permissions.ts`, `scripts/native-test-fixture.ts`; tests `android-instrumentation-runner`, `instrumentation-outcome-status`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-5 | D4 | Re-exports the upstream `requireInstrumentationSuccess` so local scripts import it from here. | Acceptable as the single seam to the vendor helper (one place to change if upstream moves it); keep, or import the vendor module directly in the four callers. Keep is simpler. | L |
| 2 | 57-66, 106-112 | C5 | `instrumentationClassResults` and `listedInstrumentationTests` each implement the `INSTRUMENTATION_STATUS: k=v` / `STATUS_CODE` field loop. | One generator `statusBlocks(text)` yielding `{fields, code}`; both functions consume it. | L |
| 3 | 37 | B3 | `typeof output !== 'string'` on a typed `string` parameter; the 16 MiB bound is a reasonable guard on tool output. | Drop the type check, keep the bound. | L |
| 4 | 124-131 | B3 | `writeInstrumentationRecord` validates records built in-process by typed callers (commit hex, APK hashes, class names). These records are evidence files read later by CI and by owners, so a malformed record is worth refusing at write time. | Keep. | L |
| 5 | 133-141 | B5 | `evidenceClass: 'E'` and `notEvidenceFor` are the AGENTS.md distinction between emulator and device evidence. | Keep. | L |

## Proposed end state
About 130 lines with one status-block parser feeding both functions. API unchanged for its seven script callers. The two host tests merge into
the release-tooling suite (research/tests-host.md).
