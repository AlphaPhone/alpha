# test/browser/notes-document-storage.spec.ts
- Lines: 65 | Kind: Playwright spec, chromium + firefox + webkit (in `scripts/storage-specs.ts`), 12 tests (8 + 4-way loop); module calls on `browser-notes-document.ts` | Verdict: DELETE
- Covers: the legacy browser Notes document: two-tab collection sharing, compare-exchange conflicts, lost acknowledgement, exact preservation of `alphaphone:notes:v2`, `alphaphone:prototype:notes:v1` and `alphaphone:daily:v1` sources, recovery download and reset, audio deletion readback against reset. Duplicates: none live. Callers/importers: `scripts/storage-specs.ts:24`; imports `helpers/legacy-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 22-31, 43-65 | A1, D3 | Legacy keys (v1, v2, daily), archive envelope `{version:1,archive,currentRaw}`, "Download Notes backup" and "Reset app Notes". D1 (legacy readers) and D3 (backup) delete all of it. | Delete; remove from `scripts/storage-specs.ts`. | None (data cannot exist) |
| 2 | 10-21, 33-41 | T6 | Remaining cases test `DocumentNotesStore` conflict/ack semantics through direct calls; that store is the legacy one (`browser-notes-document.ts`). Canonical Notes conflicts are covered by `canonical-notes.spec.ts` ("a later read failure…", "slow saves…"). | Delete. | Low |
| 3 | 40 | T1-like | Polls Web Lock queue for `alpha.notes-audio-effects.v1`. | n/a. | None |

## Proposed end state
File deleted with the legacy Notes engine. `scripts/storage-specs.ts` loses line 24.
