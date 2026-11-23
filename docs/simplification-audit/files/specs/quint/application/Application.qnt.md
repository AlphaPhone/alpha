# specs/quint/application/Application.qnt
- Lines: 56 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: MERGE into `AssistantConversation` (owner-switch trace) and DELETE the rest
- Covers: Abstract cross-boundary admission: work is admitted only for a foreground, non-sensitive, signed-in, not-reset owner; reset stops voice and pending work; a stale owner callback cannot write the cache. Models: Names `main.tsx`, `runtime/alpha-client.ts`, `platform-plugins.ts`, `connection-ui.tsx` (exist), but the only executed correspondence is one AlphaClient trace. Duplicates: `native/ApplicationComposition.qnt` imports the real identity/voice/resident/calendar/inbox/reset components (README:87-90); `AssistantConversation` covers send/approve/owner change on the same AlphaClient fixture (`clients.mjs`). Callers/importers: manifest (4 tests, no symbols); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes; `clients.mjs:72-85` `application()` replays one trace (`owner-switch-retires-actual-request`) through `refinement/application/index.mjs` aggregate (run by `test/quint-application-refinement.test.mjs`). No other module imports `Application`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-56 | T4 | A 56-line abstraction of what `ApplicationComposition` (real component actions) and `AssistantConversation` (real AlphaClient) model more precisely. Its reset/voice/resident fields have no executable counterpart. | Move the owner-switch run into `AssistantConversation` (it already has `attach(session)`), move `clients.mjs` `application()` trace into `assistantConversation()`, delete `Application.qnt` and its manifest entry. | Low for behaviour; `test/quint-checker.test.mjs:32` floor (`application: 116`) must be lowered explicitly in the same change. |
| 2 | 47 | B4 | `staleCallback = s' = s` is a stutter labelled as an action. | Goes with the delete. | — |

## Proposed end state
Deleted; the one real trace lives in `AssistantConversation`. Cross-component reset/identity safety stays in `native/ApplicationComposition`.
