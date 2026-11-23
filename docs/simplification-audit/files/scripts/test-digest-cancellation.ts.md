# scripts/test-digest-cancellation.ts
- Lines: 47 | Kind: unit (real `DigestInbox` from `apps/app/src/runtime/hosted-digests.ts`; storage is an in-memory fake, protocol is `scripts/fixtures/hosted-digest-protocol.ts`) | Verdict: MERGE into `test/integration/digests.test.ts` together with `scripts/test-local-digest-storage.ts` (chunk scripts-16)
- Covers: cancelled digest sync never touches storage (before start, while queued), a late response after cancellation writes nothing and is not acknowledged, and a cancel during commit leaves a recoverable durable result that a later sync replays and acknowledges once. Duplicates: the Dafny proof `specs/lemma/apps/app/src/runtime/hosted-digests.dfy` covers index/ack ordering but not abort interleavings; `test-local-digest-storage.ts` exercises the same class and fixture. Callers: `test/local-agent-contracts.test.mjs:14` (spawn shim).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T3 (kept) | Unit test of one class with fakes, but the subject is a concurrency algorithm (queued sync per scope, commit ordering) that neither Playwright nor the native path can reach deterministically. Qualifies for the T3 exception. | Keep the four cases as `test()`s in the digests integration file next to the storage cases. | — |
| 2 | — | T9 | Spawned through `local-agent-contracts.test.mjs` with `--import tsx`. | Delete the shim test; the merged file is the test. | L |
| 3 | 6-15 | C5 | The `storage()` fake is re-declared here and in `test-local-digest-storage.ts`. | One fake in `test/fixtures/digest-storage.ts`. | L |
| 4 | 47 | — | Narrative `console.log` success line. | Remove; `node:test` reports. | L |

## Proposed end state
Four named `test()` cases inside `test/integration/digests.test.ts`; shared storage fake and `hosted-digest-protocol` fixture in `test/fixtures/`; shim test row deleted.
