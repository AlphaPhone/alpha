# test/browser/local-agent-native-stream.spec.ts
- Lines: 83 | Kind: Playwright chat spec, `chromium`, 14 tests (4 + 10 loop outcomes); typed into the real composer, but the transport is installed by `alphaClient.attachVerifiedTransport` with an in-page import of `streamNativeAgent` and a fake port; the second loop also replaces `connectionController.captureViewNavigation` and builds a `ViewNavigationClient` in-page (T6) | Verdict: MERGE into `journeys/chat.spec.ts`
- Covers: the Android native SSE stream shows text before completion, the authoritative final replaces it, cancel/failure keep the partial with a reason, late frames are ignored, and a prepared view navigation runs only after the stream settles. Duplicates: `local-agent-stream.spec.ts` (transport text), `journey-core-loops.production.spec.ts:235` loop A (resident answers, Stop is honest). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-32, 67-77 | T6 | The resident transport is bypassed: the test hands `streamNativeAgent` a fake port instead of answering `Agent.requestStream` at the bridge. | Answer `requestStream`/`addListener` in the resident bridge fixture (`resident-agent-plugin.ts`) so the product's own transport wiring runs; drive the stream from the test through a `stream.emit()` handle. | Medium: needs a streaming hook in the shared resident fixture. |
| 2 | 65-82 | T4, D8 | Ten navigation outcomes on four 400-character lines; several (`invalid-native`, `malformed-complete`, `failed-ready`, `tool-only`, `correction`, `view-change`) are protocol edge cases of one function. | Carry `ready-done` (navigates after settle, claim then result), `ready-failure` (navigates, interrupted notice, no private text), `cancel` and `account-change` (no navigation). Drop the rest. | Medium: the dropped cases lose coverage unless an upstream or host integration test of the stream parser exists. |
| 3 | 39, 61 | - | Screenshots with no assertion. | Delete. | - |
| 4 | 4-63 | T4 | `complete`, `cancel`, `failure`, `done-then-failure` share 95 % of steps. | One test with steps: partial shown, done not applied until complete, late text ignored; one test for cancel and failure reasons. | Low. |

## Proposed end state
`journeys/chat.spec.ts` "resident streaming" section, two to four tests on the resident bridge fixture: streamed text then authoritative final; cancel and failure keep the partial with the right reason and ignore late frames; prepared navigation waits for settlement (navigates on done/failure, not on cancel/account change). No `/src` imports.
