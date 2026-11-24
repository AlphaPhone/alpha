# scripts/enroll-release-keys.ts
- Lines: 262 | Kind: script (release ceremony tool: record public key digests into signer records) | Verdict: KEEP + SIMPLIFY
- Covers: maps a key ceremony's `fingerprints.json` onto `android/release-signer.json`, `pixel10a-product.json`, `pixel10a-ota-channel.json`, refusing test/debug keys, duplicate certificates and silent replacement; dry-run by default. Callers: operator by hand; referenced by the `android-build-preflight.ts:290` remediation message and `android/signing/alpha-key-manifest.json`; test `enroll-release-keys.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 78 | C3 | Local `readJson` (one of 12). | Shared helper. | Low |
| 2 | 213-228 | C3 | Hand-written `parseArgs` with a repeatable flag. | `node:util parseArgs` (`multiple: true`). | Low |
| 3 | 102-107 | B1 | `recordedDebugSigners` swallows a malformed `artifacts/apk-manifest.json` and returns `[]`, silently weakening the debug-key refusal. | Let a parse error throw; keep the "file absent" case. | Low |
| 4 | 249 | C6 | Hard-codes package `ai.alphacompute.alphaphone` in output text. | Read `appId` from `app.config.json`. | Low |
| 5 | 63 | D11 | `type ReleaseRecord` here means a JSON record; `deliver-app-update.ts:42` has a different `ReleaseRecord`. | Rename to `SignerRecord`. | Low |

## Proposed end state
Same safety rules and dry-run/--write flow, shared helpers, ~240 lines. Release-critical: behaviour unchanged.
