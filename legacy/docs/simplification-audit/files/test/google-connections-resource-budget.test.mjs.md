# test/google-connections-resource-budget.test.mjs
- Lines: 90 | Kind: unit-in-JSDOM (compiles the whole `google-connection-ui.tsx` to CJS, runs it in a vm whose `require` returns hand-written doubles for 13 modules, renders with React into JSDOM) | Verdict: REWRITE as `journeys/settings.spec.ts` (Google accounts section) and DELETE
- Covers: the Google settings panel offers no calendar picker, uses the theme text accent, revalidates on account-change events without listing calendars, shows default-on agent switches that never disconnect or call the provider, shows "Needs Google approval" for a missing grant, and owns Android Back. Duplicates: `google-calendar-connect.test.mjs` part B (`fixtures/google-account-panel.mjs` mounts the same panel the same way), `google-agent-access.test.mjs` (switch publication), `test/browser/gmail-grant-recovery.spec.ts` and `one-calendar.spec.ts` (panel on the real page). Callers/importers: none. The file name ("resource budget") does not describe what it tests (D11).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-43 | T3, C5 | Thirteen module doubles keyed by import specifier; a second copy of the panel harness in `fixtures/google-account-panel.mjs`. | Delete both harnesses; drive the real panel in Playwright. | low |
| 2 | 51-52 | T1-like | Asserts CSS custom property values on the dialog. | Drop, or a single accessibility/contrast check in the settings journey. | none |
| 3 | 53-85 | — | User-visible behaviours worth one journey: no picker, switches toggle without disconnecting, missing grant shows approval needed, Back closes only the panel. | Carry as four journey steps. | low |

## Proposed end state
Gone. Four steps in `journeys/settings.spec.ts` using the dev bridge's Google account fixture.
