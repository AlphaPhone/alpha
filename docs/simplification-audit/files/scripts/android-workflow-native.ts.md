# scripts/android-workflow-native.ts
- Lines: 206 | Kind: script (manual device campaign: workflow phone steps, approval notices, process death, both variants, secondary user) | Verdict: MOVE to `test/android/` and SIMPLIFY; owner: wire into CI or accept as manual
- Covers: from hash-admitted archives, runs 11 cases of `WorkflowPhoneNative`, `WorkflowDraftNative`, `WorkflowApprovalNotice` and `WorkflowApprovalNoticeProcessDeath` (helper-process runner) in a fresh secondary user per case via upstream `runIsolatedAndroidTest`. Duplicates: `WorkflowApprovalNotice` is also in `android-instrumentation.ts:200` `CLASS_REGISTRY` (registry runs the whole class without the per-method permission setup). Callers/importers: `android-instrumentation.ts:292,312` (campaign note, `CAMPAIGN_RUNNERS`); `WorkflowApprovalNoticeProcessDeathInstrumentedTest.java` comment; tests `developer-archive.test.mjs`, `fixtures/isolated-native-campaign.mjs` (fake-adb run). No npm or workflow caller.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9/P4 | MVP-18 approval-notice and process-death behaviour is only covered by this script, which no workflow runs. | Owner: add it to `android-emulator.yml` (dispatch or nightly) or record it as manual acceptance; otherwise this coverage is zero in CI. | High if left unwired: silent loss of process-death coverage. |
| 2 | 75-77, 88-103, 169-190 | D8 | Minified style: several asserts per line, 11 case objects on one 1,000-character line. | Formatter pass; one case per line. | None |
| 3 | 86 | B3 | `assert.equal(pkg,'ai.alphacompute.alphaphone')` self-check of `app.config.json` (B330). | Delete. | None |
| 4 | 87 | C3 | Local `hash`. | Shared helper. | None |
| 5 | 45 | C1 | `type ApkPair` collides with a different `ApkPair` in `native-test-fixture.ts:32`. | Rename or import. | None |
| 6 | 104-110 | B3 | Asserts that the literal `cases` table is well-formed (phases, runners, builds). | Delete; type the table. | None |
| 7 | 140 | — | Device lease taken without `stateDir`, unlike `android-instrumentation.ts:580`. | Pass `deviceLeaseStateDir(process.env)` for one lease namespace. | Low |

## Tests
`fixtures/isolated-native-campaign.mjs` drives this script against a fake adb (T5: a test of the harness). Delete it once the campaign runs on a real emulator in CI.

## Proposed end state
`test/android/workflow-native.campaign.ts` (~150 formatted lines), case table typed, shared helpers, one lease namespace, run by a workflow job on the owned emulator.
