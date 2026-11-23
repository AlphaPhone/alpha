# specs/quint/application/GoogleCalendarAccessChoice.qnt
- Lines: 111 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (fixture transplant)
- Covers: verified Calendar access choice in the mounted Google panel: a write grant links, a read grant goes through consent, and stale owner/intent/read replies cannot admit (`apps/app/src/runtime/google-connection-ui.tsx`, `google-connection-return.ts`). Duplicates: shares the mounted panel with GoogleConsentAdmission and GoogleCalendarLinkPublication (three models of one component; not merged: disjoint invariants). Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `google-calendar-access-choice.mjs` (+ `.md`) via `test/quint-google-calendar-access-choice.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 3 | T2 | Uses `test/fixtures/google-account-panel.mjs`, which `readFileSync`s google-connection-ui.tsx, transforms it and runs it in JSDOM with a hand-written module map. | Mount the real panel through an esbuild virtual-port plugin, as `google-calendar-link-publication.mjs` already does; share one panel fixture for the three Google panel harnesses. | M |
| 2 | — | conflict | `delete-candidates.md` C3 lists `test/fixtures/google-account-panel.mjs` for deletion with the Calendar sync stack; this harness and GoogleConsentAdmission still need it. | Do not delete the fixture until both harnesses are ported (cross-file action). | H if deleted first: two live models lose refinement |
| 3 | — | T4 | Runs twice (per-model + aggregate). | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- One shared mounted-panel fixture (real bundle + virtual ports) for AccessChoice, ConsentAdmission and LinkPublication.
- `google-account-panel.mjs` deleted only after the port.
