# scripts/native-view-policy.ts
- Lines: 19 | Kind: build/runtime data (product renderer route declarations shared by the resident environment and the APK asset) | Verdict: KEEP
- Covers: the six product-owned native views and their upstream plugin fallbacks as byte-exact JSON. Duplicates: none in scripts (the resident validates it). Callers/importers: `scripts/cloud-resident-host.ts`, `scripts/stage-local-agent-runtime.ts`, `scripts/start-cloud-qa.ts`, `scripts/start-local-remote.ts`, `scripts/stage-aosp-native.py`, `scripts/verify-packaged-runtime.py`; tests `test/agent-action-preferences.test.mjs`, `test/agent-model-selection.test.mjs`, `test/native-view-fallback-installation.test.mjs`, `test/wallet-disabled.test.mjs` (Wallet is deleted under D2; that importer goes), `test/aosp-native-fixtures.py`, `test/packaged-runtime.test.py`; Quint `cloud-qa-launcher.mjs`, `-probe.mjs`, `browser-cloud-request-custody.mjs`, `application/boundaries.mjs`, `manifest.json`; `scripts/quint-lib.ts:33`, `scripts/source-snapshot.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | — | Small, single source of truth, CLI prints it for Python callers. No issues. | None. | — |

## Proposed end state
Unchanged. When `test/wallet-disabled.test.mjs` is deleted, one importer disappears; nothing else changes.
