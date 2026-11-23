# specs/quint/refinement/native/GmailBackgroundTraces.java
- Lines: 648 | Kind: Quint refinement harness (Java, real app Gmail plugin/worker + staged upstream mail delivery, fully intercepted HTTPS) | Verdict: KEEP; PORT the driver's upstream text slice and drop its node_modules regex checks
- Covers: model `NativeGmailBackground` (live): Gmail background delivery: configure with owner/grant verification, WorkManager periodic/catch-up scheduling, history paging with exact durable cursor, 401/403/409 budgets, storage faults before/after commit, credential rotation retiring a running worker, bridge teardown refusing queued configure without side effects, withdraw variants, notice posting/uncertain/denied, tap capture/pending/consume/release with remote revocation and offline, process recreate; 31 scenarios. Duplicates (behavioural overlap, see their reports): `test/gmail-lifecycle-custody.test.mjs`, `test/gmail-background-lock-contention.test.mjs`, `test/gmail-background-binding.test.mjs` (the last is mostly source-text), and `test/quint-native-gmail-background.test.mjs` re-running this campaign.
- Callers/importers: `gmail-background.mjs` (`checkNativeGmailBackground`, `javaTraceCampaign`), stubs from `gmail-background-platform.mjs`; aggregate `index.mjs:199`.

## How it is tied to product code
- Compiles whole app files `GmailBackground`, `GmailDeliveryWorker`, `AlphaGmailPlugin`, `CloudDeployment`,
  `LocalAgentProviderAdmission`, `PluginWorkers`, and upstream `MailBackgroundDelivery`/`MailHistoryReconciliation`
  staged by `prepareNativeFixture` with lock/receipt checks.
- **Text slice (T10, upstream)**: `gmail-background-platform.mjs:16-19,174` copies the span of upstream
  `NativeProviderAdmission.java` from `' private static String cloudId(Object value)'` to
  `' private static JSONObject cloudIdentity(JSONObject selected)'` into a stub.
- **Source-text asserts (T1)**: `gmail-background.mjs:43-46` regex-checks `node_modules/@capacitor/android/.../Bridge.java`
  (`HandlerThread("CapacitorPlugins")`, `taskHandler.post(currentThreadTask)`) and `BridgeActivity.java` (`onDestroy` calls `bridge.onDestroy()`).
- Reflection pins: `GmailBackground.{delivery,poster}` (reset), `MailBackgroundDelivery.{attempts,admittedAttempt,pendingGrant}`, `AlphaGmailPlugin.io`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | driver 43-46 | T1 | Regex assertions on third-party Capacitor source justify the harness's threading assumption; they test a dependency's text. | Delete; state the assumption in the receipt's `assumptions` (already there). | None |
| 2 | platform 16-19 | T10 | Upstream method bodies cut by anchors. | Upstream follow-up (D14): make the verified Cloud identity helper a public static in its own upstream class; until then compile the whole patched `NativeProviderAdmission.java`. | Medium |
| 3 | 84-90 | — | `configurePoster` asserts the exact notification copy ("New mail in Gmail", "Tap to open Inbox.") and channel/action ids. These are persisted/OS identities (G5) and user copy; asserting them here is a reasonable guard, not a text test. | Keep. | None |
| 4 | 338-343, 453-456 | T8 | Stack-frame polling and 5-10 s latches; inherent to the "locked begin boundary" schedule. | Keep. | None |
| 5 | driver | B5 | Four hash/receipt asserts for staged shared sources before running. | Keep only the lock sha256 equality; drop the duplicated staged-vs-inventory triple check if `prepareNativeFixture` already verifies its receipt. | Low |
| 6 | campaign | T4 | Per-model wrapper + aggregate run it twice; `batchSize:8` already splits checking. | One runner. | None |

## Proposed end state
Same 31 scenarios against the real Gmail plugin and worker. The driver stops asserting Capacitor source text, and the
upstream identity helper is compiled whole (or imported once it exists as its own upstream class). Run once.
