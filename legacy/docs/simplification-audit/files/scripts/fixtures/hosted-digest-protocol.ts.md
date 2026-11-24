# scripts/fixtures/hosted-digest-protocol.ts
- Lines: 9 | Kind: test support (stubbed `HostedDigestProtocol` whose transport throws and whose `results`/`ack` are replaced) | Verdict: MERGE inline into the surviving digest test (9 lines, 2 importers)
- Covers: lets digest tests feed results without a server. Duplicates: none. Callers/importers: `scripts/test-digest-cancellation.ts`, `scripts/test-local-digest-storage.ts` (both child suites of `test/local-agent-contracts.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-9 | T3 | Replaces two methods of the real class with `Object.assign`: the tests that use it exercise `DigestInbox` and digest storage against a stub protocol, which is a unit-with-stubs shape. | If the two suites are merged into one digest integration file, inline these 6 lines there; if they are deleted as T3, delete this with them. | L |
| 2 | file | D4 | A file for a 6-line function. | Inline. | L |

## Proposed end state
Gone as a file. Hosted digests are live product code (`apps/app/src/runtime/hosted-digests.ts`), so the cancellation and storage behaviour
needs coverage: prefer a loopback HTTP server answering the digest routes (as `test-cloud-delegation` already does) over method replacement.
