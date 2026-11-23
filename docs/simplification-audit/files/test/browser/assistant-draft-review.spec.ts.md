# test/browser/assistant-draft-review.spec.ts
- Lines: 19 | Kind: Playwright spec, chromium, 5 tests (4 loop + 1) | Verdict: MERGE into `journeys/chat.spec.ts`
- Covers: a long draft stays editable and bounded (≤168 px / 28 % height) in both themes at two heights; IME composition and Shift+Enter never send, Enter sends once. Duplicates: composer bounds also asserted in a11y/responsive sweeps. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-8 | C5/A8 | Same 6-line timeout disclaimer copied into three draft specs. | Remove; one harness timeout policy. | None. |
| 2 | 17 | P3/P2 | `LocalAgentProtocol.prototype.send` patch and `connectionController.startDevelopment`. | Resident stub records posts. | Low. |
| 3 | 9 | T4 | 2 themes × 2 heights for a geometry check. | One step at the small height; theme belongs to the a11y sweep. | Low. |

## Proposed end state
Two steps in `journeys/chat.spec.ts`: "long draft stays bounded and Send stays visible (360/420 px)" and "IME confirm and Shift+Enter do not send; Enter sends once". File deleted.
