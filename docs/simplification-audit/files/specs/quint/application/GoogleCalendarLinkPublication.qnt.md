# specs/quint/application/GoogleCalendarLinkPublication.qnt
- Lines: 160 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (marker) — correct the C3 delete entry
- Covers: the mounted Google panel keeps link and account-read busy ownership separate and only publishes a link review while token, Cloud binding and intent are current (`google-connection-ui.tsx`, `google-connection-return.ts`, `modal-inert.ts`). Duplicates: same component as GoogleCalendarAccessChoice / GoogleConsentAdmission. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `google-calendar-link-publication.mjs` + `-fixture.jsx` (+ `.md`) via `test/quint-google-calendar-link-publication.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | correction | `delete-candidates.md` C3 lists `google-calendar-link-publication.{mjs,md}` with the client Calendar sync stack. The harness stubs `./google-accounts` and never loads calendar-sync-host/linked-store/google-calendar-selection; the panel is live (Settings Calendar row → `googleConnectionController.openCalendar`). | Remove it from the C3 delete list; keep. | H if deleted: live panel loses its only refinement |
| 2 | harness 48-51 | T10 | Injects `globalThis.inspectGoogleLinkPublication` before ` function accountRead(){` in the panel source. | Observe via DOM/notice and the controlled ports instead of internal state; or export a test-free state hook only if already part of the panel controller after the split (cross-file-actions §825). | M |
| 3 | harness | cost | Launches Chromium per campaign (181 checkpoints, 23 schedules). | Keep, but run only in the formal lane when its sources change. | L |
| 4 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged; manifest row stays.
- Harness mounts the real panel with virtual ports (already) and observes without source rewriting; it becomes the shared panel fixture for the other two Google panel models.
