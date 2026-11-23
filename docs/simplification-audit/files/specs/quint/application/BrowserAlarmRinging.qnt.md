# specs/quint/application/BrowserAlarmRinging.qnt
- Lines: 119 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP (model-only)
- Covers: Web build alarms: at most one visible page owns the Web Lock and rings, the sound needs an owner, hidden/cleared-before-grant pages never ring, a changed alarm set rings again. Models: `apps/app/src/browser/clock.ts` (`BrowserClock`, lock name `alpha.browser.alarm-owner`, `poll`, `retire`), `browser/alert-audio.ts` (exist; 10 symbol pins present). Duplicates: Playwright `test/browser/journey-c-alarms.spec.ts` drives the alarm UI. Callers/importers: manifest (6 tests, 5 witnesses); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes. No harness, no wrapper.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | T10 | Tied to code only by symbol-name pins, including the lock name string. | Pin the file. A two-page Playwright journey (`journeys/reminders.spec.ts`, two contexts) is the natural executable check if wanted. | Low |
| 2 | 31 | — | `withTab` is a `def` reading `s` (not `pure`): acceptable Quint. | Keep. | — |

## Proposed end state
Unchanged model; file-level pin.
