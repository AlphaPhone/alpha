# test/files-picker-lifecycle.test.mjs
- Lines: 61 | Kind: transplant (strips imports and types from upstream `.eliza/client-features/plugins/plugin-files/src/browser/files-browser-adapter.ts` and `storage-model.ts`, runs them in `vm` with fake globals and a fake storage plugin) | Verdict: DELETE
- Covers: a native storage selection that resolves after the owner left Files is not opened and its grant is released; returning does not revive it; cancelled results release nothing; an agent `files_open` cannot revive a selection; Files rows keep semantic ids. Duplicates: none in this repo. Callers/importers: `npm test` glob; `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7, 15-16 | T2 | Regex-removes `import` lines and `export ` keywords and evaluates the text in a vm context with `HTMLElement:class{}`, `CustomEvent:class{}`. | Delete. | Low |
| 2 | 6-7 | T5 | Both files are upstream plugin-files code. | The late-selection rules belong in upstream adapter tests (follow-up). | Medium: no other test covers late native-picker results. |
| 3 | 13-20 | T3 | Fake `storage` plugin and fake `createInlineModal`/`menuFocus` ports. | Goes with the file. | Low |

## Proposed end state
File deleted. The owner-visible part ("leave Files while the system picker is open, come back: nothing opens") is a
case for `journeys/files.spec.ts` using the test-mocks storage bridge with a held `storageSelect`. File the
adapter-level cases upstream.
