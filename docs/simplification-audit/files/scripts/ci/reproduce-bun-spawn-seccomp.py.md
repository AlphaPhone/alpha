# scripts/ci/reproduce-bun-spawn-seccomp.py
- Lines: 178 | Kind: one-off reproduction (upstream Bun/seccomp defect) | Verdict: DELETE (with `.github/workflows/bun-spawn-seccomp.yml`)
- Covers: compiles a seccomp filter and SIGSYS handlers and shows that Bun 1.4.2's pre-exec child resets SIGSYS before `close_range`; also compiles upstream's `sigsys-handler.c` from the pinned `vendor/eliza` to check signal-disposition ownership. Duplicates: none. Callers/importers: `git grep reproduce-bun-spawn` finds only `.github/workflows/bun-spawn-seccomp.yml` (dispatch; two runs on 2026-10-03, never since).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P4 / A7 | Dispatch-only reproduction of an upstream defect; the shim it checks lives in `vendor/eliza` (`packages/app/scripts/aosp/seccomp-shim`), so its test belongs to upstream CI (D14). | Delete script + workflow; record in `cross-file-actions.md` upstream follow-ups that the shim's semantics test belongs upstream. | Low; restorable from git. |
| 2 | 12-21 | T9 | Top-level asserts, no `main()`. | Moot. | — |

## Proposed end state
Gone. If the shim regresses, the resident emulator job (`ResidentWorkflowCrashInstrumentedTest` lost-rpc phase, whose crash diagnostics look for exactly this SIGSYS) is the product-level signal.
