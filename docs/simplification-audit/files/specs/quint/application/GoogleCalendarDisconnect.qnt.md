# specs/quint/application/GoogleCalendarDisconnect.qnt
- Lines: 140 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (comment marker)
- Covers: Google disconnect: privacy revoke starts before and never waits on optional Calendar pause/callback retirement; late cleanup cannot be published after timeout or privacy retirement (`googleCalendarDisconnectLifecycle` in `apps/app/src/runtime/google-accounts.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `google-calendar-disconnect.mjs` (+ `.md`) via `test/quint-google-calendar-disconnect.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 66-72 | T10 | Harness rewrites google-accounts.ts at the comment `    // Never await local cleanup before starting ordinary privacy revocation.` to inject `__observeCleanup(...)`; then runs the CJS bundle with `new Function`. | Give the lifecycle an injectable observer/port (it already takes pause/retirement ports) and import the module; delete the comment anchor. | M: cross-file-actions §825 splits google-accounts.ts (google-calendar-link.ts) — manifest source path changes |
| 2 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- Harness imports the (split) Google Calendar link module and observes cleanup through a port, no source rewriting.
