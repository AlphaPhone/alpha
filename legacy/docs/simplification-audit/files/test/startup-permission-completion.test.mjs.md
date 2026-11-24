# test/startup-permission-completion.test.mjs
- Lines: 245 | Kind: integration (renders real `StartupPermissions` React component in JSDOM with real progress/flow modules; native plugins and connection controllers replaced through `registerHooks` resolve hooks; mock timers) | Verdict: KEEP (trim legacy cases)
- Covers: Required startup permission walkthrough: order, no skipping until the 20 s fallback, Settings handoff without re-prompting, durable progress, Settings review that never rewrites completion, Ready warnings, stale status reads. Duplicates: `test/browser/startup-permissions-walkthrough.spec.ts` (order/design, denial + cold return, pending prompt deadline, Google panel resume) duplicates 4 cases; `post-sign-in-setup.spec.ts`. Callers/importers: `npm test` glob only; `REQUIRED_SOURCE_ROOT` env knob nothing sets.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 63, 66, 68, 106-108 | A1 | Legacy readers: sessionStorage `alpha:startup-permission-progress:v1` resume, "historical completed v1/v2", v3>v4 upgrade, "completed legacy installation". D1 deletes these readers. | Delete these cases with the readers (keep v1 = current 4-step browser marker and v4 = current native marker). | Low |
| 2 | 36-40, 41-43, 45-61, 100-102 | T4 | Same scenarios as `startup-permissions-walkthrough.spec.ts`. | Keep one home for each; prefer the browser spec for order/design and the host test for timer/race cases. | Low |
| 3 | 11 | T9 | `REQUIRED_SOURCE_ROOT` override knob. | Delete. | Low |
| 4 | 12-17 | T7 | Writes stub modules to a temp dir and swaps `@capacitor/core`, `./platform-plugins`, connection-ui by resolve hook. | Replace with the shared native-plugin fake once it exists (one harness for host integration). | Low |
| 5 | 18-35 | D8 | 35-line fixture compressed into five very long lines. | Format; split into `fixture()` helpers. | Low |

## Proposed end state
Stays as the startup-permissions integration file (absorbing `startup-access-flow`), minus ~5 legacy-format cases and the cases the
Playwright walkthrough already covers. Timer and stale-read races stay here, where mock timers are deterministic.
