# test/installed-upgrade-runner.test.mjs
- Lines: 166 | Kind: tooling (spawns the real `scripts/test-installed-upgrade.ts` ~20 times against a temp root with a fake `adb` Node script and a fake `aapt` shell script; research bucket "A, regex" is wrong) | Verdict: SIMPLIFY and MERGE into `test/tooling/device-campaigns.test.ts`; DELETE the legacy-digest cases
- Covers: the installed-upgrade device campaign runner: candidate-pair admission (manifest present, hashes paired, not rebuilt, not test-mocks), owned secondary user lifecycle, cleanup deferred on uncertain stop or failed owner restore, reminder intent-route preservation, the `WorkflowLegacyReminderUpgradeInstrumentedTest` companion phase, usage errors. Duplicates: none (only test of this runner); `test/android-instrumentation-runner.test.mjs:558-559` checks the class-registry pointer to this script. Callers/importers: `npm test` glob. The script itself is invoked by nobody in CI or package.json (only named in `scripts/android-instrumentation.ts:292,305`, `scripts/pilot-update.ts:9` comment, `scripts/owner/emulator-campaign-check.ts:68`): it is a manual device campaign.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 113-147 | A1, D1 | Five tests (one pass, three failure modes, one swapped-APK) exist for the `legacy-digest` companion, which instruments `WorkflowLegacyReminderUpgradeInstrumentedTest` ("pre-revision one-off reminder… legacyAlarm row"): a legacy-data upgrade path. D1 deletes legacy readers and their upgrade tests. | Delete these cases, the companion phase in `scripts/test-installed-upgrade.ts:117`, `legacyDigest` in its receipt type, and the instrumented class. | Low (owner may keep the reminder engine's legacyAlarm reader per D17 if it is a device concern; it is app data, so D1 applies) |
| 2 | 9-76 | T9, D8 | The fixture is a 70-line function holding a fake adb written as a minified Node program in a template string, with mode strings driving 15 behaviours. | Move the fake adb to `test/tooling/fixtures/fake-adb.mjs` (readable, shared with other device-campaign tests such as `android-instrumentation-runner`). | Low |
| 3 | 69 | T8 | 300 s timeout per spawn; ~20 spawns of a TypeScript script (each node start + type stripping). Notable runtime for a runner nothing in CI invokes. | After deleting legacy cases, keep: one pass per kind, admission matrix (one case per refusal, calendar only), cleanup-deferred, usage. About 9 spawns. | Low |
| 4 | 149-152 | T4 | Admission refusal cases (`candidate-unverified/unpaired/app-replaced/test-mocks`) run the same admission path the APK campaign scripts share with `scripts/verify-apks.ts`. | Keep here (it is the runner's own preflight); do not duplicate in other campaign tests. | Low |
| 5 | 21 | C3 | Inline sha256 helper. | Use the shared `scripts/lib` hash once it exists. | Low |

## Proposed end state
One `describe('installed upgrade campaign')` block in `test/tooling/device-campaigns.test.ts` using a shared fake adb
fixture: calendar and reminder pass (both variants, owned user removed, verified pair installed, never Gradle output),
four admission refusals before any device command, rebuilt-after-admission refusal, cleanup deferred on stop failure and
on failed owner restore, existing registration refused, changed intent routes refused, usage exit 2. No legacy companion.
Owner question: whether a manual-only campaign runner earns a host test at all (T5 keeps only release-gating tooling).
