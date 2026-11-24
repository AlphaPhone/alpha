# specs/quint/refinement/services/mms-compose-replay.mjs
- Lines: 167 | Kind: Quint model-trace replay (bundles the real `prototype/sms-adapter.ts` + `runtime/image-sms.ts` through `test/fixtures/observed-sms-adapter.mjs`, which **injects code at a text marker**) | Verdict: KEEP; PORT the fixture's text injection; trim canary and wrappers
- Covers: `MmsCompose.qnt` — MMS composer picture chooser lifecycle across hide/pagehide, retry after cancel/deny, operation-ID reuse never dispatching twice, 5-picture limit, carrier answer read-back, retirement of accepted drafts; plus two directed cases (no re-dispatch after accepted/uncertain send; declined review gets a new ID). Duplicates: run twice (`test/quint-mms-compose.test.mjs` and `forward-replays.mjs` via `runMmsComposeReplay`); `sms-send-replay.mjs` shares the fixture and send-journal contract. Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 17-25 (fixture) | T10 | `observed-sms-adapter.mjs` reads `sms-adapter.ts` as text and inserts `globalThis.__smsDraftProbe=…` before the literal `' const sync=()=>{'`. Prettier or any edit to that line breaks the replay; the probe reads closure variables `operationId, mmsOperationId, sent, mmsSent, active, body`. | Product: expose a read-only `draftSnapshot()` from the SMS adapter state (or move draft state into a small exported store). Fixture: call it; delete the onLoad rewrite. | medium (touches adapter) |
| 2 | 17-25 | T10 (specifier regex) | Stubs keyed by regex on specifiers (`platform-plugins$`, `runtime/aosp-image$`, `native-adapter$`, `runtime/aosp-telephony$`). | Acceptable; shared loader should fail on unused keys. | low |
| 3 | 63-70 | D2 | Drives the adapter by `installSmsAdapter(Shell, views)` on a fake `Shell` class — depends on the monkey-patch adapter pattern (D2). | Keep until the adapter becomes a module with explicit inputs; then drive that. | low |
| 4 | 130-134 | T5 / B5 | Canary: replays one trace with a deliberately wrong projection and expects failure ("the comparison is live"). Tests the replay machinery. | Delete. | none |
| 5 | 129, 135-136 | B5 | Exact trace count and "every action replayed" asserts. | Keep the action-coverage assert (cheap, catches an empty driver); drop the exact count. | none |
| 6 | 126-167 | D10 | `runMmsComposeCase1/2/3(t, {canaries})` names, unused `t` param, and `runMmsComposeReplay` shim for `forward-replays`. | Name them by behaviour; drop `t`, `canaries` and the shim when `forward-replays.mjs` goes. | none |

## Proposed end state
~140 lines: replay + two directed cases, no canary, fixture without text injection (adapter exports a draft snapshot). One wrapper (`test/quint-mms-compose.test.mjs`), no aggregate re-run. Model stays live (MMS compose is MVP Messages).
