# test/chat-release.test.mjs
- Lines: 61 | Kind: transplant (slices `// chat-release:begin` … `// chat-release:end` from `chat-overlay-motion-adapter.ts`, strips types, imports it as a `data:` URL) | Verdict: DELETE (T2/T4); export the functions only if a pure-algorithm exception is wanted
- Covers: where a released chat sheet rests (sheet/hidden/full zones, flicks, short screens), release velocity from the last drag samples, remembered sheet height. Duplicates: `test/browser/full-chat-grabber.spec.ts` (321 lines, real pointer drags; the file says so on line 7). Callers/importers: `npm test` glob only; the product file carries the marker comment `// chat-release:begin (dependency-free; exercised by test/chat-release.test.mjs)` (D7).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-11 | T2/D7 | Marker-comment slice; the product file keeps markers only for this test. | Delete the test and the two marker comments. | None |
| 2 | 15-61 | T3/T4 | Zone table duplicates the pointer-driven spec for the main cases; the short-screen and velocity cases are not in the spec. | Add to `journeys/chat.spec.ts` (from `full-chat-grabber.spec.ts`): a drag on a 300px-high viewport, and a hold-then-release that does not flick. | Low |

## Proposed end state
Deleted together with the `chat-release:begin/end` markers. Chat sheet gestures are covered by the chat journey's
pointer drags, with one short-screen and one hold-release step added.
