# scripts/test-tts-startup.ts
- Lines: 64 | Kind: source transplant of upstream code (reads `vendor/eliza/packages/app/src/api/standalone-speech-routes.ts`, strips types, links it as a `vm.SourceTextModule` with synthetic dependencies) | Verdict: DELETE
- Covers: upstream standalone speech route warming, retry after cold failure, per-host close ownership. Duplicates: upstream's own tests. Callers/importers: `test/tts-worker-lifecycle.test.mjs` (spawn shim, `--experimental-vm-modules`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15 | T5/T2 | Tests a vendor source file by text; reads `vendor/eliza` directly. | Delete; upstream follow-up (D14) if elizaOS lacks the case. | None |

## Proposed end state
Deleted, together with `test/tts-worker-lifecycle.test.mjs`.
