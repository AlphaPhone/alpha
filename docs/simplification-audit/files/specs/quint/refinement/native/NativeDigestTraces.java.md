# specs/quint/refinement/native/NativeDigestTraces.java
- Lines: 348 | Kind: Quint refinement harness (Java trace driver; real `NativeDigestHost`, `NativeDigestSources`, `HostedResultNotices` compiled with port stubs) | Verdict: PORT (the platform slice; harness itself KEEP)
- Covers: live model `specs/quint/native/NativeDigestConsent.qnt` (native manifest): native digest consent grants (approve/revoke, exact owner/agent/installation/enrollment binding, scope parsing and limits, 23-hour owner day, expiry, store faults, reminders-only/calendar-only, held reads re-checking the durable grant after a blocking port). Duplicates: none at behaviour level; host javac test `test/native-digest-sources.test.mjs` + `test/fixtures/NativeDigestSourcesTest.java` cover parts of `NativeDigestSources` (projection/limits) as a unit test. The same campaign runs twice: `test/quint-native-digest-consent.test.mjs` and the native aggregate `refinement/native/index.mjs:198` (`test/quint-native-refinement.test.mjs`).
- Callers/importers: `native-digest.mjs` (`checkNativeDigestConsent`, 18 scenarios), `native-digest-platform.mjs` (stubs call back into `wallTime`, `calendarPermission`, `checkGeneration`, `checkTransport`, `activeBinding`, `readSlot`, `writeSlot`, `calendarIdentities`, `calendarRows`, `reminderRows`).

## How it is tied to product code
- Compiles whole files: `NativeDigestHost.java`, `NativeDigestSources.java`, `HostedResultNotices.java` (app) and upstream `NoticeOwner.java` (sha256 pinned to `upstream.lock.json` via `scripts/upstream-native-source.ts`).
- **Text slice (T10)**: `native-digest-platform.mjs:15-18` cuts `HostedDelivery.java` from the literal `' interface NativeSourceWork'` to `' private JSONObject active()'` and asserts the slice contains `t.verify();`, then pastes it into a stub `HostedDelivery` class with stub `HostedInbox`, `AlphaCredentialStore`, `AlphaReminders` and a same-package `System` shadow.
- Calls `HostedResultNotices.hash(...)` directly (lines 59, 147) and `NativeDigestSources.SourceChanged` (240, 255).
- Product files still exist after DECISIONS. `HostedDelivery` cloud/remote/local modes are Q-HOST-1 (open); the digest path uses `mode:"resident"` only, so it survives either answer.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | platform 15-18 | T10 | `HostedDelivery.java` is cut at two literal anchors. Any reorder, a split of `HostedDelivery` (Q-HOST-1 deletes its other modes) or a formatter run breaks the campaign. | Move `NativeSourceWork` and the methods between the anchors into their own package-private class (e.g. `HostedNativeSource.java`) that `HostedDelivery` delegates to; compile it whole with the existing stub ports. | Medium: model behaviour must stay identical; one product refactor in the same change. |
| 2 | 59, 147 | C3 / coupling | Uses `HostedResultNotices.hash` as the SHA-256 helper. The audit's shared `Digests.sha256Hex` (helpers.md) will move it. | Call the shared helper once it exists; update `digestProduct` source list. | Low |
| 3 | 123-136 | A1 (check) | Reminder rows carry `at` beside `dueAt`; this feeds `NativeDigestSources:79` `legacyAlarm` fallback (delete-candidates B43, open, upstream-dependent). | Leave; drop `at` here when B43 is resolved. | Low |
| 4 | 11-29 | D3 | 25 mutable statics as the scenario state; acceptable for a single-JVM-per-run driver. | None. | None |
| 5 | campaign | T4 / P3 | Runs in the per-model test and in the native aggregate. | Keep one runner (chunk summary). | None |
| 6 | runner 28-32 | B5 | Runner hashes inputs and asserts the upstream file is unpatched and sha-equal to the lock; receipts written to `test-results/`. | Keep the unpatched assertion only if the native patch mechanism survives; drop receipt hashing per P6/B5 in the runner rewrite. | Low |

## Proposed end state
Keep the harness and all 18 scenarios: the model is live and covers resident-mode product code. Replace the
`HostedDelivery` text slice with a compiled whole class extracted from `HostedDelivery`. Run it from one place (the
native family runner). Switch the hash call to the shared digest helper when it lands.
