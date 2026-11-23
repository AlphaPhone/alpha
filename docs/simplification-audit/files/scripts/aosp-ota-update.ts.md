# scripts/aosp-ota-update.ts
- Lines: 40 | Kind: script (operator CLI: Alpha defaults for upstream `aosp-ota-update.mjs`) | Verdict: MERGE into `scripts/aosp-tools.ts` (subcommand `ota`), keep the npm alias
- Covers: passes Alpha's OTA channel file and stallion source lock to the shared OTA client (`check`, `apply`, `status`, `fallback`, `stock-archive`, `retain-known-good`, `verify-stock`). Duplicates: same shape as `aosp-release-record.ts` and the `verify-aosp-*` wrappers. Callers/importers: npm `aosp:retain-known-good` (no caller of the alias itself); tests `aosp-release-signing.test.mjs`, `aosp-retain-known-good.test.mjs` (imports `ALPHA_OTA_DEFAULTS` and asserts the path literal: T1-ish).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5/D4 | Fourth thin binding of an upstream AOSP CLI with Alpha defaults. | One `scripts/aosp-tools.ts <ota|release-record|listener-systemui|verify-clock|verify-listener|verify-secure-camera> …` that holds the Alpha defaults once. | Low |
| 2 | 34-39 | B1 | catch prints message and sets exit 1 (stack lost). | Fine for an operator CLI; keep. | — |
| 3 | — | T1 | `aosp-retain-known-good.test.mjs:13` asserts the default path by regex. | Delete that assertion. | None |

## Proposed end state
Subcommand of `aosp-tools.ts`; `aosp:retain-known-good` points at it. Release-drill behaviour is upstream's and tested there.
