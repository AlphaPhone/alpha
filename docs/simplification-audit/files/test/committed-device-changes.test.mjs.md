# test/committed-device-changes.test.mjs
- Lines: 44 | Kind: integration-lite (real `publishCommittedDeviceChanges` from `runtime/device-actions.ts` through `fixtures/browser-source.mjs`, synthetic client and a `window` EventTarget) | Verdict: MERGE into `test/integration/device-actions.test.mjs`
- Covers: a delivered approval receipt announces `alpha:<view>-committed` once per receipt, waits while the session is busy, and is not announced to another session. Duplicates: none for the dedupe/session rule; Notes list reload is visible in `journey-b-voice-note-actions.spec.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18 | B1-like | Assigns `globalThis.window` and never restores it; leaks into other tests in the same process. | Restore in `t.after` when merged. | Low |
| 2 | 23-44 | - | Two small real-module cases. | Keep both. | None |

## Proposed end state
Two cases in `test/integration/device-actions.test.mjs` ("announces once", "waits for idle, same session only") with `window` restored after each.
