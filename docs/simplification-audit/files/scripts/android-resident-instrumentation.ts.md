# scripts/android-resident-instrumentation.ts
- Lines: 52 | Kind: script (manual device campaign: resident service with a real provider key in a fresh secondary user) | Verdict: MOVE to `test/android/` and SIMPLIFY (owner: keep as release acceptance, or delete)
- Covers: runs `ResidentEgressRedactionInstrumentedTest` (default) or `RESIDENT_TEST` in a fresh secondary user with an owner-only Cerebras key fixture and checks the in-app proof file. Duplicates: secondary-user creation/removal is also done by upstream `isolated-android-user.mjs`, which `android-instrumentation.ts` and `android-workflow-native.ts` use. Callers/importers: named in `android-instrumentation.ts:289` (campaign note) and `:312`; `scripts/qualify-head.ts` CAMPAIGNS (delete candidate A124); `ResidentEgressRedactionInstrumentedTest.java` comment; `test/qualify-head.test.mjs`. No npm or workflow caller.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-33, 47-50 | C4 | Own `pm create-user` + removal via `resident-emulator-admission.ts`, while two other campaigns use upstream `withIsolatedAndroidUser`. | Use the upstream helper (with the device lease). | Low |
| 2 | 15 | C3 | `adb` from PATH, not `toolchain.ts`. | Shared `adb(serial)`. | None |
| 3 | 20, 27-29 | C3 | Local `sha` helper. | `scripts/lib/hash.ts`. | None |
| 4 | 34 | A8 | Comment ties the record to `qualify-head.ts` CAMPAIGNS. | Drop when `qualify-head.ts` goes. | None |
| 5 | whole | T9/P | The script is the test; it is not run by any workflow. | Owner: egress redaction is a privacy guarantee, so either wire it into a manual-dispatch job with the key as a secret, or accept it as an operator-run acceptance check and move it under `test/android/`. | Medium: deleting it leaves resident egress redaction without any executed coverage. |

## Proposed end state
`test/android/resident-egress.campaign.ts` (~35 lines) using upstream isolated-user and lease helpers and shared adb/hash helpers; invoked by a documented command or a dispatch workflow.
