# test/aosp-listener.test.mjs
- Lines: 2 | Kind: wrapper that runs the upstream suite `vendor/eliza/packages/os/scripts/android/sense.test.mjs` | Verdict: DELETE (also delete the `loadListenerSystemuiTests` export in `scripts/aosp-listener-systemui.ts:17`)
- Covers: upstream's own SystemUI listener tests, imported through Alpha's pinned-source loader. Duplicates: upstream runs that suite in its own CI. Callers/importers: `npm test`; `loadListenerSystemuiTests` has no other caller (`git grep`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | T5, T9 | Re-runs a vendor test suite from this repo, and keeps a test-loading export inside a production script (D7). | Delete both. | Low: if upstream does not run `sense.test.mjs` in its CI, note it as an upstream follow-up (D14). |

## Proposed end state
Gone; `scripts/aosp-listener-systemui.ts` exports only the CLI functions.
