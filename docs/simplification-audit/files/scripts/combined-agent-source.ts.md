# scripts/combined-agent-source.ts
- Lines: 47 | Kind: script (source snapshot hasher for a frozen, non-vendor Eliza checkout) | Verdict: KEEP while `start-combined-agent.ts` stays; DELETE with it (owner question)
- Covers: `sourceManifest(source)` hashes every tracked/untracked non-ignored file, symlink and one allow-listed gitlink (llama.cpp) of a checkout into a manifest; `start-combined-agent.ts` freezes it and `core-state-preload.ts` re-checks it when `ALPHA_CORE_STATE_FROZEN_MANIFEST` is set. Callers: `scripts/start-combined-agent.ts` (no npm/CI caller; mentioned by `android-instrumentation.ts:329` for the manual CombinedAgent campaign), `scripts/core-state-preload.ts:16` (frozen branch), type import in `core-state-patch.ts:5`; listed as an input in `core-state-patch.ts:28` `CORE_STATE_INPUTS`, `verify-packaged-runtime.py:183`, `source-snapshot.ts:41`, `quint-lib.ts`; tests `core-state-patch`, `host-speech-admission`; Quint `combined-agent-launcher{,-probe}.mjs`, `reviewed-workflow-launcher.mjs`, `services/manifest.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | C3 | Exports another `sha` (SHA-256 hex) helper. | Shared `scripts/lib/hash.ts`. | Low |
| 2 | 17 | C6 | Hard-coded llama.cpp gitlink commit duplicates the upstream pin's submodule identity. | Read it from the pinned checkout's index or `upstream.lock.json`. | Low |
| 3 | 29 | C3 | Local `git()` wrapper (one of 17). | Shared helper. | Low |
| 4 | whole | A7 | Only purpose is the combined-agent launcher. If the owner retires `start-combined-agent.ts` (research: "owner decision"), this file, `combinedCoreRuntime` in `core-state-patch.ts` and the frozen branch of `core-state-preload.ts` all go, and `CORE_STATE_INPUTS` loses an entry (receipts change once). | Decide with `start-combined-agent.ts`. | Med (packaged-runtime receipt inputs change) |

## Proposed end state
Either removed together with the combined-agent launcher, or kept as ~40 lines using shared hash/git helpers.
