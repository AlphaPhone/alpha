# test/phone-dial-agent-flow.test.mjs
- Lines: 42 | Kind: integration (esbuild bundle of the real `apps/app/src/runtime/device-actions.ts` with no stubs; recording proposal transport, in-memory journal and executor ports) | Verdict: MERGE into `test/integration/device-actions.test.ts`
- Covers: the reviewed `phone.dial.v1` device action: requires the negotiated capability (contact targets also need the lookup capability); not reviewable on a sensitive screen; an approved dial opens the dial screen once and receipts a handoff, never a call; a cancelled dial is a failed receipt; receipt retry replays the journaled handoff without re-dialing; an outcome without native evidence is never receipted. Duplicates: `test/device-capability-selection.test.mjs` touches the capability list; no Playwright spec covers the agent dial flow. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | C3 | Bundles with esbuild and imports from a temp file although nothing is stubbed. | Import `device-actions.ts` directly (native type stripping, as `photo-library.test.mjs:247` already does via tsx). | None |
| 2 | 9-13 | D8 | 600-character fixture lines. | Readable `deviceActionFixture({capabilities, operation, executor})` shared with the other device-action cases. | None |
| 3 | 16-42 | - | All six cases are behaviour worth keeping (review gating, single effect, receipt replay, no evidence no receipt). | Carry all six. | Medium (agent-initiated action) |

## Proposed end state
A `describe('phone dial')` in `test/integration/device-actions.test.ts` sharing one proposal/journal/executor fixture with the photo-library and other device-action cases; six cases kept as they are; direct import, no bundle.
