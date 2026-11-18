# test/android-instrumentation-runner.test.mjs
- Lines: 657 | Kind: tooling integration (real `scripts/android-instrumentation.ts` and `scripts/instrumentation-result.ts` against synthetic `am instrument` output and a scripted fake `adb` emulator, temp APK dirs and a temp git repo) + large source-text/inventory sections over `scripts/android-instrumentation.ts`, `scripts/test-native-restart.ts`, ~150 androidTest Java files, `AndroidManifest.xml` and `template.html` | Verdict: KEEP the behavioural half (about 300 lines); DELETE the inventory and text half; MOVE to `test/tooling/android-instrumentation.test.mjs`
- Covers: the emulator runner that produces class-E evidence: per-class result parsing (skips never count as passes, crashes fail the running class), evidence records bound to commit and APK hashes, argument policy (campaign classes refused, test-mocks and HOME-role gates), APK admission against the `verify-apks` manifest, HOME-role phase restores the stock launcher, disposable secondary user lifecycle. Duplicates: `test/instrumentation-outcome-status.test.mjs` (result parsing), `test/ci-emulator-evidence.test.mjs`, `test/native-permission-runner.test.mjs`, `test/installed-upgrade-runner.test.mjs`. Callers/importers: `npm test` glob; the runner is driven in CI by `scripts/ci/emulator-suite.ts` (`.github/workflows/android-emulator.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-63, 98-118 | - | Result parsing, evidence record (EEXIST, class E, skipped is not pass), APK admission by hash. Release/evidence-gating. | Keep. | High if dropped |
| 2 | 65-96, 176-184 | - | Argument policy through `parseInstrumentationArgs`: refusals that keep campaigns, HOME role and secondary-user classes out of the default run. | Keep, but assert by property (each `campaign`/`homeRole`/`secondaryUser` entry is refused without its flag) rather than named classes. | Low |
| 3 | 244-500 (fake emulator) | - | HOME-role phase restore, failed restore keeps installation, disposable user created and removed, all-skipped class recorded as skipped: real runner logic on a scripted `adb`. | Keep. | High if dropped |
| 4 | 120-130, 576-593 | T1 | Regex over `scripts/test-native-restart.ts` object literals (tabs and newlines included) and Java phase names. | Delete; the restart campaign proves its own wiring when run. | Low |
| 5 | 132-242 | T1/T5 (inventory) | "Every @Test class is registered or excused", registry key uniqueness by regex over the runner source, gates read in Java source, permission scenarios vs manifest text: an inventory of the test sources. | Delete. If unregistered classes are a real risk, have the runner `--list` the APK's tests and fail on unknown classes at run time. | Medium |
| 6 | 412-428, 490-498, 513-517, 533-548 | T1 | `indexOf` order and regex checks inside `scripts/android-instrumentation.ts` (`const runClass =`, `spec.grant` before `spec.grantOther`, `instrumentArgs(cls, {live})` count). | Delete; the fake-emulator runs already show grant/isolation order through the recorded command list. | Low |
| 7 | 550-656 | T1, A8 | "Round-9 registrations", PasswordVaultFixture text, `PrototypeFlow`/`CalendarFlow`/retired `ResidentAgent`, J01/J05, removed "Choose folder"/"Scan mode" labels in `template.html`: changelog assertions. | Delete. | None |
| 8 | 559, 582 | A1 | Pins `WorkflowLegacyReminderUpgrade` (installed-upgrade campaign) and `notes-secure-migration` (legacy Notes layout migration), both legacy upgrade paths D1/C7 delete. | Delete with those classes and campaign phases. | None |
| 9 | 11 | - | Imports `cases` from `scripts/test-native-permissions.ts`, a manual campaign (scripts research: owner decision). | Drop with finding 5. | - |
| 10 | - | D1 | 657 lines in one file; the runner it tests is a 753-line monolith with registries (scripts research suggests splitting registry data into JSON). | After the split, test the runner, not the registry contents. | - |

## Proposed end state
`test/tooling/android-instrumentation.test.mjs`, about 300 lines: result parsing and records (3 cases), argument policy by
property (1 case), APK admission (1), HOME-role phase on the fake emulator (4), secondary-user lifecycle (1), all-skipped
class (1). The fake `adb` stays as the one helper. No reads of Java, template or runner source text.
