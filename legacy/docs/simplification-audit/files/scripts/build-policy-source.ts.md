# scripts/build-policy-source.ts
- Lines: 7 | Kind: helper (parse an `export default {...};` policy module as JSON without evaluating it) | Verdict: KEEP
- Covers: reads checked-in upstream/product build policy files (`*.policy.js`) without executing workspace code. Callers/importers: `scripts/core-state-patch.ts`, `scripts/mobile-uuid-adapter.ts`, `scripts/verify-packaged-runtime.py` (Python re-implementation), `test/fixtures/mobile-uuid-build.mjs`, tests `core-state-patch`, `quint-checker` (copies the file), `android-build-path`, `upstream-pin-guard`; Quint launcher harnesses (`services/combined-agent-launcher*.mjs`, `reviewed-workflow-launcher*.mjs`, `cloud-qa-launcher-probe.mjs`, `mobile-bundle-admission.mjs`, `native-google-host-artifact-probe.mjs`) list it as a hash input; `quint-lib.ts`, `source-snapshot.ts`.
- Findings: the TS/Python duplicate (`verify-packaged-runtime.py`) is C7 - one language per pipeline (research 2.10). Could move into `scripts/lib/` as `fs.ts` sibling. No other change.

## Proposed end state
Unchanged 7 lines, moved to `scripts/lib/policy-source.ts` when `scripts/lib/` is created; Python twin removed if
`verify-packaged-runtime.py` is ported.
