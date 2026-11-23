# specs/quint/refinement/application/google-calendar-link-publication-fixture.jsx
- Lines: 210 | Kind: browser fixture (esbuild entry) mounting the real `GoogleConnectionsPanel` | Verdict: KEEP
- Covers: in-page driver for `GoogleCalendarLinkPublication`: account reads, browser-host admission, link helper replies, owner/client replacement, scope loss, real inert and focus cleanup. Duplicates: none. Callers/importers: `google-calendar-link-publication.mjs:11` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | – | Imports the real panel and controller. Good; this is the pattern the JSDOM transplant `test/fixtures/google-account-panel.mjs` should adopt. | Keep; make it the shared panel-mount helper (C5). | – |
| 2 | 20, 166 | T10 | Reads `globalThis.inspectGoogleLinkPublication`, which the driver injects by text into the panel (hook locals `accountBusy`, `linkBusy`, `active`, `linking`, `verifiedAccounts`). | See the harness report. | Med |
| 3 | 99-106 | A3/D5 | `browserCall('residentGoogleCalendarAccess', …)` drives `browser-cloud-resident.ts`, a loopback host enabled only when `import.meta.env.DEV && VITE_ALPHA_CLOUD_RESIDENT==='1'` and never in built artifacts. Five schedules (`browserHost=true`) cover that development-only path. | Owner question: drop the five browser-host schedules and this port, or keep them as dev-tooling evidence (D6). | Low |
| 4 | 175 | – | Asserts the visible `[role=status]` equals the panel notice: a real user-visible check. | Keep. | – |

## Proposed end state
Same fixture, possibly without the browser-host port. Becomes the one mounting helper reused by the access-choice and consent
harnesses.
