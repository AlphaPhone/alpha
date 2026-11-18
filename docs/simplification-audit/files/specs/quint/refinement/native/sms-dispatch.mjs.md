# specs/quint/refinement/native/sms-dispatch.mjs
- Lines: 105 | Kind: Quint refinement harness (Java) over product classes + sliced upstream members | Verdict: PORT (driver) + SIMPLIFY; delete historical replay
- Covers: model `NativeSmsDispatch` (live) — reviewed SMS send: dialog binding, permission/foreground cancellation, SIM change, radio refusals, journal durability, provider readback, default-role outbox. Compiles whole product `AlphaTelephony`, `AlphaTelephonyPlugin`, `AlphaSmsSendReceiver` and upstream `SmsTelephony`, `SmsTelephonyConfiguration`, `SmsSendJournal`. Duplicates: `test/quint-native-sms-dispatch.test.mjs` runs the same campaign (T4) and adds the historical case. Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13,25,42-52,65 | P6/A1 | `historicalSmsSourceTraces` replays the campaign against historical upstream revision bytes via `specs/quint/legacy/core/formal-source-inventory.mjs` and `mms-historical-sources.json`, to show an old bug reproduces. It keeps `specs/quint/legacy` alive (network fetch per verify) and tests superseded code. | Delete the function, its test case (`quint-native-sms-dispatch.test.mjs:14-17`), the two `sources` entries, and (with `mms-dispatch.mjs`) `mms-historical-sources.json`. The current-pin traces already prove the repaired behaviour. | L |
| 2 | 68 | T1 | Regex over `android/app/src/launcher/AndroidManifest.xml` for `<receiver android:name=".AlphaSmsSendReceiver" android:exported="false"`. Source-text release rule. | Move to the APK/merged-manifest audit (`verify-apks`) and delete here. | L |
| 3 | 69-72 | T1 | `deepEqual` on `android/consumer-host.json` `eliza-messages` entry. | Delete. | L |
| 4 | 57-60,73-80 | B5 | Patch staging (0 patches) + receipt verify + two hash loops; l.79-80 itself asserts staged == pinned for every file. | Compile `vendor/eliza/...` paths directly; one shared pinned-hash helper. | L |
| 5 | 90-95 | – | Converts observed arrays to Quint sets/maps by field name. Fine; could live in the Java `Trace` output. | Keep. | – |
| 6 | 81-89 | – | 27 scenarios → 27 JVMs after one javac. | Keep. | – |

## Proposed end state
~60 lines: current-pin campaign only, vendor sources compiled directly, no manifest/consumer-host text checks, no
legacy import. Lane: the three product classes, `SmsDispatchTraces.java`, platform file, messages upstream module.
