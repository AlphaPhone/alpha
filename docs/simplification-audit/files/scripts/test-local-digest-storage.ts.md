# scripts/test-local-digest-storage.ts
- Lines: 64 | Kind: integration (real dev digest store over `local-agent-dev-storage` on disk + real `createDigestInbox`/`DigestInbox`; protocol is a fixture) | Verdict: KEEP, MOVE to `test/integration/digests.test.ts` (node:test), delete its entry in the shim
- Covers: digest pending-slot ownership across tabs, scope isolation, commit-before-ack, lost-ack replay, changed replay refused, disk failure blocks ack, Android fallback never writes the native namespace. Duplicates: none found at this level (`test/browser/journey-d-digests.spec.ts` drives the UI, not the storage protocol). Callers/importers: `test/local-agent-contracts.test.mjs:11` (spawn shim); imports `scripts/fixtures/hosted-digest-protocol.ts`, `scripts/local-agent-dev-storage.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | Self-asserting script spawned by a `.test.mjs` shim with a 60 s timeout. | Wrap in `test()` blocks inside `test/integration/digests.test.ts`; delete the shim line. | None |
| 2 | 1-9 | - | `fixtures/hosted-digest-protocol.ts` (also used by `test-digest-cancellation.ts`) moves with it to `test/fixtures/`. | Move. | None |
| 3 | 14-63 | D8 | Dense one-line asserts; one `try` around everything. | Split into 4 tests (tab ownership, scope/size, lost-ack, disk failure) sharing a `beforeEach` temp dir. | None |

## Proposed end state
~60 lines in `test/integration/digests.test.ts` (four `test()` cases), fixture in `test/fixtures/hosted-digest-protocol.ts`. No shim.
