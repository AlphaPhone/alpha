# test/browser/voice-fixture-failure-metadata.ts
- Lines: 65 | Kind: Playwright support (diagnostic hook), never imported by a spec | Verdict: DELETE
- Covers: nothing in the product. It wraps `Capacitor.nativePromise` to count bridge calls and attaches a redacted JSON blob to failed tests. Duplicates: none. Callers/importers: only `test/voice-fixture-failure-metadata.test.mjs` (a host unit test of this helper). `grep -rn "failure-metadata\|observeVoiceFixture\|attachVoiceFailureMetadata"` over `test/ scripts/ specs/ .github/ apps/ playwright.config.ts` finds no spec, fixture or config that calls it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-65 | A7 | No spec calls `observeVoiceFixture` or `attachVoiceFailureMetadata`; the hook is installed nowhere, so the attachment is never produced. | Delete the file. | None. |
| 2 | – | T5 | Its only consumer is `test/voice-fixture-failure-metadata.test.mjs`, a test of test machinery. | Delete that host test in the same change. | None. |
| 3 | 15-31 | B1 | Five `try/catch` blocks that swallow errors in diagnostic code (`catch { /* … */ }`). | Goes with the file. | None. |

## Proposed end state
File and `test/voice-fixture-failure-metadata.test.mjs` deleted. If failure diagnostics are wanted later, Playwright traces
(`trace: 'retain-on-failure'`) already record bridge calls and DOM state without a hand-written redactor.
