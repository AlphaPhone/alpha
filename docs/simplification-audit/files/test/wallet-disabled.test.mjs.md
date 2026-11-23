# test/wallet-disabled.test.mjs
- Lines: 105 | Kind: transplant (rewrites `mvp-features.ts` and `aosp-image.ts` imports into `data:` modules and imports them) + source-text (regexes over `data-adapter.ts`, `native-adapter.ts`, every AndroidManifest.xml and Java file, `MainActivity.java`, `vendor/eliza/.../build-mobile-bundle.ts`) + upstream import + an always-skipped test | Verdict: DELETE
- Covers: Wallet (AP-13) is unreachable: no view, deep link or quick command; no NFC/payment manifest entries or plugins; upstream mobile plugin lists exclude wallet plugins; the staged runtime inventory has no wallet-connector packages. Duplicates: `test/browser/dev-wallet.spec.ts` (deleted with Wallet), `scripts/audit-production-bundle.ts`. Callers/importers: `npm test` glob; imports `scripts/native-view-policy.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A3/D2 | Wallet code is being deleted (DECISIONS D2); every assertion that names `wallet` in renderer code goes with it. | Delete the file with the Wallet removal. | None |
| 2 | 13-30 | T2 | Import rewriting into base64 `data:` modules with fake `Capacitor.PluginHeaders`. | Delete. | None |
| 3 | 45-48 | T1 | Regex over `startPay: () => api.toast('Not connected')` in `data-adapter.ts` (still present, lines 67-68): pins the code D2 deletes. | Delete. | None |
| 4 | 51-69 | T1 | Manifest/Java scans for NFC, HCE, Quick Access Wallet. This is a real release rule. | Move to `scripts/verify-apks.ts`: read the built APK's merged manifest (`aapt2 dump permissions/xmltree`) for both variants and refuse NFC/HCE/wallet services. | Medium |
| 5 | 71-98 | T5 | Imports `vendor/eliza/.../core-plugins.ts` and `mobile-wallet-connectors.ts`; regex over upstream build script. | Delete; upstream owns its plugin policy. | Low |
| 6 | 99-105 | T9 | Skips unless `android/app/src/main/assets/agent/agent-bundle-dependencies.json` is staged, which `npm run verify` never does: always skipped there. | Move the check into the staging step (`agent:stage-android`) as a refusal. | Low |

## Proposed end state
File deleted with Wallet. Two release rules survive elsewhere: `verify-apks.ts` refuses NFC/HCE/wallet services and permissions in both APKs, and the agent staging script refuses `wagmi`, `@wagmi/*`, `@rainbow-me/*`, `@metamask/*` in the staged inventory. The "pay Sam $20" / "open wallet" chat refusal, if the unavailable-prompt rule in `mvp-features.ts:29` survives the Wallet deletion, gets one case in `journeys/production-gating.spec.ts`.
