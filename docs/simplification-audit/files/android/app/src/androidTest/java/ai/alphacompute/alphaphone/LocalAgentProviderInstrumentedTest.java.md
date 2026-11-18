# android/app/src/androidTest/java/ai/alphacompute/alphaphone/LocalAgentProviderInstrumentedTest.java
- Lines: 81 | Role: provider-key check interpretation, save/refuse, removal and the pinned launch model, called directly on `AlphaLocalAgentPlugin` static delegates. | Verdict: DELETE (with the test-only delegates in main)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:270` (`LocalAgentProvider: {}` — runs in `--all`); `test/browser/local-provider-settings.spec.ts` mentions it in a comment.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-44 | D7/T3 | Calls `AlphaLocalAgentPlugin.providerCheckFailure(int,String,String)` — declared at `AlphaLocalAgentPlugin.java:300`, no production caller (grep of `android/app/src/main`: only the declaration); it forwards to upstream `NativeProviderSlot.providerCheckFailure`. Pure-function test of upstream logic. | Delete the method; delete the delegate at `AlphaLocalAgentPlugin.java:300`. | Low |
| 2 | 46-62 | D7 | Uses the 4-arg `saveVerifiedProvider(store,key,model,check)` (`AlphaLocalAgentPlugin.java:323`, test-only; production uses `NativeProviderSlot.saveVerifiedProvider` directly at :399) and `providerIdentity(String)` (`:496-499`, test-only per android research). | Delete the method and both delegates. | Low (host tests `test/*` that slice these names must go with them: 4 `test/` files mention `saveVerifiedProvider`, 3 `providerIdentity`) |
| 3 | 73-80 | D7/A1 | `applyProviderEnvironment` (`AlphaLocalAgentPlugin.java:482`, no production caller; 5 `test/`+`specs/` files mention it) and the comment "An older build could store another model name" — a legacy-data rationale (D1). | Delete the method and the delegate. | Low |
| 4 | 64-71 | T3 | `removeDeletesTheSlotAndReadsBackUnconfigured` uses the test-only 4-arg save and `providerIdentity`; `clearProviderSlot` itself is production (`:420`). Behaviour is user-visible through Settings -> provider key (covered in the browser by `test/browser/local-provider-settings.spec.ts`). | Delete; if device coverage of key removal is wanted, drive Settings in an existing Settings journey. | Medium (owner: device coverage of provider key storage) |
| 5 | 20 | C6 | `"local-agent-provider:v1"` literal (13x in main; `LocalAgentProviderAdmission.PROVIDER_SLOT` exists). | Gone with the file. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SLOT` | const | 20 | `LocalAgentProviderAdmission.PROVIDER_SLOT`, 13 literals in main | delete |
| `keep/restore` slot backup | helper | 26-31 | similar save/restore in `NoMockProductInstrumentedTest`, `NoteAudioInstrumentedTest` (localStorage) | delete |

## Proposed end state
File deleted (0 lines); `AlphaLocalAgentPlugin` loses `providerCheckFailure` (300), 4-arg `saveVerifiedProvider` (323), `applyProviderEnvironment` (482), `providerIdentity` (496-499) and `PROVIDER_MODEL_PATTERN`/`CLOUD_PROVIDER_BASE` if no other caller (android research §3); registry entry removed.

## Verification
`npm run verify` (host tests that slice these delegates must be deleted in the same change); `npm run android:build:local`; Settings provider-key browser spec.
