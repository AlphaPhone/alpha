# scripts/aosp-listener-systemui.ts
- Lines: 28 | Kind: script (manual CLI: prepare/verify the always-on listener SystemUI overlay from the pinned upstream source) | Verdict: MERGE into `scripts/aosp-tools.ts` (subcommand), drop the test loader
- Covers: imports upstream `sense-systemui.mjs` after `upstreamNativeSource` verifies the pinned bytes, and prepares or verifies the SystemUI patch bundle (`ops`/`chip`/`assist`) against an AOSP source tree. Duplicates: none. Callers/importers: no npm, workflow, doc or script caller; `test/aosp-listener-systemui.test.mjs` (runs the CLI on fixtures), `test/aosp-listener.test.mjs` (uses `loadListenerSystemuiTests` to run upstream's `sense.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 17 | T5 | `loadListenerSystemuiTests` exists only so `test/aosp-listener.test.mjs` can re-run upstream's own test file. | Delete the export and that test; upstream runs its tests. | None |
| 2 | 18-19 | D4 | Wrapper functions only re-pass arguments with defaults. | Call `prepare`/`verify` directly in the CLI. | None |
| 3 | 20-28 | C3 | Index-based argv parsing. | `parseArgs`. | None |
| 4 | whole | A7 / D7 | No caller; it serves always-on listening (AP-06/P-61), which D7 keeps as planned. | Keep the capability as a subcommand of one AOSP operator CLI with the other thin upstream bindings (`aosp-ota-update`, `aosp-release-record`, `verify-aosp-*`). | Low |

## Proposed end state
`node scripts/aosp-tools.ts listener-systemui --source … [--chip|--assist] [--output …|--after]`; no exported test loader. `test/aosp-listener-systemui.test.mjs` may stay as one CLI integration test (it runs the real CLI on a fixture tree).
