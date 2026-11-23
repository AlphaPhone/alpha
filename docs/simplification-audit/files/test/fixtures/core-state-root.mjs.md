# test/fixtures/core-state-root.mjs
- Lines: 29 | Kind: tooling fixture (writes a private source tree + reviewed manifest for `scripts/core-state-patch.ts`) | Verdict: KEEP (move with the release-tooling tests)
- Covers: a copy of the core-state patch inputs/targets with a matching `CORE_STATE_MANIFEST`, so the real verifier can be run on a disposable root. Duplicates: none. Callers/importers: `test/android-build-path.test.mjs`, `test/core-state-patch.test.mjs`, fixtures `mobile-uuid-build.mjs`, `product-character-host.mjs`, and 9 live Quint services harnesses (`cloud-qa-launcher(-probe)`, `combined-agent-launcher(-probe)`, `mobile-bundle-admission`, `native-google-host-artifact(-probe)`, `reviewed-workflow-launcher(-probe)`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | C3 | Local sha256 `hash`. | Shared hash helper. | none |
| 2 | 15-18 | - | Hard-codes extra script/vendor files the verifier needs (`local-agent-source.ts`, `copy-file-clone.ts`, two vendor `scripts/lib/*.mjs`); a new verifier import requires editing this list. | Have `core-state-patch.ts` export its own dependency list (it already exports `CORE_STATE_INPUTS`). | Low |
| 3 | 22 | - | Reads `vendor/eliza` raw checkout. | fine for a pin check | - |

## Proposed end state
Kept as a tooling fixture under `test/tooling/support/`; the Quint services harnesses import it from there (or it moves under `specs/quint/refinement/services/support/` if specs must stop depending on test/).
