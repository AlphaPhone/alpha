# test/quint-phone-recents.test.mjs
- Lines: 100 | Kind: Quint replay on a real module (esbuild bundles `prototype/phone-adapter.ts` with four stubbed siblings; traces from `shell-model-traces.mjs`) | Verdict: MOVE to `specs/quint/refinement/application/phone-recents.mjs` and register in the runner
- Covers: the image Phone page (call-log access, status reads, dial hand-off, hide/show, notices) follows 120 PhoneRecents traces. Duplicates: `quint-phone-session` replays the same adapter under PhoneSession (busy/access/notice, forward-replays); Phone Playwright specs. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-21 | C3 | Inline esbuild stub plugin; `mms-compose-replay.mjs` and `phone-session-replay.mjs` build the same adapter with their own stub maps. | One shared `bundleAdapter(path, stubs)` helper in `refinement/application/support.mjs`. | Low |
| 2 | 30-31 | T8 | Replaces `globalThis.document` and never restores it. | Scope or restore. | Medium |
| 3 | — | T4 | PhoneRecents and PhoneSession model overlapping state of one adapter. | Formal owner: fold PhoneSession into PhoneRecents if the projections nest. | Low |

## Proposed end state
Driver `phone-recents.mjs` in the application index using the shared adapter bundler; this file deleted.
