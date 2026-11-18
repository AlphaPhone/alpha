# test/quint-legacy-chat-input-refinement.test.mjs
- Lines: 13 | Kind: Quint historical comparison (`checkChatInputRefinement` from `specs/quint/legacy/chat-input/check-chat-input-refinement.mjs`, Chromium) | Verdict: DELETE
- Covers: historical ChatInput profiles replayed against the mounted composer (6 traces) with 4 pinned mismatches. Duplicates: ComposerSend replay, chat Playwright specs. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6, A1 | Compares a superseded design (source `ef9fbf7cd7`, `specs/quint/legacy/README.md`) with the mounted current renderer and pins mismatch count 4. Historical evidence, not a live model; DECISIONS D11 retires the family. | Delete with the legacy driver, its `.qnt` and `test/fixtures/quint/*Comparison.qnt`. | Low |
| 2 | all | B5 | Asserts exact mismatch IDs: any renderer fix that removes a difference fails the test. | Gone with the file. | None |
| 3 | 6 | Cost | Starts Chromium and the mounted shell; 240 s budget. | Gone. | None |

## Proposed end state
Deleted with `specs/quint/legacy/chat-input/check-chat-input-refinement.mjs`. The current behaviour it observes is covered by `ComposerSend`/`ChatDock` models and `journeys/chat.spec.ts`.
