# apps/app/src/browser/screen-locked.ts
- Lines: 4 | Role: lock-screen visibility predicate | Verdict: MERGE into browser/foreground.ts (with notice-action.ts)
- Importers: 13 (clock, hosted-results, location, notice-action, notifications, password-provider, review, workflow-notices, workflow-receipts, workflow-result-input, workflow-urgency, runtime/deletion-undo, runtime/hosted-digest-ui). Text/path pins: specs/quint/application/manifest.json; refinement browser-hosted-result-notice.mjs, hosted-digest-refresh.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | C3 (P5) | Selector inlined again in workflow-speech.ts:8, workflow-trigger-runtime.ts:13, voice.ts:275, runtime/text-share.ts:6. | All import `screenLocked()` from foreground.ts. | Update Quint path pins. |
| 2 | 3 | D10 | Lock state derived from aria-labels `Unlock with fingerprint` / `Wake`. | Prefer a state flag published by the lock view; keep for now. | Medium. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| browserScreenLocked | helper | 2-4 | workflow-speech.ts:8, workflow-trigger-runtime.ts:13, voice.ts:275, runtime/text-share.ts:6 | foreground.ts |

## Proposed end state
Moves into foreground.ts; file deleted. Estimated lines after: 0 (current 4).

## Verification
hosted-digest-refresh, browser-hosted-result-notice Quint harnesses; lock specs.
