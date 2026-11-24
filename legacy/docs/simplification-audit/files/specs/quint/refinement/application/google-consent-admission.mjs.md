# specs/quint/refinement/application/google-consent-admission.mjs
- Lines: 200 | Kind: Quint refinement harness (source campaign, `GoogleConsentAdmission`, live in `specs/quint/application/manifest.json`) | Verdict: PORT
- Covers: the mounted Google accounts panel admits a consent URL only for the latest verified same-owner account read, keeps the held Gmail tier as a floor and makes the Calendar permission continuation re-check ownership (`apps/app/src/runtime/google-connection-ui.tsx`, `google-accounts.ts`, `gmail-grants.ts`, `google-connection-return.ts`, `google-workspace-return.ts`, `cloud-protocol.ts`). Duplicates: `google-calendar-access-choice.mjs` and `test/google-calendar-connect.test.mjs` mount the same panel through the same fixture; no other test covers consent admission ordering. Callers/importers: `test/quint-google-consent-admission.test.mjs` and the aggregate `index.mjs` (via `test/quint-application-refinement.test.mjs`) — runs twice per `npm test` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 40 | T2/T10 | The panel itself is not imported: `test/fixtures/google-account-panel.mjs:40-47` reads `google-connection-ui.tsx` as text, inserts `window.quintGoogleConsent=…` at the literal `' async function load(){'`, transforms with esbuild and runs it in `vm` with a hand-written `require` map of ~10 stub modules. Any rename of `load`, reformat (D9 Prettier changes `load(){` to `load() {`) or new import breaks it. | Bundle `google-connection-ui.tsx` with esbuild and an `onResolve` port map (the pattern `hosted-digest-refresh.mjs` and `hosted-notice-question.mjs` already use), so new imports resolve to real modules. Read the verified read from product state the panel already renders (expose it on `googleConnectionController.getSnapshot()`), not from injected closure access. | M: fixture is shared with GoogleCalendarAccessChoice; port both together. |
| 2 | 20-37 | C5 | `compile()` bundles five runtime modules one by one with `bundledSource` only so the vm `require` map can be fed. A single real bundle makes this loop disappear. | Delete with finding 1. | L |
| 3 | 13-16, 51-53 | — | Owner identity is derived from `credentialId` strings and row-array identity (`rowOwners` WeakMap). Sound and cheap. | Keep. | — |
| 4 | test wrapper | B5 | Wrapper asserts `traces === 18`, `checkpoints === 114`; the `.md`-style counts duplicate the case table and fail on every added case. | Assert `passed` only (one manifest-driven runner, see `index.mjs` report). | L |
| 5 | fixture:37 | A8 | Fixture comment cites commit `3800a178e`. | Drop with the fixture rewrite. | — |

## Proposed end state
- Harness imports a real esbuild bundle of the panel with ports for list/revoke/capture/consent/browser; no source text read, no `vm`.
- `test/fixtures/google-account-panel.mjs` becomes a bundle-based mount helper shared with `google-calendar-access-choice.mjs` (or is deleted if both harnesses inline the mount).
- 18 schedules kept as they are; they are the only coverage of consent admission races.
- Runs once, from the manifest-driven runner; no exact-count asserts.
