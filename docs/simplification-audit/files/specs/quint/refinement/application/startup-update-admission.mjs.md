# specs/quint/refinement/application/startup-update-admission.mjs
- Lines: 176 | Kind: Quint refinement harness, text transplant of upstream `app-update-gate.ts` (marker insertion + type strip) in a VM with JSDOM | Verdict: PORT
- Covers: `StartupUpdateAdmission` — the startup mount gate (`holdAppUpdateStartup`, upstream `upstream renderer: state/app-update-gate.ts`, used from `apps/app/src/main.tsx`; native side `AlphaDevicePlugin.java`) keeps the app unmounted while an update is pending/uncertain, sends Continue once for the exact paused activation, and releases only on a matching terminal readback. Duplicates: none formal; app-update Playwright/host tests cover mounted updater UI (`checkMountedUpdateAdmission` is a sibling model). Callers: `test/quint-startup-update-admission.test.mjs`, `index.mjs` aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 145-149 | T10 | Inserts `globalThis.inspect = () => ({pending, acknowledged})` after the literal `'  let pending: Activation | undefined;\n  let acknowledged: string | undefined;'` and strips types/exports by regex. | Bundle the prepared module with `bundledSource`; observe pending/acknowledged through the port calls and dialog state (`activateUpdate` input already carries the identity), or request an upstream inspector (D14). | M |
| 2 | 136-144 | B5 / A8 | Calls `checkClientFeatures()`, recomputes stamp and vendor digests, and asserts `appUpdateResumePatch` is absent ("the retired updater patch has no receipt") — a tombstone check. | Delete; `prepare-client-features` owns projection integrity. | L |
| 3 | 132-134 | B5 | Hashes `main.tsx`, `AlphaDevicePlugin.java`, scripts as sources though not executed. | Drop. | L |
| 4 | 26-30 | — | Fixture asserts the 1000 ms retry delay; that is a product constant pin, acceptable as model timing. | Keep. | L |

Product files read as text: `upstream renderer: state/app-update-gate.ts`, `vendor/eliza/…/app-update-gate.ts`, `.eliza/client-features/.source.json`. Marker: the two `let pending/acknowledged` lines.

## Proposed end state
Four schedules on the bundled gate, observation from port calls and dialog DOM, no digest/tombstone checks.
