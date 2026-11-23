# test/voice-fixture-failure-metadata.test.mjs
- Lines: 107 | Kind: tooling (tests the Playwright diagnostic helper `test/browser/voice-fixture-failure-metadata.ts`) | Verdict: DELETE
- Covers: the voice fixture's failure-metadata probe wraps `Capacitor.nativePromise` transparently, caps and redacts what it records, and attaches only on unexpected failures. Duplicates: none; it is the helper's only test. Helper importers: `test/browser/voice-assistant-fixture.ts`, `chat-dictation-api.spec.ts`, `voice-assistant.production.spec.ts`. Callers/importers of this test: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-107 | T5 | Tests test machinery (a failure-diagnostics wrapper for Playwright), not product behaviour; does not gate a release. | Delete. | Low |
| 2 | 4 | T4 | Same name as the helper `test/browser/voice-fixture-failure-metadata.ts` (research lists it among host/browser name pairs). | — | — |
| 3 | 83-89 | B5 | Asserts the helper serialises without closures: guarding the helper's own construction. | Delete. | Low |

## Proposed end state
File deleted. Whether the helper itself stays is for the browser-harness review: with one typed `test.extend` harness and
Playwright traces, a bespoke redacting probe of `nativePromise` is likely unnecessary; if it stays, it needs no unit test.
