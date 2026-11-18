# specs/quint/refinement/native/gmail-background-platform.mjs
- Lines: 232 | Kind: Quint refinement fixture builder (Android/WorkManager/Capacitor stubs as strings + a **slice** of upstream `NativeProviderAdmission.java`) | Verdict: PORT (slice → whole class) + move stubs to files
- Covers: ports for `gmail-background.mjs` (model `NativeGmailBackground`, live). Exports the compiled product list `gmailProduct` (`GmailBackground`, `GmailDeliveryWorker`, `AlphaGmailPlugin`, `CloudDeployment`, `LocalAgentProviderAdmission`, `PluginWorkers` — all exist) and the shared `MailBackgroundDelivery`/`MailHistoryReconciliation` paths. Duplicates: Activity/Intent/Plugin/PluginCall stubs differ from the other 8 platform files. Callers/importers: `gmail-background.mjs:8` only.

## Text pins (T10)
- `vendor/eliza/plugins/plugin-native-agent/.../runtime/NativeProviderAdmission.java`: slice from `' private static String cloudId(Object value)'` to `' private static JSONObject cloudIdentity(JSONObject selected)'`, sanity check that the slice contains `verifiedCloudIdentity` (lines 16-19, injected at 170-175). Anchors verified present today (upstream lines 253/257).
- `GmailPorts.java` (201-222) declares stand-ins for product classes `AlphaCredentialStore`, `AlphaLocalAgentPlugin`, `AlphaDataReset`, `MainActivity`, `R` in one file; their members must match what the Gmail classes call.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-19, 170-175 | T10 | Slicing two private methods out of an upstream file; `verifiedCloudIdentity` is already `public static`. | Compile the whole pinned `NativeProviderAdmission.java` with the extra stubs it needs, or (upstream follow-up, D14) move `verifiedCloudIdentity`+`cloudId` to a small upstream `CloudIdentity` class and compile that. | Medium |
| 2 | 20-222 | D6 / C4 | 200 lines of Java in template strings incl. a generated Periodic/OneTime `WorkRequest` pair. | Committed `stubs/gmail/*.java`. | Low |
| 3 | 224-229 | C3 | Temp write loop duplicated. | Shared helper. | None |
| 4 | 7 | follow-up | `CloudDeployment` is compiled; it is also used by hosted/paired code (C4). The Gmail path needs only its storage-slot naming. | Keep in step with C4. | Low |

## Proposed end state
Stubs as files; the upstream class compiled whole (or a narrower upstream class), so no anchor strings remain.
