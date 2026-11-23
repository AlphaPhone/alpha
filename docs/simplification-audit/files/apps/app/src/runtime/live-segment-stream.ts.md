# apps/app/src/runtime/live-segment-stream.ts
- Lines: 11 | Role: re-exports `createLiveSegmentStream` and two types from upstream `packages/voice/src/live-voice-session.ts`; its own comment says it "adds no behavior of its own". | Verdict: DELETE
- Importers: 0 in `apps/app/src` (grep for `live-segment-stream` and `createLiveSegmentStream`: only this file). Text/path pins: `test/voice-assistant.test.mjs:9,750` (dynamic import of this path), `specs/quint/native/manifest.json:74` (sources list), `test/support/feature-parity.mjs:539`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-11 | A7 / D4 | No product importer; kept "for its native transport and tests". | Delete. Point `test/voice-assistant.test.mjs` at the upstream module (or delete the test as T5 — it tests upstream); replace the path in `specs/quint/native/manifest.json:74` with the upstream path; drop `feature-parity.mjs:539`. | Low. |
| 2 | 3 | A8 | "(#423)" issue citation. | Gone with the file. | — |

## Local types and helpers
None.

## Proposed end state
File removed.

## Verification
`npm run verify` (Quint native manifest sources check, feature-parity), voice assistant tests after repointing.
