# test/device-capability-selection.test.mjs
- Lines: 49 | Kind: unit (real pure `selectDeviceCapabilities` from `runtime/phone-context.ts`) + one constant check of `DEVICE_PROFILE` from an eval script | Verdict: MERGE tests 1-2 into `test/integration/device-actions.test.mjs`; DELETE test 3
- Covers: each platform profile (APK, browser, iOS, AOSP image) offers the agent only the device capabilities it can run (no Clock on non-Android, no `clock.alarms.v1`, SMS/dial only on the image, camera/foreground-review gates). Duplicates: platform gating is partly exercised in `test/reminder-capability-negotiation.test.mjs` and `test/aosp-sms.test.mjs`. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-45 | T3 | Pure function, no stubs; it is the PRD-level contract of what the phone advertises (P-17 no alarms, image-only SMS/dial). Risky to lose: a wrong advertisement makes the agent propose impossible actions. | Keep as one table case inside the device-actions integration file, driven through the device registration that sends the list. | Low. |
| 2 | 47-49 | T1-like, A7 | Asserts the eval script's constant equals a literal: couples a product test to a manual eval's config. | Delete; also drop the `DEVICE_PROFILE` export if only this imports it. | None. |
| 3 | 1-3 | A8 | Header names a ticket id and evidence class. | Drop in merge. | None. |

## Proposed end state
One table-driven "capabilities by platform profile" case in `test/integration/device-actions.test.mjs`, asserted on the
capability header the device registration actually sends.
