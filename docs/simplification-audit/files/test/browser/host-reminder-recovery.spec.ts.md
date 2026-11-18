# test/browser/host-reminder-recovery.spec.ts
- Lines: 9 | Kind: unit-in-browser (T6): no user action; 6 `/src` module imports plus a raw `fetch('/__alpha-local-agent')` | Verdict: REWRITE as a Node integration test `test/local-agent-storage.integration.test.ts` (or DELETE if the dev host journal is retired with the hosted/dev storage harness)
- Covers: the development host action journal's `recoverReminder` uses the retained receipt: wrong binding rejected, stale expected entry rejected by the host, recovery idempotent, reminder store unchanged, status survives reload — for applied/unapplied x create/complete. Duplicates: none in the browser suite; the same recovery is implemented natively for Android (`actionJournal`) — check Android instrumentation/Quint for the production journal. Callers/importers: chromium project but `test.skip` unless `VITE_LOCAL_AGENT=1`; run only by `.github/workflows/browser.yml:183` (shard 1, speech/agent-profile step) together with `browser-agent-tts` and `browser-host-disclosure`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T9 | Permanently skipped in the normal chromium shards; runs only in one special CI step with a fake token file. | If kept, it should run under Node against `scripts/local-agent-dev-storage.ts` directly (the server side it exercises) with the renderer `developmentActionJournal` imported — no browser needed. | Low |
| 2 | 5-8 | T6 / D8 | One 2,000-character line doing the whole scenario inside `page.evaluate`. | Rewrite readable in Node. | — |
| 3 | 5 | — | Exercises `developmentActionJournal` (`apps/app/src/runtime/local-agent-storage.ts:22,41`) and `scripts/local-agent-dev-storage.ts:81` — development-only storage (D6). Production uses the Android journal. | Owner question: is the dev host journal's recovery worth a test at all? If the dev local-agent path stays (D5/D19), keep as Node integration; otherwise delete with it. | Low |

## Proposed end state
Either deleted together with the dev host journal, or ~60 lines in `test/local-agent-storage.integration.test.ts` that call `localAgentStorage(tmpDir, …)` and the journal API with the four applied/creating combinations, removing the browser.yml special step entry for this spec.
