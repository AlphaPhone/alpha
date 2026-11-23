# apps/app/src/runtime/note-default-title.ts
- Lines: 13 | Role: next default title ("New note 2", "Voice note 3") from existing rows. | Verdict: KEEP
- Importers: `prototype/model.js:3`, `prototype/canonical-notes-ui.ts:3`, `prototype/voice-adapter.ts:3`.
- Text/path pins: `test/notes-empty-close.test.mjs`, `test/canonical-notes-webview-abort.test.mjs`, `test/canonical-recording-audio-save.test.mjs`, `test/fixtures/cloud-voice-view.mjs`, `specs/quint/application/manifest.json`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | D8 | `prefix=base.toLowerCase()` recomputed per row. | Hoist out of the loop. | None |

No upstream twin (git grep over `.eliza/client-features`: none). User-visible copy; keep.

## Local types and helpers
None.

## Proposed end state
Unchanged, ~13 lines; could live in the notes bindings/presentation module.

## Verification
`test/notes-empty-close.test.mjs`, canonical-notes tests.
