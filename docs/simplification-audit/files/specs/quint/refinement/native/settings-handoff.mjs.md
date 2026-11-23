# specs/quint/refinement/native/settings-handoff.mjs
- Lines: 57 | Kind: Quint refinement harness (Java) over sliced product members | Verdict: PORT (with platform) + SIMPLIFY
- Covers: model `NativeSettingsHandoff` (live) — exact Settings intents, fallback page, invalid page, absent/retired host, password-provider page for launcher vs standalone. Duplicates: `test/quint-native-settings-handoff.test.mjs` (T4). Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38-41 | T1 | `assert.deepEqual` on `android/consumer-host.json` module entry for `eliza-system`. A config-shape pin, not behaviour; the Android build fails on its own if the module is wrong. | Delete. | L |
| 2 | 24-26,42-44 | B5 | `prepareNativeFixture` + `verifyNativePatchReceipt` stage upstream with zero patches, then assert staged hash == pinned hash. | Compile `vendor/eliza/plugins/plugin-native-system/.../SystemSettingsPages.java` directly; keep at most one pinned-hash check via a shared helper. | L |
| 3 | 30 | B5 | Hashes Capacitor `Plugin.java`, `Bridge.java`, `BridgeActivity.java` which are never compiled; the assumption text (l.50) claims a BridgeActivity property the harness does not exercise. | Drop those inputs and that assumption sentence. | L |
| 4 | 45 | – | 9 scenarios, campaign runner. | Keep. | – |

## Proposed end state
`checkNativeSettingsHandoff` compiles `SettingsHandoff.java`, `PasswordProviderSupport.java`, vendor
`SystemSettingsPages.java` and stubs; no consumer-host or patch-receipt assertions. ~35 lines.
